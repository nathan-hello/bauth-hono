import type { Handler } from "hono";
import { auth, validateUsername } from "@/server/auth";
import { getAuthError, type AuthError } from "@/lib/auth-error";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import {
  redirectIfSession,
  redirectWithHeaders,
  serverError,
} from "./redirect";
import { RegisterPage } from "@/views/register";
import { routes } from "@/routes/routes";

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

  const errs = parseRegister({ username, email, password, repeat });
  if (errs) {
    return c.html(RegisterPage({ errors: errs, email }));
  }

  if (!username || !password || !repeat) {
    return c.html(
      RegisterPage({ errors: [{ type: "INVALID_EMAIL_OR_PASSWORD" }], email }),
    );
  }

  const result = await tel.task("SIGN_UP", async (span) => {
    tel.debug("ATTEMPT", safeRequestAttrs(c.req.raw, form));

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

    tel.info("SIGN_UP_SUCCESS");
    return redirectWithHeaders(headers, "/auth/dashboard");
  });

  if (result.ok) return result.data;
  return c.html(RegisterPage({ errors: getAuthError(result.error), email }));
};

function parseRegister(
  data: Record<string, string | undefined>,
): AuthError[] | undefined {
  const errors: AuthError[] = [];
  if (!data.email) errors.push({ type: "INVALID_EMAIL" });
  if (!data.password) errors.push({ type: "INVALID_PASSWORD" });
  if (!data.username || !validateUsername(data.username))
    errors.push({ type: "INVALID_USERNAME" });
  if (!data.repeat || data.password !== data.repeat)
    errors.push({ type: "password_mismatch" });
  return errors.length > 0 ? errors : undefined;
}
