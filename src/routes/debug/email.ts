import { DebugEmailPage } from "@/views/debug/email";
import type { Handler } from "hono";

export const get: Handler = async (c) => {
  return c.html(DebugEmailPage());
};
