import type { Handler } from "hono";
import { auth } from "@/server/auth";
import { copy } from "@/lib/copy";
import { AppError, getAuthError } from "@/lib/auth-error";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import { generateQrSvg } from "@/lib/qr";
import { DashboardPage, type DashboardActionData, type DashboardLoaderData } from "@/views/dashboard";

const tel = new Telemetry("route.dashboard");

type LoaderResult = { data: DashboardLoaderData; userId: string };

async function getLoaderData(request: Request): Promise<LoaderResult | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;

  const allSessions = await auth.api.listSessions({ headers: request.headers });

  const s = allSessions
    .filter((s: any) => typeof s.ipAddress === "string")
    .map((s: any) => ({
      id: s.token,
      ipAddress: s.ipAddress ?? copy.dashboard_unknown_ip,
      lastLoggedIn: s.updatedAt,
    }));

  return {
    userId: session.user.id,
    data: {
      email: {
        email: session.user.email,
        verified: session.user.emailVerified,
      },
      sessions: {
        entries: s,
        current: {
          id: session.session.token,
          ipAddress: session.session.ipAddress ?? copy.dashboard_unknown_ip,
          lastLoggedIn: session.session.updatedAt,
        },
      },
      totp: {
        userEnabled: session.user.twoFactorEnabled ?? false,
      },
    },
  };
}

export const get: Handler = async (c) => {
  const result = await tel.task("GET", async (span) => {
    const loaded = await getLoaderData(c.req.raw);
    if (!loaded) return Response.redirect("/auth/login", 302);
    span.setAttribute("user.id", loaded.userId);
    return c.html(DashboardPage({ loaderData: loaded.data }));
  });
  if (result.ok) return result.data;
  return Response.redirect("/auth/login", 302);
};

export const post: Handler = async (c) => {
  const form = await c.req.formData();
  const action = form.get("action")?.toString();

  if (!action) {
    return Response.redirect("/auth/dashboard", 302);
  }

  const result = await tel.task(action.toUpperCase(), async (span) => {
    tel.debug("ACTION", { action, ...safeRequestAttrs(c.req.raw, form) });

    let actionData: DashboardActionData = {};
    let responseHeaders: Headers | undefined;

    if (action === "change_password") {
      const current = form.get("current")?.toString();
      const newPass = form.get("new_password")?.toString();
      const repeat = form.get("new_password_repeat")?.toString();
      if (!current) throw new AppError("INVALID_PASSWORD");
      if (!newPass) throw new AppError("password_mismatch");
      if (newPass && newPass !== repeat) throw new AppError("password_mismatch");

      const result = await auth.api.changePassword({
        body: { currentPassword: current, newPassword: newPass, revokeOtherSessions: true },
        headers: c.req.raw.headers,
        returnHeaders: true,
      });
      responseHeaders = result.headers;
      actionData = { change_password: { success: true } };
      tel.info("PASSWORD_CHANGED");
    }

    if (action === "revoke_session") {
      const which = form.get("session")?.toString();
      if (which) {
        if (which === "all") {
          const result = await auth.api.revokeOtherSessions({
            headers: c.req.raw.headers,
            returnHeaders: true,
          });
          responseHeaders = result.headers;
        } else {
          const result = await auth.api.revokeSession({
            body: { token: which },
            headers: c.req.raw.headers,
            returnHeaders: true,
          });
          responseHeaders = result.headers;
        }
        tel.info("SESSION_REVOKED", { target: which === "all" ? "all" : "single" });
      }
    }

    if (action === "email_change") {
      const newEmail = form.get("new_email")?.toString();
      if (newEmail) {
        const result = await auth.api.changeEmail({
          body: { newEmail },
          headers: c.req.raw.headers,
          returnHeaders: true,
        });
        responseHeaders = result.headers;
        tel.info("EMAIL_CHANGE_REQUESTED");
      }
    }

    if (action === "email_resend_verification") {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (session) {
        await auth.api.sendVerificationEmail({ body: { email: session.user.email } });
        actionData = { email_verify: { sent: true } };
        tel.info("VERIFICATION_EMAIL_SENT");
      }
    }

    if (action === "2fa_enable") {
      const password = form.get("password")?.toString();
      if (password) {
        const result = await auth.api.enableTwoFactor({
          body: { password },
          headers: c.req.raw.headers,
          returnHeaders: true,
        });
        responseHeaders = result.headers;

        let qrSvg: string | undefined;
        if (result.response.totpURI) {
          qrSvg = await generateQrSvg(result.response.totpURI);
        }

        actionData = {
          totp: {
            intermediateEnable: true,
            totpURI: result.response.totpURI,
            qrSvg,
            backupCodes: result.response.backupCodes,
            userEnabled: false,
          },
        };
        tel.info("2FA_ENABLE_INITIATED");
      }
    }

    if (action === "2fa_totp_verify") {
      const code = form.get("totp_code")?.toString();
      const totpURI = form.get("totp_uri")?.toString();

      if (code) {
        const result = await auth.api.verifyTOTP({
          body: { code },
          headers: c.req.raw.headers,
          returnHeaders: true,
        });
        responseHeaders = result.headers;
        actionData = {
          totp: {
            verified: true,
            ...(totpURI && { totpURI }),
            userEnabled: true,
          },
        };
        tel.info("TOTP_VERIFIED");
      }
    }

    if (action === "2fa_disable") {
      const password = form.get("password")?.toString();
      if (password) {
        const result = await auth.api.disableTwoFactor({
          body: { password },
          headers: c.req.raw.headers,
          returnHeaders: true,
        });
        responseHeaders = result.headers;
        tel.info("2FA_DISABLED");
      }
    }

    if (action === "get_totp_uri") {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (session?.user.twoFactorEnabled) {
        const password = form.get("password")?.toString();
        if (password) {
          const result = await auth.api.getTOTPURI({
            body: { password },
            headers: c.req.raw.headers,
            returnHeaders: true,
          });
          responseHeaders = result.headers;

          let qrSvg: string | undefined;
          if (result.response.totpURI) {
            qrSvg = await generateQrSvg(result.response.totpURI);
          }

          actionData = {
            totp: {
              totpURI: result.response.totpURI,
              qrSvg,
              userEnabled: true,
            },
          };
          tel.debug("TOTP_URI_FETCHED");
        }
      }
    }

    if (action === "get_backup_codes") {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (session?.user.twoFactorEnabled) {
        const password = form.get("password")?.toString();
        if (password) {
          const result = await auth.api.generateBackupCodes({
            body: { password },
            headers: c.req.raw.headers,
            returnHeaders: true,
          });
          responseHeaders = result.headers;
          actionData = {
            totp: {
              backupCodes: result.response.backupCodes,
              userEnabled: true,
            },
          };
          tel.info("BACKUP_CODES_GENERATED");
        }
      }
    }

    const loaded = await getLoaderData(c.req.raw);
    if (!loaded) return Response.redirect("/auth/login", 302);

    span.setAttribute("user.id", loaded.userId);

    const html = DashboardPage({ actionData, loaderData: loaded.data });

    if (responseHeaders) {
      const h = new Headers(responseHeaders);
      h.set("Content-Type", "text/html; charset=utf-8");
      return c.html(html, { headers: h });
    }

    return c.html(html);
  });

  if (result.ok) return result.data;

  // Sad path: re-render dashboard with errors
  let actionData: DashboardActionData = { errors: getAuthError(result.error) };

  // For TOTP verify failures, preserve the QR state from form
  if (action === "2fa_totp_verify") {
    const totpURI = form.get("totp_uri")?.toString();
    const backupCodesRaw = form.get("backup_codes")?.toString();
    const intermediateEnable = form.get("intermediate_enable") === "true";
    const backupCodes = backupCodesRaw ? JSON.parse(backupCodesRaw) : undefined;

    let qrSvg: string | undefined;
    if (totpURI) {
      try { qrSvg = await generateQrSvg(totpURI); } catch {}
    }

    actionData = {
      totp: {
        ...(intermediateEnable && { intermediateEnable: true }),
        ...(totpURI && { totpURI }),
        ...(qrSvg && { qrSvg }),
        ...(backupCodes && { backupCodes }),
        errors: getAuthError(result.error),
        userEnabled: !intermediateEnable,
      },
    };
  }

  const loaded = await getLoaderData(c.req.raw);
  if (!loaded) return Response.redirect("/auth/login", 302);

  return c.html(DashboardPage({ actionData, loaderData: loaded.data }));
};
