import type { Handler } from "hono";
import { auth, validateUsername } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { redirectIfSession, redirectWithHeaders, serverError } from "@/routes/auth/redirect";
import { RegisterPage } from "@/views/auth/register";
import { routes } from "@/routes/routes";
import { AppError } from "@/lib/auth-error";

const tel = new Telemetry(routes.auth.register);

export const get: Handler = async (c) => {
    const result = await tel.task("GET", async () => {
        tel.debug("REQUEST", safeRequestAttrs(c.req.raw));
        const existing = await redirectIfSession(c.req.raw);
        if (existing) return existing;
        return c.html(RegisterPage({}));
    });
    if (result.ok) return result.data;
    return serverError(result.traceId);
};

export const post: Handler = async (c) => {
    const form = await c.req.formData();
    const username = form.get("username")?.toString();
    const email = form.get("email")?.toString();
    const password = form.get("password")?.toString();
    const repeat = form.get("repeat")?.toString();

    if (!email) {
        return c.html(RegisterPage({}));
    }

    const result = await tel.task("POST", async (span) => {
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
            span.setAttribute("user.id", response.user.id);
        }

        return redirectWithHeaders(headers, "/auth/dashboard");
    });

    if (result.ok) return result.data;
    return c.html(RegisterPage({ errors: result.error, email }));
};

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
