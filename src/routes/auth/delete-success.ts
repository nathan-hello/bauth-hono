import { DeleteSuccessPage } from "@/views/auth/delete";
import { Handler } from "hono";

export const get: Handler = (c) => {
  return c.html(DeleteSuccessPage())
}
