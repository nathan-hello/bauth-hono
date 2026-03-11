import { Hono, type Handler } from "hono";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { routes } from "@/routes/routes";
import { DebugHomePage } from "@/views/debug/index";
import { createCopy } from "@/lib/copy";
import { AppEnv } from "@/lib/types";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.debug.home);

export const get: Handler = async (c) => {
    const copy = createCopy(c.req.raw);

    const result = await tel.task("GET", async (span) => {
        tel.debug("REQUEST", safeRequestAttrs(c.req.raw));
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        if (session) {
            span.setAttribute("user.id", session.user.id);
        }
        return c.html(DebugHomePage({ session, copy }));
    });
    if (result.ok) return result.data;
    // Session check failed — render home without session
    return c.html(DebugHomePage({ session: null, copy }));
};

export default app;
