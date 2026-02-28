import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import type { MultiLogExporter } from "./exporters";

let loggerProvider: LoggerProvider | null = null;

export function getLoggerProvider(): LoggerProvider {
  if (!loggerProvider) {
    loggerProvider = new LoggerProvider();
  }
  return loggerProvider;
}

type LoggingConfig = {
  tracesUrl: string;
  exporters: MultiLogExporter;
};

export function StartLogging(config: LoggingConfig) {
  loggerProvider = new LoggerProvider({
    processors: [new SimpleLogRecordProcessor(config.exporters)],
  });

  new NodeSDK({
    traceExporter: new OTLPTraceExporter({ url: config.tracesUrl }),
  }).start();
}
