import { serve } from "bun";
import { Config } from "./config.js";
import { Router } from "artur";
import { TokenStorage } from "./token-storage/token-storage.js";
import { TokenStorageHTTPTransport } from "./token-storage/transports/http-transport.js";
import { Temporal } from "temporal-polyfill";
import { httpTransportProtocol } from "./utils/http-trasport-protocol.js";
import type { StorageInstance } from "./token-storage/storage/dtos/storage-instance.dto.js";
import { Client } from "pg";
import { PostgresQLStorage } from "./token-storage/storage/postgresql-storage.js";
// import { DuckDBStorage } from "./token-storage/storage/duckdb-storage.js";
import { HTTPStorage } from "./token-storage/storage/http-storage.js";
import * as Prometheus from "prom-client";
import { Metrics } from "./utils/metrics.js";
import { Telemetry } from "./utils/telemetry.js";
import { packageVersion } from "./package-version.js";

const config = Config.fromEnvironment();

const telemetry = config.telemetry.enabled
  ? new Telemetry({
      uri: config.telemetry.uri,
      debug: config.telemetry.debug,
    })
  : null;

telemetry?.push({
  name: "container_up",
  client_id: `${Date.now()}.${1234}`,
  properties: {
    service_name: "tokenstorage",
    service_version: packageVersion,
  },
});

const metrics = new Metrics({
  enabled: config.server.metrics.enabled,
  percentiles: config.server.metrics.summaryPercentiles,
  buckets: config.server.metrics.histogramBuckets,
  ageBuckets: config.server.metrics.ageBuckets,
  maxAgeSeconds: config.server.metrics.maxAgeSeconds,
  collectDefaultMetrics: true,
  enableSummary: config.server.metrics.enableSummary,
});

const parseStatusCode = (
  statusCode: number | null,
): `${"1" | "2" | "3" | "4" | "5"}xx` | "unknown" => {
  if (statusCode === null) return "unknown";
  if (statusCode >= 100 && statusCode < 200) return "1xx";
  if (statusCode >= 200 && statusCode < 300) return "2xx";
  if (statusCode >= 300 && statusCode < 400) return "3xx";
  if (statusCode >= 400 && statusCode < 500) return "4xx";
  if (statusCode >= 500 && statusCode < 600) return "5xx";
  return "unknown";
};

const register = new Prometheus.Registry();

Prometheus.collectDefaultMetrics({ register });

const startTime = Temporal.Now.instant();

const metricsMiddleware =
  (fetch: (request: Request) => Promise<Response>) => async (req: Request) => {
    const s = metrics.httpStartTimer();
    let statusCode: null | number = null;
    try {
      const res = await fetch(req);
      statusCode = res.status;
      res.headers.append(
        "X-TokenStorage-Api-Version",
        httpTransportProtocol.version,
      );
      return res;
    } finally {
      const { pathname } = new URL(req.url);
      s(req.method, pathname, parseStatusCode(statusCode));
    }
  };

const router = new Router();

const dbFactory = (uri: string | null): StorageInstance | undefined => {
  if (uri === null) return undefined;
  if (!URL.canParse(uri)) return undefined;
  const { protocol, pathname } = new URL(uri);
  if (protocol === "postgresql")
    return new PostgresQLStorage({ client: new Client(uri) });
  // if (protocol === "duckdb")
  //   return new DuckDBStorage({ database: { path: pathname } });
  // if (protocol === "file")
  //   return new DuckDBStorage({ database: { path: pathname } });
  if (protocol === "http" || protocol === "https")
    return new HTTPStorage(new URL(uri));
  return undefined;
};

const tokenStorage = new TokenStorage({
  db: dbFactory(config.database.uri),
});

const transport = new TokenStorageHTTPTransport(tokenStorage, {
  jsonRpcMiddlewares: [
    (next) => {
      return async (params, request, event) => {
        const s = metrics.rpcStartTimer();
        try {
          const r = await next(params, request, event);
          console.log("r:", r);
          return r;
        } finally {
          s(request.method, "SUCCESS");
        }
      };
    },
  ],
});

router.route("POST", "/rpc", {
  middlewares: [metricsMiddleware],
  fetch: transport.jsonRpcRouter.fetch,
});

router.route("GET", "/metrics", async () => {
  return await metrics.toResponse();
});

router.route("ALL", "/health", () =>
  Response.json({
    status: "ok",
    uptime: Temporal.Now.instant().since(startTime).total("milliseconds"),
  }),
);

const server = serve({
  port: config.server.port,
  hostname: config.server.hostname,
  fetch: router.fetch,
});

console.log(`Listening on ${server.url}`);
