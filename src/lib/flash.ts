import { AppError, type TErrorCodes } from "@/lib/auth-error";
import type { ActionNames, ActionResult, RouteActionData } from "@/lib/types";

export type FlashValue =
    | string
    | number
    | boolean
    | null
    | FlashValue[]
    | { [key: string]: FlashValue | undefined };

export type SerializedActionResult<
    TActions extends { [K: string]: { name: string } } = { [K: string]: { name: string } },
> =
    | {
          action: ActionNames<TActions> | string | undefined;
          success: true;
      }
    | {
          action: ActionNames<TActions> | string | undefined;
          success: false;
          errors: TErrorCodes[];
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
    if (actionData.result.success) {
        return {
            result: {
                action: actionData.result.action,
                success: true,
            },
            state: actionData.state,
        };
    }

    return {
        result: {
            action: actionData.result.action,
            success: false,
            errors: actionData.result.errors.map((error) => error.code),
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

    if (actionData.result.success) {
        return {
            result: {
                action: actionData.result.action,
                success: true,
            },
            state: actionData.state,
        };
    }

    return {
        result: {
            action: actionData.result.action,
            success: false,
            errors: actionData.result.errors.map((error) => new AppError(error)),
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
