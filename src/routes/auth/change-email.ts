import { Context } from "hono";
import { Flash } from "@/lib/flash";
import { AppError } from "@/lib/auth-error";
import type { RouteActionData } from "@/lib/types";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { ChangeEmailPage } from "@/views/auth/change-email";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { createCopy } from "@/lib/copy";

const tel = new Telemetry(routes.auth.changeEmail);

const flash = new Flash<typeof actions>();

export const actions = {
    change_email: { name: "change_email", handler: ChangeEmail },
    resend_verification: { name: "resend_verification", handler: ResendVerification },
};

export type ChangeEmailLoaderData = {
    currentEmail: string;
    emailVerified: boolean;
};

export type ChangeEmailActionData = RouteActionData<typeof actions>;

type ActionReturnData = {
    verificationSent?: boolean;
    headers?: Headers;
};

export async function get(c: Context) {
    const copy = createCopy(c.req.raw);

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const { actionData, headers } = flash.Consume(c.req.raw.headers);

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
}

export async function post(c: Context) {
    if (!(await auth.api.getSession({ headers: c.req.raw.headers }))) {
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
        return flash.Respond(c.req.raw, result.data.headers, {
            result: { action, success: true },
        });
    }

    return flash.Respond(c.req.raw, undefined, {
        result: { action, success: false, errors: result.error },
    });
}

async function ChangeEmail(request: Request, form: FormData): Promise<ActionReturnData> {
    const newEmail = form.get("new_email")?.toString();
    if (!newEmail) throw new AppError("field_missing_email");
    const r = await auth.api.changeEmail({
        body: { newEmail },
        headers: request.headers,
        returnHeaders: true,
    });
    return { headers: r.headers };
}

async function ResendVerification(request: Request, _: FormData): Promise<ActionReturnData> {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new AppError("SESSION_EXPIRED");
    await auth.api.sendVerificationEmail({
        body: { email: session.user.email },
    });
    return { verificationSent: true };
}
