import type { Handler } from "hono";
import { Context, Hono } from "hono";
import { Flash } from "@/lib/flash";
import { AppError } from "@/lib/auth-error";
import { AppEnv, type RouteActionData } from "@/lib/types";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { ChangeUsernamePage } from "@/views/auth/change-username";
import { Redirect } from "@/routes/redirect";
import { createCopy } from "@/lib/copy";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.changeUsername);
const flash = new Flash<typeof actions>();

type ActionReturnData = { headers?: Headers };
export type ChangeUsernameLoaderData = { username: string };
export type ChangeUsernameActionData = RouteActionData<typeof actions>;

export const actions = { change_username: { name: "change_username", handler: ChangeUsername } };

app.get("/", async (c) => {
    const copy = createCopy(c.req.raw);

    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const { state: actionData, headers } = flash.Consume(c.req.raw.headers);

    return c.html(
        ChangeUsernamePage({
            loaderData: { username: session.user.username || "" },
            actionData,
            copy,
        }),
        { headers },
    );
});

app.post("/", async (c) => {
    if (!(await auth.api.getSession({ headers: c.req.raw.headers }))) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const form = await c.req.formData();

    const result = await tel.task("POST", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw, form));
        return await ChangeUsername(c.req.raw, form);
    });

    if (result.ok) {
        return new Redirect(c.req.raw, result.data.headers).After.OAuth();
    }

    return flash.Respond(c.req.raw, undefined, {
        result: { action: "change_username", success: false, errors: result.error },
    });
});

async function ChangeUsername(request: Request, form: FormData): Promise<ActionReturnData> {
    const username = form.get("username")?.toString();

    if (!username) throw new AppError("field_missing_username");

    const r = await auth.api.updateUser({
        body: { username },
        headers: request.headers,
        returnHeaders: true,
    });

    return { headers: r.headers };
}
