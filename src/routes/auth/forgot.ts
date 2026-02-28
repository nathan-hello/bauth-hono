import type { Handler } from "hono";
import { auth } from "@/server/auth";
import { AppError, getAuthError } from "@/lib/auth-error";
import { APIError } from "better-auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { redirectIfSession, redirectWithHeaders, serverError } from "./redirect";
import { ForgotPage, type ForgotStep } from "@/views/forgot";
import { routes } from "@/routes/routes";

const tel = new Telemetry(routes.auth.forgot);

export const get: Handler = async (c) => {
  const result = await tel.task("GET", async () => {
    tel.debug("REQUEST", safeRequestAttrs(c.req.raw));
    const existing = await redirectIfSession(c.req.raw);
    if (existing) return existing;
    return c.html(ForgotPage({ step: "start" }));
  });
  if (result.ok) return result.data;
  return serverError(result.traceId);
};

export const post: Handler = async (c) => {
  const form = await c.req.formData();
  const step = form.get("step")?.toString() as ForgotStep | undefined;
  const email = form.get("email")?.toString();
  const code = form.get("code")?.toString();
  const resend = form.get("resend")?.toString();
  const password = form.get("password")?.toString();
  const repeat = form.get("repeat")?.toString();

  if (!step || !["start", "code", "update", "try-again"].includes(step)) {
    return c.html(ForgotPage({ step: "start", errors: [{ type: "generic_error" }] }));
  }

  const result = await tel.task(step.toUpperCase(), async () => {
    tel.debug("FORM_SUBMITTED", { step, ...safeRequestAttrs(c.req.raw, form) });

    if (step === "start" || resend === "true") {
      if (!email) return c.html(ForgotPage({ step: "start" }));
      await auth.api.forgetPasswordEmailOTP({
        body: { email },
        headers: c.req.raw.headers,
      });
      tel.info("OTP_SENT", { email });
      return c.html(ForgotPage({ step: "code", email }));
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
      return c.html(ForgotPage({ step: "update", email, code }));
    }

    if (step === "update") {
      if (!password || !repeat || password !== repeat) throw new AppError("password_mismatch");
      if (!email || !code) throw new AppError("generic_error", "missing email or code");

      const { headers, response } = await auth.api.resetPasswordEmailOTP({
        headers: c.req.raw.headers,
        body: { email, password, otp: code },
        returnHeaders: true,
      });
      if (!response.success) {
        throw new AppError("generic_error", "resetPasswordEmailOTP returned success=false");
      }

      tel.info("PASSWORD_RESET", { email });
      return redirectWithHeaders(headers, "/");
    }

    return c.html(ForgotPage({ step: "start" }));
  });

  if (result.ok) return result.data;
  if (result.error instanceof APIError && result.error.body?.code === "TOO_MANY_ATTEMPTS") {
    return c.html(ForgotPage({ step: "try-again", errors: [{ type: "TOO_MANY_ATTEMPTS" }] }));
  }
  return c.html(ForgotPage({ step, errors: getAuthError(result.error), email }));
};
