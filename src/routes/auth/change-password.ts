import { Context, Handler } from "hono";
import { Flash } from "@/lib/flash";
import { AppError } from "@/lib/auth-error";
import type { RouteActionData } from "@/lib/types";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { ChangePasswordPage } from "@/views/auth/change-password";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";

const tel = new Telemetry(routes.auth.changePassword);

const flash = new Flash<typeof actions>();

export const actions = {
    change_password: { name: "change_password", handler: ChangePassword },
    set_password: { name: "set_password", handler: SetPassword },
};

export type ChangePasswordLoaderData = {
    hasCredential: boolean;
};

export type ChangePasswordActionData = RouteActionData<typeof actions>;

type ActionReturnData = {
    headers?: Headers;
};

export const get: Handler = async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const accounts = await auth.api.listUserAccounts({ headers: c.req.raw.headers });
    const hasCredential = accounts.some((a) => a.providerId === "credential");

    const { actionData, headers } = flash.Consume(c.req.raw.headers);

    return c.html(
        ChangePasswordPage({
            loaderData: { hasCredential },
            actionData,
        }),
        { headers },
    );
};

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
        return flash.Respond(c.req.raw, result.data.headers, {
            result: { action, success: true },
        });
    }

    return flash.Respond(c.req.raw, undefined, {
        result: { action, success: false, errors: result.error },
    });
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
