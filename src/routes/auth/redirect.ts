import { auth } from "@/server/auth";

export async function redirectIfSession(request: Request): Promise<Response | null> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (session !== null) {
      return Response.redirect("/", 302);
    }
  } catch (error) {
    if (error instanceof Response) return error;
  }
  return null;
}

export function redirectWithHeaders(headers: Headers, location: string): Response {
  return new Response(null, {
    status: 302,
    headers: new Headers([...headers.entries(), ["Location", location]]),
  });
}

export function serverError(traceId: string): Response {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>500</title><style>body{margin:0;background:#282828;color:#e5e5e5;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center}p{color:#928374}.trace{font-size:.875rem;color:#7c6f64}a{color:#689d6a}</style></head><body><div><h1>500</h1><p>An unexpected error occurred.</p><p class="trace">Error ID: ${traceId}</p><a href="/">Go home</a></div></body></html>`,
    { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
