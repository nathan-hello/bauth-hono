import { Hono } from "hono";
import { auth } from "@/server/auth";
import { Telemetry } from "@/server/telemetry";
import { routes } from "@/routes/routes";
import { Redirect } from "@/routes/redirect";
import { AppEnv } from "@/lib/types";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.logout);

app.get("/", async (c) => {
    const result = await tel.task("GET", async () => {
        return await auth.api.signOut({
            headers: c.req.raw.headers,
            returnHeaders: true,
        });
    });

    if (result.ok) {
        return new Redirect(c.req.raw, result.data.headers).After.Logout();
    }

    return new Redirect(c.req.raw).After.Logout();
});

export default app;
