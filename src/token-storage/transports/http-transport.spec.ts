import { describe, test, expect, afterAll } from "bun:test";
import { TokenStorage } from "../token-storage";
import { TokenStorageHTTPTransport } from "./http-transport";
import { serve } from "bun";

const ms1h = 1 * 60 * 60 * 1000;

describe("test1", () => {
  let s: null | ReturnType<typeof serve> = null;

  afterAll(async () => {
    s?.stop(true);
  });

  test.skip(
    "test1",
    async () => {
      const tokens = new TokenStorage();

      await tokens.putOAuthClient("aaaa", {
        client_id: "aaaa",
        client_secret: "bbbb",
        auth_provider_x509_cert_url: "cccc",
        auth_uri: "dddd",
        project_id: "eeee",
        token_uri: "ffff",
        created_at: new Date(
          Date.UTC(2025, 11, 23, 12, 32, 0, 0),
        ).toISOString(),
      });

      const { jsonRpcRouter } = new TokenStorageHTTPTransport(tokens);

      s = serve({
        port: 4000,
        fetch: (req) => jsonRpcRouter.fetch(req),
      });

      await new Promise((resolve) => setTimeout(resolve, ms1h));
    },
    { timeout: ms1h },
  );
});
