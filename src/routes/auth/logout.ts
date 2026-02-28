import type { Context, Handler } from "hono";
import { auth } from "../../server/auth";
import { getAuthError } from "../../lib/auth-error";
import { APIError } from "better-auth";
import { Telemetry, safeRequestAttrs } from "../../server/telemetry";
import { redirectWithHeaders } from "./redirect";
import { LogoutPage } from "../../views/logout";
import { routes } from "@/routes/routes";

const tel = new Telemetry(routes.auth.logout);

function handleSignOutError(c: Context, error: unknown) {
  if (error instanceof APIError && error.body?.code === "FAILED_TO_GET_SESSION") {
    return Response.redirect("/", 302);
  }
  return c.html(LogoutPage({ errors: getAuthError(error) }));
}

export const get: Handler = async (c) => {
  const result = await tel.task("GET", async () => {
    tel.debug("REQUEST", safeRequestAttrs(c.req.raw));

    const { headers, response } = await auth.api.signOut({
      headers: c.req.raw.headers,
      returnHeaders: true,
    });

    if (response.success === false) {
      throw new Error("signOut returned success=false");
    }

    tel.info("SIGN_OUT_SUCCESS");
    return redirectWithHeaders(headers, "/");
  });

  if (result.ok) return result.data;
  return handleSignOutError(c, result.error);
};

export const post: Handler = async (c) => {
  const result = await tel.task("POST", async () => {
    const { headers, response } = await auth.api.signOut({
      headers: c.req.raw.headers,
      returnHeaders: true,
    });

    if (response.success === false) {
      throw new Error("signOut returned success=false");
    }

    tel.info("SIGN_OUT_SUCCESS");
    return redirectWithHeaders(headers, "/");
  });

  if (result.ok) return result.data;
  return handleSignOutError(c, result.error);
};
