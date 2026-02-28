import { ERROR_COPY } from "@/lib/copy";
import { APIError } from "better-auth";
import { auth } from "@/server/auth";

export type AuthApiErrors = keyof (typeof auth)["$ERROR_CODES"];

const AppErrorCodes = [
  "totp_uri_not_found",
  "password_mismatch",
  "otp_failed",
  "code_invalid",
  // Better Auth codes that don't match $ERROR_CODES exactly
  "USERNAME_IS_TOO_SHORT",
  "USERNAME_IS_TOO_LONG",
  "USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER",
  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
  "INVALID_OTP_CODE",
  "generic_error",
] as const;

const ErrorCodes = [
  ...AppErrorCodes,
  ...Object.keys(auth.$ERROR_CODES ? auth.$ERROR_CODES : { ERROR_CODES_NOT_FOUND: true }),
];

export type TErrorCodes = (typeof AppErrorCodes)[number] | AuthApiErrors;

export type AuthError = {
  type: TErrorCodes;
};

export class AppError extends Error {
  readonly code: TErrorCodes;

  constructor(code: TErrorCodes, internal?: string) {
    super(internal ?? code);

    if (!ErrorCodes.includes(code)) {
      this.code = "generic_error";
    }

    this.code = code;
    this.name = "AppError";
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

export function getAuthError(e: unknown): AuthError[] {
  if (e instanceof AppError) {
    return [{ type: e.code }];
  }

  if (e instanceof APIError) {
    const code = e.body?.code;
    if (typeof code === "string" && code in ERROR_COPY) {
      return [{ type: code as TErrorCodes }];
    }
    return [{ type: "generic_error" }];
  }

  return [{ type: "generic_error" }];
}
