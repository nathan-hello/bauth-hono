import { createCopy } from "@/lib/copy";
import { Redirect } from "@/routes/redirect";
import { ErrorPage } from "@/views/components/error";
import { Handler } from "hono";

export const get: Handler = (c) => {
    const copy = createCopy(c.req.raw);
    const err = c.req.query("error");

    // This happens when a user clicks on oauth but cancels
    // in the middle of the oauth flow with the provider.
    if (err === "access_denied") {
        return new Redirect(c.req.raw).Because.OauthFailed();
    }

    if (err === "banned") {
        return new Redirect(c.req.raw).Because.OauthUserIsBanned(copy);
    }

    const message =
        err !== undefined && err in copy.error ? copy.error[err as keyof typeof copy.error] : `Unknown error: ${err}`;

    return c.html(ErrorPage({ status: 500, message, copy }));
};
