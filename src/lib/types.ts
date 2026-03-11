import { Env } from "hono/types";
import { TaskResult } from "@/server/telemetry";

export type ActionNames<TActions extends { [K: string]: { name: string } }> = TActions[keyof TActions]["name"];

export type ActionResult<TActions extends { [K: string]: { name: string } } = { [K: string]: { name: string } }> =
    TaskResult<null> & { action: ActionNames<TActions> };

export type ActionKeys<TActions> = {
    [K in keyof TActions]: TActions[K] extends { name: string } ? TActions[K]["name"] : never;
};

export type RouteActionData<
    TActions extends { [K: string]: { name: string } } = { [K: string]: { name: string } },
    TState = undefined,
> = {
    result: ActionResult<TActions>;
    state?: TState;
};

export type BAuthSessionMaybe = {
    session: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date;
        token: string;
        ipAddress?: string | null | undefined | undefined;
        userAgent?: string | null | undefined | undefined;
    };
    user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined | undefined;
        username?: string | null | undefined;
        displayUsername?: string | null | undefined;
        twoFactorEnabled: boolean | null | undefined;
    };
} | null;

export type BAuthSession = NonNullable<BAuthSessionMaybe>;

const appEnv = {
    Variables: {},
} satisfies Env;

export type AppEnv = typeof appEnv;

import { user } from "@/server/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export type FullUser = InferSelectModel<typeof user>;
