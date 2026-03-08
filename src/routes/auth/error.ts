import { copy } from "@/lib/copy";
import { ErrorPage } from "@/views/components/error";
import { Handler } from "hono";

export const get: Handler = (c) => {
    const err = c.req.query("error");
    const message =
        err !== undefined && err in copy.error
            ? copy.error[err as keyof typeof copy.error]
            : `Unknown error: ${err}`;

    return c.html(ErrorPage({ status: 500, message }));
};
