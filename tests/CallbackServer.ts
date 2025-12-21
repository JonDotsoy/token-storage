import { serve } from "bun";

export class CallbackServer {
  #port?: number;

  port(port: number) {
    this.#port = port;
    return this;
  }

  async wait() {
    if (!this.#port) throw new Error("No port provided");
    const callback = Promise.withResolvers<{
      url: string;
      headers: any;
      body: any;
    }>();
    const server = serve({
      port: this.#port,
      async fetch(req) {
        callback.resolve({
          url: req.url,
          headers: Object.fromEntries(req.headers.entries()),
          body: await req.text(),
        });
        return new Response("OK");
      },
    });
    const value = await callback.promise;
    server.stop();
    return value;
  }
}
