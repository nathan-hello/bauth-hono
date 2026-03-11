import type { Context, Handler } from "hono";
import { Flash } from "@/lib/flash";
import type { RouteActionData } from "@/lib/types";
import { auth, validateUsername } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { RegisterPage } from "@/views/auth/register";
import { routes } from "@/routes/routes";
import { AppError } from "@/lib/auth-error";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { createCopy } from "@/lib/copy";

const tel = new Telemetry(routes.auth.register);

const flash = new Flash<typeof actions, RegisterActionState>();

export const actions = {
    register: { name: "register", handler: Register },
    oauth: { name: "oauth", handler: RegisterOauth },
};

export type RegisterLoaderData = {};

export type RegisterActionState = {
    email?: string;
};

export type RegisterActionData = RouteActionData<typeof actions, RegisterActionState>;

export const get: Handler = async (c) => {
    const copy = createCopy(c.req.raw);

    const result = await tel.task("GET", async () => {
        tel.debug("REQUEST", safeRequestAttrs(c.req.raw));
        const existing = await auth.api.getSession({ headers: c.req.raw.headers });
        if (existing) {
            return new Redirect(c.req.raw).Because.HasSession();
        }
        const { state: actionData, headers } = flash.Consume(c.req.raw.headers);

        return c.html(
            RegisterPage({
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

    const result = await tel.task("POST", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw, form));
        const handler = findAction(actions, action);
        return await handler(c, form);
    });

    if (result.ok) return result.data;

    const email = form.get("email")?.toString();
    return flash.Respond(c.req.raw, undefined, {
        result: { action, success: false, errors: result.error },
        state: { email },
    });
};

async function Register(c: Context, form: FormData) {
    const username = form.get("username")?.toString();
    const email = form.get("email")?.toString();
    const password = form.get("password")?.toString();
    const repeat = form.get("repeat")?.toString();

    if (!email) {
        throw new AppError("INVALID_EMAIL");
    }

    const errs = parseRegister({ username, email, password, repeat });
    if (errs) {
        throw errs;
    }

    if (!username || !password || !repeat) {
        throw new AppError("INVALID_EMAIL_OR_PASSWORD");
    }

    tel.debug("attrs", safeRequestAttrs(c.req.raw, form));

    const { headers, response } = await auth.api.signUpEmail({
        body: {
            username,
            password,
            email,
            name: username,
            displayUsername: username,
        },
        headers: c.req.raw.headers,
        returnHeaders: true,
    });

    if (response?.user) {
        tel.info("new_user", { userId: response.user.id });
    }

    return new Redirect(c.req.raw, headers).After.Register();
}

async function RegisterOauth(c: Context, form: FormData) {
    const provider = form.get("provider")?.toString();
    if (!provider) {
        throw new AppError("internal_field_missing_oauth");
    }

    const data = await auth.api.signInSocial({
        headers: c.req.raw.headers,
        body: { provider, requestSignUp: true },
        returnHeaders: true,
    });

    if (!data.response.url) {
        throw new AppError("oauth_no_url_given_by_provider");
    }

    return new Redirect(c.req.raw, data.headers).Because.Oauth(data.response.url);
}

function parseRegister(data: Record<string, string | undefined>): AppError[] | undefined {
    const errors: AppError[] = [];
    if (!data.email) {
        errors.push(new AppError("INVALID_EMAIL"));
    }
    if (!data.password) {
        errors.push(new AppError("INVALID_PASSWORD"));
    }
    if (!data.username || !validateUsername(data.username)) {
        errors.push(new AppError("INVALID_USERNAME"));
    }
    if (!data.repeat || data.password !== data.repeat) {
        errors.push(new AppError("password_mismatch"));
    }
    return errors.length > 0 ? errors : undefined;
}
