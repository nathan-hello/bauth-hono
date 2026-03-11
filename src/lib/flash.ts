import { AppError, type TErrorCodes } from "@/lib/auth-error";
import type { ActionNames, RouteActionData } from "@/lib/types";
import { parse, serialize } from "cookie";
import { dotenv } from "@/server/env";

export type FlashValue = string | number | boolean | null | FlashValue[] | { [key: string]: FlashValue | undefined };

export type SerializedActionResult<
    TActions extends { [K: string]: { name: string } } = { [K: string]: { name: string } },
> =
    | {
          action: ActionNames<TActions> | string | undefined;
          ok: true;
          traceId: string;
          data: null;
      }
    | {
          action: ActionNames<TActions> | string | undefined;
          ok: false;
          error: TErrorCodes[];
          traceId: string;
      };

export type SerializedActionData<
    TActions extends { [K: string]: { name: string } } = { [K: string]: { name: string } },
    TState extends FlashValue | undefined = undefined,
> = {
    result: SerializedActionResult<TActions>;
    state?: TState;
};

export function serializeActionData<
    TActions extends { [K: string]: { name: string } },
    TState extends FlashValue | undefined,
>(actionData: RouteActionData<TActions, TState>): SerializedActionData<TActions, TState> {
    if (actionData.result.ok) {
        return {
            result: {
                action: actionData.result.action,
                ok: true,
                traceId: actionData.result.traceId,
                data: null,
            },
            state: actionData.state,
        };
    }

    return {
        result: {
            action: actionData.result.action,
            traceId: actionData.result.traceId,
            ok: false,
            error: actionData.result.error.map((error) => error.code),
        },
        state: actionData.state,
    };
}

export function deserializeActionData<
    TActions extends { [K: string]: { name: string } },
    TState extends FlashValue | undefined,
>(actionData: SerializedActionData<TActions, TState> | undefined): RouteActionData<TActions, TState> | undefined {
    if (!actionData) {
        return undefined;
    }

    if (actionData.result.ok) {
        return {
            result: {
                ok: true,
                traceId: actionData.result.traceId,
                action: actionData.result.action ?? "top-of-page",
                data: null,
            },
            state: actionData.state,
        };
    }

    return {
        result: {
            action: actionData.result.action ?? "top-of-page",
            ok: false,
            error: actionData.result.error.map((error) => new AppError(error)),
            traceId: actionData.result.traceId,
        },
        state: actionData.state,
    };
}

export function encodeFlash<T extends FlashValue>(value: T): string {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeFlash<T extends FlashValue>(value: string): T | undefined {
    try {
        return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
    } catch {
        return undefined;
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

export class Flash<
    TActions extends { [K: string]: { name: string } } = { [K: string]: { name: string } },
    TState extends FlashValue | undefined = undefined,
> {
    constructor(private defaultState: TState) {}
    Respond(
        request: Request,
        existingHeaders: Headers | undefined,
        actionData: RouteActionData<TActions, TState>,
    ): Response {
        const url = new URL(request.url);
        const headers = new Headers({ Location: `${url.pathname}${url.search}` });

        if (existingHeaders) {
            for (const cookie of existingHeaders.getSetCookie()) {
                headers.append("Set-Cookie", cookie);
            }
        }

        const serialized = serializeActionData<TActions, TState>(actionData);
        headers.append("Set-Cookie", serialize(flashCookieName(), encodeFlash(serialized), flashCookieOptions(60)));

        return new Response(null, { status: 303, headers });
    }

    Consume(headers: Headers): {
        state: TState extends undefined ? undefined : NonNullable<RouteActionData<TActions, TState>["state"]>;
        result: RouteActionData<TActions, TState>["result"] | undefined;
        headers: Headers;
    } {
        const cookie = headers.get("cookie");
        const parsed = parse(cookie || "");
        const raw = parsed[flashCookieName()];

        const responseHeaders = new Headers();
        responseHeaders.append("Set-Cookie", serialize(flashCookieName(), "", flashCookieOptions(0)));

        if (!raw) {
            return { state: this.defaultState as NonNullable<TState>, result: undefined, headers: responseHeaders };
        }

        const actionData = decodeFlash<SerializedActionData<TActions, TState>>(raw);
        const unmarshal = deserializeActionData<TActions, TState>(actionData);
        if (!unmarshal) {
            return { state: this.defaultState, result: undefined, headers: responseHeaders };
        }

        return {
            state: unmarshal?.state ?? this.defaultState,
            result: unmarshal.result,
            headers: responseHeaders,
        };
    }
}
