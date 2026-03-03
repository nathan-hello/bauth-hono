import type { Handler } from "hono";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { redirectWithHeaders } from "@/routes/auth/redirect";
import { LogoutPage } from "@/views/auth/logout";
import { routes } from "@/routes/routes";

const tel = new Telemetry(routes.auth.logout);

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

  if (result.ok) {
    return result.data;
  }
  if (result.error[0].code === "FAILED_TO_GET_SESSION") {
    return Response.redirect("/", 302);
  }
  return c.html(LogoutPage({ errors: result.error }));
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

  if (result.ok) {
    return result.data;
  }

  if (result.error[0].code === "FAILED_TO_GET_SESSION") {
    return Response.redirect("/", 302);
  }
  return c.html(LogoutPage({ errors: result.error }));
};
