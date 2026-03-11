import type { Handler } from "hono";
import { Flash } from "@/lib/flash";
import type { RouteActionData } from "@/lib/types";
import { auth } from "@/server/auth";
import { AppError } from "@/lib/auth-error";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { LoginPage } from "@/views/auth/login";
import { routes } from "@/routes/routes";
import { Context } from "hono";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { parse } from "cookie";
import { dotenv } from "@/server/env";
import { createCopy } from "@/lib/copy";

const tel = new Telemetry(routes.auth.login);

const flash = new Flash<typeof actions, LoginActionState>();

export const actions = {
    login: { name: "login", handler: LogIn },
    oauth: { name: "oauth", handler: LogInOauth },
};

export type LoginLoaderData = {};

export type LoginActionState = {
    email?: string;
};

export type LoginActionData = RouteActionData<typeof actions, LoginActionState>;

export const get: Handler = async (c) => {
    const copy = createCopy(c.req.raw);

    const result = await tel.task("GET", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw));
        const existing = await auth.api.getSession({ headers: c.req.raw.headers });
        if (existing) {
            return new Redirect(c.req.raw).Because.HasSession();
        }
        const cookies = c.req.raw.headers.get("cookie");
        if (cookies) {
            const parsed = parse(cookies);
            const cookieKey = dotenv.COOKIE_PREFIX + ".two_factor";
            if (parsed[cookieKey] || parsed["__Secure." + cookieKey]) {
                return new Redirect(c.req.raw).Because.TwoFactorRequired();
            }
        }

        const { actionData, headers } = flash.Consume(c.req.raw.headers);

        return c.html(
            LoginPage({
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
    return new Redirect(c.req.raw).Because.Error(copy, result);
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

    return flash.Respond(c.req.raw, undefined, {
        result: { action, success: false, errors: result.error },
        state: { email },
    });
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
        return new Redirect(c.req.raw, headers).Because.TwoFactorRequired();
    }

    return new Redirect(c.req.raw, headers).After.Login();
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
    return new Redirect(c.req.raw, data.headers).Because.Oauth(data.response.url);
}
