import type { Handler } from "hono";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { LogoutPage } from "@/views/auth/logout";
import { routes } from "@/routes/routes";
import { AppError } from "@/lib/auth-error";
import { Redirect } from "@/routes/redirect";

const tel = new Telemetry(routes.auth.logout);

export const get: Handler = async (c) => {
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

    return c.html(LogoutPage({ errors: result.error }));
};
