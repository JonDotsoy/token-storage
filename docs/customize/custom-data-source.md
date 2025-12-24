# Custom Data Source

Crea tu propio data source implementando la interfaz `StorageInstance` para integrar Token Storage con cualquier sistema de almacenamiento.

## Ejemplo: Redis Storage

```typescript
import type { StorageInstance } from "@jondotsoy/token-storage/storage/dtos/storage-instance.dto";
import type {
  OAuthClient,
  OAuthClientInput,
  Connection,
  ConnectionInput,
  Credential,
  CredentialInput,
  Stats,
} from "@jondotsoy/token-storage";
import { createClient, RedisClientType } from "redis";

export class RedisStorage implements StorageInstance {
  private redis: RedisClientType;

  constructor(redisUrl: string) {
    this.redis = createClient({ url: redisUrl });
  }

  async connect() {
    await this.redis.connect();
  }

  async disconnect() {
    await this.redis.disconnect();
  }

  // OAuth Clients
  async putOAuthClient(
    oauth_client_id: string,
    oauthClient: OAuthClientInput,
  ): Promise<void> {
    await this.redis.set(
      `oauth_client:${oauth_client_id}`,
      JSON.stringify(oauthClient),
    );
  }

  async getOAuthClient(oauth_client_id: string): Promise<OAuthClient | null> {
    const data = await this.redis.get(`oauth_client:${oauth_client_id}`);
    if (!data) return null;
    return { oauth_client_id, ...JSON.parse(data) };
  }

  async deleteOAuthClient(oauth_client_id: string): Promise<void> {
    await this.redis.del(`oauth_client:${oauth_client_id}`);
  }

  async *getOAuthClients(): AsyncIterable<OAuthClient> {
    const keys = await this.redis.keys("oauth_client:*");
    for (const key of keys) {
      const oauth_client_id = key.replace("oauth_client:", "");
      const client = await this.getOAuthClient(oauth_client_id);
      if (client) yield client;
    }
  }

  // Connections
  async putConnection(
    connection_id: string,
    connection: ConnectionInput,
  ): Promise<void> {
    await this.redis.set(
      `connection:${connection_id}`,
      JSON.stringify(connection),
    );
  }

  async getConnection(connection_id: string): Promise<Connection | null> {
    const data = await this.redis.get(`connection:${connection_id}`);
    if (!data) return null;
    return { connection_id, ...JSON.parse(data) };
  }

  async deleteConnection(connection_id: string): Promise<void> {
    await this.redis.del(`connection:${connection_id}`);
  }

  async *getConnections(): AsyncIterable<Connection> {
    const keys = await this.redis.keys("connection:*");
    for (const key of keys) {
      const connection_id = key.replace("connection:", "");
      const connection = await this.getConnection(connection_id);
      if (connection) yield connection;
    }
  }

  // Credentials
  async putCredential(
    credential_id: string,
    credential: CredentialInput,
  ): Promise<void> {
    await this.redis.set(
      `credential:${credential_id}`,
      JSON.stringify(credential),
    );
  }

  async getCredential(credential_id: string): Promise<Credential | null> {
    const data = await this.redis.get(`credential:${credential_id}`);
    if (!data) return null;
    return { credential_id, ...JSON.parse(data) };
  }

  async deleteCredential(credential_id: string): Promise<void> {
    await this.redis.del(`credential:${credential_id}`);
  }

  async *getCredentials(): AsyncIterable<Credential> {
    const keys = await this.redis.keys("credential:*");
    for (const key of keys) {
      const credential_id = key.replace("credential:", "");
      const credential = await this.getCredential(credential_id);
      if (credential) yield credential;
    }
  }

  // Stats
  async getStats(): Promise<Stats> {
    const [oauthClients, connections, credentials] = await Promise.all([
      this.redis.keys("oauth_client:*"),
      this.redis.keys("connection:*"),
      this.redis.keys("credential:*"),
    ]);

    return {
      oauthClients: oauthClients.length,
      connections: connections.length,
      credentials: credentials.length,
    };
  }
}
```

## Consideraciones

**Serialización:** Usa `JSON.stringify()` y `JSON.parse()` para almacenar objetos.

**Async Iterables:** Los métodos `get*()` deben usar `async *` y `yield`:

```typescript
async *getOAuthClients(): AsyncIterable<OAuthClient> {
  for (const item of items) {
    yield item;
  }
}
```

**Null handling:** Retorna `null` cuando un recurso no existe.

**Performance:** Usa `Promise.all()` en `getStats()` para consultas paralelas.

## Testing

Usa [Testcontainers](https://node.testcontainers.org/modules/redis/) para probar con una instancia real de Redis:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { TokenStorage } from "@jondotsoy/token-storage";
import { RedisStorage } from "./redis-storage";
import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";

describe("RedisStorage", () => {
  let container: StartedRedisContainer;
  let storage: TokenStorage;

  beforeAll(async () => {
    // Inicia contenedor Redis
    container = await new RedisContainer().start();

    const redisStorage = new RedisStorage(container.getConnectionUrl());
    await redisStorage.connect();

    storage = new TokenStorage({ db: redisStorage });
  });

  afterAll(async () => {
    await container.stop();
  });

  it("should store and retrieve OAuth client", async () => {
    await storage.putOAuthClient("test-client", {
      client_id: "123",
      client_secret: "secret",
      project_id: "test",
      auth_uri: "https://auth.example.com",
      token_uri: "https://token.example.com",
      auth_provider_x509_cert_url: "https://certs.example.com",
      created_at: new Date().toISOString(),
    });

    const client = await storage.getOAuthClient("test-client");
    expect(client).toBeDefined();
    expect(client?.client_id).toBe("123");
  });
});
```
