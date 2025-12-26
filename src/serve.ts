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

const config = Config.fromEnvironment();

const metrics = new Metrics({
  percentiles: config.server.metrics.summaryPercentiles,
  buckets: config.server.metrics.histogramBuckets,
  ageBuckets: config.server.metrics.ageBuckets,
  maxAgeSeconds: config.server.metrics.maxAgeSeconds,
  collectDefaultMetrics: true,
  enableSummary: config.server.metrics.enableSummary,
});

const percentiles = config.server.metrics.summaryPercentiles;

const register = new Prometheus.Registry();

Prometheus.collectDefaultMetrics({ register });

const startTime = Temporal.Now.instant();

const router = new Router({
  middlewares: [
    (fetch) => async (req) => {
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
        s(req.method, pathname, statusCode ?? NaN);
      }
    },
  ],
});

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

router.route("POST", "/rpc", { fetch: transport.jsonRpcRouter.fetch });

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
