import { AppError } from "@/lib/auth-error";
import { convertSetCookiesToCookies } from "@/lib/cookies";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { safeRequestAttrs, Telemetry } from "@/server/telemetry";
import { DeleteAccountPage, DeleteSuccessPage } from "@/views/auth/delete";
import { Context } from "hono";

const tel = new Telemetry(routes.auth.delete);

export const actions = {
    delete_account: { name: "delete_account", handler: DeleteAccount },
    resend_email: { name: "resend_email", handler: ResendEmail },
    switch_otp: { name: "switch_otp", handler: SwitchOtp },
};

type DeleteActionData = {
    data?: {
        deleted?: boolean;
        verificationType?: "email" | "totp";
        resentEmail?: boolean;
    };
    headers?: Headers;
};

export async function get(c: Context) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }
    const accounts = await auth.api.listUserAccounts({ headers: c.req.raw.headers });
    const hasCredential = accounts.some((a) => a.providerId === "credential");
    return c.html(
        DeleteAccountPage({
            hasCredential,
            state: session.user.twoFactorEnabled ? { verificationType: "totp" } : undefined,
        }),
    );
}

export async function post(c: Context) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }
    const accounts = await auth.api.listUserAccounts({ headers: c.req.raw.headers });
    const hasCredential = accounts.some((a) => a.providerId === "credential");
    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    const result = await tel.task("POST", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw, form));
        const handler = findAction(actions, action);
        return await handler(c.req.raw, form);
    });

    if (result.ok) {
        if (result.data.data?.deleted) {
            return c.html(DeleteSuccessPage());
        }

        return c.html(
            DeleteAccountPage({
                hasCredential,
                state: result.data.data?.verificationType
                    ? { verificationType: result.data.data.verificationType }
                    : undefined,
            }),
            { headers: result.data.headers },
        );
    }

    return c.html(
        DeleteAccountPage({
            hasCredential,
            state: session.user.twoFactorEnabled
                ? { verificationType: getOtpType(form.get("otp-type")?.toString()) }
                : undefined,
            result: { action, success: false, errors: result.error },
        }),
    );
}

function getOtpType(s: string | undefined): "email" | "totp" {
    if (s === "email") return s;
    if (s === "totp") return s;
    return "totp";
}

async function ResendEmail(request: Request, _: FormData): Promise<DeleteActionData> {
    await auth.api.sendTwoFactorOTP({ headers: request.headers });
    return { data: { verificationType: "email", resentEmail: true } };
}

async function SwitchOtp(request: Request, form: FormData): Promise<DeleteActionData> {
    const to = form.get("to")?.toString();
    const type: "email" | "totp" = to === "email" ? "email" : "totp";
    if (type === "email") {
        await auth.api.sendTwoFactorOTP({ headers: request.headers });
    }
    return { data: { verificationType: type } };
}

async function DeleteAccount(request: Request, form: FormData): Promise<DeleteActionData> {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        throw new AppError("FAILED_TO_GET_SESSION");
    }

    const accounts = await auth.api.listUserAccounts({ headers: request.headers });
    const hasCredential = accounts.some((a) => a.providerId === "credential");

    let headersForDelete = request.headers;

    if (session?.user.twoFactorEnabled) {
        // Checking 2FA when deleting a user is not supported
        // in auth.api.deleteUser. This means that we have to
        // check it manaully. Upon checking it manually, we get
        // a new Session Token, which means we have to tell auth.api.deleteUser
        // about this new session token, as the one with the original
        // request is now invalid.
        const otpHeaders = await checkOtp(request, form);
        if (!otpHeaders) throw new AppError("otp_failed");
        headersForDelete = convertSetCookiesToCookies(request.headers, otpHeaders);
    }

    const password = form.get("password")?.toString();
    if (!hasCredential) {
        const result = await auth.api.deleteUser({
            body: {},
            headers: request.headers,
            returnHeaders: true,
        });
        return { data: { deleted: true }, headers: result.headers };
    }

    if (!password) {
        throw new AppError("INVALID_PASSWORD");
    }

    const result = await auth.api.deleteUser({
        body: { password: password || undefined },
        headers: headersForDelete,
        returnHeaders: true,
    });

    return { data: { deleted: true }, headers: result.headers };
}

async function checkOtp(request: Request, form: FormData): Promise<Headers | null> {
    const otp = form.get("otp")?.toString();
    const type = form.get("otp-type")?.toString();
    if (!type || (type !== "email" && type !== "totp")) {
        throw new AppError("otp_failed");
    }
    if (!otp) {
        throw new AppError("INVALID_OTP");
    }

    let result: { headers: Headers };
    switch (type) {
        case "email":
            result = await auth.api.verifyTwoFactorOTP({
                body: { code: otp },
                headers: request.headers,
                returnHeaders: true,
            });
            return result.headers;
        case "totp":
            result = await auth.api.verifyTOTP({
                body: { code: otp },
                headers: request.headers,
                returnHeaders: true,
            });
            return result.headers;
    }
}
