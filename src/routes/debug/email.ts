import { AppEnv } from "@/lib/types";
import { DebugEmailPage } from "@/views/debug/email";
import { Hono } from "hono";

const app = new Hono<AppEnv>();

app.get("/", async (c) => {
    return c.html(DebugEmailPage());
});

export default app;
