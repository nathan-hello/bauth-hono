import { Hono } from "hono";
import { Flash } from "@/lib/flash";
import { AppError } from "@/lib/auth-error";
import { ActionResult, AppEnv } from "@/lib/types";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry } from "@/server/telemetry";
import { ChangeEmailPage } from "@/views/auth/change-email";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { Copy, createCopy } from "@/lib/copy";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.changeEmail);
const flash = new Flash<typeof actions, State>({ currentEmail: "", emailVerified: false });

export type State = { currentEmail: string; emailVerified: boolean };
export type ChangeEmailProps = { result: ActionResult<typeof actions, State>; state: State; copy: Copy };

export const actions = {
    change_email: { name: "change_email", handler: ChangeEmail },
    resend_verification: { name: "resend_verification", handler: ResendVerification },
};

app.get("/", async (c) => {
    const copy = createCopy(c.req.raw);

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const { state: actionData, headers } = flash.Consume(c.req.raw.headers);

    return c.html(
        ChangeEmailPage({
            loaderData: {
                currentEmail: session.user.email,
                emailVerified: session.user.emailVerified,
            },
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
    const action = form.get("action")?.toString();

    const result = await tel.task(
        "POST",
        async () => {
            const handler = findAction(actions, action);
            return await handler(c.req.raw, form);
        },
        { action },
    );

    return flash.Respond(c.req.raw, result);
});

async function ChangeEmail(request: Request, form: FormData): Promise<{ headers: Headers }> {
    const newEmail = form.get("new_email")?.toString();
    if (!newEmail) throw new AppError("field_missing_email");
    const r = await auth.api.changeEmail({
        body: { newEmail },
        headers: request.headers,
        returnHeaders: true,
    });
    return { headers: r.headers };
}

async function ResendVerification(request: Request, _: FormData): Promise<null> {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new AppError("SESSION_EXPIRED");
    await auth.api.sendVerificationEmail({
        body: { email: session.user.email },
    });
    return null;
}

export default app;
