const SENSITIVE_KEYS = new Set([
    "password",
    "current",
    "new_password",
    "new_password_repeat",
    "repeat",
    "code",
    "totp_code",
    "totp_uri",
    "backup_codes",
]);

const SENITIVE_HEADERS = ["session_token", "two_factor"];

export async function safeRequestAttrs(r: Request | Response | undefined) {
    if (!r) {
        return { http: "request_was_undefined" };
    }

    let attrs: Record<string, string> = {
        "http.url": r.url,
    };

    for (const [key, value] of r.headers.entries()) {
        if (SENITIVE_HEADERS.some((s) => key.includes(s))) {
            attrs[`header.${key}`] = "[REDACTED]";
            continue;
        }
        attrs[`header.${key}`] = value;
    }
    const form = await r.clone().formData();
    for (const [key, value] of form.entries()) {
        attrs[`form.${key}`] = SENSITIVE_KEYS.has(key) ? "[REDACTED]" : String(value);
    }

    if (r instanceof Request) {
        attrs["req.method"] = r.method;
        attrs["req.integrity"] = r.integrity;
        attrs["req.referrer"] = r.referrer;
        attrs["req.cache"] = r.cache.toString();
        attrs["req.destination"] = r.destination.toString();
        attrs["req.redirect"] = r.redirect.toString();
    }

    if (r instanceof Response) {
        attrs["res.status"] = r.status.toString();
        attrs["res.type"] = r.type.toString();
        attrs["res.redirected"] = r.redirected ? "true" : "false";
    }

    return attrs;
}
