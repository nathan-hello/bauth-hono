import { ErrorPage } from "@/views/components/error";
import { copy } from "@/lib/copy";
import { routes } from "./routes";
import { TaskResult } from "@/server/telemetry";
import { decodeFlash, encodeFlash, type FlashValue } from "@/lib/flash";
import { dotenv } from "@/server/env";
import { parse, serialize } from "cookie";

function to(url: string, headers?: Headers): Response {
    const responseHeaders = new Headers({ Location: url });

    if (headers) {
        for (const cookie of headers.getSetCookie()) {
            responseHeaders.append("Set-Cookie", cookie);
        }
    }

    return new Response(null, { status: 302, headers: responseHeaders });
}

function appendHeaders(target: Headers, source?: Headers) {
    if (!source) {
        return;
    }

    for (const cookie of source.getSetCookie()) {
        target.append("Set-Cookie", cookie);
    }
}

function flashCookieName() {
    return `${dotenv.COOKIE_PREFIX}.flash`;
}

function flashCookieOptions(maxAge: number) {
    return {
        path: "/",
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        maxAge,
    };
}

export class Redirect {
    constructor(
        private request: Request,
        private headers?: Headers,
    ) {}

    static ConsumeFlash<T extends FlashValue>(cookie: string | null) {
        const parsed = parse(cookie || "");
        const raw = parsed[flashCookieName()];
        if (!raw) {
            return {
                actionData: undefined,
                headers: undefined,
            };
        }

        const headers = new Headers();
        headers.append("Set-Cookie", serialize(flashCookieName(), "", flashCookieOptions(0)));

        return {
            actionData: decodeFlash<T>(raw),
            headers,
        };
    }

    Flash<T extends FlashValue>(actionData: T): Response {
        const url = new URL(this.request.url);
        const headers = new Headers({ Location: `${url.pathname}${url.search}` });

        appendHeaders(headers, this.headers);
        headers.append("Set-Cookie", serialize(flashCookieName(), encodeFlash(actionData), flashCookieOptions(60)));

        return new Response(null, { status: 303, headers });
    }

    After = {
        Login: () => {
            if (process.env.NODE_ENV === "development") {
                return to(routes.debug.home, this.headers);
            }
            return to(routes.index, this.headers);
        },
        Register: () => {
            if (process.env.NODE_ENV === "development") {
                return to(routes.debug.home, this.headers);
            }
            return to(routes.index, this.headers);
        },
        PasswordReset: () => {
            return to(routes.auth.dashboard, this.headers);
        },
        Logout: () => {
            return to(routes.auth.login, this.headers);
        },
        OAuth: () => {
            return to(routes.auth.dashboard, this.headers);
        },
    };

    Because = {
        NotAnAdmin: () => {
            return to(routes.auth.dashboard, this.headers);
        },
        Oauth: (url: string) => {
            return to(url, this.headers);
        },
        OauthFailed: () => {
            return to(routes.auth.login, this.headers);
        },
        NoTwoFactorCookie: () => {
            return to(routes.auth.login, this.headers);
        },
        TwoFactorRequired: () => {
            return to(routes.auth.twoFactor, this.headers);
        },
        NoSession: () => {
            return to(routes.auth.login, this.headers);
        },
        HasSession: () => {
            return to(routes.auth.dashboard, this.headers);
        },
        OauthUserIsBanned: () => {
            return new Response(
                ErrorPage({
                    status: 403,
                    message: copy.you_have_been_banned,
                }).toString(),
                {
                    status: 403,
                    headers: { "Content-Type": "text/html; charset=utf-8" },
                },
            );
        },
        Error: (result: Extract<TaskResult<any>, { ok: false }>): Response => {
            return new Response(
                ErrorPage({
                    status: 500,
                    message: `${copy.trace_id}: ${result.traceId}`,
                }).toString(),
                {
                    status: 500,
                    headers: { "Content-Type": "text/html; charset=utf-8" },
                },
            );
        },
    };
}
