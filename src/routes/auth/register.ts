import { Hono, type Context } from "hono";
import { Flash } from "@/lib/flash";
import { AppEnv, BaseProps } from "@/lib/types";
import { auth, validateUsername } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { RegisterPage } from "@/views/auth/register";
import { routes } from "@/routes/routes";
import { AppError } from "@/lib/auth-error";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { createCopy } from "@/lib/copy";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.register);
const flash = new Flash<typeof actions, State>({ email: "" });

export const actions = {
    register: { name: "register", handler: Register },
    oauth: { name: "oauth", handler: RegisterOauth },
};

type State = {
    email?: string;
};

export type RegisterProps = BaseProps<typeof actions, State>;

app.get("/", async (c) => {
    const copy = createCopy(c.req.raw);

    const existing = await auth.api.getSession({ headers: c.req.raw.headers });
    if (existing) {
        return new Redirect(c.req.raw).Because.HasSession();
    }
    const { state, result, headers } = flash.Consume(c.req.raw.headers);

    return c.html(
        RegisterPage({
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
    const result = await tel.task(
        "POST",
        async () => {
            const handler = findAction(actions, action);
            return await handler(c, form);
        },
        { action },
    );
    return flash.Respond(c.req.raw, result, { state: { email: form.get("email")?.toString() } });
});

async function Register(c: Context, form: FormData): Promise<{ response: Response }> {
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

    return { response: new Redirect(c.req.raw, headers).After.Register() };
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

export default app;
