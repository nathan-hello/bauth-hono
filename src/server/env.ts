import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseEnvFile() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch {}
}

parseEnvFile();

function loadEnv<const K extends string>(...keys: K[]): Record<K, string> {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`MISSING_ENV_VARS: ${JSON.stringify(missing)}`);
  }
  return process.env as Record<K, string>;
}

export const dotenv = loadEnv(
  "BETTER_AUTH_SECRET",
  "COOKIE_PREFIX",
  "DB_FILE_NAME",
  "FROM_EMAIL",
  "LOG_FILE_PATH",
  "OTEL_LOGS_URL",
  "OTEL_TRACES_URL",
  "PRODUCTION_URL",
  "RESEND_ACCESS_TOKEN",
);
