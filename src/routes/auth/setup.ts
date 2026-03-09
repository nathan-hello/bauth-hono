import type { Handler } from "hono";
import { Context } from "hono";
import { deserializeActionData, serializeActionData, type SerializedActionData } from "@/lib/flash";
import { AppError } from "@/lib/auth-error";
import type { RouteActionData } from "@/lib/types";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { SetupPage } from "@/views/auth/setup";
import { Redirect } from "@/routes/redirect";
import { findAction } from "@/routes/auth/lib/check-action";

const tel = new Telemetry(routes.auth.setup);

export const actions = {
    setup: { name: "setup", handler: Setup },
};

export type SetupLoaderData = {
    email: string;
};

export type SetupActionData = RouteActionData<typeof actions>;

type ActionReturnData = {
    headers?: Headers;
};

export const get: Handler = async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const flash = Redirect.ConsumeFlash<SerializedActionData<typeof actions>>(c.req.raw.headers.get("cookie"));

    return c.html(
        SetupPage({
            loaderData: { email: session.user.email },
            actionData: deserializeActionData<typeof actions, undefined>(flash.actionData),
        }),
        { headers: flash.headers },
    );
};

export async function post(c: Context) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    const result = await tel.task("POST", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw, form));
        const handler = findAction(actions, action);
        return await handler(c.req.raw, form);
    });

    if (result.ok) {
        return new Redirect(c.req.raw, result.data.headers).After.OAuth();
    }

    return new Redirect(c.req.raw).Flash(
        serializeActionData<typeof actions, undefined>({
            result: { action, success: false, errors: result.error },
        }),
    );
}

async function Setup(request: Request, form: FormData): Promise<ActionReturnData> {
    const newEmail = form.get("email")?.toString();
    const newPass = form.get("new_password")?.toString();
    const repeat = form.get("repeat")?.toString();

    if (!newEmail) throw new AppError("field_missing_email");
    if (!newPass) throw new AppError("field_missing_password");
    if (!repeat) throw new AppError("field_missing_password_repeat");
    if (newPass !== repeat) throw new AppError("password_mismatch");

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new AppError("SESSION_EXPIRED");

    let headers: Headers | undefined = undefined;

    if (newEmail !== session.user.email) {
        const emailResult = await auth.api.changeEmail({
            body: { newEmail },
            headers: request.headers,
            returnHeaders: true,
        });
        headers = emailResult.headers;
    }

    const passwordResult = await auth.api.setPassword({
        body: { newPassword: newPass },
        headers: headers ? headers : request.headers,
        returnHeaders: true,
    });

    return { headers: passwordResult.headers };
}
