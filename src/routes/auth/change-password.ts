import { Context, Handler } from "hono";
import { AppError } from "@/lib/auth-error";
import { redirects, routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { ChangePasswordPage } from "@/views/auth/change-password";
import { findAction } from "@/routes/auth/lib/check-action";

const tel = new Telemetry(routes.auth.changePassword);

type ActionReturnData = {
    headers?: Headers;
};

export const actions = {
    change_password: { name: "change_password", handler: ChangePassword },
    set_password: { name: "set_password", handler: SetPassword },
} as const;

export const get: Handler = async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return redirects.ToLogin();

    const accounts = await auth.api.listUserAccounts({ headers: c.req.raw.headers });
    const hasCredential = accounts.some((a) => a.providerId === "credential");

    return c.html(ChangePasswordPage({ hasCredential }));
};

export async function post(c: Context) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return redirects.ToLogin();
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
        const h = result.data.headers ? new Headers(result.data.headers) : undefined;
        return c.html(
            ChangePasswordPage({ hasCredential, result: { action, success: true } }),
            h ? { headers: h } : undefined,
        );
    }

    return c.html(ChangePasswordPage({ hasCredential, result: { action, success: false, errors: result.error } }));
}

async function ChangePassword(request: Request, form: FormData): Promise<ActionReturnData> {
    const current = form.get("current")?.toString();
    const newPass = form.get("new_password")?.toString();
    const repeat = form.get("new_password_repeat")?.toString();
    if (!current) throw new AppError("INVALID_PASSWORD");
    if (!newPass) throw new AppError("password_mismatch");
    if (newPass !== repeat) throw new AppError("password_mismatch");
    const r = await auth.api.changePassword({
        body: { currentPassword: current, newPassword: newPass, revokeOtherSessions: true },
        headers: request.headers,
        returnHeaders: true,
    });
    return { headers: r.headers };
}

async function SetPassword(request: Request, form: FormData): Promise<ActionReturnData> {
    const newPass = form.get("new_password")?.toString();
    const repeat = form.get("new_password_repeat")?.toString();
    if (!newPass) throw new AppError("password_mismatch");
    if (newPass !== repeat) throw new AppError("password_mismatch");
    const r = await auth.api.setPassword({
        body: { newPassword: newPass },
        headers: request.headers,
        returnHeaders: true,
    });
    return { headers: r.headers };
}
