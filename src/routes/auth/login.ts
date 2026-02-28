import type { Handler } from "hono";
import { auth } from "../../server/auth";
import { AppError, getAuthError } from "../../lib/auth-error";
import { Telemetry, safeRequestAttrs } from "../../server/telemetry";
import { redirectIfSession, redirectWithHeaders, serverError } from "./redirect";
import { LoginPage } from "../../views/login";
import { routes } from "@/routes/routes";

const tel = new Telemetry(routes.auth.login);

export const get: Handler = async (c) => {
  const result = await tel.task("GET", async (span) => {
    tel.debug("REQUEST", safeRequestAttrs(c.req.raw));
    const existing = await redirectIfSession(c.req.raw);
    if (existing) return existing;
    return c.html(LoginPage({}));
  });
  if (result.ok) return result.data;
  return serverError(result.traceId);
};

export const post: Handler = async (c) => {
  const form = await c.req.formData();
  const email = form.get("email")?.toString();
  const password = form.get("password")?.toString();

  if (!email || !password) {
    return c.html(LoginPage({ errors: [{ type: "INVALID_EMAIL_OR_PASSWORD" }], email: email || "" }));
  }

  const isEmail = email.includes("@");

  const result = await tel.task("SIGN_IN", async (span) => {
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
      return redirectWithHeaders(headers, "/auth/2fa");
    }

    if ("user" in response && response.user) {
      span.setAttribute("user.id", (response.user as any).id);
    }

    tel.info("SIGN_IN_SUCCESS");
    return redirectWithHeaders(headers, "/");
  });

  if (result.ok) return result.data;
  return c.html(LoginPage({ errors: getAuthError(result.error), email }));
};
