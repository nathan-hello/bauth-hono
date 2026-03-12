import { APIError } from "better-auth";
import { auth } from "@/server/auth";
import { defaultCopy as copy } from "@/lib/copy";

const BetterAuthCallbackErrors = [
    "invalid_callback_request",
    "state_not_found",
    "state_mismatch",
    "no_code",
    "no_callback_url",
    "oauth_provider_not_found",
    "email_not_found",
    // This is resolved with auth.accountLinking.allowDifferentEmails
    "email_doesn't_match",
    "unable_to_get_user_info",
    "unable_to_link_account",
    "account_already_linked_to_different_user",
    "signup_disabled",
] as const;

// Found by RESEND_ERROR_CODE_KEY in resend. They don't
// export the type so it's here.
export const ResendErrorCodes = [
    "invalid_idempotency_key",
    "validation_error",
    "missing_api_key",
    "restricted_api_key",
    "invalid_api_key",
    "not_found",
    "method_not_allowed",
    "invalid_idempotent_request",
    "concurrent_idempotent_requests",
    "invalid_attachment",
    "invalid_from_address",
    "invalid_access",
    "invalid_parameter",
    "invalid_region",
    "missing_required_field",
    "monthly_quota_exceeded",
    "daily_quota_exceeded",
    "rate_limit_exceeded",
    "security_error",
    "application_error",
    "internal_server_error",
] as const;

const AppErrorCodes = [
    "better_auth_returned_false",
    "code_invalid",
    "field_missing_code",
    "field_missing_email",
    "field_missing_new_username",
    "field_missing_password",
    "field_missing_password_repeat",
    "field_missing_username",
    "generic_error",
    "internal_field_missing_action",
    "internal_field_missing_already_verified",
    "internal_field_missing_email",
    "internal_field_missing_new_email",
    "internal_field_missing_oauth",
    "internal_field_missing_password",
    "internal_field_missing_code",
    "internal_field_missing_providerId",
    "internal_field_missing_session",
    "internal_field_missing_token",
    "internal_field_missing_totp_uri",
    "internal_field_missing_user_id",
    "internal_field_unknown_oauth_provider",
    "oauth_no_url_given_by_provider",
    "otp_failed",
    "password_mismatch",
    "totp_uri_not_found",
    // Better Auth codes that don't match $ERROR_CODES exactly
    // Removed because hopefully it's not an issue anymore?
    // "USERNAME_IS_TOO_SHORT",
    // "USERNAME_IS_TOO_LONG",
    // "USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER",
    // "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
    // "INVALID_OTP_CODE",
] as const;
 
export type TErrorCodes =
    | (typeof AppErrorCodes)[number]
    | (typeof ResendErrorCodes)[number]
    | (typeof BetterAuthCallbackErrors)[number]
    | keyof (typeof auth)["$ERROR_CODES"];

export class AppError extends Error {
    // This makes toString() known to callers in Typescript.
    [key: string]: any;

    readonly code: TErrorCodes;
    readonly copy: string;

    constructor(code: TErrorCodes) {
        super(code);

        if (![...AppErrorCodes, ...Object.keys(auth.$ERROR_CODES)].includes(code)) {
            this.code = "generic_error";
        }

        this.code = code;
        this.name = "AppError";
        this.copy = copy.error[this.code];
    }

    public override toString(): string {
        return this.code;
    }
}

export function errorAttrs(error: unknown): Record<string, string> {
    if (error instanceof AppError) {
        return { type: "AppError", code: error.code, message: error.message };
    }
    if (error instanceof APIError) {
        return {
            type: "APIError",
            code: error.body?.code ?? "unknown",
            status: String(error.status),
            message: error.message,
        };
    }
    if (error instanceof Error) {
        return { type: error.name, message: error.message };
    }
    return { type: "unknown", message: String(error) };
}
