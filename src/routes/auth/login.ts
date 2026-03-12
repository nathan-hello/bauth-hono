import { Flash } from "@/lib/flash";
import { AppEnv, BaseProps } from "@/lib/types";
import { auth } from "@/server/auth";
import { AppError } from "@/lib/auth-error";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { LoginPage } from "@/views/auth/login";
import { routes } from "@/routes/routes";
import { Context, Hono } from "hono";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { parse } from "cookie";
import { dotenv } from "@/server/env";
import { createCopy } from "@/lib/copy";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.login);
const flash = new Flash<typeof actions, State>({ email: "" });

export const actions = {
    login: { name: "login", handler: LogIn },
    oauth: { name: "oauth", handler: LogInOauth },
};

export type State = {
    email?: string;
};

export type LoginProps = BaseProps<typeof actions, State>;

app.get("/", async (c) => {
    const copy = createCopy(c.req.raw);
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

    const { state, result, headers } = flash.Consume(c.req.raw.headers);

    return c.html(
        LoginPage({
            state,
            result,
            copy,
        }),
        { headers },
    );
});

app.post("/", async (c) => {
    const form = await c.req.formData();
    const action = form.get("action")?.toString();
    const email = form.get("email")?.toString();

    const result = await tel.task(
        "POST",
        async (span) => {
            span.setAttributes(safeRequestAttrs(c.req.raw, form));
            const handler = findAction(actions, action);
            return await handler(c.req.raw, form);
        },
        { action },
    );

    return flash.Respond(c.req.raw, result, { state: { email: email ?? "" } });
});

async function LogIn(request: Request, form: FormData): Promise<{ response: Response }> {
    const email = form.get("email")?.toString();
    const password = form.get("password")?.toString();
    if (!email || !password) {
        throw new AppError("INVALID_EMAIL_OR_PASSWORD");
    }

    const isEmail = email.includes("@");

    tel.debug("email_or_username_detected", { method: isEmail ? "email" : "username" });

    const { headers, response } = await (isEmail
        ? auth.api.signInEmail({
              headers: request.headers,
              body: { email, password },
              returnHeaders: true,
          })
        : auth.api.signInUsername({
              headers: request.headers,
              body: { username: email, password },
              returnHeaders: true,
          }));

    if (!response) {
        throw new AppError("generic_error");
    }

    if ("twoFactorRedirect" in response) {
        tel.info("2FA_REDIRECT");
        return { response: new Redirect(request, headers).Because.TwoFactorRequired() };
    }

    return { response: new Redirect(request, headers).After.Login() };
}

async function LogInOauth(request: Request, form: FormData): Promise<{ response: Response }> {
    const provider = form.get("provider")?.toString();
    if (!provider) {
        throw new AppError("internal_field_missing_oauth");
    }

    const data = await auth.api.signInSocial({
        headers: request.headers,
        body: { provider },
        returnHeaders: true,
    });

    if (!data.response.url) {
        throw new AppError("oauth_no_url_given_by_provider");
    }

    // In the handler for auth.api.signInSocial (and linkSocialAcount), the
    // only way that we don't get a redirect url is if we pass an idToken in
    // the body.
    return { response: new Redirect(request, data.headers).Because.Oauth(data.response.url) };
}

export default app;
