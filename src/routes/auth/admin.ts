import { Hono } from "hono";
import { desc, like, or } from "drizzle-orm";
import { Flash } from "@/lib/flash";
import { AppError } from "@/lib/auth-error";
import type { FullUser, AppEnv, BaseProps } from "@/lib/types";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { Telemetry } from "@/server/telemetry";
import { AdminPage } from "@/views/auth/admin";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";
import { db } from "@/server/drizzle/db";
import { roles } from "@/server/lib/admin";
import * as schema from "@/server/drizzle/schema";
import { createCopy } from "@/lib/copy";

const app = new Hono<AppEnv>();
const tel = new Telemetry(routes.auth.admin);
const flash = new Flash<typeof actions, State>({});

export type State = { userId?: string };
export type Search = { users: FullUser[]; filters: AdminFilters; hasNextPage: boolean };
export type AdminProps = BaseProps<typeof actions, State> & { search: Search };

export type AdminFilters = { q: string; page: number; limit: number };

export const actions = {
    ban_user: { name: "ban_user", handler: BanUser },
    update_ban: { name: "update_ban", handler: UpdateBan },
    unban_user: { name: "unban_user", handler: UnbanUser },
    update_profile: { name: "update_profile", handler: UpdateProfile },
    update_role: { name: "update_role", handler: UpdateRole },
    update_handles: { name: "update_handles", handler: UpdateHandles },
};

app.get("/", async (c) => {
    const copy = createCopy(c.req.raw);

    const filters = getFilters(c.req.raw.url);
    const adminState = await userIsAdmin(c.req.raw.headers);
    if (!adminState.session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    if (!adminState.success) {
        return new Redirect(c.req.raw, adminState.headers).Because.NotAnAdmin();
    }

    const search = await getLoaderData(filters);

    const { state, headers, result } = flash.Consume(c.req.raw.headers);

    return c.html(AdminPage({ result, state, copy, search }), { headers });
});

app.post("/", async (c) => {
    const adminState = await userIsAdmin(c.req.raw.headers);
    if (!adminState.session) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    if (!adminState.success) {
        return new Redirect(c.req.raw, adminState.headers).Because.NotAnAdmin();
    }

    const form = await c.req.formData();
    const action = form.get("action")?.toString();
    const userId = form.get("userId")?.toString();

    const result = await tel.task(
        "POST",
        async () => {
            const handler = findAction(actions, action);
            return await handler(c.req.raw, form);
        },
        { action },
    );

    return flash.Respond(c.req.raw, result, { state: { userId } });
});

async function getLoaderData(filters: AdminFilters): Promise<Search> {
    const whereClause = getUserSearchWhere(filters.q);

    const offset = (filters.page - 1) * filters.limit;

    const rows = whereClause
        ? await db
              .select()
              .from(schema.user)
              .where(whereClause)
              .orderBy(desc(schema.user.createdAt))
              .limit(filters.limit + 1)
              .offset(offset)
        : await db
              .select()
              .from(schema.user)
              .orderBy(desc(schema.user.createdAt))
              .limit(filters.limit + 1)
              .offset(offset);

    const hasNextPage = rows.length > filters.limit;
    const users = hasNextPage ? rows.slice(0, filters.limit) : rows;

    return {
        users,
        hasNextPage,
        filters,
    };
}

async function userIsAdmin(headers: Headers) {
    const session = await auth.api.getSession({ headers });
    if (!session) {
        return { session: null, success: false, headers: undefined };
    }

    const { response, headers: permissionHeaders } = await auth.api.userHasPermission({
        returnHeaders: true,
        headers,
        body: {
            role: "admin",
            permission: {},
        },
    });

    return {
        session,
        success: response.success,
        headers: permissionHeaders,
    };
}

async function BanUser(request: Request, form: FormData): Promise<{ headers: Headers; state: State }> {
    const userId = requireFormValue(form, "userId", "internal_field_missing_user_id");
    const banReason = nullableTrimmedValue(form, "ban_reason") ?? undefined;
    const banExpiresAt = optionalDateValue(form, "ban_expires_at");

    const r = await auth.api.banUser({
        body: {
            userId,
            banReason,
            banExpiresIn: banExpiresAt ? getFutureDurationInSeconds(banExpiresAt) : undefined,
        },
        headers: request.headers,
        returnHeaders: true,
    });

    return {
        headers: r.headers,
        state: { userId },
    };
}

async function UpdateBan(request: Request, form: FormData): Promise<{ headers: Headers; state: State }> {
    const userId = requireFormValue(form, "userId", "internal_field_missing_user_id");
    const banReason = nullableTrimmedValue(form, "ban_reason");
    const banExpires = optionalDateValue(form, "ban_expires_at");

    const r = await auth.api.adminUpdateUser({
        headers: request.headers,
        body: {
            userId,
            data: {
                banReason,
                banExpires,
            },
        },
        returnHeaders: true,
    });

    return {
        headers: r.headers,
        state: { userId },
    };
}

async function UnbanUser(request: Request, form: FormData): Promise<{ headers: Headers; state: State }> {
    const userId = requireFormValue(form, "userId", "internal_field_missing_user_id");

    const r = await auth.api.unbanUser({
        body: { userId },
        headers: request.headers,
        returnHeaders: true,
    });

    return {
        headers: r.headers,
        state: { userId },
    };
}

async function UpdateProfile(request: Request, form: FormData): Promise<{ headers: Headers; state: State }> {
    const userId = requireFormValue(form, "userId", "internal_field_missing_user_id");
    const name = requireFormValue(form, "name", "generic_error");
    const email = requireFormValue(form, "email", "field_missing_email");
    const image = nullableTrimmedValue(form, "image");

    const r = await auth.api.adminUpdateUser({
        headers: request.headers,
        body: {
            userId,
            data: {
                name,
                email,
                image,
            },
        },
        returnHeaders: true,
    });

    return {
        headers: r.headers,
        state: { userId },
    };
}

async function UpdateRole(request: Request, form: FormData): Promise<{ headers: Headers; state: State }> {
    const userId = requireFormValue(form, "userId", "internal_field_missing_user_id");
    const role = parseRoleValue(form);

    const r = await auth.api.setRole({
        headers: request.headers,
        body: {
            userId,
            role,
        },
        returnHeaders: true,
    });

    return {
        headers: r.headers,
        state: { userId },
    };
}

async function UpdateHandles(request: Request, form: FormData): Promise<{ headers: Headers; state: State }> {
    const userId = requireFormValue(form, "userId", "internal_field_missing_user_id");
    const username = requireFormValue(form, "username", "field_missing_username");
    const displayUsername = nullableTrimmedValue(form, "display_username");

    const r = await auth.api.adminUpdateUser({
        headers: request.headers,
        body: {
            userId,
            data: {
                username,
                displayUsername,
            },
        },
        returnHeaders: true,
    });

    return {
        headers: r.headers,
        state: { userId },
    };
}

function requireFormValue(form: FormData, key: string, error: ConstructorParameters<typeof AppError>[0]): string {
    const value = form.get(key)?.toString().trim();
    if (!value) {
        throw new AppError(error);
    }
    return value;
}

function nullableTrimmedValue(form: FormData, key: string): string | null {
    const value = form.get(key)?.toString().trim();
    return value ? value : null;
}

function optionalDateValue(form: FormData, key: string): Date | null {
    const value = form.get(key)?.toString().trim();
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new AppError("generic_error");
    }

    return date;
}

function getFutureDurationInSeconds(date: Date): number {
    const diffInSeconds = Math.ceil((date.getTime() - Date.now()) / 1000);
    if (diffInSeconds <= 0) {
        throw new AppError("generic_error");
    }
    return diffInSeconds;
}

function parseRoleValue(form: FormData): keyof typeof roles | (keyof typeof roles)[] {
    const raw = requireFormValue(form, "role", "generic_error");
    const parsed = raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    if (parsed.length === 0) {
        throw new AppError("generic_error");
    }

    const validRoles = new Set<keyof typeof roles>(Object.keys(roles) as (keyof typeof roles)[]);
    const normalized = parsed.map((value) => {
        if (!validRoles.has(value as keyof typeof roles)) {
            throw new AppError("generic_error");
        }
        return value as keyof typeof roles;
    });

    return normalized.length === 1 ? normalized[0] : normalized;
}

function getFilters(url: string): AdminFilters {
    const searchParams = new URL(url).searchParams;
    const q = searchParams.get("q")?.trim() ?? "";
    const page = clampPositiveInteger(searchParams.get("page"), 1);
    const limit = Math.min(clampPositiveInteger(searchParams.get("limit"), 25), 100);

    return { q, page, limit };
}

function clampPositiveInteger(raw: string | null, fallback: number) {
    if (!raw) {
        return fallback;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }

    return parsed;
}

function getUserSearchWhere(q: string) {
    if (!q) {
        return undefined;
    }

    const search = `%${q}%`;

    return or(
        like(schema.user.id, search),
        like(schema.user.name, search),
        like(schema.user.email, search),
        like(schema.user.username, search),
        like(schema.user.displayUsername, search),
        like(schema.user.role, search),
    );
}

export default app;
