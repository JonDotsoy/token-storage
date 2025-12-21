import * as Bun from "bun";
import { serve } from "bun";

class AuthServer {
  #port?: number;
  #exchanges = new Map<string, string>();
  server?: Bun.Server<undefined>;

  port(port: number) {
    this.#port = port;
    return this;
  }

  setExchange(code: string, token: string) {
    this.#exchanges.set(code, token);
    return this;
  }

  async close() {
    if (!this.server) throw new Error("No server");
    this.server.stop();
  }

  async start() {
    if (!this.#port) throw new Error("No port provided");
    this.server = serve({
      port: this.#port,
      routes: {
        "/health": () => new Response("ok"),
        "/exchange": (req) => {
          const url = new URL(req.url);
          const code = url.searchParams.get("code");
          if (!code) return new Response("Missing code", { status: 400 });
          const token = this.#exchanges.get(code);
          if (!token) return new Response("Invalid code", { status: 400 });
          return Response.json({ token });
        },
      },
    });
    while (true) {
      try {
        const response = await fetch(new URL(`/health`, this.server.url));
        if (response.status === 200) {
          break;
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 90));
      }
    }
  }
}
