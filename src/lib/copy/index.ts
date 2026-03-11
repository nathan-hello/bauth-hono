import { Child, createContext, useContext } from "hono/jsx";
import en from "@/lib/copy/en";
import { User } from "better-auth";

export type Copy = typeof en;

const CopyContext = createContext<Copy>(en);

export function CopyProvider({ copy, children }: { copy: Copy; children: Child }) {
    // return <CopyContext.Provider value={copy}>{children}</CopyContext.Provider>;
    return CopyContext.Provider({ value: copy, children });
}

export function useCopy(): Copy {
    const ctx = useContext(CopyContext);
    if (!ctx) {
        throw new Error("useCopy must be used within CopyProvider");
    }
    return ctx;
}

export function createCopy(_data: Request | User): Copy {
    return en;
}

export const defaultCopy = en;
