import type { Hono } from "hono";
import * as home from "./auth/home";
import * as login from "./auth/login";
import * as register from "./auth/register";
import * as logout from "./auth/logout";
import * as forgot from "./auth/forgot";
import * as twofa from "./auth/2fa";
import * as dashboard from "./auth/dashboard";

export function registerRoutes(app: Hono) {
  app.get("/", home.get);

  app.get("/auth/login", login.get);

  app.post("/auth/login", login.post);

  app.get("/auth/register", register.get);
  app.post("/auth/register", register.post);

  app.get("/auth/logout", logout.get);
  app.post("/auth/logout", logout.post);

  app.get("/auth/forgot", forgot.get);
  app.post("/auth/forgot", forgot.post);

  app.get("/auth/2fa", twofa.get);
  app.post("/auth/2fa", twofa.post);

  app.get("/auth/dashboard", dashboard.get);
  app.post("/auth/dashboard", dashboard.post);
}
