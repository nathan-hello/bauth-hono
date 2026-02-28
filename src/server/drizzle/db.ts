import { drizzle } from "drizzle-orm/bun-sqlite";
import Database from "bun:sqlite";
import * as schema from "@/server/drizzle/schema";
import { dotenv } from "@/server/env";

const sqlite = new Database(dotenv.DB_FILE_NAME);
export const db = drizzle(sqlite, {
  schema,
});
