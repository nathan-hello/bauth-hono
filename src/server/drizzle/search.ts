import { like, or, eq } from "drizzle-orm";
import * as schema from "@/server/drizzle/schema";
import { db } from "@/server/drizzle/db";
import { Telemetry } from "@/server/telemetry";
import * as OTPAuth from "otpauth";

const tel = new Telemetry("drizzle-orm/queries");

export async function getUserByLogin(login: string) {
    if (!login) {
        return undefined;
    }

    const users = await db
        .select()
        .from(schema.user)
        .where(or(eq(schema.user.email, login), eq(schema.user.username, login)))
        .leftJoin(schema.twoFactor, eq(schema.user.id, schema.twoFactor.userId));

    if (users.length === 0) {
        return undefined;
    }

    const user = users[0].user;
    const twoFactors = users.filter((r) => r.two_factor).map((r) => r.two_factor!);

    return { ...user, twoFactors };
}

export async function verifyUserTotp(userId: string, code: string): Promise<boolean> {
    const users = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.id, userId))
        .leftJoin(schema.twoFactor, eq(schema.user.id, schema.twoFactor.userId));

    if (users.length === 0) {
        return false;
    }

    const user = users[0].user;
    const twoFactors = users.filter((r) => r.two_factor).map((r) => r.two_factor!);

    if (twoFactors.length === 0) {
        return false;
    }

    const totpRecord = twoFactors[0];
    const secret = totpRecord.secret;

    const totp = new OTPAuth.TOTP({
        issuer: "bauth-hono",
        label: user.email,
        secret: OTPAuth.Secret.fromBase32(secret),
        digits: 6,
        period: 30,
    });

    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
}

export function getUserSearchWhere(q: string) {
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

export async function getEmailFromUsername(username: string): Promise<string | undefined> {
    if (!username) {
        return undefined;
    }

    const user = await db.select().from(schema.user).where(eq(schema.user.username, username));

    if (user.length > 1) {
        tel.error("MORE_THAN_ONE_USERNAME", { username: user[0].username, ids: user.map((u) => u.id) });
        return undefined;
    }

    if (user.length === 0) {
        return undefined;
    }

    return user[0].email;
}

export async function createSessionForUser(userId: string): Promise<{ headers: Headers }> {
    const token = globalThis.crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(schema.session).values({
        id: crypto.randomUUID(),
        token,
        expiresAt,
        userId,
    });

    const cookieName = `${process.env.COOKIE_PREFIX || "better-auth"}.session_token`;
    const headers = new Headers();
    headers.set(
        "Set-Cookie",
        `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}Expires=${expiresAt.toUTCString()}`,
    );

    return { headers };
}
