import type { Hono } from "hono";
import * as home from "@/routes/auth/home";
import * as login from "@/routes/auth/login";
import * as register from "@/routes/auth/register";
import * as logout from "@/routes/auth/logout";
import * as forgot from "@/routes/auth/forgot";
import * as twofa from "@/routes/auth/2fa";
import * as dashboard from "@/routes/auth/dashboard";
import * as api from "@/routes/auth/api";
import { routes } from "@/routes/routes";


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
