import { dotenv } from "@/server/env";
import { StartLogging } from "@/server/telemetry/sdk";
import { MultiLogExporter, PinoLogExporter } from "@/server/telemetry/exporters";

StartLogging({
  tracesUrl: dotenv.OTEL_TRACES_URL,
  exporters: new MultiLogExporter([new PinoLogExporter(dotenv.LOG_FILE_PATH)]),
});

import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { registerRoutes } from "@/routes/index";

const app = new Hono();

app.use("/*", serveStatic({ root: "./public" }));
registerRoutes(app);

const port = Number(process.env.PORT) || 3005;

export default {
  port,
  fetch: app.fetch,
};
