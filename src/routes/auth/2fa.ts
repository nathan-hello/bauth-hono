import { Hono, type Context } from "hono";
import { Flash } from "@/lib/flash";
import { AppEnv, BaseProps } from "@/lib/types";
import { auth } from "@/server/auth";
import { dotenv } from "@/server/env";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { TwoFactorPage } from "@/views/auth/2fa";
import { parse } from "cookie";
import { routes } from "@/routes/routes";
import { AppError } from "@/lib/auth-error";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { createCopy } from "@/lib/copy";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.twoFactor);
const flash = new Flash<typeof actions, State>({ verificationType: "totp" });

export type State = { verificationType: "totp" | "email" };
export type TwoFactorProps = BaseProps<typeof actions, State>;

export const actions = {
    switch: { name: "switch", handler: Switch },
    resend_email: { name: "resend_email", handler: ResendEmail },
    verify_totp: { name: "verify_totp", handler: VerifyTotp },
    verify_email: { name: "verify_email", handler: VerifyEmail },
};

app.get("/", async (c) => {
    const copy = createCopy(c.req.raw);

    const result = await tel.task("GET", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw));

        const cookies = c.req.raw.headers.get("cookie");
        if (!cookies) {
            return new Redirect(c.req.raw).Because.NoTwoFactorCookie();
        }

        const parsed = parse(cookies);
        const cookieKey = dotenv.COOKIE_PREFIX + ".two_factor";
        if (!parsed[cookieKey] && !parsed["__Secure." + cookieKey]) {
            return new Redirect(c.req.raw).Because.NoTwoFactorCookie();
        }

        const { state, result, headers } = flash.Consume(c.req.raw.headers);

        return c.html(
            TwoFactorPage({
                result,
                state,
                copy,
            }),
            { headers },
        );
    });
    if (result.ok) {
        return result.data;
    }
    return new Redirect(c.req.raw).Because.Error(copy, result);
});

app.post("/", async (c) => {
    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    const result = await tel.task(
        "POST",
        async (span) => {
            span.setAttributes(safeRequestAttrs(c.req.raw, form));
            const handler = findAction(actions, action);
            return await handler(c, form);
        },
        { action },
    );

    const verificationType: State["verificationType"] =
        action === "verify_email" || action === "resend_email" ? "email" : "totp";

    return flash.Respond(c.req.raw, result, { state: { verificationType } });
});

async function Switch(c: Context<AppEnv>, form: FormData): Promise<{ state: Partial<State> }> {
    const to = form.get("to")?.toString();
    if (to === "email") {
        await auth.api.sendTwoFactorOTP({
            body: { trustDevice: true },
            headers: c.req.raw.headers,
        });
        tel.info("2FA_EMAIL_OTP_SENT");
    }
    const verificationType = to === "email" ? "email" : "totp";
    return { state: { verificationType } };
}

async function ResendEmail(c: Context<AppEnv>, _form: FormData): Promise<{ state: Partial<State> }> {
    const { status } = await auth.api.sendTwoFactorOTP({
        body: { trustDevice: true },
        headers: c.req.raw.headers,
    });
    if (!status) {
        throw new AppError("generic_error");
    }
    tel.info("2FA_EMAIL_OTP_RESENT");
    return { state: { verificationType: "email" } };
}

async function VerifyTotp(c: Context<AppEnv>, form: FormData): Promise<{ headers: Headers }> {
    const code = form.get("code")?.toString();
    if (!code) {
        throw new AppError("INVALID_OTP");
    }
    const { headers } = await auth.api.verifyTOTP({
        headers: c.req.raw.headers,
        body: { code, trustDevice: true },
        returnHeaders: true,
    });
    return { headers };
}

async function VerifyEmail(c: Context<AppEnv>, form: FormData): Promise<{ headers: Headers }> {
    const code = form.get("code")?.toString();
    if (!code) {
        throw new AppError("INVALID_OTP");
    }
    const { headers } = await auth.api.verifyTwoFactorOTP({
        headers: c.req.raw.headers,
        body: { code, trustDevice: true },
        returnHeaders: true,
    });
    tel.info("EMAIL_OTP_VERIFIED");
    return { headers };
}

export default app;
