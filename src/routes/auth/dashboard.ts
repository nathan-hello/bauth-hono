import type { Handler } from "hono";
import { auth } from "@/server/auth";
import { AppError } from "@/lib/auth-error";
import { TaskResult, Telemetry, safeRequestAttrs } from "@/server/telemetry";
import {
    DashboardLoaderData,
    DashboardPage,
    LinkedAccount,
    type DashboardActionData,
    type TotpState,
} from "@/views/auth/dashboard";
import { redirects, routes } from "@/routes/routes";
import { convertSetCookiesToCookies } from "@/lib/cookies";
import { redirectIfNoSession, redirectWithSetCookies } from "@/routes/auth/redirect";

const tel = new Telemetry("route.dashboard");

async function getLoaderData(headers: Headers): Promise<DashboardLoaderData | null> {
    const session = await auth.api.getSession({ headers });
    if (!session) return null;

    const allSessions = await auth.api.listSessions({ headers });
    const accounts = (await auth.api.listUserAccounts({ headers })) as unknown as LinkedAccount[];
    const ret = {
        user: session.user,
        session: session.session,
        sessions: allSessions,
        accounts,
    };

    // tel.debug("LOADER_DATA", { data: JSON.stringify(ret) });

    return ret;
}

export const get: Handler = async (c) => {
    const result = await tel.task("GET", async (span) => {
        const r = await redirectIfNoSession(c.req.raw);
        if ("response" in r) {
            return r.response;
        }
        const loaded = await getLoaderData(c.req.raw.headers);
        if (!loaded) {
            return redirects.ToLogin();
        }

        span.setAttribute("user.id", loaded.user.id);

        return c.html(DashboardPage({ loaderData: loaded }));
    });
    if (result.ok) return result.data;
    return redirects.ToLogin();
};

export const post: Handler = async (c) => {
    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    const getLoaderForLogs = await getLoaderData(c.req.raw.headers);
    if (!getLoaderForLogs) {
        return redirects.ToLogin();
    }

    if (!action || !checkAction(action)) {
        tel.warn("ACTION_NOT_FOUND", { action });
        return c.html(
            DashboardPage({
                loaderData: getLoaderForLogs,
                actionData: {
                    result: {
                        action: "top-of-page",
                        success: false,
                        errors: [new AppError("internal_field_missing_action")],
                    },
                },
            }),
        );
    }

    const result: TaskResult<
        | DashboardActionData
        | {
              headers: Headers;
          }
        | {
              result: DashboardActionData["result"];
              totp: TotpState;
              headers?: Headers;
          }
    > = await tel.task("POST", async (span) => {
        if (action === "link_account") {
            const linkResult = await LinkAccount(c.req.raw, form);
            return redirectWithSetCookies(linkResult.headers, linkResult.redirectUrl);
        }

        span.setAttribute("user.id", getLoaderForLogs.user.id);
        span.setAttribute("action", action);
        tel.debug(action, safeRequestAttrs(c.req.raw, form));

        return await actions[action](c.req.raw, form);
    });

    if (result.ok) {
        if (result.data instanceof Response) {
            return result.data;
        }

        const headersForLoader =
            "headers" in result.data && result.data.headers !== undefined
                ? convertSetCookiesToCookies(c.req.raw.headers, result.data.headers)
                : c.req.raw.headers;
        const loaderAfterSuccess = await getLoaderData(headersForLoader);
        if (!loaderAfterSuccess) {
            return redirects.ToLogin();
        }

        const actionData: DashboardActionData = {
            result: "result" in result.data ? result.data.result : undefined,
            totp: "totp" in result.data ? result.data?.totp : undefined,
        };

        const html = DashboardPage({ actionData, loaderData: loaderAfterSuccess });

        if ("headers" in result.data && result.data?.headers) {
            const h = new Headers(result.data.headers);
            h.set("Content-Type", "text/html; charset=utf-8");
            return c.html(html, { headers: h });
        }

        return c.html(html);
    }

    const loaderAfterError = await getLoaderData(c.req.raw.headers);
    if (!loaderAfterError) {
        return redirects.ToLogin();
    }

    tel.error("ACTION_ERROR", { error: JSON.stringify(result.error) ?? "UNKNOWN" });

    return c.html(
        DashboardPage({
            actionData: {
                result: {
                    action,
                    success: false,
                    errors: result.error,
                },
            },
            loaderData: loaderAfterError,
        }),
    );
};

function checkAction(a: string): a is keyof typeof actions {
    return a in actions;
}

const actions = {
    change_password: PasswordChange,
    set_password: SetPassword,
    revoke_session: RevokeSession,
    email_change: EmailChange,
    email_resend_verification: EmailVerificationResend,
    two_factor_enable: TwoFactorEnable,
    two_factor_totp_verify: TwoFactorTotpVerify,
    two_factor_disable: TwoFactorDisable,
    get_totp_uri: TwoFactorGetTotpUri,
    get_backup_codes: TwoFactorGetBackupCodes,
    unlink_account: UnlinkAccount,
    link_account: LinkAccount,
};

export const actionName: { [K in keyof typeof actions]: K } = {
    change_password: "change_password",
    set_password: "set_password",
    revoke_session: "revoke_session",
    email_change: "email_change",
    email_resend_verification: "email_resend_verification",
    two_factor_enable: "two_factor_enable",
    two_factor_totp_verify: "two_factor_totp_verify",
    two_factor_disable: "two_factor_disable",
    get_totp_uri: "get_totp_uri",
    get_backup_codes: "get_backup_codes",
    link_account: "link_account",
    unlink_account: "unlink_account",
};

async function RevokeSession(request: Request, form: FormData): Promise<{ headers: Headers }> {
    const token = form.get("session")?.toString();
    if (!token) {
        throw new AppError("internal_field_missing_token");
    }
    if (token === "all") {
        const result = await auth.api.revokeOtherSessions({
            headers: request.headers,
            returnHeaders: true,
        });
        if (!result.response.status) {
            throw new AppError("generic_error");
        }

        return { headers: result.headers };
    }

    const result = await auth.api.revokeSession({
        body: { token: token },
        headers: request.headers,
        returnHeaders: true,
    });

    if (!result.response.status) {
        throw new AppError("generic_error");
    }
    return { headers: result.headers };
}

async function EmailVerificationResend(request: Request, _: FormData): Promise<DashboardActionData> {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        throw new AppError("internal_field_missing_session");
    }
    const { status } = await auth.api.sendVerificationEmail({
        body: { email: session.user.email },
    });
    if (!status) {
        throw new AppError("better_auth_returned_false");
    }
    return {
        result: {
            action: "email_resend_verification",
            success: true,
        },
    };
}

async function EmailChange(request: Request, form: FormData): Promise<{ headers: Headers }> {
    const newEmail = form.get("new_email")?.toString();
    if (!newEmail) {
        throw new AppError("internal_field_missing_new_email");
    }
    const result = await auth.api.changeEmail({
        body: { newEmail },
        headers: request.headers,
        returnHeaders: true,
    });
    return { headers: result.headers };
}

async function TwoFactorEnable(request: Request, form: FormData): Promise<{ totp: TotpState; headers: Headers }> {
    const password = form.get("password")?.toString();
    if (!password) {
        throw new AppError("INVALID_USERNAME_OR_PASSWORD");
    }
    const result = await auth.api.enableTwoFactor({
        body: { password },
        headers: request.headers,
        returnHeaders: true,
    });
    return {
        totp: {
            intermediateEnable: true,
            totpURI: result.response.totpURI,
            backupCodes: result.response.backupCodes,
            userEnabled: false,
        },
        headers: result.headers,
    };
}

async function PasswordChange(request: Request, form: FormData): Promise<{ headers: Headers }> {
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
    return { headers: result.headers };
}

async function SetPassword(request: Request, form: FormData): Promise<{ headers: Headers }> {
    const newPass = form.get("new_password")?.toString();
    const repeat = form.get("new_password_repeat")?.toString();
    if (!newPass) throw new AppError("password_mismatch");
    if (newPass !== repeat) throw new AppError("password_mismatch");
    const result = await auth.api.setPassword({
        body: { newPassword: newPass },
        headers: request.headers,
        returnHeaders: true,
    });
    return { headers: result.headers };
}

// TODO(nate): update this so when someone tries to verify
// using the Show QR Code and fails, it doesn't close the
// details and shows the error message near the input instead
// at the top of the page.
async function TwoFactorTotpVerify(
    request: Request,
    form: FormData,
): Promise<{ result: DashboardActionData["result"]; totp: TotpState; headers?: Headers }> {
    const code = form.get("totp_code")?.toString();
    const totpURI = form.get("totp_uri")?.toString();
    const alreadyVerified = form.get("already-verified")?.toString();

    if (!code) {
        throw new AppError("INVALID_CODE");
    }

    if (!totpURI) {
        throw new AppError("internal_field_missing_totp_uri");
    }
    if (!alreadyVerified) {
        throw new AppError("internal_field_missing_totp_already_verified");
    }

    try {
        const result = await auth.api.verifyTOTP({
            body: { code },
            headers: request.headers,
            returnHeaders: true,
        });
        return {
            result: {
                action: "two_factor_totp_verify",
                success: true,
            },
            headers: result.headers,
            totp: {
                verified: true,
                totpURI: alreadyVerified === "true" ? totpURI : undefined,
                userEnabled: alreadyVerified === "true",
            },
        };
    } catch (error) {
        if (error !== null && typeof error === "object" && "code" in error && error.code === "INVALID_CODE") {
            return {
                result: {
                    action: "two_factor_totp_verify",
                    success: false,
                    errors: [new AppError("INVALID_CODE")],
                },
                totp: {
                    verified: true,
                    totpURI: alreadyVerified === "true" ? totpURI : undefined,
                    userEnabled: alreadyVerified === "true",
                },
            };
        }
        return {
            result: {
                action: "two_factor_totp_verify",
                success: false,
                errors: [new AppError("generic_error")],
            },
            totp: {
                verified: true,
                totpURI: alreadyVerified === "true" ? totpURI : undefined,
                userEnabled: alreadyVerified === "true",
            },
        };
    }
}

async function TwoFactorDisable(request: Request, form: FormData): Promise<{ headers: Headers }> {
    const password = form.get("password")?.toString();
    if (!password) {
        throw new AppError("INVALID_PASSWORD");
    }
    const result = await auth.api.disableTwoFactor({
        body: { password },
        headers: request.headers,
        returnHeaders: true,
    });
    return { headers: result.headers };
}

async function TwoFactorGetTotpUri(request: Request, form: FormData): Promise<{ totp: TotpState; headers: Headers }> {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !session.user.twoFactorEnabled) {
        tel.warn("TWO_FACTOR_REQUESTED_BUT_NOT_FOUND", {
            sessionFound: session !== null,
            twoFactorEnabled: session?.user.twoFactorEnabled,
        });
        throw new AppError("SESSION_EXPIRED");
    }

    const password = form.get("password")?.toString();
    if (!password) {
        throw new AppError("INVALID_PASSWORD");
    }
    const result = await auth.api.getTOTPURI({
        body: { password },
        headers: request.headers,
        returnHeaders: true,
    });
    return {
        headers: result.headers,
        totp: {
            totpURI: result.response.totpURI,
            userEnabled: true,
        },
    };
}

async function TwoFactorGetBackupCodes(
    request: Request,
    form: FormData,
): Promise<{ headers: Headers; totp: TotpState }> {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !session.user.twoFactorEnabled) {
        throw new AppError("SESSION_EXPIRED");
    }
    const password = form.get("password")?.toString();
    if (!password) {
        throw new AppError("INVALID_PASSWORD");
    }
    const result = await auth.api.generateBackupCodes({
        body: { password },
        headers: request.headers,
        returnHeaders: true,
    });

    return {
        headers: result.headers,
        totp: {
            backupCodes: result.response.backupCodes,
            userEnabled: true,
        },
    };
}

async function LinkAccount(request: Request, form: FormData): Promise<{ redirectUrl: string; headers: Headers }> {
    const provider = form.get("provider")?.toString();
    if (!provider) {
        throw new AppError("internal_field_unknown_oauth_provider");
    }
    const result = await auth.api.linkSocialAccount({
        headers: request.headers,
        body: {
            provider: provider,
            callbackURL: routes.auth.dashboard,
        },
        returnHeaders: true,
    });
    if (result.response.url) {
        return { redirectUrl: result.response.url, headers: result.headers };
    }
    throw new AppError("generic_error");
}

async function UnlinkAccount(request: Request, form: FormData): Promise<{ headers: Headers }> {
    const providerId = form.get("providerId")?.toString();
    if (!providerId) {
        throw new AppError("internal_field_missing_providerId");
    }
    const result = await auth.api.unlinkAccount({
        headers: request.headers,
        body: { providerId },
        returnHeaders: true,
    });
    return { headers: result.headers };
}
