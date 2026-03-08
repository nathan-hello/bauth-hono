import { copy as en, BA_INTERNAL_COPY as internalCopy} from "@/lib/copy/en";

export const internal_copy = internalCopy;
export const copy = en;

export type Copy = typeof copy;
