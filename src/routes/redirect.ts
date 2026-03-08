import { ErrorPage } from "@/views/components/error";
import { copy } from "@/lib/copy";
import { routes } from "./routes";
import { TaskResult } from "@/server/telemetry";

function to(url: string, headers?: Headers): Response {
    const responseHeaders = new Headers({ Location: url });

    if (headers) {
        for (const cookie of headers.getSetCookie()) {
            responseHeaders.append("Set-Cookie", cookie);
        }
    }

    return new Response(null, { status: 302, headers: responseHeaders });
}

export class Redirect {
    constructor(
        private request: Request,
        private headers?: Headers,
    ) {}

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
