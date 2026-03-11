import { createContext, useContext } from "hono/jsx";
import { copy as en } from "@/lib/copy/en";

export type Copy = typeof en;

const CopyContext = createContext<Copy | null>(null);

export function CopyProvider({ copy, children }: { copy: Copy; children: any }) {
    return <CopyContext.Provider value={copy}>{children}</CopyContext.Provider>;
}

export function useCopy(): Copy {
    const ctx = useContext(CopyContext);
    if (!ctx) {
        throw new Error("useCopy must be used within CopyProvider");
    }
    return ctx;
}

export function createCopy(_request: Request): Copy {
    const acceptLanguage = _request.headers.get("accept-language");

    // For now, always return English
    // Future: parse accept-language and return appropriate copy
    return en;
}

// export const internal_copy = BA_INTERNAL_COPY;
// export { copy as defaultCopy } from "@/lib/copy/en";
