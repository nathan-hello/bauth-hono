import { mkdirSync, createWriteStream, type WriteStream } from "node:fs";
import { dirname } from "node:path";
import type { LogRecordExporter } from "./sdk";
import { SeverityToString, type ReadableLogRecord } from "./types";

export type LogEntry = {
  signal: "log";
  timestamp: string;
  severity?: {
    number?: number;
    text?: string;
  };
  body?: string;
  attributes: Record<string, unknown>;
  trace_id?: string;
  span_id?: string;
  scope: {
    name?: string;
  };
};

export class FileTelemetryExporter implements LogRecordExporter {
  private stream: WriteStream;

  constructor(file: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.stream = createWriteStream(file, { flags: "a" });
  }

  export(items: ReadableLogRecord[]) {
    for (const item of items) {
      this.stream.write(JSON.stringify(this.serialize(item)) + "\n");
    }
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

  private serialize(record: ReadableLogRecord): LogEntry {
    return {
      signal: "log",
      timestamp: new Date(Number(record.hrTime[0]) * 1000).toISOString(),
      severity: {
        number: record.severityNumber,
        text: record.severityText ?? SeverityToString(record.severityNumber),
      },
      body: record.body,
      attributes: record.attributes as Record<string, unknown>,
      trace_id: record.spanContext?.traceId,
      span_id: record.spanContext?.spanId,
      scope: {
        name: record.instrumentationScope.name,
      },
    };
  }
}
