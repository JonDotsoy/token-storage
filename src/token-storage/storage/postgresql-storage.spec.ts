import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "bun:test";
import { $ } from "bun";
import { Client } from "pg";
import { PostgresQLStorage } from "./postgresql-storage.js";

const ms5m = 5 * 60 * 1000;
const isCI = process.env.CI !== undefined;

describe.skipIf(isCI)("PostgreSQL Storage", () => {
  let containerId: string | null = null;
  let client: Client | null = null;
  let storage: PostgresQLStorage | null = null;

  const POSTGRES_USER = "testuser";
  const POSTGRES_PASSWORD = "testpass";
  const POSTGRES_DB = "testdb";
  let POSTGRES_PORT: number;

  beforeEach(
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
      storage = new PostgresQLStorage({ client });
      await storage.migrated.promise;
    },
    { timeout: ms5m },
  );

  afterEach(
    async () => {
      await client?.end();
      if (containerId) {
        await $`docker stop ${containerId}`;
        await $`docker rm ${containerId}`;
      }
    },
    { timeout: ms5m },
  );

  // OAuth Client Tests
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
    expect(retrieved?.client_secret).toBe(oauthClient.client_secret);
    expect(retrieved?.project_id).toBe(oauthClient.project_id);
    expect(retrieved?.auth_uri).toBe(oauthClient.auth_uri);
    expect(retrieved?.token_uri).toBe(oauthClient.token_uri);
  });

  test("should return null for non-existent OAuth client", async () => {
    const retrieved = await storage!.getOAuthClient("non-existent-client");
    expect(retrieved).toBeNull();
  });

  test("should delete OAuth client", async () => {
    const oauthClientId = "test-client-delete";
    const oauthClient = {
      client_id: "client-delete",
      client_secret: "secret-delete",
      project_id: "project-delete",
      auth_uri: "https://example.com/auth",
      token_uri: "https://example.com/token",
      auth_provider_x509_cert_url: "https://example.com/certs",
      created_at: new Date().toISOString(),
    };

    await storage!.putOAuthClient(oauthClientId, oauthClient);
    await storage!.deleteOAuthClient(oauthClientId);
    const retrieved = await storage!.getOAuthClient(oauthClientId);

    expect(retrieved).toBeNull();
  });

  test("should iterate over all OAuth clients", async () => {
    const clientIds = ["iter-client-1", "iter-client-2", "iter-client-3"];

    for (const clientId of clientIds) {
      await storage!.putOAuthClient(clientId, {
        client_id: `client-${clientId}`,
        client_secret: `secret-${clientId}`,
        project_id: `project-${clientId}`,
        auth_uri: "https://example.com/auth",
        token_uri: "https://example.com/token",
        auth_provider_x509_cert_url: "https://example.com/certs",
        created_at: new Date().toISOString(),
      });
    }

    const retrievedClients: string[] = [];
    for await (const client of storage!.getOAuthClients()) {
      if (client.oauth_client_id.startsWith("iter-client-")) {
        retrievedClients.push(client.oauth_client_id);
      }
    }

    expect(retrievedClients.length).toBeGreaterThanOrEqual(3);
    for (const clientId of clientIds) {
      expect(retrievedClients).toContain(clientId);
    }
  });

  // Connection Tests
  test("should create and retrieve connection", async () => {
    const oauthClientId = "connection-test-client";
    await storage!.putOAuthClient(oauthClientId, {
      client_id: "client-conn",
      client_secret: "secret-conn",
      project_id: "project-conn",
      auth_uri: "https://example.com/auth",
      token_uri: "https://example.com/token",
      auth_provider_x509_cert_url: "https://example.com/certs",
      created_at: new Date().toISOString(),
    });

    const connectionId = "test-connection-1";
    const connection = {
      oauth_client_id: oauthClientId,
      scope: ["read", "write"],
      created_at: new Date().toISOString(),
    };

    await storage!.putConnection(connectionId, connection);
    const retrieved = await storage!.getConnection(connectionId);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.connection_id).toBe(connectionId);
    expect(retrieved?.oauth_client_id).toBe(oauthClientId);
    expect(retrieved?.scope).toEqual(connection.scope);
  });

  test("should return null for non-existent connection", async () => {
    const retrieved = await storage!.getConnection("non-existent-connection");
    expect(retrieved).toBeNull();
  });

  test("should delete connection", async () => {
    const oauthClientId = "connection-delete-client";
    await storage!.putOAuthClient(oauthClientId, {
      client_id: "client-conn-delete",
      client_secret: "secret-conn-delete",
      project_id: "project-conn-delete",
      auth_uri: "https://example.com/auth",
      token_uri: "https://example.com/token",
      auth_provider_x509_cert_url: "https://example.com/certs",
      created_at: new Date().toISOString(),
    });

    const connectionId = "test-connection-delete";
    const connection = {
      oauth_client_id: oauthClientId,
      scope: ["read"],
      created_at: new Date().toISOString(),
    };

    await storage!.putConnection(connectionId, connection);
    await storage!.deleteConnection(connectionId);
    const retrieved = await storage!.getConnection(connectionId);

    expect(retrieved).toBeNull();
  });

  test("should iterate over all connections", async () => {
    const oauthClientId = "connection-iter-client";
    await storage!.putOAuthClient(oauthClientId, {
      client_id: "client-conn-iter",
      client_secret: "secret-conn-iter",
      project_id: "project-conn-iter",
      auth_uri: "https://example.com/auth",
      token_uri: "https://example.com/token",
      auth_provider_x509_cert_url: "https://example.com/certs",
      created_at: new Date().toISOString(),
    });

    const connectionIds = ["iter-conn-1", "iter-conn-2", "iter-conn-3"];

    for (const connId of connectionIds) {
      await storage!.putConnection(connId, {
        oauth_client_id: oauthClientId,
        scope: [`scope-${connId}`],
        created_at: new Date().toISOString(),
      });
    }

    const retrievedConnections: string[] = [];
    for await (const conn of storage!.getConnections()) {
      if (conn.connection_id.startsWith("iter-conn-")) {
        retrievedConnections.push(conn.connection_id);
      }
    }

    expect(retrievedConnections.length).toBeGreaterThanOrEqual(3);
    for (const connId of connectionIds) {
      expect(retrievedConnections).toContain(connId);
    }
  });

  // Credential Tests
  test("should create and retrieve credential", async () => {
    const oauthClientId = "credential-test-client";
    await storage!.putOAuthClient(oauthClientId, {
      client_id: "client-cred",
      client_secret: "secret-cred",
      project_id: "project-cred",
      auth_uri: "https://example.com/auth",
      token_uri: "https://example.com/token",
      auth_provider_x509_cert_url: "https://example.com/certs",
      created_at: new Date().toISOString(),
    });

    const connectionId = "credential-test-connection";
    await storage!.putConnection(connectionId, {
      oauth_client_id: oauthClientId,
      scope: ["read", "write"],
      created_at: new Date().toISOString(),
    });

    const credentialId = "test-credential-1";
    const credential = {
      connection_id: connectionId,
      token: {
        access_token: "access-token-123",
        expires_in: 3600,
        refresh_token: "refresh-token-456",
        scope: "read write",
        token_type: "Bearer",
        id_token: "id-token-789",
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    await storage!.putCredential(credentialId, credential);
    const retrieved = await storage!.getCredential(credentialId);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.credential_id).toBe(credentialId);
    expect(retrieved?.connection_id).toBe(connectionId);
    expect(retrieved?.token.access_token).toBe(credential.token.access_token);
    expect(retrieved?.token.refresh_token).toBe(credential.token.refresh_token);
    expect(retrieved?.token.id_token).toBe(credential.token.id_token);
    expect(retrieved?.token.expires_in).toBe(credential.token.expires_in);
  });

  test("should handle credential without optional fields", async () => {
    const oauthClientId = "credential-optional-client";
    await storage!.putOAuthClient(oauthClientId, {
      client_id: "client-cred-opt",
      client_secret: "secret-cred-opt",
      project_id: "project-cred-opt",
      auth_uri: "https://example.com/auth",
      token_uri: "https://example.com/token",
      auth_provider_x509_cert_url: "https://example.com/certs",
      created_at: new Date().toISOString(),
    });

    const connectionId = "credential-optional-connection";
    await storage!.putConnection(connectionId, {
      oauth_client_id: oauthClientId,
      scope: ["read"],
      created_at: new Date().toISOString(),
    });

    const credentialId = "test-credential-optional";
    const credential = {
      connection_id: connectionId,
      token: {
        access_token: "access-token-opt",
        expires_in: 7200,
        scope: "read",
        token_type: "Bearer",
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    await storage!.putCredential(credentialId, credential);
    const retrieved = await storage!.getCredential(credentialId);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.token.refresh_token).toBeUndefined();
    expect(retrieved?.token.id_token).toBeUndefined();
  });

  test("should return null for non-existent credential", async () => {
    const retrieved = await storage!.getCredential("non-existent-credential");
    expect(retrieved).toBeNull();
  });

  test("should delete credential", async () => {
    const oauthClientId = "credential-delete-client";
    await storage!.putOAuthClient(oauthClientId, {
      client_id: "client-cred-delete",
      client_secret: "secret-cred-delete",
      project_id: "project-cred-delete",
      auth_uri: "https://example.com/auth",
      token_uri: "https://example.com/token",
      auth_provider_x509_cert_url: "https://example.com/certs",
      created_at: new Date().toISOString(),
    });

    const connectionId = "credential-delete-connection";
    await storage!.putConnection(connectionId, {
      oauth_client_id: oauthClientId,
      scope: ["read"],
      created_at: new Date().toISOString(),
    });

    const credentialId = "test-credential-delete";
    const credential = {
      connection_id: connectionId,
      token: {
        access_token: "access-token-delete",
        expires_in: 3600,
        scope: "read",
        token_type: "Bearer",
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    await storage!.putCredential(credentialId, credential);
    await storage!.deleteCredential(credentialId);
    const retrieved = await storage!.getCredential(credentialId);

    expect(retrieved).toBeNull();
  });

  test("should iterate over all credentials", async () => {
    const oauthClientId = "credential-iter-client";
    await storage!.putOAuthClient(oauthClientId, {
      client_id: "client-cred-iter",
      client_secret: "secret-cred-iter",
      project_id: "project-cred-iter",
      auth_uri: "https://example.com/auth",
      token_uri: "https://example.com/token",
      auth_provider_x509_cert_url: "https://example.com/certs",
      created_at: new Date().toISOString(),
    });

    const connectionId = "credential-iter-connection";
    await storage!.putConnection(connectionId, {
      oauth_client_id: oauthClientId,
      scope: ["read"],
      created_at: new Date().toISOString(),
    });

    const credentialIds = ["iter-cred-1", "iter-cred-2", "iter-cred-3"];

    for (const credId of credentialIds) {
      await storage!.putCredential(credId, {
        connection_id: connectionId,
        token: {
          access_token: `access-token-${credId}`,
          expires_in: 3600,
          scope: "read",
          token_type: "Bearer",
          created_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });
    }

    const retrievedCredentials: string[] = [];
    for await (const cred of storage!.getCredentials()) {
      if (cred.credential_id.startsWith("iter-cred-")) {
        retrievedCredentials.push(cred.credential_id);
      }
    }

    expect(retrievedCredentials.length).toBeGreaterThanOrEqual(3);
    for (const credId of credentialIds) {
      expect(retrievedCredentials).toContain(credId);
    }
  });

  // Stats Tests
  test("should get stats", async () => {
    const stats = await storage!.getStats();
    expect(stats.oauth_clients).toBeGreaterThanOrEqual(0);
    expect(stats.connections).toBeGreaterThanOrEqual(0);
    expect(stats.tokens).toBeGreaterThanOrEqual(0);
  });

  test("should reflect correct counts in stats", async () => {
    const statsBefore = await storage!.getStats();

    // Crear un nuevo cliente OAuth
    const newClientId = "stats-test-client";
    await storage!.putOAuthClient(newClientId, {
      client_id: "client-stats",
      client_secret: "secret-stats",
      project_id: "project-stats",
      auth_uri: "https://example.com/auth",
      token_uri: "https://example.com/token",
      auth_provider_x509_cert_url: "https://example.com/certs",
      created_at: new Date().toISOString(),
    });

    const statsAfter = await storage!.getStats();
    expect(statsAfter.oauth_clients).toBe(statsBefore.oauth_clients + 1);
  });
});
