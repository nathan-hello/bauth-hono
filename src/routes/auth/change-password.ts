import { Context } from "hono";
import { AppError } from "@/lib/auth-error";
import { redirects, routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { ChangePasswordPage } from "@/views/auth/change-password";

const tel = new Telemetry(routes.auth.changePassword);

export async function get(c: Context) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return redirects.ToLogin();

    const accounts = await auth.api.listUserAccounts({ headers: c.req.raw.headers });
    const hasCredential = accounts.some((a) => a.providerId === "credential");

    return c.html(ChangePasswordPage({ hasCredential }));
}

export async function post(c: Context) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return redirects.ToLogin();

    const accounts = await auth.api.listUserAccounts({ headers: c.req.raw.headers });
    const hasCredential = accounts.some((a) => a.providerId === "credential");
    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    tel.debug("POST", safeRequestAttrs(c.req.raw, form));

    const result = await tel.task("POST", async (span) => {
        span.setAttribute("user.id", session.user.id);

        if (action === "change_password") {
            const current = form.get("current")?.toString();
            const newPass = form.get("new_password")?.toString();
            const repeat = form.get("new_password_repeat")?.toString();
            if (!current) throw new AppError("INVALID_PASSWORD");
            if (!newPass) throw new AppError("password_mismatch");
            if (newPass !== repeat) throw new AppError("password_mismatch");
            const r = await auth.api.changePassword({
                body: { currentPassword: current, newPassword: newPass, revokeOtherSessions: true },
                headers: c.req.raw.headers,
                returnHeaders: true,
            });
            return { success: true, headers: r.headers };
        }

        if (action === "set_password") {
            const newPass = form.get("new_password")?.toString();
            const repeat = form.get("new_password_repeat")?.toString();
            if (!newPass) throw new AppError("password_mismatch");
            if (newPass !== repeat) throw new AppError("password_mismatch");
            const r = await auth.api.setPassword({
                body: { newPassword: newPass },
                headers: c.req.raw.headers,
                returnHeaders: true,
            });
            return { success: true, headers: r.headers };
        }

        throw new AppError("generic_error");
    });

    if (result.ok) {
        const h = result.data.headers ? new Headers(result.data.headers) : undefined;
        return c.html(ChangePasswordPage({ hasCredential, success: true }), h ? { headers: h } : undefined);
    }

    return c.html(ChangePasswordPage({ hasCredential, errors: result.error }));
}
