import * as emails from "@/views/email/emails";
import { copy } from "@/lib/copy";
import { Resend } from "resend";
import { Telemetry } from "@/server/telemetry";
import { betterAuth } from "better-auth/minimal";
import { db } from "@/server/drizzle/db";
import { dotenv, optionalEnv } from "@/server/env";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "@/server/drizzle/schema";
import { eq } from "drizzle-orm";
import { passkey } from "@better-auth/passkey";
import { username, twoFactor, emailOTP } from "better-auth/plugins";

const resend = new Resend(dotenv.RESEND_ACCESS_TOKEN);

const tel = new Telemetry("auth.hooks");
const baTel = new Telemetry("better-auth");

export function validateUsername(username: string): boolean {
    if (username === "admin" || username.length === 0) return false;

    for (let i = 0; i < username.length; i++) {
        const code = username.charCodeAt(i);

        const isNumeric = code >= "0".charCodeAt(0) && code <= "9".charCodeAt(0);
        const isUpper = code >= "A".charCodeAt(0) && code <= "Z".charCodeAt(0);
        const isLower = code >= "a".charCodeAt(0) && code <= "z".charCodeAt(0);

        if (!(isNumeric || isUpper || isLower)) {
            return false;
        }
    }

    return true;
}

export const auth = betterAuth({
    baseURL: dotenv.PRODUCTION_URL,
    secret: dotenv.BETTER_AUTH_SECRET,

    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        expiresIn: 60 * 60 * 24,
        sendVerificationEmail: async (data, _request) => {
            const result = await tel.task("EMAIL", async (span) => {
                span.setAttributes({
                    "user.email": data.user.email,
                    "user.id": data.user.id,
                    channel: "verify-email",
                });
                const response = await resend.emails.send({
                    from: dotenv.FROM_EMAIL,
                    to: data.user.email,
                    subject: copy.email_verification_subject,
                    html: emails
                        .EmailVerification({
                            email: data.user.email,
                            verificationLink: data.url,
                            url: dotenv.PRODUCTION_URL,
                        })
                        .toString(),
                });
                if (response.error) {
                    throw response.error;
                }
                return response;
            });

            if (result.ok) {
                tel.info("RESEND_SUCCESS", {
                    id: result.data.data.id,
                    headers: result.data.headers,
                });
            }
        },
    },

    user: {
        changeEmail: {
            enabled: true,
            updateEmailWithoutVerification: true,
        },
        deleteUser: {
            enabled: true,
        },
    },
    plugins: [
        passkey({ rpID: dotenv.PRODUCTION_URL, rpName: dotenv.PRODUCTION_URL }),
        username({
            usernameValidator: validateUsername,
            displayUsernameValidator: validateUsername,
            maxUsernameLength: 32,
            minUsernameLength: 1,
            usernameNormalization: (s) => s,
        }),
        twoFactor({
            issuer: dotenv.PRODUCTION_URL,
            otpOptions: {
                storeOTP: "plain",
                sendOTP: async (data, _request) => {
                    const result = await tel.task("EMAIL", async (span) => {
                        span.setAttributes({
                            "user.email": data.user.email,
                            "user.id": data.user.id,
                            channel: "twoFactor.sendOTP",
                        });
                        const response = await resend.emails.send({
                            from: dotenv.FROM_EMAIL,
                            to: data.user.email,
                            subject: copy.email_2fa_subject,
                            html: emails
                                .Email2fa({
                                    email: data.user.email,
                                    otp: data.otp,
                                    url: dotenv.PRODUCTION_URL,
                                })
                                .toString(),
                        });
                        if (response.error) {
                            throw response.error;
                        }
                        return response;
                    });
                    if (result.ok) {
                        tel.debug("RESEND_SUCCESS", {
                            emailId: result.data.data.id,
                            headers: result.data.headers,
                        });
                    }
                },
            },
        }),
        emailOTP({
            expiresIn: 60 * 15,
            overrideDefaultEmailVerification: true,
            sendVerificationOTP: async (data, _request) => {
                const result = await tel.task("EMAIL", async (span) => {
                    span.setAttributes({
                        "user.email": data.email,
                        type: data.type,
                        channel: "emailOTP.sendVerificationOTP",
                    });
                    const response = await resend.emails.send({
                        from: dotenv.FROM_EMAIL,
                        to: data.email,
                        subject: copy.email_otp_subject,
                        html: emails
                            .EmailOtp({
                                email: data.email,
                                otp: data.otp,
                                url: dotenv.PRODUCTION_URL,
                            })
                            .toString(),
                    });
                    if (response.error) {
                        throw response.error;
                    }
                    return response;
                });
                if (result.ok) {
                    tel.info("RESEND_SUCCESS", {
                        id: result.data.data.id,
                        headers: result.data.headers,
                    });
                }
            },
        }),
    ],

    socialProviders: {
        google: {
            enabled: optionalEnv.GOOGLE_CLIENT_ID && optionalEnv.GOOGLE_CLIENT_SECRET ? true : false,
            clientId: optionalEnv.GOOGLE_CLIENT_ID ?? "",
            clientSecret: optionalEnv.GOOGLE_CLIENT_SECRET ?? "",
            accessType: "offline",
            disableImplicitSignUp: false,
            display: "page",
            prompt: "select_account consent",
        },
        apple: {
            enabled: optionalEnv.APPLE_CLIENT_ID && optionalEnv.APPLE_CLIENT_SECRET ? true : false,
            clientId: optionalEnv.APPLE_CLIENT_ID ?? "",
            clientSecret: optionalEnv.APPLE_CLIENT_SECRET ?? "",
            accessType: "offline",
            disableImplicitSignUp: false,
            display: "page",
            prompt: "select_account consent",
        },
    },

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
        // This is neccesary because the browser treats localhost as
        // "secure" but it doesn't actually use https, so any session
        // tokens in dev will not work because better-auth will give
        // a __Secure. cookie by default.
        useSecureCookies: process.env.NODE_ENV !== "development",
    },

    onAPIError: {
        errorURL: "/auth/error",
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

    trustedOrigins: [dotenv.PRODUCTION_URL, "https://localhost:5173", "http://localhost:5173"],

    account: {
        accountLinking: {
            enabled: true,
            allowDifferentEmails: true,
        },
        encryptOAuthTokens: true,
        additionalFields: {
            email: {
                type: "string",
                required: false,
            },
        },
    },

    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    if (user.username) {
                        return;
                    }

                    let username: string;
                    let attempts = 0;
                    const maxAttempts = 100;

                    while (attempts < maxAttempts) {
                        const randomSuffix = Math.random().toString(36).substring(2, 8);
                        username = `user_${randomSuffix}`;

                        const existing = db.select().from(schema.user).where(eq(schema.user.username, username)).get();

                        if (existing) {
                            attempts++;
                            continue;
                        }

                        return { data: { ...user, username } };
                    }

                    const fallbackSuffix = Date.now().toString(36);
                    username = `user_${fallbackSuffix}`;

                    return { data: { ...user, username } };
                },
            },
        },
        account: {
            create: {
                // Extract the user's email from the OAuth provider's ID token
                // and store it on the account record. This is needed because
                // better-auth doesn't persist the provider email on the account
                // by default, so we pull it from the JWT ourselves.
                before: async (account) => {
                    // Only process OAuth accounts that have an ID token.
                    // "credential" is the providerId for email/password accounts,
                    // which already have an email and don't use JWTs.
                    if (!account.idToken || account.providerId === "credential") {
                        return;
                    }

                    try {
                        // A JWT is three base64url-encoded segments separated by dots:
                        //   [0] header  – algorithm & token type
                        //   [1] payload – the claims (email, sub, iat, etc.)
                        //   [2] signature
                        // We only need the payload (index 1) to read the email claim.
                        const [_header, payloadB64, _signature] = account.idToken.split(".");

                        if (!payloadB64) {
                            return;
                        }

                        const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));

                        if (typeof payload.email === "string" && payload.email) {
                            return { data: { ...account, email: payload.email } };
                        }
                    } catch {
                        // The idToken wasn't a valid JWT – this can happen with
                        // some providers. Safe to ignore; the account just won't
                        // have a provider email stored.
                    }
                },
            },
        },
    },

    cors: {
        origin: [dotenv.PRODUCTION_URL],
        credentials: true,
    },

    logger: {
        level: "debug",
        log: (level, message, ...args) => {
            const attrs: Record<string, string> = {};
            for (const arg of args) {
                if (arg && typeof arg === "object") {
                    for (const [k, v] of Object.entries(arg)) {
                        attrs[k] = String(v);
                    }
                }
            }
            baTel[level](message, attrs);
        },
    },

    telemetry: { enabled: false },
});
