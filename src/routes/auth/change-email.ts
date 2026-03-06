import { Context } from "hono";
import { AppError } from "@/lib/auth-error";
import type { ActionResult } from "@/lib/types";
import { redirects, routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { ChangeEmailPage } from "@/views/auth/change-email";

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
    if (!session) return redirects.ToLogin();

    return c.html(
        ChangeEmailPage({
            currentEmail: session.user.email,
            emailVerified: session.user.emailVerified,
        }),
    );
}

export async function post(c: Context) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return redirects.ToLogin();

    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    tel.debug("POST", safeRequestAttrs(c.req.raw, form));

    if (!action || !(action in actions)) {
        const r: ActionResult<typeof actions> = {
            action: "top-of-page",
            success: false,
            errors: [new AppError("generic_error")],
        };
        return c.html(
            ChangeEmailPage({
                currentEmail: session.user.email,
                emailVerified: session.user.emailVerified,
                result: r,
            }),
        );
    }

    const actionKey = action as keyof typeof actions;
    const result = await tel.task("POST", async (span) => {
        span.setAttribute("user.id", session.user.id);
        return await actions[actionKey].handler(c.req.raw, form);
    });

    if (result.ok) {
        const r = result.data;
        const h = r.headers ? new Headers(r.headers) : undefined;
        const ar: ActionResult<typeof actions> = { action: actionKey, success: true };
        return c.html(
            ChangeEmailPage({
                currentEmail: session.user.email,
                emailVerified: session.user.emailVerified,
                result: ar,
                verificationSent: r.verificationSent,
            }),
            h ? { headers: h } : undefined,
        );
    }

    const ar: ActionResult<typeof actions> = { action: actionKey, success: false, errors: result.error };
    return c.html(
        ChangeEmailPage({
            currentEmail: session.user.email,
            emailVerified: session.user.emailVerified,
            result: ar,
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
