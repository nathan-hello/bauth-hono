import { Hono } from "hono";
import { Flash } from "@/lib/flash";
import { AppError } from "@/lib/auth-error";
import { AppEnv, BaseProps } from "@/lib/types";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry } from "@/server/telemetry";
import { ChangeUsernamePage } from "@/views/auth/change-username";
import { Redirect } from "@/routes/redirect";
import { createCopy } from "@/lib/copy";
import { findAction } from "@/routes/auth/lib/check-action";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.changeUsername);
const flash = new Flash<typeof actions, State>(undefined);

type State = undefined;
export type ChangeUsernameProps = BaseProps<typeof actions, State> & { username: string };

export const actions = { change_username: { name: "change_username", handler: ChangeUsername } };

app.get("/", async (c) => {
    const copy = createCopy(c.req.raw);

    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const { state, result, headers } = flash.Consume(c.req.raw.headers);

    return c.html(
        ChangeUsernamePage({
            state,
            result,
            copy,
            username: session.user.username ?? copy.username_not_set,
        }),
        { headers },
    );
});

app.post("/", async (c) => {
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

async function ChangeUsername(request: Request, form: FormData): Promise<{ response: Response }> {
    const username = form.get("username")?.toString();

    if (!username) throw new AppError("field_missing_username");

    const r = await auth.api.updateUser({
        body: { username },
        headers: request.headers,
        returnHeaders: true,
    });

    return { response: new Redirect(request, r.headers).After.OAuth() };
}

export default app;
