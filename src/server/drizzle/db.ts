import * as schema from "@/server/drizzle/schema";
import { dotenv } from "@/server/env";
import { Telemetry } from "@/server/telemetry";
import { DefaultLogger } from "drizzle-orm";

const tel = new Telemetry("drizzle-orm");

const logger = new DefaultLogger({
    writer: {
        write: (message) => {
            tel.trace(message);
        },
    },
});

const isBun = typeof globalThis.Bun !== "undefined";

let db:
    | ReturnType<typeof import("drizzle-orm/bun-sqlite").drizzle>
    | ReturnType<typeof import("drizzle-orm/better-sqlite3").drizzle>;

if (isBun) {
    const { drizzle } = await import("drizzle-orm/bun-sqlite");
    const Database = (await import("bun:sqlite")).default;
    const sqlite = new Database(dotenv.DB_FILE_NAME);
    db = drizzle(sqlite, { schema, logger });
} else {
    const { drizzle } = await import("drizzle-orm/better-sqlite3");
    const Database = (await import("better-sqlite3")).default;
    const sqlite = new Database(dotenv.DB_FILE_NAME);
    db = drizzle(sqlite, { schema, logger });
}

export { db };
