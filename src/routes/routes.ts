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
    delete: "/auth/delete",
  },
  debug: {
    email: "/debug/email",
    home: "/debug",
  },
};

export const redirects = {
  ToLogin: Response.redirect(routes.auth.login, 302),
  AfterDeleteAcccount: routes.auth.delete + "?email=true",
  afterSuccess: {
    default: "/debug",
  },
};
