import type { Handler } from "hono";
import { Flash } from "@/lib/flash";
import type { ActionResult, RouteActionData } from "@/lib/types";
import { auth } from "@/server/auth";
import { AppError } from "@/lib/auth-error";
import { Telemetry, safeRequestAttrs } from "@/server/telemetry";
import {
    DashboardLoaderData,
    DashboardPage,
    LinkedAccount,
    type TotpState,
} from "@/views/auth/dashboard";
import { routes } from "@/routes/routes";
import { findAction } from "@/routes/auth/lib/check-action";
import { Redirect } from "@/routes/redirect";

const tel = new Telemetry("route.dashboard");

const flash = new Flash<typeof actions, TotpState>();

export const actions = {
    change_password: { name: "change_password", handler: PasswordChange },
    set_password: { name: "set_password", handler: SetPassword },
    revoke_session: { name: "revoke_session", handler: RevokeSession },
    email_change: { name: "email_change", handler: EmailChange },
    email_resend_verification: { name: "email_resend_verification", handler: EmailVerificationResend },
    two_factor_enable: { name: "two_factor_enable", handler: TwoFactorEnable },
    two_factor_totp_verify: { name: "two_factor_totp_verify", handler: TwoFactorTotpVerify },
    two_factor_disable: { name: "two_factor_disable", handler: TwoFactorDisable },
    get_totp_uri: { name: "get_totp_uri", handler: TwoFactorGetTotpUri },
    get_backup_codes: { name: "get_backup_codes", handler: TwoFactorGetBackupCodes },
    unlink_account: { name: "unlink_account", handler: UnlinkAccount },
    link_account: { name: "link_account", handler: LinkAccount },
} as const;

export type DashboardActionData = RouteActionData<typeof actions, TotpState>;

type ActionReturnData = {
    result?: ActionResult<typeof actions>;
    state?: TotpState;
    headers?: Headers;
};

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

    return ret;
}

export const get: Handler = async (c) => {
    const result = await tel.task("GET", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw));
        const session = await getLoaderData(c.req.raw.headers);
        if (!session) {
            return new Redirect(c.req.raw).Because.NoSession();
        }

        const { actionData, headers } = flash.Consume(c.req.raw.headers);

        return c.html(
            DashboardPage({
                loaderData: session,
                actionData,
            }),
            { headers },
        );
    });
    if (result.ok) {
        return result.data;
    }
    return new Redirect(c.req.raw).Because.Error(result);
};

export const post: Handler = async (c) => {
    const form = await c.req.formData();
    const action = form.get("action")?.toString();

    const getLoaderForLogs = await getLoaderData(c.req.raw.headers);
    if (!getLoaderForLogs) {
        return new Redirect(c.req.raw).Because.NoSession();
    }

    const result = await tel.task("POST", async (span) => {
        span.setAttributes(safeRequestAttrs(c.req.raw, form));
        const handler = findAction(actions, action);
        return await handler(c.req.raw, form);
    });

    if (result.ok) {
        if (result.data instanceof Response) {
            return result.data;
        }

        return flash.Respond(c.req.raw, result.data.headers, {
            result: result.data.result ?? { action: action, success: true },
            state: result.data.state,
        });
    }

    return flash.Respond(c.req.raw, undefined, {
        result: { action, success: false, errors: result.error },
        state: await getTotpStateAfterError(c.req.raw, form),
    });
};

async function getTotpStateAfterError(request: Request, form: FormData): Promise<TotpState | undefined> {
    const totpURI = form.get("totp_uri")?.toString();
    const backupCodesRaw = form.get("backup_codes")?.toString();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !totpURI || !backupCodesRaw) {
        return undefined;
    }

    let backupCodes: string[];
    try {
        backupCodes = JSON.parse(backupCodesRaw);
    } catch {
        return undefined;
    }

    const showTotp = totpURI && backupCodesRaw ? true : false;

    const userEnabled = showTotp && session.user.twoFactorEnabled ? true : false;
    const intermediateEnable = showTotp && !session.user.twoFactorEnabled;

    return {
        intermediateEnable,
        userEnabled,
        totpURI,
        backupCodes,
    };
}

async function RevokeSession(request: Request, form: FormData): Promise<ActionReturnData> {
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

async function EmailVerificationResend(request: Request, _: FormData): Promise<ActionReturnData> {
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

async function EmailChange(request: Request, form: FormData): Promise<ActionReturnData> {
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

async function TwoFactorEnable(request: Request, form: FormData): Promise<ActionReturnData> {
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
        state: {
            intermediateEnable: true,
            totpURI: result.response.totpURI,
            backupCodes: result.response.backupCodes,
            userEnabled: false,
        },
        headers: result.headers,
    };
}

async function PasswordChange(request: Request, form: FormData): Promise<ActionReturnData> {
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

async function SetPassword(request: Request, form: FormData): Promise<ActionReturnData> {
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

async function TwoFactorTotpVerify(request: Request, form: FormData): Promise<ActionReturnData> {
    const code = form.get("totp_code")?.toString();
    const totpURI = form.get("totp_uri")?.toString();
    const backupCodesRaw = form.get("backup_codes")?.toString();

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        throw new AppError("SESSION_EXPIRED");
    }

    if (!code) {
        throw new AppError("INVALID_CODE");
    }
    if (!totpURI) {
        throw new AppError("internal_field_missing_totp_uri");
    }

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
        state: {
            userEnabled: true,
            totpURI: totpURI,
            backupCodes: backupCodesRaw ? JSON.parse(backupCodesRaw) : undefined,
            intermediateEnable: false,
        },
    };
}

async function TwoFactorDisable(request: Request, form: FormData): Promise<ActionReturnData> {
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

async function TwoFactorGetTotpUri(request: Request, form: FormData): Promise<ActionReturnData> {
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
        state: {
            totpURI: result.response.totpURI,
            userEnabled: true,
        },
    };
}

async function TwoFactorGetBackupCodes(request: Request, form: FormData): Promise<ActionReturnData> {
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
        state: {
            backupCodes: result.response.backupCodes,
            userEnabled: true,
        },
    };
}

async function LinkAccount(request: Request, form: FormData): Promise<Response> {
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
    if (!result.response.url) {
        // In the handler for auth.api.linkSocialAcount (and signInSocial), the
        // only way that we don't get a redirect url is if we pass an idToken in
        // the body.
        throw new AppError("oauth_no_url_given_by_provider");
    }

    return new Redirect(request, result.headers).Because.Oauth(result.response.url);
}

async function UnlinkAccount(request: Request, form: FormData): Promise<ActionReturnData> {
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
