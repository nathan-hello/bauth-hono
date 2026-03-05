import type { Context, Handler } from "hono";
import { auth } from "@/server/auth";
import { dotenv } from "@/server/env";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { redirectIfSession, redirectWithSetCookies, serverError } from "@/routes/auth/redirect";
import { ActionReturnData, TwoFactorPage } from "@/views/auth/2fa";
import { parse } from "cookie";
import { redirects, routes } from "@/routes/routes";
import { AppError } from "@/lib/auth-error";

const tel = new Telemetry(routes.auth.twoFactor);

export const get: Handler = async (c) => {
    const result = await tel.task("GET", async () => {
        tel.debug("REQUEST", safeRequestAttrs(c.req.raw));
        const existing = await redirectIfSession(c.req.raw);
        if (existing) return existing;

        const cookies = c.req.raw.headers.get("cookie");
        if (!cookies) {
            tel.debug("REDIRECT_NO_COOKIES");
            return Response.redirect("/auth/login", 302);
        }
        const parsed = parse(cookies);
        const cookieKey = dotenv.COOKIE_PREFIX + ".two_factor";
        if (!parsed[cookieKey]) {
            tel.debug("REDIRECT_NO_2FA_COOKIE", { cookie: cookieKey });
            return Response.redirect("/auth/login", 302);
        }

        return c.html(TwoFactorPage({}));
    });
    if (result.ok) return result.data;
    return serverError(result.traceId);
};

function checkAction(a: string): a is keyof typeof actions {
    return a in actions;
}

const actions = {
    switch: Switch,
    resend_email: ResendEmail,
    verify_totp: VerifyTotp,
    verify_email: VerifyEmail,
};

export const actionName: { [K in keyof typeof actions]: K } = {
    switch: "switch",
    resend_email: "resend_email",
    verify_totp: "verify_totp",
    verify_email: "verify_email",
};

export const post: Handler = async (c) => {
    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    if (!action || !checkAction(action)) {
        tel.warn("ACTION_NOT_FOUND", { action });
        return c.html(TwoFactorPage({}));
    }

    const result = await tel.task(action.toUpperCase(), async () => {
        tel.debug("FORM_SUBMITTED", safeRequestAttrs(c.req.raw, form));
        return await actions[action](c, form);
    });

    if (result.ok) {
        if (result.data instanceof Headers) {
            return redirectWithSetCookies(result.data, redirects.AfterLogin(c));
        }
        return c.html(TwoFactorPage(result.data));
    }

    const verificationType =
        action === "verify_email" || action === "resend_email" ? ("email" as const) : ("totp" as const);

    return c.html(
        TwoFactorPage({
            verificationType,
            result: {
                action,
                success: false,
                errors: result.error,
            },
        }),
    );
};

async function Switch(c: Context, form: FormData): Promise<ActionReturnData> {
    const to = form.get("to")?.toString();
    if (to === "email") {
        await auth.api.sendTwoFactorOTP({
            body: { trustDevice: true },
            headers: c.req.raw.headers,
        });
        tel.info("2FA_EMAIL_OTP_SENT");
    }
    const verificationType = to === "email" ? "email" : "totp";
    return {
        result: {
            action: "switch",
            success: true,
        },
        verificationType,
    };
}

async function ResendEmail(c: Context, _form: FormData): Promise<ActionReturnData> {
    const { status } = await auth.api.sendTwoFactorOTP({
        body: { trustDevice: true },
        headers: c.req.raw.headers,
    });
    if (!status) {
        throw new AppError("generic_error");
    }
    tel.info("2FA_EMAIL_OTP_RESENT");
    return {
        result: {
            action: "resend_email",
            success: true,
        },
        verificationType: "email",
    };
}

async function VerifyTotp(c: Context, form: FormData): Promise<Headers> {
    const code = form.get("code")?.toString();
    if (!code) {
        throw new AppError("INVALID_OTP_CODE");
    }
    const { headers } = await auth.api.verifyTOTP({
        headers: c.req.raw.headers,
        body: { code, trustDevice: true },
        returnHeaders: true,
    });
    return headers;
}

async function VerifyEmail(c: Context, form: FormData): Promise<Headers> {
    const code = form.get("code")?.toString();
    if (!code) {
        throw new AppError("INVALID_OTP_CODE");
    }
    const { headers } = await auth.api.verifyTwoFactorOTP({
        headers: c.req.raw.headers,
        body: { code, trustDevice: true },
        returnHeaders: true,
    });
    tel.info("EMAIL_OTP_VERIFIED");
    return headers;
}
