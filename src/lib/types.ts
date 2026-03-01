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
} | null

export type BAuthSession = NonNullable<BAuthSessionMaybe>;
