import { connect } from "bun";
import {
  describe,
  test,
  expect,
  afterEach,
  beforeEach,
  beforeAll,
  afterAll,
} from "bun:test";
import { Client } from "../src/client";
import { TokenStorage } from "../src/token-storage/token-storage";
import { Service } from "./Service";
import { DB } from "./DB";
import { CallbackServer } from "./CallbackServer";
import { ms } from "./ms";
import { openUrl } from "./openUrl";
import { OAuthDummyServer } from "./OAuthDummyServer";

const client_secret = {
  client_id:
    "971210345098-54q7la8nl60701hdu6s85keduks7tj08.apps.googleusercontent.com",
  project_id: "jondotsoy",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_secret: "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",
  redirect_uris: ["http://localhost"],
};

describe("t", () => {
  const d = new OAuthDummyServer().port(4080);

  beforeAll(async () => {
    await d.start();
  });

  afterAll(async () => {
    await d.close();
  });

  test(
    "test1",
    async () => {
      const tokenStore = new TokenStorage();

      await tokenStore.putOAuthClient("google", d.info());
      await tokenStore.putConnection("conn", {
        oauth_client_id: "google",
        scope: ["profile"],
        created_at: new Date(),
      });
      const urlLogin = await tokenStore.getAuthURL(
        "conn",
        "http://localhost:4002",
      );
      openUrl(urlLogin);
      const res = await new CallbackServer().port(4002).wait();
      const code = new URL(res.url).searchParams.get("code")!;
      const { credential_id } = await tokenStore.exchangeCode(
        "conn",
        "http://localhost:4002",
        code,
      );
      const token = await tokenStore.getToken(credential_id);
      console.log("token", token);
      // const credential = await tokenStore.getCredential(credential_id);
      // await tokenStore.putCredential(credential_id, {
      //   ...credential!,
      //   token: {
      //     ...credential!.token,
      //     expires_in: -1, // force expiration
      //   }
      // });

      const token2 = await tokenStore.getToken(credential_id);
      console.log("token", token2);
      debugger;
    },
    { timeout: ms.minutes(30) },
  );
});

describe.skip("Integración OAuth", () => {
  const baseUrl = new URL("http://localhost:3000");

  const server = new Service()
    .cmd(["bun", "src/serve.ts"])
    .healthCheck(new URL("/health", baseUrl).toString());

  const db = new DB().path("./db");

  beforeEach(async () => {
    await db.clean();
    await server.start();
  });

  afterEach(async () => {
    await server.close();
  });

  test(
    "debería completar el flujo OAuth completo: crear cliente, obtener URL de autorización, intercambiar código y obtener token",
    async () => {
      const client = new Client().baseUrl(baseUrl.toString());

      await client.putOAuthClient("google", client_secret);
      await client.putConnection("conn", {
        client_id: "google",
        scope: ["profile"],
        created_at: new Date(),
      });
      const authUrl = await client.getAuthUrl(
        "conn",
        "http://localhost:4001/callback",
      );

      console.log("authUrl", authUrl.auth_url);
      openUrl(authUrl.auth_url);
      const res = await new CallbackServer().port(4001).wait();
      const code = new URL(res.url).searchParams.get("code");

      const { authorization_id, token } = await client.exchangeCode(
        "conn",
        code!,
        "http://localhost:4001/callback",
      );

      console.log("token", token);

      const token2 = await client.getToken(authorization_id);

      console.log("token2", token2);
    },
    { timeout: 30_000 },
  );
});
