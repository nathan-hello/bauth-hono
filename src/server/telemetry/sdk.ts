import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import type { FileTelemetryExporter } from "@/server/telemetry/exporters";

let loggerProvider: LoggerProvider | null = null;

export function getLoggerProvider(): LoggerProvider {
    if (!loggerProvider) {
        loggerProvider = new LoggerProvider();
    }
    return loggerProvider;
}

type LoggingConfig = {
    tracesUrl?: string;
    exporter: FileTelemetryExporter;
};

export function StartLogging(config: LoggingConfig) {
    loggerProvider = new LoggerProvider({
        processors: [new SimpleLogRecordProcessor(config.exporter)],
    });

    const spanProcessors = [new SimpleSpanProcessor(config.exporter)];

    if (config.tracesUrl) {
        spanProcessors.push(new SimpleSpanProcessor(new OTLPTraceExporter({ url: config.tracesUrl })));
    }

    new NodeSDK({
        spanProcessors,
    }).start();
}
