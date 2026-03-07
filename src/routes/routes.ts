import { redirectWithSetCookies } from "@/routes/auth/redirect";
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
        home: "/debug",
    },
};

export const redirects = {
    ToLogin: (_: Context): Response => {
        return Response.redirect(routes.auth.login, 302);
    },
    AfterDeleteAcccount: (_: Context) => {
        return Response.redirect(routes.auth.deleteSuccess);
    },
    AfterLogout: (_: Context): Response => {
        return Response.redirect(routes.auth.login, 302);
    },
    WithSetCookies: {
        AfterLogout: (_: Context, headers: Headers) => {
            return redirectWithSetCookies(headers, routes.index);
        },
    },
    AfterLogin: (_: Context): Response => {
        if (process.env.NODE_ENV === "development") {
            return Response.redirect(routes.auth.dashboard, 302);
        }
        return Response.redirect(routes.index, 302);
    },
    AfterOauth: (_: Context): Response => {
        return Response.redirect(routes.auth.dashboard);
    },
    IfSessionExists: {

    },
};
