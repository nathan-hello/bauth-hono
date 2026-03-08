import type { Context, Handler } from "hono";
import { auth } from "@/server/auth";
import { dotenv } from "@/server/env";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { TwoFactorBackupPage } from "@/views/auth/2fa-backup";
import { parse } from "cookie";
import { routes } from "@/routes/routes";
import { AppError } from "@/lib/auth-error";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";

const tel = new Telemetry(routes.auth.twoFactorBackup);

export const actions = {
    verify_backup_code: { name: "verify_backup_code", handler: VerifyBackupCode },
};

export const get: Handler = async (c) => {
    const result = await tel.task("GET", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw));

        const cookies = c.req.raw.headers.get("cookie");
        if (!cookies) {
            return c.html(TwoFactorBackupPage({}));
        }

        const parsed = parse(cookies);
        const cookieKey = dotenv.COOKIE_PREFIX + ".two_factor";
        if (!parsed[cookieKey] && !parsed["__Secure." + cookieKey]) {
            return c.html(TwoFactorBackupPage({}));
        }

        return c.html(TwoFactorBackupPage({}));
    });
    if (result.ok) {
        return result.data;
    }
    return c.html(TwoFactorBackupPage({}));
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
        return c.html(TwoFactorBackupPage(result.data));
    }

    return c.html(
        TwoFactorBackupPage({
            result: { action, success: false, errors: result.error },
        }),
    );
};

async function VerifyBackupCode(request: Request, form: FormData): Promise<Headers> {
    const code = form.get("code")?.toString();
    if (!code) {
        throw new AppError("INVALID_OTP_CODE");
    }
    const { headers } = await auth.api.verifyBackupCode({
        headers: request.headers,
        body: { code, trustDevice: true },
        returnHeaders: true,
    });
    tel.debug("BACKUP_CODE_VERIFIED");
    return headers;
}
