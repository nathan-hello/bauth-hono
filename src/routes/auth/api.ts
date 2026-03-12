import { Hono } from "hono";
import { auth } from "@/server/auth";
import { safeRequestAttrs, Telemetry } from "@/server/telemetry";
import { AppEnv } from "@/lib/types";
import { Redirect } from "@/routes/redirect";
import { createCopy } from "@/lib/copy";
import { routes } from "@/routes/routes";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.api);

app.all("/", async (c) => {
    const copy = createCopy(c.req.raw);
    const result = await tel.task("HANDLE", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw));
        return await auth.handler(c.req.raw);
    });

    if (result.ok) {
        return result.data;
    }

    return new Redirect(c.req.raw).Because.Error(copy, result);
});

export default app;
