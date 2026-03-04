import { copy } from "@/lib/copy";
import { BAuthSession } from "@/lib/types";
import { auth } from "@/server/auth";
import { ErrorPage } from "@/views/components/error";

export async function redirectIfSession(request: Request): Promise<{ response: Response; userId: string } | null> {
    try {
        const session = await auth.api.getSession({ headers: request.headers });
        if (session !== null) {
            return { response: Response.redirect("/", 302), userId: session.user.id };
        }
    } catch (error) {
        return null;
    }
    return null;
}

export async function redirectIfNoSession(request: Request): Promise<BAuthSession | { response: Response }> {
    try {
        const session = await auth.api.getSession({ headers: request.headers });
        if (session === null) {
            return { response: Response.redirect("/auth/login", 302) };
        }
        return session;
    } catch (error) {
        return { response: Response.redirect("/auth/login", 302) };
    }
}

export function redirectWithHeaders(headers: Headers, location: string): Response {
    return new Response(null, {
        status: 302,
        headers: new Headers([...headers.entries(), ["Location", location]]),
    });
}

export function serverError(traceId: string): Response {
    return new Response(
        ErrorPage({
            status: 500,
            message: `${copy.trace_id}: ${traceId}`,
        }).toString(),
        {
            status: 500,
            headers: { "Content-Type": "text/html; charset=utf-8" },
        },
    );
}
