import { Context } from "hono";
import { AppError } from "@/lib/auth-error";
import { redirects, routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { ChangeEmailPage } from "@/views/auth/change-email";

const tel = new Telemetry(routes.auth.changeEmail);

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

    const result = await tel.task("POST", async (span) => {
        span.setAttribute("user.id", session.user.id);

        if (action === "change_email") {
            const newEmail = form.get("new_email")?.toString();
            if (!newEmail) throw new AppError("field_missing_email");
            const r = await auth.api.changeEmail({
                body: { newEmail },
                headers: c.req.raw.headers,
                returnHeaders: true,
            });
            return { success: true, headers: r.headers };
        }

        if (action === "resend_verification") {
            await auth.api.sendVerificationEmail({
                body: { email: session.user.email },
            });
            return { verificationSent: true };
        }

        throw new AppError("generic_error");
    });

    if (result.ok) {
        const r = result.data;
        const h = "headers" in r && r.headers ? new Headers(r.headers) : undefined;
        return c.html(
            ChangeEmailPage({
                currentEmail: session.user.email,
                emailVerified: session.user.emailVerified,
                success: "success" in r ? r.success : undefined,
                verificationSent: "verificationSent" in r ? r.verificationSent : undefined,
            }),
            h ? { headers: h } : undefined,
        );
    }

    return c.html(
        ChangeEmailPage({
            currentEmail: session.user.email,
            emailVerified: session.user.emailVerified,
            errors: result.error,
        }),
    );
}
