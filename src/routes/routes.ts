export const routes = {
    index: "/",
    auth: {
        api: "/auth/api",
        login: "/auth/login",
        logout: "/auth/logout",
        forgot: "/auth/forgot",
        register: "/auth/register",
        twoFactor: "/auth/2fa",
        dashboard: "/auth/dashboard",
        changePassword: "/auth/dashboard/change-password",
        changeEmail: "/auth/dashboard/change-email",
        oauthGoogle: "/auth/oauth/google",
        oauthApple: "/auth/oauth/apple",
        oauthCallback: "/api/auth/callback/:provider",
        delete: "/auth/delete",
        deleteSuccess: "/auth/delete/success",
    },
    debug: {
        email: "/debug/email",
        home: "/",
    },
};
