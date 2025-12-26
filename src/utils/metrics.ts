import * as p from "prom-client";
import { Registry, Counter, Summary, Histogram } from "prom-client";
import { parseSecond, type Duration } from "./duration";
import { parsePercentile, type Percentile } from "./percentil";

export type MetricsConfigs = {
  registers?: Registry[];
  /** Percentile values to track for summary metrics (e.g., [0.5, 0.9, 0.95, 0.99]) */
  percentiles?: number[];
  /** Custom histogram buckets for duration measurements in seconds */
  buckets?: number[];
  maxAgeSeconds?: number;
  ageBuckets?: number;
  enableSummary?: boolean;
  collectDefaultMetrics?: boolean;
};

export class Metrics {
  httpStartTimer: () => (
    method: string,
    pathname: string,
    statusCode: `${"1" | "2" | "3" | "4" | "5"}xx` | "unknown",
  ) => void;
  rpcStartTimer: () => (method: string, status: "ERROR" | "SUCCESS") => void;
  registry: p.Registry<"text/plain; version=0.0.4; charset=utf-8">;

  constructor(configs: MetricsConfigs = {}) {
    const {
      registers = [],
      buckets = Array.from<Duration, number>(
        ["1ms", "10ms", "100ms", "1s", "10s", "30s"],
        (v) => parseSecond(v)!,
      ),
      percentiles = Array.from<Percentile, number>(
        ["P5", "P9", "P50", "P90", "P95", "P99"],
        (v) => parsePercentile(v)!,
      ),
      maxAgeSeconds = 600,
      ageBuckets = 5,
      collectDefaultMetrics = false,
      enableSummary = true,
    } = configs;

    const registry = (this.registry = new Registry());

    if (collectDefaultMetrics) {
      p.collectDefaultMetrics({ register: registry });
    }

    // Register with additional registries if provided
    registers.forEach((reg) => {
      reg.registerMetric = registry.registerMetric.bind(registry);
    });

    const rpc_duration_seconds = new Histogram({
      name: "rpc_duration_seconds",
      help: "Duration of RPC calls in seconds",
      labelNames: ["method", "status"],
      buckets,
      registers: [registry, ...registers],
    });

    const rpc_duration_seconds_summary = enableSummary
      ? new Summary({
          name: "rpc_duration_seconds_summary",
          help: "Summary of RPC call durations in seconds",
          labelNames: ["method", "status"],
          percentiles,
          maxAgeSeconds,
          ageBuckets,
          registers: [registry, ...registers],
        })
      : null;

    const http_request_duration_seconds = new Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "pathname", "statusCode"],
      buckets,
      registers: [registry, ...registers],
    });

    const http_request_duration_seconds_summary = enableSummary
      ? new Summary({
          name: "http_request_duration_seconds_summary",
          help: "Summary of HTTP request durations in seconds",
          labelNames: ["method", "pathname", "statusCode"],
          percentiles,
          maxAgeSeconds,
          ageBuckets,
          registers: [registry, ...registers],
        })
      : null;

    this.httpStartTimer = () => {
      const end = http_request_duration_seconds.startTimer();
      const endSummary = http_request_duration_seconds_summary?.startTimer();
      return (method: string, pathname: string, statusCode: string) => {
        end({
          method,
          pathname,
          statusCode,
        });
        endSummary?.({
          method,
          pathname,
          statusCode,
        });
      };
    };

    this.rpcStartTimer = () => {
      const end = rpc_duration_seconds.startTimer();
      const endSummary = rpc_duration_seconds_summary?.startTimer();
      return (method: string, status: "ERROR" | "SUCCESS") => {
        end({
          method,
          status,
        });
        endSummary?.({
          method,
          status,
        });
      };
    };
  }

  async toResponse(): Promise<Response> {
    const metrics = await this.registry.metrics();
    return new Response(metrics, {
      headers: {
        "Content-Type": this.registry.contentType,
      },
    });
  }
}
