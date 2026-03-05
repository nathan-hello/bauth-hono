import type { AppError } from "@/lib/auth-error";

export type ActionResult<TAction extends string = string> =
    | { action: TAction | "top-of-page"; success: false; errors: AppError[] }
    | { action: TAction | "top-of-page"; success: true; errors?: never };

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
