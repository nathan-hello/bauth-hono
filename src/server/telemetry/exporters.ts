import { mkdirSync, createWriteStream, type WriteStream } from "node:fs";
import { dirname } from "node:path";
import { SpanKind, SpanStatusCode, type Attributes, type HrTime } from "@opentelemetry/api";
import type { AnyValue, LogAttributes } from "@opentelemetry/api-logs";
import { ExportResultCode, type ExportResult } from "@opentelemetry/core";
import type { LogRecordExporter, ReadableLogRecord } from "@opentelemetry/sdk-logs";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

export class MultiLogExporter implements LogRecordExporter {
    constructor(private exporters: (LogRecordExporter | null)[]) {}

    export(logRecords: ReadableLogRecord[], resultCallback: (result: ExportResult) => void) {
        for (const exporter of this.exporters) {
            exporter?.export(logRecords, () => {});
        }
        resultCallback({ code: ExportResultCode.SUCCESS });
    }

    async shutdown() {
        await Promise.all(this.exporters.map((e) => e?.shutdown()));
    }
}

export type LogEntry = {
    signal: "log";
    timestamp: string;
    timestamp_unix_nano: string;
    observed_timestamp: string;
    observed_timestamp_unix_nano: string;
    severity?: {
        number?: number;
        text?: string;
    };
    body?: AnyValue;
    event_name?: string;
    attributes: LogAttributes;
    dropped_attributes_count: number;
    trace_id?: string;
    span_id?: string;
    resource: {
        attributes: Attributes;
        schema_url?: string;
    };
    scope: {
        name?: string;
        version?: string;
        schema_url?: string;
        attributes?: Attributes;
    };
};

export type SpanEntry = {
    signal: "span";
    name: string;
    kind: {
        id: number;
        text: string;
    };
    trace_id: string;
    span_id: string;
    parent_span_id?: string;
    status: {
        code: number;
        text: string;
        message?: string;
    };
    start_time: string;
    start_time_unix_nano: string;
    end_time: string;
    end_time_unix_nano: string;
    duration_nano: string;
    attributes: Attributes;
    events: Array<{
        name: string;
        time: string;
        time_unix_nano: string;
        attributes?: Attributes;
        dropped_attributes_count?: number;
    }>;
    links: Array<{
        trace_id: string;
        span_id: string;
        trace_flags: number;
        is_remote?: boolean;
        attributes: Attributes;
        dropped_attributes_count?: number;
    }>;
    dropped_attributes_count: number;
    dropped_events_count: number;
    dropped_links_count: number;
    resource: {
        attributes: Attributes;
        schema_url?: string;
    };
    scope: {
        name?: string;
        version?: string;
        schema_url?: string;
        attributes?: Attributes;
    };
};

export class FileTelemetryExporter implements LogRecordExporter, SpanExporter {
    private stream: WriteStream;

    constructor(file: string) {
        mkdirSync(dirname(file), { recursive: true });
        this.stream = createWriteStream(file, { flags: "a" });
    }

    export(items: ReadableLogRecord[] | ReadableSpan[], resultCallback: (result: ExportResult) => void) {
        try {
            for (const item of items) {
                this.writeJsonLine(
                    this.isReadableLogRecord(item) ? this.serializeLogRecord(item) : this.serializeSpan(item),
                );
            }
            resultCallback({ code: ExportResultCode.SUCCESS });
        } catch (error) {
            resultCallback({
                code: ExportResultCode.FAILED,
                error: error instanceof Error ? error : new Error(String(error)),
            });
        }
    }

    forceFlush() {
        return new Promise<void>((resolve, reject) => {
            this.stream.write("", (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }

    shutdown() {
        return new Promise<void>((resolve, reject) => {
            this.stream.end((error?: Error | null) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }

    private isReadableLogRecord(item: ReadableLogRecord | ReadableSpan): item is ReadableLogRecord {
        return "hrTime" in item;
    }

    private writeJsonLine(entry: LogEntry | SpanEntry) {
        this.stream.write(JSON.stringify(entry) + "\n");
    }

    private serializeLogRecord(record: ReadableLogRecord): LogEntry {
        return {
            signal: "log",
            timestamp: hrTimeToIso(record.hrTime),
            timestamp_unix_nano: hrTimeToUnixNano(record.hrTime),
            observed_timestamp: hrTimeToIso(record.hrTimeObserved),
            observed_timestamp_unix_nano: hrTimeToUnixNano(record.hrTimeObserved),
            severity: {
                number: record.severityNumber,
                text: record.severityText,
            },
            body: record.body,
            event_name: record.eventName,
            attributes: record.attributes,
            dropped_attributes_count: record.droppedAttributesCount,
            trace_id: record.spanContext?.traceId,
            span_id: record.spanContext?.spanId,
            resource: serializeResource(record.resource),
            scope: serializeScope(record.instrumentationScope),
        };
    }

    private serializeSpan(span: ReadableSpan): SpanEntry {
        const spanContext = span.spanContext();

        return {
            signal: "span",
            name: span.name,
            kind: {
                id: span.kind,
                text: spanKindText(span.kind),
            },
            trace_id: spanContext.traceId,
            span_id: spanContext.spanId,
            parent_span_id: span.parentSpanContext?.spanId,
            status: {
                code: span.status.code,
                text: spanStatusText(span.status.code),
                message: span.status.message,
            },
            start_time: hrTimeToIso(span.startTime),
            start_time_unix_nano: hrTimeToUnixNano(span.startTime),
            end_time: hrTimeToIso(span.endTime),
            end_time_unix_nano: hrTimeToUnixNano(span.endTime),
            duration_nano: hrTimeToUnixNano(span.duration),
            attributes: span.attributes,
            events: span.events.map((event) => ({
                name: event.name,
                time: hrTimeToIso(event.time),
                time_unix_nano: hrTimeToUnixNano(event.time),
                attributes: event.attributes,
                dropped_attributes_count: event.droppedAttributesCount,
            })),
            links: span.links.map((link) => ({
                trace_id: link.context.traceId,
                span_id: link.context.spanId,
                trace_flags: link.context.traceFlags,
                is_remote: link.context.isRemote,
                attributes: link.attributes ?? {},
                dropped_attributes_count: link.droppedAttributesCount,
            })),
            dropped_attributes_count: span.droppedAttributesCount,
            dropped_events_count: span.droppedEventsCount,
            dropped_links_count: span.droppedLinksCount,
            resource: serializeResource(span.resource),
            scope: serializeScope(span.instrumentationScope),
        };
    }
}

function serializeResource(resource: { attributes: Attributes; schemaUrl?: string }) {
    return {
        attributes: resource.attributes,
        schema_url: resource.schemaUrl,
    };
}

function serializeScope(scope: { name?: string; version?: string; schemaUrl?: string; attributes?: Attributes }) {
    return {
        name: scope.name,
        version: scope.version,
        schema_url: scope.schemaUrl,
        attributes: scope.attributes,
    };
}

function hrTimeToUnixNano([seconds, nanos]: HrTime) {
    return (BigInt(seconds) * 1000000000n + BigInt(nanos)).toString();
}

function hrTimeToIso([seconds, nanos]: HrTime) {
    return new Date(seconds * 1000 + Math.floor(nanos / 1000000)).toISOString();
}

function spanKindText(kind: SpanKind) {
    switch (kind) {
        case SpanKind.INTERNAL:
            return "INTERNAL";
        case SpanKind.SERVER:
            return "SERVER";
        case SpanKind.CLIENT:
            return "CLIENT";
        case SpanKind.PRODUCER:
            return "PRODUCER";
        case SpanKind.CONSUMER:
            return "CONSUMER";
        default:
            return "UNKNOWN";
    }
}

function spanStatusText(code: SpanStatusCode) {
    switch (code) {
        case SpanStatusCode.UNSET:
            return "UNSET";
        case SpanStatusCode.OK:
            return "OK";
        case SpanStatusCode.ERROR:
            return "ERROR";
        default:
            return "UNKNOWN";
    }
}
