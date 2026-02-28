import { emailOtp as EmailOtpTemplate, email2fa as Email2faTemplate, emailVerification as EmailVerificationTemplate } from "../email/templates";
import { copy } from "../lib/copy";
import { Resend } from "resend";
import { Telemetry } from "./telemetry";
import { betterAuth } from "better-auth/minimal";
import { db } from "./drizzle/db";
import { dotenv } from "./env";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "./drizzle/schema";
import { passkey } from "@better-auth/passkey";
import { username, twoFactor, emailOTP } from "better-auth/plugins";

const resend = new Resend(dotenv.RESEND_ACCESS_TOKEN);

const tel = new Telemetry("auth.hooks");
const baTel = new Telemetry("better-auth");

export function validateUsername(username: string) {
  if (username === "admin") {
    return false;
  }
  return /^[a-zA-Z0-9_-]+$/.test(username);
}

export const auth = betterAuth({
  baseURL: dotenv.PRODUCTION_URL,
  secret: dotenv.BETTER_AUTH_SECRET,
  plugins: [
    passkey({ rpID: dotenv.PRODUCTION_URL, rpName: dotenv.PRODUCTION_URL }),

    username({
      usernameValidator: validateUsername,
      displayUsernameValidator: validateUsername,
    }),

    twoFactor({
      issuer: dotenv.PRODUCTION_URL,
      otpOptions: {
        storeOTP: "plain",
        sendOTP: async (data, _request) => {
          tel.info("SEND_OTP", {
            "user.email": data.user.email,
            "user.id": data.user.id,
            channel: "email-otp",
          });
          const response = await resend.emails.send({
            from: dotenv.FROM_EMAIL,
            to: data.user.email,
            subject: copy.email_2fa_subject,
            html: Email2faTemplate(data.user.email, data.otp, dotenv.PRODUCTION_URL),
          });
          if (response.error) {
            tel.error("RESEND_ERROR", { error: response.error, headers: response.headers });
          } else {
            tel.info("RESEND_SUCCESS", { id: response.data.id, headers: response.headers });
          }
        },
      },
    }),

    emailOTP({
      expiresIn: 60 * 15,
      overrideDefaultEmailVerification: true,
      sendVerificationOTP: async (data, _request) => {
        tel.info("SEND_OTP", {
          "user.email": data.email,
          type: data.type,
          channel: "email-signin",
        });
        const response = await resend.emails.send({
          from: dotenv.FROM_EMAIL,
          to: data.email,
          subject: copy.email_otp_subject,
          html: EmailOtpTemplate(data.email, data.otp, dotenv.PRODUCTION_URL),
        });
        if (response.error) {
          tel.error("RESEND_ERROR", { error: response.error, headers: response.headers });
        } else {
          tel.info("RESEND_SUCCESS", { id: response.data.id, headers: response.headers });
        }
      },
    }),
  ],

  rateLimit: {
    window: 60,
    max: 100,
    storage: "database",
    customRules: {
      "/send-verification-email": { window: 300, max: 1 },
      "/email-otp/send-verification-otp": { window: 300, max: 1 },
      "/sign-in/email-otp": { window: 300, max: 5 },
      "/two-factor/*": { window: 300, max: 5 },
    },
  },

  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),

  advanced: {
    cookiePrefix: dotenv.COOKIE_PREFIX,
  },

  onAPIError: {
    onError: (error, ctx) => {
      const message = error instanceof Error ? error.message : String(error);
      const name = error instanceof Error ? error.name : "UnknownError";
      tel.error("API_ERROR", {
        error: name,
        message,
        session: ctx.session?.session,
        user: ctx.session?.user,
      });
    },
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async (data, _request) => {
      tel.info("SEND_VERIFICATION_EMAIL", {
        "user.email": data.user.email,
        "user.id": data.user.id,
      });
      const response = await resend.emails.send({
        from: dotenv.FROM_EMAIL,
        to: data.user.email,
        subject: copy.email_verification_subject,
        html: EmailVerificationTemplate(data.user.email, data.url, dotenv.PRODUCTION_URL),
      });
      if (response.error) {
        tel.error("RESEND_ERROR", { error: response.error, headers: response.headers });
      } else {
        tel.info("RESEND_SUCCESS", { id: response.data.id, headers: response.headers });
      }
    },
  },

  trustedOrigins: [dotenv.PRODUCTION_URL, "https://localhost:5173", "http://localhost:5173"],

  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
    },
    updateAccountOnSignIn: true,
    encryptOAuthTokens: true,
  },

  cors: {
    origin: [dotenv.PRODUCTION_URL],
    credentials: true,
  },

  logger: {
    level: "error",
    log: (level, message, ...args) => {
      const attrs: Record<string, string> = {};
      for (const arg of args) {
        if (arg && typeof arg === "object") {
          for (const [k, v] of Object.entries(arg)) {
            attrs[k] = String(v);
          }
        }
      }
      if (level === "error") {
        baTel.error(String(message), attrs);
      } else if (level === "warn") {
        baTel.warn(String(message), attrs);
      } else {
        baTel.info(String(message), attrs);
      }
    },
  },

  telemetry: { enabled: false },
});
