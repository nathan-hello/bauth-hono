import type { Handler } from "hono";
import { Flash } from "@/lib/flash";
import { auth } from "@/server/auth";
import { dotenv } from "@/server/env";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { TwoFactorBackupPage } from "@/views/auth/backup-code";
import { parse } from "cookie";
import type { RouteActionData } from "@/lib/types";
import { routes } from "@/routes/routes";
import { AppError } from "@/lib/auth-error";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { createCopy } from "@/lib/copy";

const tel = new Telemetry(routes.auth.twoFactorBackup);

const flash = new Flash<typeof actions>();

export const actions = {
    verify_backup_code: { name: "verify_backup_code", handler: VerifyBackupCode },
};

export type TwoFactorBackupLoaderData = {};

export type TwoFactorBackupActionData = RouteActionData<typeof actions>;

export const get: Handler = async (c) => {
    const copy = createCopy(c.req.raw);

    const result = await tel.task("GET", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw));

        const cookies = c.req.raw.headers.get("cookie");
        if (!cookies) {
            return await new Redirect(c.req.raw).Because.TwoFactorCookieNotFound();
        }

        const parsed = parse(cookies);
        const cookieKey = dotenv.COOKIE_PREFIX + ".two_factor";
        if (!parsed[cookieKey] && !parsed["__Secure." + cookieKey]) {
            return await new Redirect(c.req.raw).Because.TwoFactorCookieNotFound();
        }

        const { actionData, headers } = flash.Consume(c.req.raw.headers);

        return c.html(
            TwoFactorBackupPage({
                loaderData: {},
                actionData,
                copy,
            }),
            { headers },
        );
    });
    if (result.ok) {
        return result.data;
    }
    return await new Redirect(c.req.raw).Because.TwoFactorCookieNotFound();

};

export const post: Handler = async (c) => {
    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    const result = await tel.task("POST", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw, form));
        const handler = findAction(actions, action);
        return await handler(c.req.raw, form);
    });

    if (result?.ok) {
        if (result.data instanceof Headers) {
            return new Redirect(c.req.raw, result.data).After.Login();
        }
        return flash.Respond(c.req.raw, undefined, result.data);
    }

    return flash.Respond(c.req.raw, undefined, {
        result: { action, success: false, errors: result.error },
    });
};

async function VerifyBackupCode(request: Request, form: FormData): Promise<Headers> {
    const code = form.get("code")?.toString();
    if (!code) {
        throw new AppError("INVALID_OTP");
    }
    const { headers } = await auth.api.verifyBackupCode({
        headers: request.headers,
        body: { code, trustDevice: true },
        returnHeaders: true,
    });
    tel.debug("BACKUP_CODE_VERIFIED");
    return headers;
}
