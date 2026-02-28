import type { Hono } from "hono";
import * as home from "./auth/home";
import * as login from "./auth/login";
import * as register from "./auth/register";
import * as logout from "./auth/logout";
import * as forgot from "./auth/forgot";
import * as twofa from "./auth/2fa";
import * as dashboard from "./auth/dashboard";
import * as api from "./auth/api";
import { routes } from "./routes";


export function registerRoutes(app: Hono) {
  app.get(routes.debug.home, home.get);

  app.post(routes.auth.api, api.post);

  app.get(routes.auth.login, login.get);
  app.post(routes.auth.login, login.post);

  app.get(routes.auth.register, register.get);
  app.post(routes.auth.register, register.post);

  app.get(routes.auth.logout, logout.get);
  app.post(routes.auth.logout, logout.post);

  app.get(routes.auth.forgot, forgot.get);
  app.post(routes.auth.forgot, forgot.post);

  app.get(routes.auth.twoFactor, twofa.get);
  app.post(routes.auth.twoFactor, twofa.post);

  app.get(routes.auth.dashboard, dashboard.get);
  app.post(routes.auth.dashboard, dashboard.post);
}
