import { Context } from "hono";
import { AppError } from "@/lib/auth-error";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { ChangeEmailPage } from "@/views/auth/change-email";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";

const tel = new Telemetry(routes.auth.changeEmail);

type ActionReturnData = {
    verificationSent?: boolean;
    headers?: Headers;
};

export const actions = {
    change_email: { name: "change_email", handler: ChangeEmail },
    resend_verification: { name: "resend_verification", handler: ResendVerification },
} as const;

export async function get(c: Context) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    return c.html(
        ChangeEmailPage({
            currentEmail: session.user.email,
            emailVerified: session.user.emailVerified,
        }),
    );
}

export async function post(c: Context) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    const result = await tel.task("POST", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw, form));
        const handler = findAction(actions, action);
        return await handler(c.req.raw, form);
    });

    if (result.ok) {
        return c.html(
            ChangeEmailPage({
                currentEmail: session.user.email,
                emailVerified: session.user.emailVerified,
                result: { action, success: true },
                verificationSent: result.data.verificationSent,
            }),
            { headers: result.data.headers },
        );
    }

    return c.html(
        ChangeEmailPage({
            currentEmail: session.user.email,
            emailVerified: session.user.emailVerified,
            result: { action, success: false, errors: result.error },
        }),
    );
}

async function ChangeEmail(request: Request, form: FormData): Promise<ActionReturnData> {
    const newEmail = form.get("new_email")?.toString();
    if (!newEmail) throw new AppError("field_missing_email");
    const r = await auth.api.changeEmail({
        body: { newEmail },
        headers: request.headers,
        returnHeaders: true,
    });
    return { headers: r.headers };
}

async function ResendVerification(request: Request, _: FormData): Promise<ActionReturnData> {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new AppError("SESSION_EXPIRED");
    await auth.api.sendVerificationEmail({
        body: { email: session.user.email },
    });
    return { verificationSent: true };
}
