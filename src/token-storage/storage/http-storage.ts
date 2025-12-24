import z from "zod";
import type {
  Connection,
  ConnectionInput,
  Credential,
  CredentialInput,
  OAuthClient,
  OAuthClientInput,
  Stats,
  StorageInstance,
} from "./dtos/storage-instance.dto.js";
import { httpTransportProtocol } from "../../utils/http-trasport-protocol.js";

const jsonRpcResponseSchema = z.union([
  z.object({
    id: z.number(),
    jsonrpc: z.literal("2.0"),
    result: z.unknown(),
  }),
  z.object({
    id: z.number(),
    jsonrpc: z.literal("2.0"),
    error: z.object({
      code: z.number(),
      message: z.string(),
      data: z.unknown(),
    }),
  }),
]);

export class HTTPStorageInstanceError extends Error {
  constructor(request: Request, response: Response, message: string) {
    super(
      `POST ${request.url}: ${response.status} ${response.statusText} ${message}`,
    );
  }
}

type Middleware = (
  fetch: (request: Request) => Promise<Response>,
) => (request: Request) => Promise<Response>;

const applyMiddleware = (middleware?: Middleware) => {
  const pass: Middleware = middleware ?? ((fetch) => (req) => fetch(req));
  return pass(fetch);
};

export class HTTPStorage implements StorageInstance {
  #secuenceId = 1;
  #fetch: (request: Request) => Promise<Response>;

  constructor(
    readonly url: URL,
    readonly options?: { middleware?: Middleware },
  ) {
    this.#fetch = applyMiddleware(options?.middleware);
  }

  async fetch(request: Request) {
    return await this.#fetch(request);
  }

  prepareMethod<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(methodDef: {
    name: string;
    input: I | undefined | null;
    output: O;
  }) {
    return async (input: z.infer<I>): Promise<z.infer<O>> => {
      const request = new Request(`${this.url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: this.#secuenceId++,
          jsonrpc: "2.0",
          method: methodDef.name,
          params: input,
        }),
      });
      const response = await this.fetch(request);
      if (!response.ok)
        throw new HTTPStorageInstanceError(
          request,
          response,
          await response.text(),
        );
      const jsonRpcResponse = jsonRpcResponseSchema.parse(
        await response.json(),
      );
      if ("error" in jsonRpcResponse) {
        throw new HTTPStorageInstanceError(
          request,
          response,
          `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
        );
      }
      return jsonRpcResponse.result as any;
    };
  }

  async putOAuthClient(
    oauth_client_id: string,
    oauthClient: OAuthClientInput,
  ): Promise<void> {
    const method = this.prepareMethod(
      httpTransportProtocol.methods.OAuthClientPut,
    );
    await method({ oauth_client_id, oauthClient });
  }
  async getOAuthClient(oauth_client_id: string): Promise<OAuthClient | null> {
    const method = this.prepareMethod(
      httpTransportProtocol.methods.OAuthClientGet,
    );
    return await method({ oauth_client_id });
  }
  async deleteOAuthClient(oauth_client_id: string): Promise<void> {
    const method = this.prepareMethod(
      httpTransportProtocol.methods.OAuthClientDelete,
    );
    await method({ oauth_client_id });
  }
  async *getOAuthClients(): AsyncIterable<OAuthClient> {
    const method = this.prepareMethod(
      httpTransportProtocol.methods.OAuthClientList,
    );
    const clients = await method(undefined);
    for (const client of clients) {
      yield client;
    }
  }
  async putConnection(
    connection_id: string,
    connection: ConnectionInput,
  ): Promise<void> {
    const method = this.prepareMethod(
      httpTransportProtocol.methods.ConnectionPut,
    );
    await method({ connection_id, connection });
  }
  async getConnection(connection_id: string): Promise<Connection | null> {
    const method = this.prepareMethod(
      httpTransportProtocol.methods.ConnectionGet,
    );
    return await method({ connection_id });
  }
  async deleteConnection(connection_id: string): Promise<void> {
    const method = this.prepareMethod(
      httpTransportProtocol.methods.ConnectionDelete,
    );
    await method({ connection_id });
  }
  async *getConnections(): AsyncIterable<Connection> {
    const method = this.prepareMethod(
      httpTransportProtocol.methods.ConnectionList,
    );
    const connections = await method(undefined);
    for (const connection of connections) {
      yield connection;
    }
  }
  async putCredential(
    credential_id: string,
    credential: CredentialInput,
  ): Promise<void> {
    const method = this.prepareMethod(
      httpTransportProtocol.methods.CredentialPut,
    );
    await method({ credential_id, credential });
  }
  async getCredential(credential_id: string): Promise<Credential | null> {
    const method = this.prepareMethod(
      httpTransportProtocol.methods.CredentialGet,
    );
    return await method({ credential_id });
  }
  async deleteCredential(credential_id: string): Promise<void> {
    const method = this.prepareMethod(
      httpTransportProtocol.methods.CredentialDelete,
    );
    await method({ credential_id });
  }
  async *getCredentials(): AsyncIterable<Credential> {
    const method = this.prepareMethod(
      httpTransportProtocol.methods.CredentialList,
    );
    const credentials = await method(undefined);
    for (const credential of credentials) {
      yield credential;
    }
  }
  async getStats(): Promise<Stats> {
    const method = this.prepareMethod(httpTransportProtocol.methods.StatsGet);
    return await method(undefined);
  }
  async getAuthURL(
    connection_id: string,
    redirect_uri: string,
  ): Promise<string> {
    const method = this.prepareMethod(httpTransportProtocol.methods.AuthGetURL);
    return await method({ connection_id, redirect_uri });
  }
  async exchangeCode(
    connection_id: string,
    redirect_uri: string,
    code: string,
  ): Promise<{ credential_id: string }> {
    const method = this.prepareMethod(
      httpTransportProtocol.methods.AuthExchangeCode,
    );
    return await method({ connection_id, redirect_uri, code });
  }
  async getToken(credential_id: string): Promise<Credential["token"]> {
    const method = this.prepareMethod(httpTransportProtocol.methods.TokenGet);
    return await method({ credential_id });
  }
}
