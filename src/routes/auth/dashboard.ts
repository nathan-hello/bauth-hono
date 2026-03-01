import type { Handler } from "hono";
import { auth } from "@/server/auth";
import { AppError, getAuthError } from "@/lib/auth-error";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import {
  DashboardLoaderData,
  DashboardPage,
  type DashboardActionData,
} from "@/views/auth/dashboard";
import { redirects, routes } from "@/routes/routes";

const tel = new Telemetry("route.dashboard");

async function getLoaderData(
  headers: Headers,
): Promise<DashboardLoaderData | null> {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;

  const allSessions = await auth.api.listSessions({ headers });
  const ret = {
    user: session.user,
    session: session.session,
    sessions: allSessions,
  };

  tel.debug("LOADER_DATA", { data: JSON.stringify(ret) });

  return ret;
}

export const get: Handler = async (c) => {
  const result = await tel.task("GET", async (span) => {
    const loaded = await getLoaderData(c.req.raw.headers);
    if (!loaded) {
      return redirects.ToLogin;
    }

    span.setAttribute("user.id", loaded.user.id);

    return c.html(DashboardPage({ loaderData: loaded }));
  });
  if (result.ok) return result.data;
  return redirects.ToLogin;
};

export const post: Handler = async (c) => {
  const result = await tel.task("POST", async (span) => {
    const form = await c.req.formData();
    const action = form.get("action")?.toString();
    const loaded = await getLoaderData(c.req.raw.headers);
    if (!loaded) {
      return redirects.ToLogin;
    }

    span.setAttribute("user.id", loaded.user.id);

    if (!action || !checkAction(action)) {
      tel.warn("ACTION_NOT_FOUND", { action });
      return Response.redirect(routes.auth.dashboard, 400);
    }

    tel.debug(action, safeRequestAttrs(c.req.raw, form));

    const result: { data?: DashboardActionData; headers?: Headers } | null =
      await actions[action](c.req.raw, form);

    tel.debug("ACTION_RESULT", {
      data: JSON.stringify(result?.data),
      headers: JSON.stringify(result?.headers),
    });

    const html = DashboardPage({
      actionData: result?.data,
      loaderData: loaded,
    });

    if (result?.headers) {
      const h = new Headers(result.headers);
      h.set("Content-Type", "text/html; charset=utf-8");
      return c.html(html, { headers: h });
    }

    return c.html(html);
  });

  if (result.ok) return result.data;

  const loaded = await getLoaderData(c.req.raw.headers);
  if (!loaded) {
    return redirects.ToLogin;
  }

  return c.html(
    DashboardPage({
      actionData: {
        errors: getAuthError(result.error),
      },
      loaderData: loaded,
    }),
  );
};

function checkAction(a: string): a is keyof typeof actions {
  return a in actions;
}

const actions = {
  change_password: PasswordChange,
  revoke_session: RevokeSession,
  email_change: EmailChange,
  email_resend_verification: EmailVerificationResend,
  two_factor_enable: TwoFactorEnable,
  two_factor_totp_verify: TwoFactorTotpVerify,
  two_factor_disable: TwoFactorDisable,
  get_totp_uri: TwoFactorGetTotpUri,
  get_backup_codes: TwoFactorGetBackupCodes,
};

export const actionName: { [K in keyof typeof actions]: K } = {
  change_password: "change_password",
  revoke_session: "revoke_session",
  email_change: "email_change",
  email_resend_verification: "email_resend_verification",
  two_factor_enable: "two_factor_enable",
  two_factor_totp_verify: "two_factor_totp_verify",
  two_factor_disable: "two_factor_disable",
  get_totp_uri: "get_totp_uri",
  get_backup_codes: "get_backup_codes",
};

async function RevokeSession(
  request: Request,
  form: FormData,
): Promise<{ headers: Headers } | null> {
  const which = form.get("session")?.toString();
  if (!which) {
    return null;
  }
  if (which === "all") {
    const result = await auth.api.revokeOtherSessions({
      headers: request.headers,
      returnHeaders: true,
    });
    return { headers: result.headers };
  }
  const result = await auth.api.revokeSession({
    body: { token: which },
    headers: request.headers,
    returnHeaders: true,
  });
  return { headers: result.headers };
}

async function EmailVerificationResend(
  request: Request,
  _: FormData,
): Promise<{ data: DashboardActionData } | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return null;
  }
  const { status } = await auth.api.sendVerificationEmail({
    body: { email: session.user.email },
  });
  return { data: { email_verify: { sent: status } } };
}

async function EmailChange(
  request: Request,
  form: FormData,
): Promise<{ headers: Headers } | null> {
  const newEmail = form.get("new_email")?.toString();
  if (!newEmail) {
    return null;
  }
  const result = await auth.api.changeEmail({
    body: { newEmail },
    headers: request.headers,
    returnHeaders: true,
  });
  return { headers: result.headers };
}

async function TwoFactorEnable(
  request: Request,
  form: FormData,
): Promise<{ data: DashboardActionData; headers: Headers } | null> {
  const password = form.get("password")?.toString();
  if (!password) {
    return null;
  }
  const result = await auth.api.enableTwoFactor({
    body: { password },
    headers: request.headers,
    returnHeaders: true,
  });
  return {
    data: {
      totp: {
        intermediateEnable: true,
        totpURI: result.response.totpURI,
        backupCodes: result.response.backupCodes,
        userEnabled: false,
      },
    },
    headers: result.headers,
  };
}

async function PasswordChange(
  request: Request,
  form: FormData,
): Promise<{ headers: Headers; data: DashboardActionData } | null> {
  const current = form.get("current")?.toString();
  const newPass = form.get("new_password")?.toString();
  const repeat = form.get("new_password_repeat")?.toString();
  if (!current) throw new AppError("INVALID_PASSWORD");
  if (!newPass) throw new AppError("password_mismatch");
  if (newPass !== repeat) throw new AppError("password_mismatch");
  const result = await auth.api.changePassword({
    body: {
      currentPassword: current,
      newPassword: newPass,
      revokeOtherSessions: true,
    },
    headers: request.headers,
    returnHeaders: true,
  });
  return {
    headers: result.headers,
    data: { change_password: { success: true } },
  };
}

async function TwoFactorTotpVerify(
  request: Request,
  form: FormData,
): Promise<{ headers: Headers; data: DashboardActionData } | null> {
  const code = form.get("totp_code")?.toString();
  const totpURI = form.get("totp_uri")?.toString();
  if (!code || !totpURI) {
    return null;
  }
  const result = await auth.api.verifyTOTP({
    body: { code },
    headers: request.headers,
    returnHeaders: true,
  });
  return {
    headers: result.headers,
    data: {
      totp: {
        verified: true,
        totpURI: totpURI,
        userEnabled: true,
      },
    },
  };
}

async function TwoFactorDisable(
  request: Request,
  form: FormData,
): Promise<{ headers: Headers } | null> {
  const password = form.get("password")?.toString();
  if (!password) {
    return null;
  }
  const result = await auth.api.disableTwoFactor({
    body: { password },
    headers: request.headers,
    returnHeaders: true,
  });
  return { headers: result.headers };
}

async function TwoFactorGetTotpUri(
  request: Request,
  form: FormData,
): Promise<{ headers: Headers; data: DashboardActionData } | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !session.user.twoFactorEnabled) {
    tel.warn("TWO_FACTOR_REQUESTED_BUT_NOT_FOUND", {
      sessionFound: session !== null,
      twoFactorEnabled: session?.user.twoFactorEnabled,
    });
    return null;
  }

  const password = form.get("password")?.toString();
  if (!password) {
    return null;
  }
  const result = await auth.api.getTOTPURI({
    body: { password },
    headers: request.headers,
    returnHeaders: true,
  });
  return {
    headers: result.headers,
    data: {
      totp: {
        totpURI: result.response.totpURI,
        userEnabled: true,
      },
    },
  };
}

async function TwoFactorGetBackupCodes(
  request: Request,
  form: FormData,
): Promise<{ headers: Headers; data: DashboardActionData } | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !session.user.twoFactorEnabled) {
    return null;
  }
  const password = form.get("password")?.toString();
  if (!password) {
    return null;
  }
  const result = await auth.api.generateBackupCodes({
    body: { password },
    headers: request.headers,
    returnHeaders: true,
  });

  return {
    headers: result.headers,
    data: {
      totp: {
        backupCodes: result.response.backupCodes,
        userEnabled: true,
      },
    },
  };
}
