import { Hono } from "hono";
import { Flash } from "@/lib/flash";
import { AppError } from "@/lib/auth-error";
import { AppEnv, BaseProps } from "@/lib/types";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry } from "@/server/telemetry";
import { ChangePasswordPage } from "@/views/auth/change-password";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { createCopy } from "@/lib/copy";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.changePassword);
const flash = new Flash<typeof actions, State>(undefined);

type State = undefined;
export type ChangePasswordProps = BaseProps<typeof actions, State> & { hasCredential: boolean };

export const actions = {
    change_password: { name: "change_password", handler: ChangePassword },
    set_password: { name: "set_password", handler: SetPassword },
};

app.get("/", async (c) => {
    const copy = createCopy(c.req.raw);

    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const accounts = await auth.api.listUserAccounts({ headers: c.req.raw.headers });
    const hasCredential = accounts.some((a) => a.providerId === "credential");

    const { state, result, headers } = flash.Consume(c.req.raw.headers);

    return c.html(
        ChangePasswordPage({
            state,
            hasCredential,
            result,
            copy,
        }),
        { headers },
    );
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
        async () => {
            const handler = findAction(actions, action);
            return await handler(c.req.raw, form);
        },
        { action },
    );

    return flash.Respond(c.req.raw, result);
});

async function ChangePassword(request: Request, form: FormData): Promise<{ headers: Headers }> {
    const current = form.get("current")?.toString();
    const newPass = form.get("new_password")?.toString();
    const repeat = form.get("new_password_repeat")?.toString();
    if (!current) throw new AppError("INVALID_PASSWORD");
    if (!newPass) throw new AppError("password_mismatch");
    if (newPass !== repeat) throw new AppError("password_mismatch");
    const r = await auth.api.changePassword({
        body: { currentPassword: current, newPassword: newPass, revokeOtherSessions: true },
        headers: request.headers,
        returnHeaders: true,
    });
    return { headers: r.headers };
}

async function SetPassword(request: Request, form: FormData): Promise<{ headers: Headers }> {
    const newPass = form.get("new_password")?.toString();
    const repeat = form.get("new_password_repeat")?.toString();
    if (!newPass) throw new AppError("password_mismatch");
    if (newPass !== repeat) throw new AppError("password_mismatch");
    const r = await auth.api.setPassword({
        body: { newPassword: newPass },
        headers: request.headers,
        returnHeaders: true,
    });
    return { headers: r.headers };
}

export default app;
