import type { Handler } from "hono";
import { Context } from "hono";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { AdminPage } from "@/views/auth/admin";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { AppError } from "@/lib/auth-error";
import { UserWithRole } from "better-auth/plugins";
import { db } from "@/server/drizzle/db";
import * as schema from "@/server/drizzle/schema";

const tel = new Telemetry(routes.auth.admin);

export const actions = {
    ban_user: { name: "ban_user", handler: BanUser },
    unban_user: { name: "unban_user", handler: UnbanUser },
    change_username: { name: "change_username", handler: ChangeUsername },
};

type ActionReturnData = {
    headers?: Headers;
};

async function getLoaderData(headers: Headers): Promise<(typeof auth.$Infer.Session.user & UserWithRole)[]> {
    const session = await auth.api.getSession({ headers });
    if (!session) {
        return [];
    }

    // Better Auth's User schema doesn't give type hinting for auth.api.listUsers()
    // when there are plugins that update the user type (such as admin and username)
    const users = await db.select().from(schema.user);

    return users.map((user) => ({
        ...user,
        image: user.image ?? undefined,
        role: user.role ?? undefined,
        banReason: user.banReason ?? undefined,
        banExpires: user.banExpires ?? undefined,
        username: user.username ?? undefined,
        displayUsername: user.displayUsername ?? undefined,
        twoFactorEnabled: user.twoFactorEnabled ?? undefined,
    }));
}

export const get: Handler = async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const { response, headers } = await auth.api.userHasPermission({
        returnHeaders: true,
        headers: c.req.raw.headers,
        body: {
            role: "admin",
            permission: {},
        },
    });

    if (!response.success) {
        return new Redirect(c.req.raw, headers).Because.NotAnAdmin();
    }

    const users = await getLoaderData(c.req.raw.headers);

    return c.html(AdminPage({ users }));
};

export async function post(c: Context) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const usersBefore = await getLoaderData(c.req.raw.headers);
    if (!usersBefore) {
        return c.html(AdminPage({ error: "Access denied. Admin only." }));
    }

    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    const result = await tel.task("POST", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw, form));
        const handler = findAction(actions, action);
        return await handler(c.req.raw, form);
    });

    if (result.ok) {
        const usersAfter = await getLoaderData(result.data.headers ?? c.req.raw.headers);
        return c.html(AdminPage({ users: usersAfter ?? usersBefore }), { headers: result.data.headers });
    }

    return c.html(AdminPage({ users: usersBefore, error: "Action failed" }));
}

async function BanUser(request: Request, form: FormData): Promise<ActionReturnData> {
    const userId = form.get("userId")?.toString();
    if (!userId) throw new Error("userId required");

    const r = await auth.api.banUser({
        body: { userId },
        headers: request.headers,
        returnHeaders: true,
    });

    return { headers: r.headers };
}

async function UnbanUser(request: Request, form: FormData): Promise<ActionReturnData> {
    const userId = form.get("userId")?.toString();
    if (!userId) throw new Error("userId required");

    const r = await auth.api.unbanUser({
        body: { userId },
        headers: request.headers,
        returnHeaders: true,
    });

    return { headers: r.headers };
}

async function ChangeUsername(request: Request, form: FormData) {
    const userId = form.get("userId")?.toString();
    if (!userId) {
        throw new AppError("internal_field_missing_user_id");
    }

    const newUsername = form.get("new_username")?.toString();
    if (!newUsername) {
        throw new AppError("field_missing_new_username");
    }

    const r = await auth.api.adminUpdateUser({
        headers: request.headers,
        body: {
            userId: userId,
            data: {
                username: newUsername,
            },
        },
        returnHeaders: true,
    });
    return { headers: r.headers };
}
