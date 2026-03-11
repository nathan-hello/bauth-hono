import type { Handler } from "hono";
import { Context } from "hono";
import { Flash } from "@/lib/flash";
import { AppError } from "@/lib/auth-error";
import type { RouteActionData } from "@/lib/types";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { ChangeUsernamePage } from "@/views/auth/change-username";
import { Redirect } from "@/routes/redirect";

const tel = new Telemetry(routes.auth.changeUsername);

const flash = new Flash<typeof actions>();

export const actions = {
    change_username: { name: "change_username", handler: ChangeUsername },
};

export type ChangeUsernameLoaderData = {
    username: string;
};

export type ChangeUsernameActionData = RouteActionData<typeof actions>;

type ActionReturnData = {
    headers?: Headers;
};

export const get: Handler = async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const { actionData, headers } = flash.Consume(c.req.raw.headers);

    return c.html(
        ChangeUsernamePage({
            loaderData: { username: session.user.username || "" },
            actionData,
        }),
        { headers },
    );
};

export async function post(c: Context) {
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
}

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
