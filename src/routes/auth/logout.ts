import { Hono, type Handler } from "hono";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { routes } from "@/routes/routes";
import { AppError } from "@/lib/auth-error";
import { Redirect } from "@/routes/redirect";
import { ErrorPage } from "@/views/components/error";
import { createCopy } from "@/lib/copy";
import { AppEnv } from "@/lib/types";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.logout);

export const get: Handler = async (c) => {
    const copy = createCopy(c.req.raw);

    const result = await tel.task("GET", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw));

        const { headers, response } = await auth.api.signOut({
            headers: c.req.raw.headers,
            returnHeaders: true,
        });

        if (response.success === false) {
            throw new AppError("generic_error");
        }

        return new Redirect(c.req.raw, headers).After.Logout();
    });

    if (result.ok) {
        return result.data;
    }

    if (result.error[0].code === "FAILED_TO_GET_SESSION") {
        return new Redirect(c.req.raw).After.Logout();
    }

    return c.html(ErrorPage({ status: 500, message: result.traceId, copy }));
};

export default app;
