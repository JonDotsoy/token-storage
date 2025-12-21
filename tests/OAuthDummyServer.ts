import * as Bun from "bun";
import { serve } from "bun";

export class OAuthDummyServer {
  #port: null | number = null;
  #server: Bun.Server<undefined> | null = null;

  port(port: number) {
    this.#port = port;
    return this;
  }

  info() {
    return {
      client_id:
        "971210345098-54q7la8nl60701hdu6s85keduks7tj08.apps.googleusercontent.com",
      project_id: "jondotsoy",
      auth_uri: `http://localhost:${this.#port}/oauth2/auth`,
      token_uri: `http://localhost:${this.#port}/token`,
      auth_provider_x509_cert_url: `http://localhost:${this.#port}/oauth2/v1/certs`,
      client_secret: "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",
      redirect_uris: ["http://localhost"],
    };
  }

  async close() {
    if (!this.#server) throw new Error("No server");
    this.#server.stop();
  }

  async start() {
    const port = this.#port;
    if (!port) throw new Error("No port provided");
    const server = serve({
      port,
      routes: {
        "/oauth2/auth": (req) => {
          const url = new URL(req.url);
          const response_type = url.searchParams.get("response_type");
          const client_id = url.searchParams.get("client_id");
          const query_redirect_uri = url.searchParams.get("redirect_uri");
          const scope = url.searchParams.get("scope");
          const state = url.searchParams.get("state");
          const redirect_uri = new URL(query_redirect_uri!);
          redirect_uri.searchParams.set("code", "1234");
          redirect_uri.searchParams.set("state", state!);
          redirect_uri.searchParams.set("scope", scope!);
          return Response.redirect(redirect_uri.toString(), 302);
          // return Response.json({
          //   response_type,
          //   client_id,
          //   redirect_uri: query_redirect_uri,
          //   scope,
          //   state,
          // });
        },
        "/token": async (req) => {
          const body = await req.text();
          console.log("url:", req.url);
          console.log("body:", body);
          console.log("body:", new URLSearchParams(body));
          return Response.json({
            access_token: "1234",
            expires_in: 3600,
            token_type: "Bearer",
            refresh_token: "1234",
          });
        },
      },
    });
    this.#server = server;
  }
}
