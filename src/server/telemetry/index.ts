import { trace, SpanStatusCode, type Span, context, type Attributes } from "@opentelemetry/api";
import { LogAttributes, SeverityNumber, type AnyValue } from "@opentelemetry/api-logs";
import { getLoggerProvider } from "@/server/telemetry/sdk";
import { AppError, ResendErrorCodes } from "@/lib/auth-error";
import { APIError } from "better-auth";
import { defaultCopy as copy } from "@/lib/copy";

export type TelemetryLogSchema = {
    info: [string, Record<string, AnyValue>];
    debug: [string, Record<string, AnyValue>];
    warn: [string, Record<string, AnyValue>];
    error: [string, Record<string, AnyValue>];
};

type TaskSuccess<R, TMeta extends Attributes | undefined = undefined> = {
    ok: true;
    traceId: string;
    data: R;
    meta: TMeta;
};

type TaskFailure<TMeta extends Attributes | undefined = undefined> = {
    ok: false;
    traceId: string;
    error: AppError[];
    meta: TMeta;
};

// TODO: use this in all route handlers (or a middleware???)
type RequestSetter = (request: Request) => void;

export type TaskResult<R, TMeta extends Attributes | undefined = undefined> =
    | TaskSuccess<R, TMeta>
    | TaskFailure<TMeta>;

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

export function safeRequestAttrs(request: Request | undefined, form?: FormData) {
    if (!request) {
        return { http: "request_was_undefined" };
    }

    const attrs: Record<string, string> = {
        "http.method": request.method,
        "http.url": request.url,
    };

    if (form) {
        for (const [key, value] of form.entries()) {
            attrs[`form.${key}`] = SENSITIVE_KEYS.has(key) ? "[REDACTED]" : String(value);
        }
    }

    return attrs;
}

type Attrs<T = LogAttributes> = T | (() => T | Promise<T>);

export class Telemetry<T extends TelemetryLogSchema = TelemetryLogSchema> {
    private tracer;
    private namespace: string;

    constructor(namespace: string) {
        this.namespace = namespace;
        this.tracer = trace.getTracer(namespace);
    }

    private get logger() {
        return getLoggerProvider().getLogger(this.namespace);
    }

    // Overload 1: Simple Async
    task<R>(name: string, fn: (span: Span, setRequest: RequestSetter) => Promise<R>): Promise<TaskResult<R, undefined>>;

    // Overload 2: Simple Sync
    task<R>(name: string, fn: (span: Span, setRequest: RequestSetter) => R): TaskResult<R, undefined>;

    // Overload 3: Meta Async
    task<R, TMeta extends Attributes & { request?: Request }>(
        name: string,
        fn: (span: Span, setRequest: RequestSetter) => Promise<R>,
        meta: TMeta,
    ): Promise<TaskResult<R, TMeta>>;

    // Overload 4: Meta Sync
    task<R, TMeta extends Attributes & { request?: Request }>(
        name: string,
        fn: (span: Span, setRequest: RequestSetter) => R,
        meta: TMeta,
    ): TaskResult<R, TMeta>;

    // Implementation
    task<R, TMeta extends (Attributes & { request?: Request }) | undefined = undefined>(
        name: string,
        fn: (span: Span, setRequest: RequestSetter) => R | Promise<R>,
        meta?: TMeta,
    ): TaskResult<R, TMeta> | Promise<TaskResult<R, TMeta>> {
        return this.tracer.startActiveSpan(name, (span) => {
            try {
                let req: Request;
                const cb = (r: Request) => {
                    req = r;
                };

                const result = fn(span, cb);
                const traceId = span.spanContext().traceId;

                span.setAttribute("promise", result instanceof Promise);

                if (result instanceof Promise) {
                    return result
                        .then((data): TaskResult<R, TMeta> => {
                            this.handleSuccess(span, name);
                            span.end();
                            return {
                                meta: meta as TMeta,
                                traceId,
                                data,
                                ok: true as const,
                            };
                        })
                        .catch((err): TaskResult<R, TMeta> => {
                            this.handleError(span, name, err);
                            span.end();
                            return {
                                meta: meta as TMeta,
                                traceId,
                                ok: false as const,
                                error: getAuthError(err),
                            };
                        });
                }

                this.handleSuccess(span, name);
                span.end();
                return {
                    meta: meta as TMeta,
                    traceId,
                    data: result,
                    ok: true as const,
                };
            } catch (err) {
                this.handleError(span, name, err);
                span.end();
                const traceId = span.spanContext().traceId;
                return {
                    meta: meta as TMeta,
                    traceId,
                    ok: false as const,
                    error: getAuthError(err),
                };
            }
        });
    }
    private handleSuccess(span: Span, name: string) {
        span.setStatus({ code: SpanStatusCode.OK });
        this.emit(name, SeverityNumber.INFO, "INFO", { success: true });
    }

    private handleError(span: Span, name: string, error: unknown): void {
        const errorName = error instanceof Error ? error.name : "UnknownError";
        const attrs: Record<string, string | number> = { creator: errorName };

        try {
            attrs.full = JSON.stringify(error);
        } catch {
            attrs.full = "Unable to JSON.stringify the error. String() attempt: " + String(error);
        }

        if (
            error != null &&
            typeof error === "object" &&
            "code" in error &&
            (typeof error.code === "string" || typeof error.code === "number")
        ) {
            attrs.code = error.code;
        }

        if (error != null && typeof error === "object" && "message" in error && typeof error.message === "string") {
            attrs.message = error.message;
        }

        span.setStatus({ code: SpanStatusCode.ERROR });

        this.emit(name, SeverityNumber.ERROR, "ERROR", attrs);
    }

    debug(body: T["debug"][0], attributes?: Attrs<T["debug"][1]>) {
        this.log(body, SeverityNumber.DEBUG, "DEBUG", attributes);
    }

    warn(body: T["warn"][0], attributes?: Attrs<T["warn"][1]>) {
        this.log(body, SeverityNumber.WARN, "WARN", attributes);
    }

    info(body: T["info"][0], attributes?: Attrs<T["info"][1]>) {
        this.log(body, SeverityNumber.INFO, "INFO", attributes);
    }

    error(body: T["error"][0], attributes?: Attrs<T["error"][1]>) {
        this.log(body, SeverityNumber.ERROR, "ERROR", attributes);
    }

    private log(body: string, severityNumber: SeverityNumber, severityText: string, attributes?: Attrs) {
        if (typeof attributes === "function") {
            const result = attributes();
            if (result instanceof Promise) {
                result.then((resolved) => this.emit(body, severityNumber, severityText, resolved));
                return;
            }
            this.emit(body, severityNumber, severityText, result);
            return;
        }
        this.emit(body, severityNumber, severityText, attributes);
    }

    private emit(body: string, severityNumber: SeverityNumber, severityText: string, attributes?: LogAttributes) {
        this.logger.emit({
            body,
            severityNumber,
            severityText,
            attributes,
            context: context.active(),
        });
    }
}

/**
 * Specifically disallow AppError from being passed to this function.
 * There are catches in the function for when this happens, which is
 * just for the try/catch inside of Telemetry.task, as all catches are
 * typed as unknown so Typescript can't check it. Anyone trying to call
 * this function with a known AppError | AppError[] should simply not
 * do that.
 */
function getAuthError(e: unknown): AppError[] {
    if (e === null) {
        return [];
    }
    if (e instanceof AppError) {
        return [e];
    }
    if (Array.isArray(e) && e[0] instanceof AppError) {
        return e;
    }

    if (e instanceof APIError) {
        const code = e.body?.code;
        if (typeof code === "string" && code in copy.error) {
            return [new AppError(code as keyof typeof copy.error)];
        }
    }

    if (
        typeof e === "object" &&
        "name" in e &&
        typeof e.name === "string" &&
        ResendErrorCodes.includes(e.name as any)
    ) {
        return [new AppError(e.name as (typeof ResendErrorCodes)[number])];
    }

    return [new AppError("generic_error")];
}
