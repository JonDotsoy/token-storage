import z from "zod";
import * as schemas from "../../schemas";
import type {
  Connection,
  ConnectionInput,
  Credential,
  CredentialInput,
  OAuthClient,
  OAuthClientInput,
  Stats,
  StorageInstance,
} from "./dtos/storage-instance.dto";

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

const requestJson = (
  body: any,
  requestInfo: string,
  init: Omit<RequestInit, "body"> | undefined,
) => {
  const request = new Request(requestInfo, {
    ...init,
    body: JSON.stringify(body),
  });
  request.headers.append("Content-Type", "application/json");
  return request;
};

type Middleware = (
  fetch: (request: Request) => Promise<Response>,
) => (request: Request) => Promise<Response>;

const applyMiddleware = (middleware?: Middleware) => {
  const pass: Middleware = middleware ?? ((fetch) => (req) => fetch(req));
  return pass(fetch);
};

export class HTTPStorageInstance implements StorageInstance {
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

  async putOAuthClient(
    oauth_client_id: string,
    oauthClient: OAuthClientInput,
  ): Promise<void> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "OAuthClient.put",
        params: { oauth_client_id, oauthClient },
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
  }
  async getOAuthClient(oauth_client_id: string): Promise<OAuthClient | null> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "OAuthClient.get",
        params: { oauth_client_id },
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
    return jsonRpcResponse.result === null
      ? null
      : schemas.OAuthClientSchema.parse(jsonRpcResponse.result);
  }
  async deleteOAuthClient(oauth_client_id: string): Promise<void> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "OAuthClient.delete",
        params: { oauth_client_id },
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
  }
  async *getOAuthClients(): AsyncIterable<OAuthClient> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "OAuthClient.list",
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
    const clients = z
      .array(schemas.OAuthClientSchema)
      .parse(jsonRpcResponse.result);
    for (const client of clients) {
      yield client;
    }
  }
  async putConnection(
    connection_id: string,
    connection: ConnectionInput,
  ): Promise<void> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "connection.put",
        params: { connection_id, connection },
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
  }
  async getConnection(connection_id: string): Promise<Connection | null> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "connection.get",
        params: { connection_id },
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
    return jsonRpcResponse.result === null
      ? null
      : schemas.ConnectionSchema.parse(jsonRpcResponse.result);
  }
  async deleteConnection(connection_id: string): Promise<void> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "connection.delete",
        params: { connection_id },
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
  }
  async *getConnections(): AsyncIterable<Connection> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "connection.list",
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
    const connections = z
      .array(schemas.ConnectionSchema)
      .parse(jsonRpcResponse.result);
    for (const connection of connections) {
      yield connection;
    }
  }
  async putCredential(
    credential_id: string,
    credential: CredentialInput,
  ): Promise<void> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "credential.put",
        params: { credential_id, credential },
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
  }
  async getCredential(credential_id: string): Promise<Credential | null> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "credential.get",
        params: { credential_id },
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
    return jsonRpcResponse.result === null
      ? null
      : schemas.CredentialSchema.parse(jsonRpcResponse.result);
  }
  async deleteCredential(credential_id: string): Promise<void> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "credential.delete",
        params: { credential_id },
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
  }
  async *getCredentials(): AsyncIterable<Credential> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "credential.list",
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
    const credentials = z
      .array(schemas.CredentialSchema)
      .parse(jsonRpcResponse.result);
    for (const credential of credentials) {
      yield credential;
    }
  }
  async getStats(): Promise<Stats> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "stats.get",
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
    return schemas.StatsSchema.parse(jsonRpcResponse.result);
  }
  async getAuthURL(
    connection_id: string,
    redirect_uri: string,
  ): Promise<string> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "auth.getURL",
        params: { connection_id, redirect_uri },
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
    return z.string().parse(jsonRpcResponse.result);
  }
  async exchangeCode(
    connection_id: string,
    redirect_uri: string,
    code: string,
  ): Promise<{ credential_id: string }> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "auth.exchangeCode",
        params: { connection_id, redirect_uri, code },
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
    return z
      .object({ credential_id: z.string() })
      .parse(jsonRpcResponse.result);
  }
  async getToken(credential_id: string): Promise<Credential["token"]> {
    const request = new Request(`${this.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.#secuenceId++,
        jsonrpc: "2.0",
        method: "token.get",
        params: { credential_id },
      }),
    });
    const response = await this.fetch(request);
    if (!response.ok)
      throw new HTTPStorageInstanceError(
        request,
        response,
        await response.text(),
      );
    const jsonRpcResponse = jsonRpcResponseSchema.parse(await response.json());
    if ("error" in jsonRpcResponse) {
      throw new HTTPStorageInstanceError(
        request,
        response,
        `${jsonRpcResponse.error.code} ${jsonRpcResponse.error.message} ${jsonRpcResponse.error.data}`,
      );
    }
    return schemas.TokenSchema.parse(jsonRpcResponse.result);
  }
}
