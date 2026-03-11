import { Hono } from "hono";
import { Flash } from "@/lib/flash";
import { auth } from "@/server/auth";
import { dotenv } from "@/server/env";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { TwoFactorBackupPage } from "@/views/auth/backup-code";
import { parse } from "cookie";
import { AppEnv, BaseProps } from "@/lib/types";
import { routes } from "@/routes/routes";
import { AppError } from "@/lib/auth-error";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { createCopy } from "@/lib/copy";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.twoFactorBackup);
const flash = new Flash<typeof actions>(undefined);

export const actions = { verify_backup_code: { name: "verify_backup_code", handler: VerifyBackupCode } };
type State = undefined;
export type BackupCodeProps = BaseProps<typeof actions, State>;

app.get("/", async (c) => {
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

        const { result, headers } = flash.Consume(c.req.raw.headers);

        return c.html(
            TwoFactorBackupPage({
                state: undefined,
                result,
                copy,
            }),
            { headers },
        );
    });
    if (result.ok) {
        return result.data;
    }
    return await new Redirect(c.req.raw).Because.TwoFactorCookieNotFound();
});

app.post("/", async (c) => {
    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    const result = await tel.task(
        "POST",
        async (span) => {
            span.setAttributes(safeRequestAttrs(c.req.raw, form));
            const handler = findAction(actions, action);
            return await handler(c.req.raw, form);
        },
        { action },
    );

    return flash.Respond(c.req.raw, result);
});

async function VerifyBackupCode(request: Request, form: FormData): Promise<{ response: Response }> {
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

    return { response: new Redirect(request, headers).After.Login() };
}

export default app;
