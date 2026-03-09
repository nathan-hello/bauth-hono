import type { AppError } from "@/lib/auth-error";

export type ActionNames<TActions extends { [K: string]: { name: string } }> = TActions[keyof TActions]["name"];

export type ActionResult<TActions extends { [K: string]: { name: string } } = { [K: string]: { name: string } }> =
    | { action: ActionNames<TActions> | string | undefined; success: false; errors: AppError[] }
    | { action: ActionNames<TActions> | string | undefined; success: true; errors?: never };

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
