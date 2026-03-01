import type { Handler } from "hono";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { routes } from "@/routes/routes";
import { DebugHomePage } from "@/views/debug/index";

const tel = new Telemetry(routes.debug.home);

export const get: Handler = async (c) => {
  const result = await tel.task("GET", async (span) => {
    tel.debug("REQUEST", safeRequestAttrs(c.req.raw));
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session) {
      span.setAttribute("user.id", session.user.id);
    }
    return c.html(DebugHomePage({ session }));
  });
  if (result.ok) return result.data;
  // Session check failed — render home without session
  return c.html(DebugHomePage({ session: null }));
};
