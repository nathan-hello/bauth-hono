import type { Handler } from "hono";
import { Context } from "hono";
import { AppError } from "@/lib/auth-error";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { ChangeUsernamePage } from "@/views/auth/change-username";
import { Redirect } from "@/routes/redirect";

const tel = new Telemetry(routes.auth.changeUsername);

export const actions = {
    change_username: { name: "change_username", handler: ChangeUsername },
};

type ActionReturnData = {
    headers?: Headers;
};

export const get: Handler = async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    return c.html(ChangeUsernamePage({ username: session.user.username || "" }));
};

export async function post(c: Context) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
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

    return c.html(
        ChangeUsernamePage({
            username: session.user.username || "",
            result: { action: "change_username", success: false, errors: result.error },
        }),
    );
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
