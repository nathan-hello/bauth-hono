import type { Handler } from "hono";
import { deserializeActionData, serializeActionData, type SerializedActionData } from "@/lib/flash";
import { auth } from "@/server/auth";
import { AppError } from "@/lib/auth-error";
import type { RouteActionData } from "@/lib/types";
import { APIError } from "better-auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { ForgotPage, type ForgotStep } from "@/views/auth/forgot";
import { routes } from "@/routes/routes";
import type { Context } from "hono";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";

const tel = new Telemetry(routes.auth.forgot);

export const actions = {
    forgot: { name: "forgot", handler: Forgot },
};

export type ForgotLoaderData = {};

export type ForgotActionState = {
    step: ForgotStep;
    email?: string;
    code?: string;
};

export type ForgotActionData = RouteActionData<typeof actions, ForgotActionState>;

type ActionReturnData = {
    step: ForgotStep;
    email?: string;
    code?: string;
};

export const get: Handler = async (c) => {
    const result = await tel.task("GET", async () => {
        tel.debug("REQUEST", safeRequestAttrs(c.req.raw));
        const existing = await auth.api.getSession({ headers: c.req.raw.headers });
        if (!existing) {
            return new Redirect(c.req.raw).Because.NoSession();
        }
        const flash = Redirect.ConsumeFlash<SerializedActionData<typeof actions, ForgotActionState>>(
            c.req.raw.headers.get("cookie"),
        );

        return c.html(
            ForgotPage({
                loaderData: {},
                actionData: deserializeActionData<typeof actions, ForgotActionState>(flash.actionData),
            }),
            { headers: flash.headers },
        );
    });
    if (result.ok) {
        return result.data;
    }
    return new Redirect(c.req.raw).Because.Error(result);
};

export const post: Handler = async (c) => {
    const form = await c.req.formData();
    const action = form.get("action")?.toString();
    const step = form.get("step")?.toString() as ForgotStep | undefined;
    const email = form.get("email")?.toString();

    if (!step || !["start", "code", "update", "try-again"].includes(step)) {
        return new Redirect(c.req.raw).Flash(
            serializeActionData<typeof actions, ForgotActionState>({
                result: {
                    action: "forgot",
                    success: false,
                    errors: [new AppError("generic_error")],
                },
                state: { step: "start" },
            }),
        );
    }

    const result = await tel.task("POST", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw, form));
        const handler = findAction(actions, action);
        return await handler(c, form);
    });

    if (result.ok) {
        if (result.data instanceof Response) {
            return result.data;
        }
        return new Redirect(c.req.raw).Flash(
            serializeActionData<typeof actions, ForgotActionState>({
                result: { action: action || actions.forgot.name, success: true },
                state: { step: result.data.step, email: result.data.email, code: result.data.code },
            }),
        );
    }

    // TOO_MANY_ATTEMPTS is a special case because we want to advance
    // the 'step' to 'try-again'
    if (result.error instanceof APIError && result.error.body?.code === "TOO_MANY_ATTEMPTS") {
        return new Redirect(c.req.raw).Flash(
            serializeActionData<typeof actions, ForgotActionState>({
                result: {
                    action: "forgot",
                    success: false,
                    errors: [new AppError("TOO_MANY_ATTEMPTS")],
                },
                state: { step: "try-again" },
            }),
        );
    }

    return new Redirect(c.req.raw).Flash(
        serializeActionData<typeof actions, ForgotActionState>({
            result: { action: "forgot", success: false, errors: result.error },
            state: { step, email },
        }),
    );
};

async function Forgot(c: Context, form: FormData): Promise<ActionReturnData | Response> {
    const step = form.get("step")?.toString() as ForgotStep;
    const email = form.get("email")?.toString();
    const code = form.get("code")?.toString();
    const resend = form.get("resend")?.toString();
    const password = form.get("password")?.toString();
    const repeat = form.get("repeat")?.toString();

    if (step === "start" || resend === "true") {
        if (!email) return { step: "start" };
        await auth.api.forgetPasswordEmailOTP({
            body: { email },
            headers: c.req.raw.headers,
        });
        tel.info("OTP_SENT", { email });
        return { step: "code", email };
    }

    if (step === "try-again") {
        return Response.redirect("/auth/login", 302);
    }

    if (step === "code") {
        if (!email) throw new AppError("otp_failed");
        if (!code) throw new AppError("code_invalid");

        const ok = await auth.api.checkVerificationOTP({
            body: { email, otp: code, type: "forget-password" },
            headers: c.req.raw.headers,
        });
        if (!ok) throw new AppError("otp_failed");

        tel.info("OTP_VERIFIED", { email });
        return { step: "update", email, code };
    }

    if (step === "update") {
        if (!password || !repeat || password !== repeat) throw new AppError("password_mismatch");
        if (!email) throw new AppError("field_missing_email");
        if (!code) throw new AppError("field_missing_code");

        const { headers, response } = await auth.api.resetPasswordEmailOTP({
            headers: c.req.raw.headers,
            body: { email, password, otp: code },
            returnHeaders: true,
        });
        if (!response.success) {
            throw new AppError("generic_error");
        }

        tel.info("PASSWORD_RESET", { email });

        return new Redirect(c.req.raw, headers).After.PasswordReset();
    }

    return { step: "start" };
}
