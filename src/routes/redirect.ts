import { ErrorPage } from "@/views/components/error";
import type { Copy } from "@/lib/copy";
import { routes } from "./routes";
import { TaskResult } from "@/server/telemetry";
import { auth } from "@/server/auth";

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
        TwoFactorCookieNotFound: async () => {
            try {
                const session = await auth.api.getSession({ headers: this.request.headers });
                if (session) {
                    return this.After.Login();
                }
            } catch {
                return this.Because.NoSession();
            }
            return this.Because.NoSession();
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
        OauthUserIsBanned: (copy: Copy) => {
            const page = ErrorPage({
                status: 403,
                message: copy.you_have_been_banned,
                copy,
            });
            return new Response(page.toString(), {
                    status: 403,
                    headers: { "Content-Type": "text/html; charset=utf-8" },
                },
            );
        },
        Error: (copy: Copy, result: Extract<TaskResult<any>, { ok: false }>): Response => {
            const page = ErrorPage({
                status: 500,
                message: `${copy.report_this_trace_id}: ${result.traceId}`,
                copy,
            });
            return new Response(page.toString(), {
                    status: 500,
                    headers: { "Content-Type": "text/html; charset=utf-8" },
                },
            );
        },
    };
}
