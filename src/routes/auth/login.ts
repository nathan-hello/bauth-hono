import type { Handler } from "hono";
import { auth } from "@/server/auth";
import { AppError } from "@/lib/auth-error";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { redirectIfSession, redirectWithHeaders, serverError } from "@/routes/auth/redirect";
import { LoginPage } from "@/views/auth/login";
import { redirects, routes } from "@/routes/routes";
import { Context } from "hono";

const tel = new Telemetry(routes.auth.login);

export const get: Handler = async (c) => {
    const result = await tel.task("GET", async (span) => {
        tel.debug("REQUEST", safeRequestAttrs(c.req.raw));
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

    const result = await tel.task("SIGN_IN", async (span) => {
        if (!action) {
            throw new AppError("internal_field_missing_action");
        }
        span.setAttribute("action", action);

        if (action === "login") {
            return await LogIn(c, form);
        }
        if (action === "oauth") {
            return await LogInOauth(c, form);
        }
    });

    const email = form.get("email")?.toString();
    if (result.ok) return result.data;
    console.log(JSON.stringify(result.error));
    return c.html(LoginPage({ errors: result.error, email }));
};

async function LogIn(c: Context, form: FormData) {
    const email = form.get("email")?.toString(); const password = form.get("password")?.toString();
    if (!email || !password) {
        return c.html(
            LoginPage({
                errors: [new AppError("INVALID_EMAIL_OR_PASSWORD")],
                email: email || "",
            }),
        );
    }

    const isEmail = email.includes("@");

    tel.debug("ATTEMPT", { method: isEmail ? "email" : "username" });

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
        return redirectWithHeaders(headers, "/auth/2fa");
    }

    tel.info("SIGN_IN_SUCCESS");
    return redirectWithHeaders(headers, "/");
}

async function LogInOauth(c: Context, form: FormData) {
    const provider = form.get("provider")?.toString();
    if (!provider) {
        throw new AppError("internal_field_missing_oauth");
    }

    const data = await auth.api.signInSocial({
        headers: c.req.raw.headers,
        body: { provider, callbackURL: redirects.AfterOauth(c), requestSignUp: false },
    });

    if (!data.url) {
        throw new AppError("oauth_no_url_given_by_provider");
    }

    return c.redirect(data.url);
}
