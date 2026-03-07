import type { Handler } from "hono";
import { auth } from "@/server/auth";
import { AppError } from "@/lib/auth-error";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { redirectIfSession, redirectWithSetCookies, serverError } from "@/routes/auth/redirect";
import { LoginPage } from "@/views/auth/login";
import { routes } from "@/routes/routes";
import { Context } from "hono";
import { findAction } from "@/routes/auth/lib/check-action";

const tel = new Telemetry(routes.auth.login);

export const actions = {
    login: { name: "login", handler: LogIn },
    oauth: { name: "oauth", handler: LogInOauth },
};

export const get: Handler = async (c) => {
    const result = await tel.task("GET", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw));
        const existing = await redirectIfSession(c.req.raw);
        if (existing) {
            span.setAttribute("user.id", existing.userId);
            return existing.response;
        }

        return c.html(LoginPage({}));
    });
    if (result.ok) return result.data;
    return serverError(result.traceId);
};

export const post: Handler = async (c) => {
    const form = await c.req.formData();
    const action = form.get("action")?.toString();
    const email = form.get("email")?.toString();

    const result = await tel.task("POST", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw, form));
        const handler = findAction(actions, action);
        return await handler(c, form);
    });

    if (result.ok) return result.data;

    return c.html(LoginPage({ result: { action, success: false, errors: result.error }, email }));
};

async function LogIn(c: Context, form: FormData) {
    const email = form.get("email")?.toString();
    const password = form.get("password")?.toString();
    if (!email || !password) {
        throw new AppError("INVALID_EMAIL_OR_PASSWORD");
    }

    const isEmail = email.includes("@");

    tel.debug("email_or_username_detected", { method: isEmail ? "email" : "username" });

    const { headers, response } = await (isEmail
        ? auth.api.signInEmail({
              headers: c.req.raw.headers,
              body: { email, password },
              returnHeaders: true,
          })
        : auth.api.signInUsername({
              headers: c.req.raw.headers,
              body: { username: email, password },
              returnHeaders: true,
          }));

    if (!response) {
        throw new AppError("generic_error");
    }

    if ("twoFactorRedirect" in response) {
        tel.info("2FA_REDIRECT");
        return redirectWithSetCookies(headers, "/auth/2fa");
    }

    tel.info("SIGN_IN_SUCCESS");
    return redirectWithSetCookies(headers, "/");
}

async function LogInOauth(c: Context, form: FormData) {
    const provider = form.get("provider")?.toString();
    if (!provider) {
        throw new AppError("internal_field_missing_oauth");
    }

    const data = await auth.api.signInSocial({
        headers: c.req.raw.headers,
        body: { provider },
        returnHeaders: true,
    });

    if (!data.response.url) {
        throw new AppError("oauth_no_url_given_by_provider");
    }

    // In the handler for auth.api.signInSocial (and linkSocialAcount), the
    // only way that we don't get a redirect url is if we pass an idToken in
    // the body.
    return redirectWithSetCookies(data.headers, data.response.url);
}
