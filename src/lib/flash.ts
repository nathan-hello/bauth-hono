import { AppError, type TErrorCodes } from "@/lib/auth-error";
import type { ActionNames, ActionResult, HandlerData } from "@/lib/types";
import { parse, serialize } from "cookie";
import { dotenv } from "@/server/env";

export type FlashValue = string | number | boolean | null | FlashValue[] | { [key: string]: FlashValue | undefined };

export type SerializedActionResult<
    TActions extends { [K: string]: { name: string } } = { [K: string]: { name: string } },
> =
    | {
          meta: { action: ActionNames<TActions> | "top-of-page" };
          ok: true;
          traceId: string;
          data: null;
      }
    | {
          meta: { action: ActionNames<TActions> | "top-of-page" };
          ok: false;
          error: TErrorCodes[];
          traceId: string;
      };

export type SerializedActionData<
    TActions extends { [K: string]: { name: string } } = { [K: string]: { name: string } },
    TFlash extends FlashValue | undefined = undefined,
> = {
    result: SerializedActionResult<TActions>;
    state?: TFlash;
};

export class Flash<
    TActions extends { [K: string]: { name: string } } = { [K: string]: { name: string } },
    TState extends FlashValue | undefined = undefined,
> {
    constructor(private defaultState: TState) {}
    Respond(
        request: Request,
        taskResult: ActionResult<TActions, TState>,
        dataOverride?: HandlerData<TState>,
    ): Response {
        const url = new URL(request.url);
        const headers = new Headers({ Location: `${url.pathname}${url.search}` });

        let r: ActionResult<TActions, TState> & { data?: HandlerData<TState> } = taskResult;

        if (dataOverride) {
            r.data = dataOverride;
        }

        if (r.data && "response" in r.data) {
            return r.data.response;
        }

        if (r.data && "headers" in r.data) {
            for (const cookie of r.data.headers.getSetCookie()) {
                headers.append("Set-Cookie", cookie);
            }
        }

        const actionResult: ActionResult<TActions, TState> = {
            ...taskResult,
        };

        if (r.data && "state" in r.data && r.data.state !== undefined) {
            const serialized = this.serializeActionData(actionResult, r.data.state);
            headers.append("Set-Cookie", serialize(flashCookieName(), encodeFlash(serialized), flashCookieOptions(60)));
        }

        return new Response(null, { status: 303, headers });
    }

    Consume(headers: Headers): {
        state: TState;
        result: ActionResult<TActions, TState> | undefined;
        headers: Headers;
    } {
        const cookie = headers.get("cookie");
        const parsed = parse(cookie || "");

        const responseHeaders = new Headers();
        responseHeaders.append("Set-Cookie", serialize(flashCookieName(), "", flashCookieOptions(0)));

        const raw = parsed[flashCookieName()];
        if (!raw) {
            return { state: this.defaultState as NonNullable<TState>, result: undefined, headers: responseHeaders };
        }

        const actionData = this.decodeFlash(raw);
        if (!actionData) {
            return { state: this.defaultState, result: undefined, headers: responseHeaders };
        }

        const unmarshal = this.deserializeActionData(actionData);
        if (!unmarshal) {
            return { state: this.defaultState, result: undefined, headers: responseHeaders };
        }

        return {
            state: unmarshal?.state ?? this.defaultState,
            result: unmarshal.result,
            headers: responseHeaders,
        };
    }

    private serializeActionData(
        result: ActionResult<TActions, TState>,
        state: TState extends undefined ? undefined : Partial<TState>,
    ): SerializedActionData<TActions, TState extends undefined ? undefined : Partial<TState>> {
        if (result.ok) {
            return {
                result: {
                    meta: { action: result.meta.action ?? "top-of-page" },
                    ok: true,
                    traceId: result.traceId,
                    data: null,
                },
                state: state === null ? undefined : state,
            };
        }

        return {
            result: {
                meta: { action: result.meta.action ?? "top-of-page" },
                traceId: result.traceId,
                ok: false,
                error: result.error.map((error) => error.code),
            },
            state: state === null ? undefined : state,
        };
    }

    private deserializeActionData(actionData: SerializedActionData<TActions, TState>): {
        result: ActionResult<TActions, TState>;
        state: TState | undefined;
    } {
        if (actionData.result.ok) {
            return {
                result: {
                    ok: true,
                    traceId: actionData.result.traceId,
                    meta: actionData.result.meta,
                    data: null,
                },
                state: actionData.state,
            };
        }

        return {
            result: {
                meta: actionData.result.meta,
                ok: false,
                error: actionData.result.error.map((error) => new AppError(error)),
                traceId: actionData.result.traceId,
            },
            state: actionData.state,
        };
    }
    private decodeFlash(value: string): SerializedActionData<TActions, TState> | undefined {
        try {
            return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SerializedActionData<
                TActions,
                TState
            >;
        } catch {
            return undefined;
        }
    }
}

export function encodeFlash<T extends FlashValue>(value: T): string {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
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
