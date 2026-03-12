import type { TErrorCodes } from "@/lib/auth-error";
import type { auth } from "@/server/auth";
import { routes } from "@/routes/routes";

// prettier-ignore
const BA_CALLBACK_ERRORS_COPY = {
    invalid_callback_request                 : "Provider gave an improper callback request.",
    state_not_found                          : "Provider gave an improper state.",
    state_mismatch                           : "Provider state did not match internal state.",
    no_code                                  : "Provider did not provide a challenge code.",
    no_callback_url                          : "No callback URL was given.",
    oauth_provider_not_found                 : "Provider not found.",
    email_not_found                          : "Provider did not give an email address for user.",
    // This is resolved with auth.accountLinking.allowDifferentEmails: true
    "email_doesn't_match"                    : "Email address on other accout does not match internal.",
    unable_to_get_user_info                  : "Unable to get user info.",
    unable_to_link_account                   : "Unable to link account.",
    account_already_linked_to_different_user : "Account already linked to another user.",
    signup_disabled                          : "Signup is disabled.",
};

// prettier-ignore
const EmailErrors = {
    invalid_idempotency_key                 : "Email error (001)",
    validation_error                        : "Email error (002)",
    missing_api_key                         : "Email error (003)",
    restricted_api_key                      : "Email error (004)",
    invalid_api_key                         : "Email error (005)",
    not_found                               : "Email error (006)",
    method_not_allowed                      : "Email error (007)",
    invalid_idempotent_request              : "Email error (008)",
    concurrent_idempotent_requests          : "Email error (009)",
    invalid_attachment                      : "Email error (010)",
    invalid_from_address                    : "Email error (011)",
    invalid_access                          : "Email error (012)",
    invalid_parameter                       : "Email error (013)",
    invalid_region                          : "Email error (014)",
    missing_required_field                  : "Email error (015)",
    monthly_quota_exceeded                  : "Email error (016)",
    daily_quota_exceeded                    : "Email error (017)",
    rate_limit_exceeded                     : "Email error (018)",
    security_error                          : "Email error (019)",
    application_error                       : "Email error (020)",
    internal_server_error                   : "Email error (021)",
}

// prettier-ignore
const InternallyGeneratedErrors = {
    better_auth_returned_false              : "Internal error (500) - 501",
    code_invalid                            : "Invalid verification code.",
    field_missing_code                      : "Missing OTP",
    field_missing_email                     : "Missing email",
    field_missing_new_username              : "Missing new username",
    field_missing_password                  : "Missing password",
    field_missing_password_repeat           : "Missing password",
    field_missing_username                  : "Missing username",
    generic_error                           : "Something wrong happened.",
    internal_field_missing_action           : "Internal error (500) - 502",
    internal_field_missing_already_verified : "Internal error (500) - 509",
    internal_field_missing_new_email        : "Internal error (500) - 503",
    internal_field_missing_oauth            : "Internal error (500) - 504",
    internal_field_missing_password         : "Internal error (500) - 505",
    internal_field_missing_providerId       : "Internal error (500) - 506",
    internal_field_missing_session          : "Internal error (500) - 507",
    internal_field_missing_token            : "Internal error (500) - 508",
    internal_field_missing_totp_uri         : "Internal error (500) - 510",
    internal_field_missing_user_id          : "Internal error (500) - 511",
    internal_field_unknown_oauth_provider   : "Internal error (500) - 512",
    internal_field_missing_email            : "Internal error (500) - 512",
    internal_field_missing_code             : "Internal error (500) - 513",
    oauth_no_url_given_by_provider          : "Internal error (500) - 514",
    otp_failed                              : "Verification failed.",
    password_mismatch                       : "Passwords do not match.",
    totp_uri_not_found                      : "Internal error (500) - 513",
}

type a<T> = {
    [K in keyof T]: string;
};
// prettier-ignore
const BetterAuthErrors: a<typeof auth.$ERROR_CODES>  = {
    ASYNC_VALIDATION_NOT_SUPPORTED                : "Async validation not supported.",
    CALLBACK_URL_REQUIRED                         : "Callback url required.",
    CROSS_SITE_NAVIGATION_LOGIN_BLOCKED           : "Cross site navigation login blocked.",
    EMAIL_ALREADY_VERIFIED                        : "Email already verified.",
    EMAIL_MISMATCH                                : "Email mismatch.",
    FAILED_TO_CREATE_VERIFICATION                 : "Failed to create verification.",
    FIELD_NOT_ALLOWED                             : "Field not allowed.",
    INVALID_CALLBACK_URL                          : "Invalid callback url.",
    INVALID_ERROR_CALLBACK_URL                    : "Invalid error callback url.",
    INVALID_NEW_USER_CALLBACK_URL                 : "Invalid new user callback url.",
    INVALID_ORIGIN                                : "Invalid origin.",
    INVALID_REDIRECT_URL                          : "Invalid redirect url.",
    LINKED_ACCOUNT_ALREADY_EXISTS                 : "Linked account already exists.",
    MISSING_FIELD                                 : "Missing field.",
    MISSING_OR_NULL_ORIGIN                        : "Missing or null origin.",
    SESSION_NOT_FRESH                             : "Session not fresh.",
    VALIDATION_ERROR                              : "Invalid form field.",
    VERIFICATION_EMAIL_NOT_ENABLED                : "Verification email not enabled.",
    INVALID_USERNAME                              : "Username is invalid.",
    USERNAME_TOO_SHORT                            : "Username is too short.",
    USERNAME_TOO_LONG                             : "Username is too long.",
    ACCOUNT_NOT_FOUND                             : "Invalid credentials.",
    CREDENTIAL_ACCOUNT_NOT_FOUND                  : "Invalid credentials.",
    INVALID_OTP                                   : "Code is incorrect.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL         : "Email taken.",
    TOO_MANY_ATTEMPTS                             : "Too many unsuccessful attempts.",
    EMAIL_CAN_NOT_BE_UPDATED                      : "Email cannot be updated.",
    EMAIL_NOT_VERIFIED                            : "Email is not yet verified.",
    FAILED_TO_CREATE_SESSION                      : "Failed to create session.",
    FAILED_TO_CREATE_USER                         : "Failed to create user.",
    FAILED_TO_GET_SESSION                         : "Failed to get session.",
    FAILED_TO_GET_USER_INFO                       : "Failed to get user info.",
    FAILED_TO_UNLINK_LAST_ACCOUNT                 : "You can't unlink your last account.",
    FAILED_TO_UPDATE_USER                         : "Failed to update user.",
    ID_TOKEN_NOT_SUPPORTED                        : "Id token not supported.",
    INVALID_EMAIL                                 : "Invalid email.",
    INVALID_EMAIL_OR_PASSWORD                     : "Invalid credentials.",
    INVALID_PASSWORD                              : "Invalid password.",
    INVALID_TOKEN                                 : "Invalid token.",
    PASSWORD_TOO_LONG                             : "Password too long.",
    PASSWORD_TOO_SHORT                            : "Password too short.",
    PROVIDER_NOT_FOUND                            : "Provider not found.",
    SESSION_EXPIRED                               : "Session expired.",
    SOCIAL_ACCOUNT_ALREADY_LINKED                 : "Social account already linked.",
    USER_ALREADY_EXISTS                           : "There is already an account with this email.",
    USER_ALREADY_HAS_PASSWORD                     : "User already has password.",
    USER_EMAIL_NOT_FOUND                          : "User email not found.",
    USER_NOT_FOUND                                : "Invalid credentials.",
    USERNAME_IS_ALREADY_TAKEN                     : "Username is taken.",
    UNABLE_TO_CREATE_SESSION                      : "Unable to create session.",
    AUTHENTICATION_FAILED                         : "Authentication failed.",
    BACKUP_CODES_NOT_ENABLED                      : "Backup codes not enabled.",
    CHALLENGE_NOT_FOUND                           : "Challenge not found.",
    FAILED_TO_UPDATE_PASSKEY                      : "Failed to update passkey.",
    FAILED_TO_VERIFY_REGISTRATION                 : "Failed to verify registration.",
    INVALID_BACKUP_CODE                           : "Invalid backup code.",
    INVALID_CODE                                  : "Two factor code is invalid.",
    INVALID_DISPLAY_USERNAME                      : "Invalid display username.",
    INVALID_TWO_FACTOR_COOKIE                     : "Login expired. Log out and log back in again.",
    INVALID_USERNAME_OR_PASSWORD                  : "Invalid credentials.",
    OTP_EXPIRED                                   : "OTP has expired.",
    OTP_HAS_EXPIRED                               : "OTP has expired.",
    OTP_NOT_ENABLED                               : "OTP not enabled.",
    PASSKEY_NOT_FOUND                             : "Passkey not found.",
    TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE            : "Too many attempts.",
    TOTP_NOT_ENABLED                              : "Authenticator app (TOTP) not enabled.",
    TWO_FACTOR_NOT_ENABLED                        : "Two factor authentication not enabled.",
    UNEXPECTED_ERROR                              : "Unexpected error.",
    YOU_ARE_NOT_ALLOWED_TO_REGISTER_THIS_PASSKEY  : "You are not allowed to register this passkey.",
    YOU_CANNOT_BAN_YOURSELF                       : "You cannot ban yourself.",
    YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE      : "You are not allowed to change users role.",
    YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS           : "You are not allowed to create users.",
    YOU_ARE_NOT_ALLOWED_TO_LIST_USERS             : "You are not allowed to list users.",
    YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS    : "You are not allowed to list users sessions.",
    YOU_ARE_NOT_ALLOWED_TO_BAN_USERS              : "You are not allowed to ban users.",
    YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS      : "You are not allowed to impersonate users.",
    YOU_ARE_NOT_ALLOWED_TO_UPDATE_USERS           : "You are not allowed to update user.",
    YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS           : "You are not allowed to delete user.",
    YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS  : "You are not allowed to revoke users sessions.",
    YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD     : "You are not allowed to set users password.",
    BANNED_USER                                   : "User is banned.",
    YOU_ARE_NOT_ALLOWED_TO_GET_USER               : "You are not allowed to get user.",
    INVALID_ROLE_TYPE                             : "Invalid role type.",
    NO_DATA_TO_UPDATE                             : "No data to update.",
    YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE : "You are not allowed to set non existent value.",
    YOU_CANNOT_IMPERSONATE_ADMINS                 : "You cannot impersonate admins.",
    YOU_CANNOT_REMOVE_YOURSELF                    : "You cannot remove yourself.",
};

const ERROR_COPY: Record<TErrorCodes, string> = {
    ...EmailErrors,
    ...InternallyGeneratedErrors,
    ...BetterAuthErrors,
    ...BA_CALLBACK_ERRORS_COPY,
};

export type RouteMetadata = { title: string };

type R<T = typeof routes> = {
    [K in keyof T]: T[K] extends string ? RouteMetadata : T[K] extends object ? R<T[K]> : T[K];
};

const RoutesCopy: R = {
    auth: {
        api: {
            title: "/auth/api",
        },
        admin: {
            title: "Admin",
        },
        changeEmail: {
            title: "Change email",
        },
        changePassword: {
            title: "Change password",
        },
        changeUsername: {
            title: "Change username",
        },
        dashboard: {
            title: "Account settings",
        },
        delete: {
            title: "Delete account",
        },
        error: {
            title: "500 Error",
        },
        forgot: {
            title: "Forgot password",
        },
        login: {
            title: "Log in",
        },
        logout: {
            title: "Log out",
        },
        register: {
            title: "Sign up",
        },
        setup: {
            title: "Setup account",
        },
        twoFactor: {
            title: "Two factor check",
        },
        twoFactorBackup: {
            title: "Backup code verification",
        },
    },
    debug: {
        home: {
            title: "Debug home",
        },
        email: {
            title: "Debug email",
        },
    },
    index: {
        title: "",
    },
};

const OAUTH_COPY = {
    login_prompt: "Sign in with",
    register_prompt: "Sign up with",
    providers: {
        google: "Google",
        apple: "Apple",
    },
};

export default {
    error: ERROR_COPY,
    oauth: OAUTH_COPY,
    routes: RoutesCopy,

    report_this_trace_id: "Report the following Trace ID",

    home_signed_in_as: "Signed in as",
    home_not_signed_in: "Not signed in",
    home_debug: "Debug",

    register_prompt: "Don't have an account?",
    login_prompt: "Already have an account?",
    back_to_login: "Back to login",
    change_prompt: "Forgot password?",
    code_resend: "Resend code",
    sign_out: "Sign out",
    email_sent: "Email sent.",

    username: "Username",
    username_not_set: "No username set",
    email: "Email",
    email_or_username: "Email or username",
    password: "Password",
    code: "Code",
    repeat_password: "Repeat password",
    continue: "Continue",

    totp_manual_secret: "Secret:",
    totp_manual_alg: "Algorithm:",
    totp_manual_period: "Period:",
    totp_manual_period_seconds: "seconds",
    totp_manual_digits: "Digits:",
    totp_tab_link: "Link",
    totp_tab_qr: "QR",
    totp_tab_manual: "Manual",

    go_home: "Go home",
    go_dashboard: "Account settings",
    go_back: "Back",

    forgot_email_prompt: "Enter your email to reset your password.",
    forgot_code_prompt: "Enter the code sent to your email.",

    twofa_prompt_email: "Enter the code sent to your email",
    twofa_prompt_totp: "Enter the code shown in your authenticator app (TOTP).",
    twofa_prompt_backup: "Enter a backup code",
    twofa_backup_placeholder: "XXXXX-XXXXX",
    twofa_switch_to_totp: "Use authenticator app instead",
    twofa_switch_to_email: "Use email verification instead",
    twofa_use_authenticator: "Use authenticator or email instead",
    twofa_use_backup: "Use a backup code instead",

    dashboard_password_changed: "Password changed successfully",
    dashboard_username_changed: "Username changed successfully",

    change_email: "Change Email",
    change_username: "Change Username",
    email_verification_sent: "Email verification sent.",
    resend_email_verification: "Resend Email Verification",
    email_verified: "Email verified!",

    password_current: "Current Password",
    password_current_placeholder: "Current Password",
    password_new: "New Password",
    password_new_placeholder: "New Password",
    password_repeat_new: "Repeat New Password",
    password_repeat_new_placeholder: "Repeat new password",
    password_change: "Change Password",
    password_set: "Set Password",
    password_setup_prompt: "Set a password to sign in directly.",

    dashboard_setup: "Setup",

    dashboard_2fa_heading: "Two-Factor Authentication",
    dashboard_2fa_description: "Use an authenticator app (TOTP) for two factor authentication.",
    dashboard_2fa_enable: "Enable 2FA",
    dashboard_2fa_setup_prompt: "Verify using your authenticator app to complete setup.",
    dashboard_2fa_active: "Two-factor authentication is active.",
    dashboard_2fa_success: "Success!",
    dashboard_2fa_show_qr: "Show QR Code",
    dashboard_2fa_new_backup_codes: "New Backup Codes",
    dashboard_2fa_disable: "Disable 2FA",
    dashboard_2fa_optional_verify: "2FA is enabled, meaning no further action is necessary. Use the box below to test.",
    dashboard_2fa_verify_prompt: "Verify with a code from your app.",
    dashboard_2fa_code_placeholder: "6-digit code",
    dashboard_2fa_verify_button: "Verify Code",
    dashboard_2fa_open_totp_link: "Click to open in authenticator app.",

    dashboard_backup_codes_title: "Backup Codes",
    dashboard_backup_codes_save: "Save these somewhere safe. Each code works once.",

    dashboard_linked_accounts_heading: "Accounts",
    dashboard_linked_accounts_is_linked: "Linked",
    dashboard_linked_accounts_not_linked: "Not set",
    dashboard_linked_accounts_unlink: "Unlink",
    dashboard_linked_accounts_link: "Link",
    dashboard_linked_accounts_credential: "Email & Password",

    dashboard_sessions_heading: "Sessions",
    dashboard_session_current: "Current",
    dashboard_session_revoke: "Revoke",
    dashboard_session_revoke_other_sessions: "Revoke Other Sessions",

    dashboard_delete_account_heading: "Danger Zone",
    dashboard_delete_account_button: "Delete Account",
    delete_confirm_button: "I'm sure. Delete my account",
    delete_section_header_password_only: "Enter your password to verify deleting your account.",
    delete_section_header_password_and_2fa: "Enter your password and 2FA to verify deleting your account.",
    delete_section_header_2fa_only: "Enter your 2FA code to verify deleting your account.",
    delete_section_header_oauth_no_password_or_2fa: "Are you sure you want to delete your account?",

    delete_go_back: "Back to safety",
    delete_success_header: "Your account has been successfully deleted.",

    email_2fa_body: "Your two-factor authentication code for",
    email_2fa_expiry: "This code expires shortly. Do not share it with anyone.",
    email_2fa_subject: "One time passcode",

    email_otp_body: "Your one-time login code for",
    email_otp_expiry: "This code expires in 15 minutes. Do not share it with anyone.",
    email_otp_subject: "One time passcode",

    email_verification_subject: "Email verification",
    email_verify_body: "Click the link below to verify the email address",

    email_reset_password_subject: "Password reset",
    email_reset_password_link_body: "Click the link below to reset your password.",
    email_reset_password_otp_body: "Use the code below to reset your password.",

    email_footer_prefix:
        "If you did not initiate this request, you can safely ignore this email. If you believe your account has been compromised,",
    email_footer_reset: "reset your password",
    email_footer_middle: "or go to your",
    email_footer_dashboard: "dashboard",
    email_footer_suffix: "to review your account.",

    email_change_subject: "Change email address",
    email_change_body: "Click the link below to confirm changing your email address.",
    email_change_from: "From",
    email_change_to: "to",

    you_have_been_banned: "You have been banned.",
};
