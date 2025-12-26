import { pick } from "@jondotsoy/utils-js/pick";
import {
  type Percentile,
  parsePercentile,
  isPercentile,
} from "./utils/percentil.js";
import { parseSecond, type Duration } from "./utils/duration.js";

const env = (name: string) => pick(process.env).property(name);

interface MetricsConfig {
  maxAgeSeconds: number;
  ageBuckets: number;
  summaryPercentiles: number[];
  histogramBuckets: number[];
  enableSummary: boolean;
}

interface ServerConfig {
  port: number;
  hostname: string;
  metrics: MetricsConfig;
}

interface CorsConfig {
  origin: string | string[];
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
}

interface DatabaseConfig {
  uri: string | null;
}

interface ConfigOptions {
  server?: Partial<Omit<ServerConfig, "metrics">> & {
    metrics?: Partial<MetricsConfig>;
  };
  cors?: Partial<CorsConfig>;
  database?: Partial<DatabaseConfig>;
}

export class Config {
  public server: ServerConfig;
  public cors: CorsConfig;
  public database: DatabaseConfig;

  constructor(options?: ConfigOptions) {
    const defaults = Config.defaultValues();
    this.server = {
      port: options?.server?.port ?? defaults.server.port,
      hostname: options?.server?.hostname ?? defaults.server.hostname,
      metrics: {
        maxAgeSeconds:
          options?.server?.metrics?.maxAgeSeconds ??
          defaults.server.metrics.maxAgeSeconds,
        ageBuckets:
          options?.server?.metrics?.ageBuckets ??
          defaults.server.metrics.ageBuckets,
        summaryPercentiles:
          options?.server?.metrics?.summaryPercentiles ??
          defaults.server.metrics.summaryPercentiles,
        histogramBuckets:
          options?.server?.metrics?.histogramBuckets ??
          defaults.server.metrics.histogramBuckets,
        enableSummary:
          options?.server?.metrics?.enableSummary ??
          defaults.server.metrics.enableSummary,
      },
    };
    this.cors = {
      origin: options?.cors?.origin ?? defaults.cors.origin,
      methods: options?.cors?.methods ?? defaults.cors.methods,
      allowedHeaders:
        options?.cors?.allowedHeaders ?? defaults.cors.allowedHeaders,
      credentials: options?.cors?.credentials ?? defaults.cors.credentials,
    };
    this.database = {
      uri: options?.database?.uri ?? defaults.database.uri,
    };
  }

  static defaultValues(): {
    server: ServerConfig;
    cors: CorsConfig;
    database: DatabaseConfig;
  } {
    return {
      server: {
        port: 5454,
        hostname: "localhost",
        metrics: {
          maxAgeSeconds: 600, // 10 minutos
          ageBuckets: 5,
          summaryPercentiles: Array.from<Percentile, number>(
            ["P50", "P90", "P95", "P99"],
            (v) => parsePercentile(v)!,
          ),
          histogramBuckets: Array.from<Duration, number>(
            ["50ms", "100ms", "250ms", "500ms", "1s", "2.5s", "5s", "10s"],
            (v) => parseSecond(v)!,
          ),
          enableSummary: false,
        },
      },
      cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
      },
      database: {
        uri: null,
      },
    };
  }

  static fromEnvironment(options?: ConfigOptions): Config {
    const port =
      env("PORT")
        ?.numeric()
        ?.pipe((v) => Number(v)).value ?? null;
    const hostname = env("HOST")?.string()?.value ?? null;
    const corsOrigin = env("CORS_ORIGIN")?.string()?.value ?? null;
    const dbUri = env("DB_URI")?.string()?.value ?? null;
    const metricsMaxAgeSeconds =
      env("METRICS_MAX_AGE_SECONDS")
        ?.numeric()
        ?.pipe((v) => Number(v)).value ?? null;
    const metricsAgeBuckets =
      env("METRICS_AGE_BUCKETS")
        ?.numeric()
        ?.pipe((v) => Number(v)).value ?? null;
    const metricsSummaryPercentiles =
      env("METRICS_SUMMARY_PERCENTILES")
        ?.string()
        ?.pipe((v) =>
          v.split(",").map((p) => {
            const v = p.trim();
            if (!isPercentile(v)) {
              throw new Error(
                `Invalid percentile value '${v}' in METRICS_SUMMARY_PERCENTILES environment variable. Expected format: P50, P90, P95, P99`,
              );
            }
            return parsePercentile(v)!;
          }),
        ).value ?? null;
    const metricsHistogramBuckets =
      env("METRICS_HISTOGRAM_BUCKETS")
        ?.string()
        ?.pipe((v) =>
          v.split(",").map((d) => {
            const v = d.trim();
            const seconds = parseSecond(v);
            if (seconds === null) {
              throw new Error(
                `Invalid duration value '${v}' in METRICS_HISTOGRAM_BUCKETS environment variable. Expected format: 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s`,
              );
            }
            return seconds;
          }),
        ).value ?? null;
    const metricsEnableSummary =
      env("METRICS_ENABLE_SUMMARY")
        ?.string()
        ?.pipe((v) => {
          const normalized = v.toLowerCase();
          return normalized === "on" || normalized === "true";
        }).value ?? null;
    const defaultValues = Config.defaultValues();

    return new Config({
      server: {
        port: options?.server?.port ?? port ?? defaultValues.server.port,
        hostname:
          options?.server?.hostname ??
          hostname ??
          defaultValues.server.hostname,
        metrics: {
          maxAgeSeconds:
            options?.server?.metrics?.maxAgeSeconds ??
            metricsMaxAgeSeconds ??
            defaultValues.server.metrics.maxAgeSeconds,
          ageBuckets:
            options?.server?.metrics?.ageBuckets ??
            metricsAgeBuckets ??
            defaultValues.server.metrics.ageBuckets,
          summaryPercentiles:
            options?.server?.metrics?.summaryPercentiles ??
            metricsSummaryPercentiles ??
            defaultValues.server.metrics.summaryPercentiles,
          histogramBuckets:
            options?.server?.metrics?.histogramBuckets ??
            metricsHistogramBuckets ??
            defaultValues.server.metrics.histogramBuckets,
          enableSummary:
            options?.server?.metrics?.enableSummary ??
            metricsEnableSummary ??
            defaultValues.server.metrics.enableSummary,
        },
      },
      cors: {
        origin:
          options?.cors?.origin ??
          (corsOrigin ? corsOrigin.split(",") : defaultValues.cors.origin),
        methods: options?.cors?.methods ?? defaultValues.cors.methods,
        allowedHeaders:
          options?.cors?.allowedHeaders ?? defaultValues.cors.allowedHeaders,
        credentials:
          options?.cors?.credentials ?? defaultValues.cors.credentials,
      },
      database: {
        uri: options?.database?.uri ?? dbUri ?? defaultValues.database.uri,
      },
    });
  }
}

// export default Config.fromEnvironment();
