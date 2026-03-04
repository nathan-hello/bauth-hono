import type { Handler } from "hono";
import { auth } from "@/server/auth";
import { Telemetry } from "@/server/telemetry";
import { routes } from "@/routes/routes";

const tel = new Telemetry("auth.oauth");

function oauthHandler(provider: "google" | "apple"): Handler {
    return async (c) => {
        const form = await c.req.formData();
        const callbackURL = form.get("callbackURL")?.toString() || routes.auth.dashboard;

        const result = await tel.task(`SIGN_IN_${provider.toUpperCase()}`, async () => {
            const data = await auth.api.signInSocial({
                headers: c.req.raw.headers,
                body: {
                    provider,
                    callbackURL,
                },
            });

            if (!data?.url) {
                throw new Error(`No redirect URL returned for ${provider}`);
            }

            return data.url;
        });

        if (result.ok) {
            return c.redirect(result.data);
        }

        tel.error("OAUTH_ERROR", { provider, error: String(result.error) });
        return c.redirect(routes.auth.login);
    };
}

export const google: Handler = oauthHandler("google");
export const apple: Handler = oauthHandler("apple");
