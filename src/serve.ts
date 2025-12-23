import { serve } from "bun";
import config from "./config.js";
import { Router } from "artur";
import { TokenStorage } from "./token-storage/token-storage.js";
import { TokenStorageHTTPTransport } from "./token-storage/transports/http-transport.js";
import { Temporal } from "temporal-polyfill";

const startTime = Temporal.Now.instant();

const router = new Router({
  middlewares: [
    (fetch) => async (req) => {
      const res = await fetch(req);
      res.headers.append("X-Service-Name", "token-storage");
      return res;
    },
  ],
});

const tokenStorage = new TokenStorage();

const transport = new TokenStorageHTTPTransport(tokenStorage);

router.route("POST", "/rpc", { fetch: transport.jsonRpcRouter.fetch });

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
