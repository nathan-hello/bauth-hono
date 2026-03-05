import { dotenv } from "@/server/env";
import { StartLogging } from "@/server/telemetry/sdk";
import { MultiLogExporter, PinoLogExporter } from "@/server/telemetry/exporters";

import * as login from "@/routes/auth/login";
import * as register from "@/routes/auth/register";
import * as logout from "@/routes/auth/logout";
import * as forgot from "@/routes/auth/forgot";
import * as twofa from "@/routes/auth/2fa";
import * as dashboard from "@/routes/auth/dashboard";
import * as api from "@/routes/auth/api";
import * as accountDelete from "@/routes/auth/delete";
import * as changePassword from "@/routes/auth/change-password";
import * as changeEmail from "@/routes/auth/change-email";

import * as debugHome from "@/routes/debug/home";
import * as debugEmail from "@/routes/debug/email";

import { routes } from "@/routes/routes";

StartLogging({
    tracesUrl: dotenv.OTEL_TRACES_URL,
    exporters: new MultiLogExporter([new PinoLogExporter(dotenv.LOG_FILE_PATH)]),
});

import { Hono } from "hono";
import { trimTrailingSlash } from "hono/trailing-slash";
import { serveStatic } from "hono/bun";

const app = new Hono();

// Allow trailing slashes. E.g.: /auth/login and /auth/login/
// become the same route. Browsers like qutebrowser need this.
app.use(trimTrailingSlash());

app.use("/*", serveStatic({ root: "./public" }));
app.all("/api/auth/*", api.post);

app.get(routes.auth.login, login.get);
app.post(routes.auth.login, login.post);

app.get(routes.auth.register, register.get);
app.post(routes.auth.register, register.post);

app.get(routes.auth.logout, logout.get);
app.post(routes.auth.logout, logout.post);

app.get(routes.auth.forgot, forgot.get);
app.post(routes.auth.forgot, forgot.post);

app.get(routes.auth.twoFactor, twofa.get);
app.post(routes.auth.twoFactor, twofa.post);

app.get(routes.auth.dashboard, dashboard.get);
app.post(routes.auth.dashboard, dashboard.post);

app.get(routes.auth.changePassword, changePassword.get);
app.post(routes.auth.changePassword, changePassword.post);

app.get(routes.auth.changeEmail, changeEmail.get);
app.post(routes.auth.changeEmail, changeEmail.post);

app.get(routes.auth.delete, accountDelete.get);
app.post(routes.auth.delete, accountDelete.post);

if (process.env.NODE_ENV === "development") {
    app.get(routes.index, debugHome.get);
    app.get(routes.debug.email, debugEmail.get);
}

const port = Number(process.env.PORT) || 3005;

export default {
    port,
    fetch: app.fetch,
};
