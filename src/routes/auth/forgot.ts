import { Hono } from "hono";
import { Flash } from "@/lib/flash";
import { auth } from "@/server/auth";
import { AppError } from "@/lib/auth-error";
import { AppEnv, BaseProps } from "@/lib/types";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { ForgotPage } from "@/views/auth/forgot";
import { routes } from "@/routes/routes";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { createCopy } from "@/lib/copy";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.forgot);
const flash = new Flash<typeof actions, State>({ step: "start" });

export const actions = {
    start_email: { name: "start_email", handler: StartEmail },
    email_code: { name: "email_code", handler: EmailCode },
    email_update: { name: "email_update", handler: EmailUpdate },
    email_resend: { name: "email_resend", handler: EmailResend },
};

export type State =
    | { step: "start" }
    | { step: "email-code"; email: string }
    | { step: "email-update"; email: string; code: string };

export type ForgotProps = BaseProps<typeof actions, State>;

app.get("/", async (c) => {
    const copy = createCopy(c.req.raw);
    const { state, result, headers } = flash.Consume(c.req.raw.headers);
    return c.html(ForgotPage({ result, state, copy }), { headers });
});

app.post("/", async (c) => {
    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    const result = await tel.task(
        "POST",
        async (span) => {
            span.setAttributes(safeRequestAttrs(c.req.raw, form));
            const handler = findAction(actions, action);
            return await handler(c.req.raw, form);
        },
        { action },
    );

    return flash.Respond(c.req.raw, result, { state: getStateForAction(action, form) });
});

async function StartEmail(request: Request, form: FormData): Promise<{ headers: Headers; state: State }> {
    const email = requireEmail(form, "identifier");
    const result = await auth.api.requestPasswordResetEmailOTP({
        body: { email },
        headers: request.headers,
        returnHeaders: true,
    });

    return { headers: result.headers, state: { step: "email-code", email } };
}

async function EmailCode(request: Request, form: FormData): Promise<{ headers: Headers; state: State }> {
    const email = requireValue(form, "email", "internal_field_missing_email");
    const code = requireValue(form, "code", "field_missing_code");

    const result = await auth.api.checkVerificationOTP({
        headers: request.headers,
        body: { email, type: "forget-password", otp: code },
        returnHeaders: true,
    });

    return { state: { step: "email-update", email, code }, headers: result.headers };
}

async function EmailUpdate(request: Request, form: FormData): Promise<{ response: Response }> {
    const email = requireValue(form, "email", "internal_field_missing_email");
    const code = requireValue(form, "code", "internal_field_missing_code");
    const password = requirePassword(form);

    const result = await auth.api.resetPasswordEmailOTP({
        body: { email, otp: code, password },
        headers: request.headers,
        returnHeaders: true,
    });

    return { response: new Redirect(request, result.headers).After.PasswordReset() };
}

async function EmailResend(request: Request, form: FormData): Promise<{ headers: Headers; state: State }> {
    const email = requireValue(form, "email", "internal_field_missing_email");

    const result = await auth.api.forgetPasswordEmailOTP({
        headers: request.headers,
        body: { email },
        returnHeaders: true,
    });

    return { headers: result.headers, state: { step: "email-code", email } };
}

function getStateForAction(action: string | undefined, form: FormData): State {
    switch (action) {
        case actions.email_code.name:
        case actions.email_resend.name: {
            const email = trimmedValue(form, "email");
            return email ? { step: "email-code", email } : { step: "start" };
        }
        case actions.email_update.name: {
            const email = trimmedValue(form, "email");
            const code = trimmedValue(form, "code");
            return email && code ? { step: "email-update", email, code } : { step: "start" };
        }
        default:
            return { step: "start" };
    }
}

function requireEmail(form: FormData, key: string): string {
    const value = requireValue(form, key, "field_missing_email");
    if (!value.includes("@")) {
        throw new AppError("INVALID_EMAIL");
    }
    return value;
}

function requirePassword(form: FormData): string {
    const password = requireValue(form, "password", "field_missing_password");
    const repeat = requireValue(form, "repeat", "field_missing_password_repeat");
    if (password !== repeat) {
        throw new AppError("password_mismatch");
    }
    return password;
}

function requireValue(form: FormData, key: string, error: ConstructorParameters<typeof AppError>[0]): string {
    const value = trimmedValue(form, key);
    if (!value) {
        throw new AppError(error);
    }
    return value;
}

function trimmedValue(form: FormData, key: string): string | undefined {
    const value = form.get(key)?.toString().trim();
    return value || undefined;
}

export default app;
