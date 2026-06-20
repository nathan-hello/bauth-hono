import { SeverityNumber, type Logger, type ReadableLogRecord } from "./types";

export interface LogRecordExporter {
  export(logRecords: ReadableLogRecord[]): void;
  shutdown(): Promise<void>;
}

class LoggerProvider {
  public exporters: LogRecordExporter[] = [];

  constructor(exporter: LogRecordExporter | LogRecordExporter[] | null) {
    if (exporter === null) return;
    if (Array.isArray(exporter)) {
      this.exporters.push(...exporter);
    } else {
      this.exporters.push(exporter);
    }
  }

  getLogger(_name: string): Logger {
    return {
      emit: (record: ReadableLogRecord) => {
        if (
          typeof process === "object" &&
          typeof process.env === "object" &&
          process.env.NODE_ENV === "testing" &&
          record.severityNumber &&
          record.severityNumber === SeverityNumber.ERROR
        ) {
          throw Error(
            "a `tel.error()` was surfaced during testing!\n" + JSON.stringify(record),
          );
        }
        this.exporters.forEach((e) => {
          e.export([record]);
        });
      },
    };
  }
}

let loggerProvider: LoggerProvider | null = null;

export function getLoggerProvider(): LoggerProvider {
  if (!loggerProvider) {
    loggerProvider = new LoggerProvider(null);
  }
  return loggerProvider;
}

export function AddExporters(exporters: LogRecordExporter[]) {
  if (loggerProvider) {
    loggerProvider.exporters.push(...exporters);
    return;
  }
  loggerProvider = new LoggerProvider(exporters);
}
