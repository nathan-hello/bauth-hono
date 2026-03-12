import { AppError } from "@/lib/auth-error";
import { createCopy } from "@/lib/copy";
import { Flash } from "@/lib/flash";
import { AppEnv } from "@/lib/types";
import { actions as dashboardActions, State } from "@/routes/auth/dashboard";
import { actions as loginActions } from "@/routes/auth/login";
import { Redirect } from "@/routes/redirect";
import { routes } from "@/routes/routes";
import { dotenv } from "@/server/env";
import { ErrorPage } from "@/views/components/error";
import { Hono } from "hono";

const app = new Hono<AppEnv>();

app.get("/", async (c) => {
    const copy = createCopy(c.req.raw);
    const err = c.req.query("error");

    // This happens when a user clicks on oauth but cancels
    // in the middle of the oauth flow with the provider.
    if (err === "access_denied") {
        return new Redirect(c.req.raw).Because.OauthFailed();
    }

    if (err === "banned") {
        return new Flash<typeof dashboardActions, State>().Respond(
            c.req.raw,
            {
                ok: false,
                meta: { action: loginActions.login.name },
                error: [new AppError("BANNED_USER")],
                traceId: "",
            },
            { state: {} },
            dotenv.PRODUCTION_URL + routes.auth.login,
        );
    }

    if (err === "account_already_linked_to_different_user") {
        return new Flash<typeof dashboardActions, State>().Respond(
            c.req.raw,
            {
                ok: false,
                meta: { action: "top-of-page" },
                error: [new AppError("account_already_linked_to_different_user")],
                traceId: "",
            },
            { state: {} },
            dotenv.PRODUCTION_URL + routes.auth.dashboard,
        );
    }

    const message =
        err !== undefined && err in copy.error ? copy.error[err as keyof typeof copy.error] : `Unknown error: ${err}`;

    return c.html(ErrorPage({ status: 500, message, copy }));
});

export default app;
