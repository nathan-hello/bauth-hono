import { Env } from "hono/types";
import { auth } from "@/server/auth";
import { TaskResult } from "@/server/telemetry";

export type ActionNames<TActions extends { [K: string]: { name: string } }> = TActions[keyof TActions]["name"];

export type HandlerData<TState> =
    | { state: TState extends undefined ? undefined : Partial<TState> }
    | { headers: Headers }
    | { response: Response }
    | null;

export type ActionResult<TActions extends { [K: string]: { name: string } }, TState> = TaskResult<
    HandlerData<TState>,
    { action: ActionNames<TActions> | undefined }
>;

export type ActionKeys<TActions> = {
    [K in keyof TActions]: TActions[K] extends { name: string } ? TActions[K]["name"] : never;
};

export type BAuthSession = typeof auth.$Infer.Session;

const appEnv = {
    Variables: {},
} satisfies Env;

export type AppEnv = typeof appEnv;

import { user } from "@/server/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";
import { Copy } from "@/lib/copy";

export type FullUser = InferSelectModel<typeof user>;
