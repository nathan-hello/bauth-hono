export const routes = {
  auth: {
    api: "/auth/api",
    login: "/auth/login",
    logout: "/auth/logout",
    forgot: "/auth/forgot",
    register: "/auth/register",
    twoFactor: "/auth/2fa",
    dashboard: "/auth/dashboard",
  },
  debug: {
    email: "/debug/email",
    home: "/debug/session",
  },
};

export const redirects = {
  afterSuccess: {
    default: "/",
  },
};
