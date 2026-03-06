import type { Handler } from "hono";
import { auth } from "@/server/auth";
import { AppError } from "@/lib/auth-error";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { redirectIfSession, redirectWithSetCookies, serverError } from "@/routes/auth/redirect";
import { LoginPage } from "@/views/auth/login";
import { redirects, routes } from "@/routes/routes";
import { Context } from "hono";
import type { ActionResult } from "@/lib/types";

const tel = new Telemetry(routes.auth.login);

export const actions = {
    login: { name: "login", handler: LogIn },
    oauth: { name: "oauth", handler: LogInOauth },
} as const;

export const actionName = {
    login: actions.login.name,
    oauth: actions.oauth.name,
} as const;

function checkAction(a: string): a is keyof typeof actions {
    return a in actions;
}

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

    if (!action || !checkAction(action)) {
        return c.html(
            LoginPage({
                result: {
                    action: "top-of-page",
                    success: false,
                    errors: [new AppError("internal_field_missing_action")],
                },
            }),
        );
    }

    const result = await tel.task("SIGN_IN", async (span) => {
        span.setAttribute("action", action);
        return await actions[action].handler(c, form);
    });

    if (result.ok) return result.data;

    const email = form.get("email")?.toString();
    const r: ActionResult<typeof actions> = { action, success: false, errors: result.error };
    return c.html(LoginPage({ result: r, email }));
};

async function LogIn(c: Context, form: FormData) {
    const email = form.get("email")?.toString();
    const password = form.get("password")?.toString();
    if (!email || !password) {
        throw new AppError("INVALID_EMAIL_OR_PASSWORD");
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

    return redirectWithSetCookies(data.headers, data.response.url);
}
