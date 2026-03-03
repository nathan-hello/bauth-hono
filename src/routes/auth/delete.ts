import { AppError } from "@/lib/auth-error";
import { convertSetCookiesToCookies } from "@/lib/cookies";
import { serverError } from "@/routes/auth/redirect";
import { redirects, routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { safeRequestAttrs, Telemetry } from "@/server/telemetry";
import { DeleteAccountPage, DeleteSuccessPage } from "@/views/auth/delete";
import { Context } from "hono";

const tel = new Telemetry(routes.auth.delete);

type ActionResult = {
  data?: {
    deleted?: boolean;
    verificationType?: "email" | "totp";
    resentEmail?: boolean;
  };
  headers?: Headers;
} | null;

export async function get(c: Context) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return redirects.ToLogin;
  }
  return c.html(
    DeleteAccountPage({
      state: session.user.twoFactorEnabled
        ? { verificationType: "totp" }
        : undefined,
    }),
  );
}

export async function post(c: Context) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return redirects.ToLogin;
  }
  const form = await c.req.formData();

  const result = await tel.task("POST", async (span) => {
    const action = form.get("action")?.toString();
    span.setAttribute("user.id", session.user.id);

    if (!action || !checkAction(action)) {
      tel.error("ACTION_UNDEFINED", {
        data: safeRequestAttrs(c.req.raw, form),
      });
      throw new AppError("generic_error");
    }

    span.setAttribute("action", action);
    tel.debug(action, safeRequestAttrs(c.req.raw, form));

    return await actions[action](c.req.raw, form);
  });

  if (result.ok) {
    const r = result.data;
    if (!r) return serverError(result.traceId);

    if (r.data?.deleted) {
      return c.html(
        DeleteSuccessPage(),
        r.headers ? { headers: r.headers } : undefined,
      );
    }

    return c.html(
      DeleteAccountPage({ state: r.data }),
      r.headers ? { headers: r.headers } : undefined,
    );
  }

  return c.html(
    DeleteAccountPage({
      state: {
        verificationType: session.user.twoFactorEnabled
          ? getOtpType(form.get("otp-type")?.toString())
          : undefined,
        errors: result.error,
      },
    }),
  );
}

function checkAction(a: string): a is keyof typeof actions {
  return a in actions;
}

function getOtpType(s: string | undefined): "email" | "totp" {
  if (s === "email") return s;
  if (s === "totp") return s;
  return "totp";
}

async function ResendEmail(
  request: Request,
  _: FormData,
): Promise<ActionResult> {
  await auth.api.sendTwoFactorOTP({ headers: request.headers });
  return { data: { verificationType: "email", resentEmail: true } };
}

async function SwitchOtp(
  request: Request,
  form: FormData,
): Promise<ActionResult> {
  const to = form.get("to")?.toString();
  const type: "email" | "totp" = to === "email" ? "email" : "totp";
  if (type === "email") {
    await auth.api.sendTwoFactorOTP({ headers: request.headers });
  }
  return { data: { verificationType: type } };
}

async function DeleteAccount(
  request: Request,
  form: FormData,
): Promise<ActionResult> {
  const password = form.get("password")?.toString();
  if (!password) throw new AppError("INVALID_PASSWORD");

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;

  let headersForDelete = request.headers;

  if (session.user.twoFactorEnabled) {
    const otpHeaders = await checkOtp(request, form);
    if (!otpHeaders) throw new AppError("otp_failed");
    headersForDelete = convertSetCookiesToCookies(request.headers, otpHeaders);
  }

  const result = await auth.api.deleteUser({
    body: { password },
    headers: headersForDelete,
    returnHeaders: true,
  });

  return { data: { deleted: true }, headers: result.headers };
}

async function checkOtp(
  request: Request,
  form: FormData,
): Promise<Headers | null> {
  const otp = form.get("otp")?.toString();
  const type = form.get("otp-type")?.toString();
  if (!otp || !type) throw new AppError("otp_failed");

  if (type === "email") {
    const result = await auth.api.verifyTwoFactorOTP({
      body: { code: otp },
      headers: request.headers,
      returnHeaders: true,
    });
    return result.headers;
  }
  if (type === "totp") {
    const result = await auth.api.verifyTOTP({
      body: { code: otp },
      headers: request.headers,
      returnHeaders: true,
    });
    return result.headers;
  }

  return null;
}

const actions = {
  delete_account: DeleteAccount,
  resend_email: ResendEmail,
  switch_otp: SwitchOtp,
};

export const actionName: { [K in keyof typeof actions]: K } = {
  delete_account: "delete_account",
  resend_email: "resend_email",
  switch_otp: "switch_otp",
};
