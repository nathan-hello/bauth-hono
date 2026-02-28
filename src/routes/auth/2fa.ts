import type { Handler } from "hono";
import { auth } from "@/server/auth";
import { dotenv } from "@/server/env";
import { getAuthError } from "@/lib/auth-error";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { redirectIfSession, redirectWithHeaders, serverError } from "./redirect";
import { TwoFactorPage } from "@/views/2fa";
import { parse } from "cookie";
import { routes } from "@/routes/routes";

const tel = new Telemetry(routes.auth.twoFactor);

export const get: Handler = async (c) => {
  const result = await tel.task("GET", async () => {
    tel.debug("REQUEST", safeRequestAttrs(c.req.raw));
    const existing = await redirectIfSession(c.req.raw);
    if (existing) return existing;

    const cookies = c.req.raw.headers.get("cookie");
    if (!cookies) {
      tel.debug("REDIRECT_NO_COOKIES");
      return Response.redirect("/auth/login", 302);
    }
    const parsed = parse(cookies);
    const cookieKey = dotenv.COOKIE_PREFIX + ".two_factor";
    if (!parsed[cookieKey]) {
      tel.debug("REDIRECT_NO_2FA_COOKIE", { cookie: cookieKey });
      return Response.redirect("/auth/login", 302);
    }

    return c.html(TwoFactorPage({}));
  });
  if (result.ok) return result.data;
  return serverError(result.traceId);
};

export const post: Handler = async (c) => {
  const form = await c.req.formData();
  const action = form.get("action")?.toString();

  const result = await tel.task(action?.toUpperCase() ?? "POST", async () => {
    tel.debug("FORM_SUBMITTED", safeRequestAttrs(c.req.raw, form));

    if (action === "switch-totp") {
      return c.html(TwoFactorPage({ state: { verificationType: "totp" } }));
    }

    if (action === "switch-email") {
      await auth.api.sendTwoFactorOTP({
        body: { trustDevice: true },
        headers: c.req.raw.headers,
      });
      tel.info("2FA_EMAIL_OTP_SENT");
      return c.html(TwoFactorPage({ state: { verificationType: "email" } }));
    }

    if (action === "resend-email") {
      const { status } = await auth.api.sendTwoFactorOTP({
        body: { trustDevice: true },
        headers: c.req.raw.headers,
      });
      tel.info("2FA_EMAIL_OTP_RESENT");
      return c.html(TwoFactorPage({ state: { verificationType: "email", resentEmail: status } }));
    }

    if (action === "verify-totp") {
      const code = form.get("code")?.toString();
      if (!code) return c.html(TwoFactorPage({ state: { verificationType: "totp" } }));
      const { headers } = await auth.api.verifyTOTP({
        headers: c.req.raw.headers,
        body: { code, trustDevice: true },
        returnHeaders: true,
      });
      tel.info("TOTP_VERIFIED");
      return redirectWithHeaders(headers, "/");
    }

    if (action === "verify-email") {
      const code = form.get("code")?.toString();
      if (!code) return c.html(TwoFactorPage({ state: { verificationType: "email" } }));
      const { headers } = await auth.api.verifyTwoFactorOTP({
        headers: c.req.raw.headers,
        body: { code, trustDevice: true },
        returnHeaders: true,
      });
      tel.info("EMAIL_OTP_VERIFIED");
      return redirectWithHeaders(headers, "/");
    }

    return c.html(TwoFactorPage({}));
  });

  if (result.ok) return result.data;

  const verificationType =
    action === "verify-email" || action === "switch-email" || action === "resend-email"
      ? ("email" as const)
      : ("totp" as const);
  return c.html(TwoFactorPage({ state: { verificationType, errors: getAuthError(result.error) } }));
};
