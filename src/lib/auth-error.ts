import { ERROR_COPY } from "@/lib/copy";
import { APIError } from "better-auth";
import { auth } from "@/server/auth";

export type AuthApiErrors = keyof (typeof auth)["$ERROR_CODES"];

const AppErrorCodes = [
  "generic_error",
  "totp_uri_not_found",
  "password_mismatch",
  "otp_failed",
  "code_invalid",
  "field_missing_code",
  "field_missing_email",
  "field_missing_password",
  "field_missing_password_repeat",
  // Better Auth codes that don't match $ERROR_CODES exactly
  "USERNAME_IS_TOO_SHORT",
  "USERNAME_IS_TOO_LONG",
  "USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER",
  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
  "INVALID_OTP_CODE",
] as const;

const ErrorCodes = [
  ...AppErrorCodes,
  ...Object.keys(
    auth.$ERROR_CODES ? auth.$ERROR_CODES : { ERROR_CODES_NOT_FOUND: true },
  ),
];

export type TErrorCodes = (typeof AppErrorCodes)[number] | AuthApiErrors;

export class AppError extends Error {
  // This makes toString() known to callers in Typescript.
  [key: string]: any;

  readonly code: TErrorCodes;

  constructor(code: TErrorCodes) {
    super(code);

    if (!ErrorCodes.includes(code)) {
      this.code = "generic_error";
    }

    this.code = code;
    this.name = "AppError";
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

/**
 * Specifically disallow AppError from being passed to this function.
 * There are catches in the function for when this happens, which is
 * just for the try/catch inside of Telemetry.task, as all catches are
 * typed as unknown so Typescript can't check it. Anyone trying to call
 * this function with a known AppError | AppError[] should simply not
 * do that.
 */
export function getAuthError<T>(
  e: T extends AppError ? never : T extends AppError[] ? never : unknown,
): AppError[] {
  if (e instanceof AppError) {
    return [e];
  }
  if (Array.isArray(e) && e[0] instanceof AppError) {
    return e;
  }

  if (e instanceof APIError) {
    const code = e.body?.code;
    if (typeof code === "string" && code in ERROR_COPY) {
      return [new AppError(code as TErrorCodes)];
    }
  }

  return [new AppError("generic_error")];
}
