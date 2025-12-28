import {
  describe,
  expect,
  test,
  setSystemTime,
  beforeAll,
  afterAll,
} from "bun:test";
import { SQLiteStorage } from "./sqlite-storage.js";
import { OAuthClientSchema } from "../../schemas.js";

describe("test1", () => {
  beforeAll(() => {
    setSystemTime(new Date("2024-01-15T10:30:00.000Z"));
  });

  afterAll(() => {
    setSystemTime();
  });

  test("should store and retrieve OAuth client", async () => {
    const storage = new SQLiteStorage({
      database: { path: ":memory:" },
    });

    const oauthClient = {
      client_id: "test-client-id",
      project_id: "test-project-id",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "test-client-secret",
      created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
    };

    await storage.putOAuthClient("foo", oauthClient);

    const retrievedClient = await storage.getOAuthClient("foo");

    // Validate using schema
    const validated = OAuthClientSchema.parse(retrievedClient);

    expect(validated).toEqual({
      oauth_client_id: "foo",
      client_id: oauthClient.client_id,
      project_id: oauthClient.project_id,
      auth_uri: oauthClient.auth_uri,
      token_uri: oauthClient.token_uri,
      auth_provider_x509_cert_url: oauthClient.auth_provider_x509_cert_url,
      client_secret: oauthClient.client_secret,
      created_at: oauthClient.created_at,
    });

    setSystemTime();
  });

  test("should return null when OAuth client does not exist", async () => {
    const storage = new SQLiteStorage({
      database: { path: ":memory:" },
    });

    const client = await storage.getOAuthClient("non-existent");
    expect(client).toBeNull();
  });

  test("should delete OAuth client", async () => {
    const storage = new SQLiteStorage({
      database: { path: ":memory:" },
    });

    const oauthClient = {
      client_id: "test-client-id",
      project_id: "test-project-id",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "test-client-secret",
      created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
    };

    await storage.putOAuthClient("foo", oauthClient);

    // Verify it exists
    const retrievedClient = await storage.getOAuthClient("foo");
    expect(retrievedClient).not.toBeNull();
    expect(retrievedClient?.oauth_client_id).toBe("foo");

    // Delete it
    await storage.deleteOAuthClient("foo");

    // Verify it's gone
    const deletedClient = await storage.getOAuthClient("foo");
    expect(deletedClient).toBeNull();
  });

  test("should list all OAuth clients", async () => {
    const storage = new SQLiteStorage({
      database: { path: ":memory:" },
    });

    const oauthClient1 = {
      client_id: "client-1",
      project_id: "project-1",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-1",
      created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
    };

    const oauthClient2 = {
      client_id: "client-2",
      project_id: "project-2",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-2",
      created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
    };

    await storage.putOAuthClient("client-1", oauthClient1);
    await storage.putOAuthClient("client-2", oauthClient2);

    const clients = [];
    for await (const client of storage.getOAuthClients()) {
      clients.push(client);
    }

    expect(clients).toHaveLength(2);
    expect(clients[0].oauth_client_id).toBe("client-1");
    expect(clients[1].oauth_client_id).toBe("client-2");
  });
});

describe("connections", () => {
  beforeAll(() => {
    setSystemTime(new Date("2024-01-15T10:30:00.000Z"));
  });

  afterAll(() => {
    setSystemTime();
  });

  test("should store and retrieve connection", async () => {
    const storage = new SQLiteStorage({
      database: { path: ":memory:" },
    });

    const connection = {
      oauth_client_id: "test-oauth-client-id",
      scope: ["read", "write"],
      created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
    };

    await storage.putConnection("conn-123", connection);

    const retrievedConnection = await storage.getConnection("conn-123");

    expect(retrievedConnection).toEqual({
      connection_id: "conn-123",
      oauth_client_id: connection.oauth_client_id,
      scope: connection.scope,
      created_at: connection.created_at,
    });
  });

  test("should return null when connection does not exist", async () => {
    const storage = new SQLiteStorage({
      database: { path: ":memory:" },
    });

    const connection = await storage.getConnection("non-existent");
    expect(connection).toBeNull();
  });

  test("should delete connection", async () => {
    const storage = new SQLiteStorage({
      database: { path: ":memory:" },
    });

    const connection = {
      oauth_client_id: "test-oauth-client-id",
      scope: ["read", "write"],
      created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
    };

    await storage.putConnection("conn-123", connection);

    // Verify it exists
    const retrievedConnection = await storage.getConnection("conn-123");
    expect(retrievedConnection).not.toBeNull();
    expect(retrievedConnection?.connection_id).toBe("conn-123");

    // Delete it
    await storage.deleteConnection("conn-123");

    // Verify it's gone
    const deletedConnection = await storage.getConnection("conn-123");
    expect(deletedConnection).toBeNull();
  });

  test("should list all connections", async () => {
    const storage = new SQLiteStorage({
      database: { path: ":memory:" },
    });

    const connection1 = {
      oauth_client_id: "oauth-client-1",
      scope: ["read"],
      created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
    };

    const connection2 = {
      oauth_client_id: "oauth-client-2",
      scope: ["write"],
      created_at: new Date("2024-01-15T10:31:00.000Z").toISOString(),
    };

    await storage.putConnection("conn-1", connection1);
    await storage.putConnection("conn-2", connection2);

    const connections = [];
    for await (const connection of storage.getConnections()) {
      connections.push(connection);
    }

    expect(connections).toHaveLength(2);
    expect(connections[0].connection_id).toBe("conn-2"); // Ordered by created_at DESC
    expect(connections[1].connection_id).toBe("conn-1");
  });
});

describe("credentials", () => {
  beforeAll(() => {
    setSystemTime(new Date("2024-01-15T10:30:00.000Z"));
  });

  afterAll(() => {
    setSystemTime();
  });

  test("should store and retrieve credential", async () => {
    const storage = new SQLiteStorage({
      database: { path: ":memory:" },
    });

    const credential = {
      connection_id: "conn-123",
      token: {
        access_token: "test-access-token",
        expires_in: 3600,
        refresh_token: "test-refresh-token",
        scope: "read write",
        token_type: "Bearer",
        id_token: "test-id-token",
        created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
      },
      created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
    };

    await storage.putCredential("cred-456", credential);

    const retrievedCredential = await storage.getCredential("cred-456");

    expect(retrievedCredential).toEqual({
      credential_id: "cred-456",
      connection_id: credential.connection_id,
      token: {
        access_token: credential.token.access_token,
        expires_in: credential.token.expires_in,
        refresh_token: credential.token.refresh_token,
        scope: credential.token.scope,
        token_type: credential.token.token_type,
        id_token: credential.token.id_token,
        created_at: credential.token.created_at,
      },
      created_at: credential.created_at,
    });
  });

  test("should return null when credential does not exist", async () => {
    const storage = new SQLiteStorage({
      database: { path: ":memory:" },
    });

    const credential = await storage.getCredential("non-existent");
    expect(credential).toBeNull();
  });

  test("should delete credential", async () => {
    const storage = new SQLiteStorage({
      database: { path: ":memory:" },
    });

    const credential = {
      connection_id: "conn-123",
      token: {
        access_token: "test-access-token",
        expires_in: 3600,
        refresh_token: "test-refresh-token",
        scope: "read write",
        token_type: "Bearer",
        id_token: "test-id-token",
        created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
      },
      created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
    };

    await storage.putCredential("cred-456", credential);

    // Verify it exists
    const retrievedCredential = await storage.getCredential("cred-456");
    expect(retrievedCredential).not.toBeNull();
    expect(retrievedCredential?.credential_id).toBe("cred-456");

    // Delete it
    await storage.deleteCredential("cred-456");

    // Verify it's gone
    const deletedCredential = await storage.getCredential("cred-456");
    expect(deletedCredential).toBeNull();
  });

  test("should list all credentials", async () => {
    const storage = new SQLiteStorage({
      database: { path: ":memory:" },
    });

    const credential1 = {
      connection_id: "conn-1",
      token: {
        access_token: "token-1",
        expires_in: 3600,
        scope: "read",
        token_type: "Bearer",
        created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
      },
      created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
    };

    const credential2 = {
      connection_id: "conn-2",
      token: {
        access_token: "token-2",
        expires_in: 7200,
        scope: "write",
        token_type: "Bearer",
        created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
      },
      created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
    };

    await storage.putCredential("cred-1", credential1);
    await storage.putCredential("cred-2", credential2);

    const credentials = [];
    for await (const credential of storage.getCredentials()) {
      credentials.push(credential);
    }

    expect(credentials).toHaveLength(2);
    expect(credentials[0].credential_id).toBe("cred-1");
    expect(credentials[1].credential_id).toBe("cred-2");
  });
});

describe("stats", () => {
  beforeAll(() => {
    setSystemTime(new Date("2024-01-15T10:30:00.000Z"));
  });

  afterAll(() => {
    setSystemTime();
  });

  test("should return empty stats for new storage", async () => {
    const storage = new SQLiteStorage({
      database: { path: ":memory:" },
    });

    const stats = await storage.getStats();

    expect(stats.oauth_clients).toBe(0);
    expect(stats.connections).toBe(0);
    expect(stats.tokens).toBe(0);
  });

  test("should return stats after adding entities", async () => {
    const storage = new SQLiteStorage({
      database: { path: ":memory:" },
    });

    // Add OAuth client
    await storage.putOAuthClient("client-1", {
      client_id: "client-1",
      project_id: "project-1",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-1",
      created_at: new Date("2024-01-15T10:30:00.000Z").toISOString(),
    });

    // Verify it was added
    const client = await storage.getOAuthClient("client-1");
    expect(client).not.toBeNull();

    const stats = await storage.getStats();

    expect(stats.oauth_clients).toBe(1);
    expect(stats.connections).toBe(0);
    expect(stats.tokens).toBe(0);
  });
});
