import { AppError } from "@/lib/auth-error";

export function findAction<T extends { [x: string]: { name: string; handler: (...args: any) => any } }>(
    obj: T,
    n: string | undefined,
): T[keyof T]["handler"] {
    const handler = Object.values(obj).find((o) => o.name === n)?.handler;
    if (!handler) {
      throw new AppError("internal_field_missing_action")
    }
    return handler
}
