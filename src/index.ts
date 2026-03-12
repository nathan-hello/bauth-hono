import { dotenv } from "@/server/env";
import { StartLogging } from "@/server/telemetry/sdk";
import { FileTelemetryExporter } from "@/server/telemetry/exporters";

StartLogging({
    tracesUrl: dotenv.OTEL_TRACES_URL,
    exporter: new FileTelemetryExporter(dotenv.LOG_FILE_PATH),
});

import api from "@/routes/auth/api";
import admin from "@/routes/auth/admin";
import changeEmail from "@/routes/auth/change-email";
import changePassword from "@/routes/auth/change-password";
import changeUsername from "@/routes/auth/change-username";
import dashboard from "@/routes/auth/dashboard";
import del from "@/routes/auth/delete";
import err from "@/routes/auth/error";
import forgot from "@/routes/auth/forgot";
import login from "@/routes/auth/login";
import logout from "@/routes/auth/logout";
import register from "@/routes/auth/register";
import setup from "@/routes/auth/setup";
import twofa from "@/routes/auth/2fa";
import twofaBackup from "@/routes/auth/backup-code";

import debugHome from "@/routes/debug/home";
import debugEmail from "@/routes/debug/email";

import { routes } from "@/routes/routes";

import { Hono } from "hono";
import { trimTrailingSlash } from "hono/trailing-slash";
import { serveStatic } from "hono/bun";
import { AppEnv } from "@/lib/types";
import { safeRequestAttrs, Telemetry } from "@/server/telemetry";
import { buildError, Redirect } from "@/routes/redirect";
import { createCopy } from "@/lib/copy";
import { HTTPException } from "hono/http-exception";
import { AppError } from "@/lib/auth-error";
import { logger } from "hono/logger";

const app = new Hono<AppEnv>();
const tel = new Telemetry("middleware");

// Allow trailing slashes. E.g.: /auth/login and /auth/login/
// become the same route. Browsers like qutebrowser need this.
app.use(trimTrailingSlash());

app.onError(async (error) => {
    const copy = createCopy(undefined);
    const message = error.name + ": " + error.message + " Cause: " + (error.cause ?? "unknown");
    let status = 500;
    if (error instanceof HTTPException) {
        status = error.status;
    }
    return buildError(status, message, copy);
});

app.use("/*", serveStatic({ root: "./public" }));

app.use(
    logger((log, attrs) => {
        tel.info("HONO", { log, attrs });
    }),
);

app.use(async (c, next) => {
    const result = await tel.task("REQUEST", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw));
        const start = performance.now();
        await next();
        const end = performance.now();
        span.setAttribute("RESPONSE_TIME", end - start);
    });
    if (!result.ok) {
        tel.error("ERR_IMPOSSIBLE", { error: result.error, ok: result.ok });
    }
});

app.route("/api/auth/*", api);

app.route(routes.auth.admin, admin);
app.route(routes.auth.changeEmail, changeEmail);
app.route(routes.auth.changePassword, changePassword);
app.route(routes.auth.changeUsername, changeUsername);
app.route(routes.auth.dashboard, dashboard);
app.route(routes.auth.delete, del);
app.route(routes.auth.error, err);
app.route(routes.auth.forgot, forgot);
app.route(routes.auth.login, login);
app.route(routes.auth.logout, logout);
app.route(routes.auth.register, register);
app.route(routes.auth.setup, setup);
app.route(routes.auth.twoFactor, twofa);
app.route(routes.auth.twoFactorBackup, twofaBackup);

if (process.env.NODE_ENV === "development") {
    app.route(routes.index, debugHome);
    app.route(routes.debug.email, debugEmail);
}

export { app };

const port = Number(process.env.PORT) || 3005;

export default {
    port,
    fetch: app.fetch,
};
