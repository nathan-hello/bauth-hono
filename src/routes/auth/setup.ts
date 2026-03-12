import { Hono } from "hono";
import { Flash } from "@/lib/flash";
import { AppError } from "@/lib/auth-error";
import { AppEnv, BaseProps } from "@/lib/types";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { SetupPage } from "@/views/auth/setup";
import { Redirect } from "@/routes/redirect";
import { findAction } from "@/routes/auth/lib/check-action";
import { createCopy } from "@/lib/copy";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.setup);
const flash = new Flash<typeof actions, State>({ email: "" });

export const actions = {
    setup: { name: "setup", handler: Setup },
};

export type State = {
    email: string;
};

export type SetupProps = BaseProps<typeof actions, State>;

app.get("/", async (c) => {
    const copy = createCopy(c.req.raw);

    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const { state, result, headers } = flash.Consume(c.req.raw.headers);

    return c.html(SetupPage({ state, result, copy }), { headers });
});

app.post("/", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    const result = await tel.task(
        "POST",
        async (span) => {
            span.setAttributes(safeRequestAttrs(c.req.raw, form));
            const handler = findAction(actions, action);
            return await handler(c.req.raw, form);
        },
        { action },
    );

    return flash.Respond(c.req.raw, result);
});

async function Setup(request: Request, form: FormData): Promise<{ response: Response }> {
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

    const result = await auth.api.setPassword({
        body: { newPassword: newPass },
        headers: headers ? headers : request.headers,
        returnHeaders: true,
    });

    return { response: new Redirect(request, result.headers).After.OAuth() };
}

export default app;
