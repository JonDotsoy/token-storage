import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { $ } from "bun";
import { Client } from "pg";
import { PostgresQLStorageInstance } from "./postgresql-storage.js";

const ms5m = 5 * 60 * 1000;

describe.skipIf(process.env.CI !== undefined)("PostgreSQL Storage", () => {
  let containerId: string | null = null;
  let client: Client | null = null;
  let storage: PostgresQLStorageInstance | null = null;

  const POSTGRES_USER = "testuser";
  const POSTGRES_PASSWORD = "testpass";
  const POSTGRES_DB = "testdb";
  let POSTGRES_PORT: number;

  beforeAll(
    async () => {
      // Generar puerto random entre 5432 y 6432
      POSTGRES_PORT = Math.floor(Math.random() * 1000) + 5432;

      // Iniciar contenedor PostgreSQL
      const result = await $`docker run -d \
            -e POSTGRES_USER=${POSTGRES_USER} \
            -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
            -e POSTGRES_DB=${POSTGRES_DB} \
            -p ${POSTGRES_PORT}:5432 \
            postgres:16-alpine`.text();

      containerId = result.trim();

      // Esperar a que PostgreSQL esté listo
      await $`docker exec ${containerId} sh -c 'until pg_isready -U ${POSTGRES_USER}; do sleep 1; done'`;

      client = new Client({
        host: "localhost",
        port: POSTGRES_PORT,
        user: POSTGRES_USER,
        password: POSTGRES_PASSWORD,
        database: POSTGRES_DB,
      });
      await client.connect();
      storage = new PostgresQLStorageInstance({ client });
      await storage.migrated.promise;
    },
    { timeout: ms5m },
  );

  afterAll(
    async () => {
      await client?.end();
      if (containerId) {
        await $`docker stop ${containerId}`;
        await $`docker rm ${containerId}`;
      }
    },
    { timeout: ms5m },
  );

  test("should create and retrieve OAuth client", async () => {
    const oauthClientId = "test-client-1";
    const oauthClient = {
      client_id: "client-123",
      client_secret: "secret-456",
      project_id: "project-789",
      auth_uri: "https://example.com/auth",
      token_uri: "https://example.com/token",
      auth_provider_x509_cert_url: "https://example.com/certs",
      created_at: new Date().toISOString(),
    };

    await storage!.putOAuthClient(oauthClientId, oauthClient);
    const retrieved = await storage!.getOAuthClient(oauthClientId);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.oauth_client_id).toBe(oauthClientId);
    expect(retrieved?.client_id).toBe(oauthClient.client_id);
  });

  test("should get stats", async () => {
    const stats = await storage!.getStats();
    expect(stats.oauth_clients).toBeGreaterThanOrEqual(0);
    expect(stats.connections).toBeGreaterThanOrEqual(0);
    expect(stats.tokens).toBeGreaterThanOrEqual(0);
  });
});
