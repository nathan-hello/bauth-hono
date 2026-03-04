import { Context } from "hono";

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
        oauthGoogle: "/auth/oauth/google",
        oauthApple: "/auth/oauth/apple",
        oauthCallback: "/api/auth/callback/:provider",
        delete: "/auth/delete",
        deleteSuccess: "/auth/delete/success",
    },
    debug: {
        email: "/debug/email",
        home: "/debug",
    },
};

export const redirects = {
    ToLogin: Response.redirect(routes.auth.login, 302),
    AfterDeleteAcccount: routes.auth.deleteSuccess,
    AfterOauth: (c: Context): string => {
        return routes.auth.dashboard;
    },
    afterSuccess: {
        default: "/debug",
    },
};
