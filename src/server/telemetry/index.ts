import { trace, SpanStatusCode, type Span, context } from "@opentelemetry/api";
import { SeverityNumber, type AnyValue } from "@opentelemetry/api-logs";
import { getLoggerProvider } from "./sdk";

export type TelemetryLogSchema = {
  info: [string, Record<string, AnyValue>];
  debug: [string, Record<string, AnyValue>];
  warn: [string, Record<string, AnyValue>];
  error: [string, Record<string, AnyValue>];
};

export type TaskResult<R> =
  | { ok: true; traceId: string; data: R }
  | { ok: false; traceId: string; error: unknown };

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

export function safeRequestAttrs(request: Request, form?: FormData) {
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

type Attrs<T = Record<string, AnyValue>> = T | (() => T | Promise<T>);

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

  task<R>(name: string, fn: (span: Span) => Promise<R>): Promise<TaskResult<R>>;
  task<R>(name: string, fn: (span: Span) => R): TaskResult<R>;

  task<R>(
    name: string,
    fn: (span: Span) => R | Promise<R>,
  ): TaskResult<R> | Promise<TaskResult<R>> {
    return this.tracer.startActiveSpan(name, (span) => {
      try {
        const result = fn(span);

        if (result instanceof Promise) {
          return result
            .then((data): TaskResult<R> => {
              span.setStatus({ code: SpanStatusCode.OK });
              return { ok: true as const, data, traceId: span.spanContext().traceId };
            })
            .catch((err): TaskResult<R> => {
              this.handleError(span, name, err);
              return {
                ok: false as const,
                error: err,
                traceId: span.spanContext().traceId,
              };
            })
            .finally(() => span.end());
        }

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return { ok: true as const, data: result, traceId: span.spanContext().traceId };
      } catch (err) {
        this.handleError(span, name, err);
        span.end();
        return {
          ok: false as const,
          error: err,
          traceId: span.spanContext().traceId,
        };
      }
    });
  }

  private handleError(span: Span, name: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const attrs: Record<string, string> = { error: errorName, message };

    if (
      error != null &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as Record<string, unknown>).code === "string"
    ) {
      attrs.code = (error as Record<string, unknown>).code as string;
    }

    span.setStatus({ code: SpanStatusCode.ERROR, message });
    this.emit(`Task Error: ${name}`, SeverityNumber.ERROR, "ERROR", attrs);
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

  private log(
    body: string,
    severityNumber: SeverityNumber,
    severityText: string,
    attributes?: Attrs,
  ) {
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

  private emit(
    body: string,
    severityNumber: SeverityNumber,
    severityText: string,
    attributes?: any,
  ) {
    this.logger.emit({
      body,
      severityNumber,
      severityText,
      attributes,
      context: context.active(),
    });
  }
}
