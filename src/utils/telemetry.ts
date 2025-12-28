import { z } from "zod";

const apiSpec = {
  current: {
    version: "1",
    schemas: {
      event: z.object({
        client_id: z.string().regex(/^\d+\.\d+$/),
        name: z.literal("container_up"),
        properties: z.object({
          service_name: z.enum(["tokenstorage"]),
          service_version: z.string().max(25),
        }),
      }),
    },
  },
};

type TelemetryOptions = {
  uri: string;
  debug?: boolean;
};

type Message = z.infer<typeof apiSpec.current.schemas.event>;

export class Telemetry {
  #controllerReadable =
    Promise.withResolvers<ReadableStreamDefaultController<Message>>();
  #readable = new ReadableStream<Message>({
    start: (controller) => {
      this.#controllerReadable.resolve(controller);
    },
  });
  #thread: Promise<void>;
  #debug: boolean;
  #collectUrl: string;

  constructor(options: TelemetryOptions) {
    this.#thread = this.#startThread();
    this.#collectUrl = options?.uri;
    this.#debug = options?.debug ?? false;
  }

  push(message: Message) {
    this.#controllerReadable.promise.then((controller) =>
      controller.enqueue(message),
    );
  }

  async #startThread() {
    const done = Promise.withResolvers<true>();
    this.#readable.pipeTo(
      new WritableStream<Message>({
        write: async (message) => {
          const collectUrl = new URL(this.#collectUrl);

          try {
            const request = new Request(collectUrl, {
              method: "POST",
              body: JSON.stringify(message),
            });

            if (this.#debug) {
              console.error(
                `Telemetry request: ${request.method} ${request.url} body: ${JSON.stringify(message)}`,
              );
            }

            const response = await fetch(request);

            const debugResponse = !response.ok || this.#debug;

            if (debugResponse) {
              console.error(
                `Telemetry response: ${response.status} ${response.statusText} body: ${await response.text()}`,
              );
            }
          } catch (e) {
            console.error(e);
          }
        },
      }),
    );
    await done.promise;
  }
}
