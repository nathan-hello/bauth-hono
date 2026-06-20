export type AttributeValue = string | number | boolean | null | undefined | AttributeValue[] | { [key: string]: AttributeValue };
export type Attributes = Record<string, AttributeValue>;

export const SeverityNumber = {
  TRACE: 1,
  DEBUG: 5,
  INFO: 9,
  WARN: 13,
  ERROR: 17,
} as const;

export type SeverityNumber = (typeof SeverityNumber)[keyof typeof SeverityNumber];

export function SeverityToString(severity?: number): string {
  if (!severity) return "info";
  if (severity <= 4) return "trace";
  if (severity <= 8) return "debug";
  if (severity <= 12) return "info";
  if (severity <= 16) return "warn";
  return "error";
}

export const SpanStatusCode = {
  OK: 1,
  ERROR: 2,
} as const;

export type SpanStatusCode = (typeof SpanStatusCode)[keyof typeof SpanStatusCode];

export type SpanContext = {
  traceId: string;
  spanId: string;
  parentSpanId: string | undefined;
};

export interface Span {
  readonly context: SpanContext;
  setAttributes(attributes: Attributes): void;
  setAttribute(key: string, value: AttributeValue): void;
  setStatus(status: { code: SpanStatusCode; message?: string }): void;
  end(): void;
}

export type ReadableLogRecord = {
  hrTime: [number, number];
  body: string;
  attributes: Attributes;
  severityNumber?: SeverityNumber;
  severityText?: string;
  spanContext?: SpanContext;
  instrumentationScope: { name: string };
};

export type Logger = {
  emit(record: ReadableLogRecord): void;
};
