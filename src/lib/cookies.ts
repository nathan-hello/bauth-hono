/**
 * Set-Cookie -> Cookie converter function.
 *
 * This is necessary for when the auth.api returns Headers. Those headers
 * are given a Set-Cookie header. For the loader right after the auth.api
 * call, we tell Better Auth about the newly generated cookies, instead of
 * the original request's Cookies, as those have a now-invalid session token.
 */
export function convertSetCookiesToCookies(
    orginalRequestHeaders: Headers,
    newlyCreatedSetCookieHeaders: Headers,
): Headers {
    const setCookies = newlyCreatedSetCookieHeaders.getSetCookie();
    if (setCookies.length === 0) return orginalRequestHeaders;

    const cookies = new Map<string, string>();
    // Gets all of the original cookies
    for (const part of (orginalRequestHeaders.get("cookie") || "").split(";")) {
        const eq = part.indexOf("=");
        if (eq > 0) cookies.set(part.slice(0, eq).trim(), part.slice(eq + 1));
    }
    // Gets the newly created cookies. If there is a conflict, this will win.
    // I.e., if session_token is present in the original cookies, this will
    // overwrite.
    for (const sc of setCookies) {
        const nameValue = sc.split(";")[0];
        const eq = nameValue.indexOf("=");
        if (eq > 0) cookies.set(nameValue.slice(0, eq).trim(), nameValue.slice(eq + 1));
    }

    const merged = new Headers(orginalRequestHeaders);
    merged.set("cookie", [...cookies].map(([k, v]) => `${k}=${v}`).join("; "));
    return merged;
}
