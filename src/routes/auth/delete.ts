import { AppError } from "@/lib/auth-error";
import { Flash } from "@/lib/flash";
import { convertSetCookiesToCookies } from "@/lib/cookies";
import { AppEnv, BaseProps } from "@/lib/types";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry } from "@/server/telemetry";
import { DeleteAccountPage, DeleteSuccessPage } from "@/views/auth/delete";
import { Hono } from "hono";
import { createCopy } from "@/lib/copy";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.delete);
const flash = new Flash<typeof actions, State>({ success: false, verificationType: "totp" });

type State = { success?: boolean; verificationType?: "totp" | "email" };
export type DeleteProps = BaseProps<typeof actions, State> & { hasCredential: boolean; hasTwoFactor: boolean };

export const actions = {
    delete_account: { name: "delete_account", handler: DeleteAccount },
    resend_email: { name: "resend_email", handler: ResendEmail },
    switch_otp: { name: "switch_otp", handler: SwitchOtp },
};

app.get("/", async (c) => {
    const copy = createCopy(c.req.raw);

    // This is before auth.api.getSession() because when an account is
    // deleted, after the Redirect, the user's session token is cleared.
    const { state, headers, result } = flash.Consume(c.req.raw.headers);
    if (state?.success) {
        return c.html(DeleteSuccessPage({ copy }), { headers });
    }

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const accounts = await auth.api.listUserAccounts({ headers: c.req.raw.headers });
    const hasCredential = accounts.some((a) => a.providerId === "credential");

    const hasTwoFactor = session.user.twoFactorEnabled ? true : false;

    return c.html(DeleteAccountPage({ state, result, copy, hasTwoFactor, hasCredential }), { headers });
});

app.post("/", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    const result = await tel.task(
        "POST",
        async () => {
            const handler = findAction(actions, action);
            return await handler(c.req.raw, form);
        },
        { action },
    );

    return flash.Respond(c.req.raw, result, {
        state: { verificationType: getOtpType(form.get("otp-type")?.toString()) },
    });
});

async function ResendEmail(request: Request, _: FormData): Promise<{ state: State }> {
    await auth.api.sendTwoFactorOTP({ headers: request.headers });
    return { state: { verificationType: "email" } };
}

async function SwitchOtp(request: Request, form: FormData): Promise<{ state: State }> {
    const to = form.get("to")?.toString();
    const type: "email" | "totp" = to === "email" ? "email" : "totp";
    if (type === "email") {
        await auth.api.sendTwoFactorOTP({ headers: request.headers });
    }
    return { state: { verificationType: type } };
}

async function DeleteAccount(request: Request, form: FormData): Promise<{ state: State; headers: Headers }> {
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
        headersForDelete = convertSetCookiesToCookies(request.headers, otpHeaders);
    }

    const password = form.get("password")?.toString();
    if (!hasCredential) {
        const result = await auth.api.deleteUser({
            body: {},
            headers: request.headers,
            returnHeaders: true,
        });
        return { state: { success: true }, headers: result.headers };
    }

    if (!password) {
        throw new AppError("INVALID_PASSWORD");
    }

    const result = await auth.api.deleteUser({
        body: { password: password },
        headers: headersForDelete,
        returnHeaders: true,
    });

    return { state: { success: true }, headers: result.headers };
}

async function checkOtp(request: Request, form: FormData): Promise<Headers> {
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

function getOtpType(s: string | undefined): "email" | "totp" {
    if (s === "email") return s;
    if (s === "totp") return s;
    return "totp";
}

export default app;
