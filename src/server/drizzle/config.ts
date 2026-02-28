import { defineConfig } from "drizzle-kit";
import { dotenv } from "../env";

export default defineConfig({
  out: "./src/server/drizzle/migrations",
  schema: "./src/server/drizzle/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: dotenv.DB_FILE_NAME,
  },
});
