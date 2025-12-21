import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { TokenStorage } from "../token-storage";
import { TokenStorageHTTPTransport } from "../transports/http-transport";
import { serve } from "bun";
import { HTTPStorageInstance } from "./http-storage";

describe("test", () => {
  const port = 5480;
  let server: Bun.Server<any>;
  let tokenStorage: TokenStorage;

  beforeEach(async () => {
    const tokenStorageBackend = new TokenStorage();

    const { jsonRpcRouter } = new TokenStorageHTTPTransport(
      tokenStorageBackend,
    );

    server = serve({
      port,
      routes: {
        "/rpc": jsonRpcRouter.fetch,
      },
    });

    tokenStorage = new TokenStorage({
      db: new HTTPStorageInstance(new URL("/rpc", server.url)),
    });
  });

  afterEach(async () => {
    await server.stop();
  });

  test("test", async () => {
    const stats = await tokenStorage.getStats();

    expect(stats).toEqual({
      connections: 0,
      oauth_clients: 0,
      tokens: 0,
    });
  });

  test("putOAuthClient and getOAuthClient", async () => {
    const oauth_client_id = "test-oauth-client-1";
    const oauthClient = {
      client_id: "client-123",
      project_id: "project-456",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-789",
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putOAuthClient(oauth_client_id, oauthClient);

    const retrieved = await tokenStorage.getOAuthClient(oauth_client_id);
    expect(retrieved).toEqual({
      oauth_client_id,
      ...oauthClient,
    });
  });

  test("getOAuthClient returns null for non-existent client", async () => {
    const result = await tokenStorage.getOAuthClient("non-existent");
    expect(result).toBeNull();
  });

  test("deleteOAuthClient", async () => {
    const oauth_client_id = "test-oauth-client-delete";
    const oauthClient = {
      client_id: "client-delete",
      project_id: "project-delete",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-delete",
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putOAuthClient(oauth_client_id, oauthClient);
    await tokenStorage.deleteOAuthClient(oauth_client_id);

    const result = await tokenStorage.getOAuthClient(oauth_client_id);
    expect(result).toBeNull();
  });

  test("getOAuthClients lists all clients", async () => {
    const client1 = {
      client_id: "client-1",
      project_id: "project-1",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-1",
      created_at: new Date().toISOString(),
    };

    const client2 = {
      client_id: "client-2",
      project_id: "project-2",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-2",
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putOAuthClient("oauth-1", client1);
    await tokenStorage.putOAuthClient("oauth-2", client2);

    const clients = [];
    for await (const client of tokenStorage.getOAuthClients()) {
      clients.push(client);
    }

    expect(clients.length).toBeGreaterThanOrEqual(2);
    expect(clients).toContainEqual({ oauth_client_id: "oauth-1", ...client1 });
    expect(clients).toContainEqual({ oauth_client_id: "oauth-2", ...client2 });
  });

  test("putConnection and getConnection", async () => {
    const oauth_client_id = "oauth-for-connection";
    const oauthClient = {
      client_id: "client-conn",
      project_id: "project-conn",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-conn",
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putOAuthClient(oauth_client_id, oauthClient);

    const connection_id = "test-connection-1";
    const connection = {
      oauth_client_id,
      scope: ["https://www.googleapis.com/auth/drive.readonly"],
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putConnection(connection_id, connection);

    const retrieved = await tokenStorage.getConnection(connection_id);
    expect(retrieved).toEqual({
      connection_id,
      ...connection,
    });
  });

  test("getConnection returns null for non-existent connection", async () => {
    const result = await tokenStorage.getConnection("non-existent");
    expect(result).toBeNull();
  });

  test("deleteConnection", async () => {
    const oauth_client_id = "oauth-for-delete-conn";
    const oauthClient = {
      client_id: "client-del-conn",
      project_id: "project-del-conn",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-del-conn",
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putOAuthClient(oauth_client_id, oauthClient);

    const connection_id = "test-connection-delete";
    const connection = {
      oauth_client_id,
      scope: ["https://www.googleapis.com/auth/drive"],
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putConnection(connection_id, connection);
    await tokenStorage.deleteConnection(connection_id);

    const result = await tokenStorage.getConnection(connection_id);
    expect(result).toBeNull();
  });

  test("getConnections lists all connections", async () => {
    const oauth_client_id = "oauth-for-list";
    const oauthClient = {
      client_id: "client-list",
      project_id: "project-list",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-list",
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putOAuthClient(oauth_client_id, oauthClient);

    const conn1 = {
      oauth_client_id,
      scope: ["scope1"],
      created_at: new Date().toISOString(),
    };

    const conn2 = {
      oauth_client_id,
      scope: ["scope2"],
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putConnection("conn-1", conn1);
    await tokenStorage.putConnection("conn-2", conn2);

    const connections = [];
    for await (const conn of tokenStorage.getConnections()) {
      connections.push(conn);
    }

    expect(connections.length).toBeGreaterThanOrEqual(2);
    expect(connections).toContainEqual({ connection_id: "conn-1", ...conn1 });
    expect(connections).toContainEqual({ connection_id: "conn-2", ...conn2 });
  });

  test("putCredential and getCredential", async () => {
    const oauth_client_id = "oauth-for-cred";
    const oauthClient = {
      client_id: "client-cred",
      project_id: "project-cred",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-cred",
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putOAuthClient(oauth_client_id, oauthClient);

    const connection_id = "conn-for-cred";
    const connection = {
      oauth_client_id,
      scope: ["https://www.googleapis.com/auth/drive"],
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putConnection(connection_id, connection);

    const credential_id = "test-credential-1";
    const credential = {
      connection_id,
      token: {
        access_token: "access-token-123",
        expires_in: 3600,
        refresh_token: "refresh-token-456",
        scope: "https://www.googleapis.com/auth/drive",
        token_type: "Bearer",
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putCredential(credential_id, credential);

    const retrieved = await tokenStorage.getCredential(credential_id);
    expect(retrieved).toEqual({
      credential_id,
      ...credential,
    });
  });

  test("getCredential returns null for non-existent credential", async () => {
    const result = await tokenStorage.getCredential("non-existent");
    expect(result).toBeNull();
  });

  test("deleteCredential", async () => {
    const oauth_client_id = "oauth-for-del-cred";
    const oauthClient = {
      client_id: "client-del-cred",
      project_id: "project-del-cred",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-del-cred",
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putOAuthClient(oauth_client_id, oauthClient);

    const connection_id = "conn-for-del-cred";
    const connection = {
      oauth_client_id,
      scope: ["scope"],
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putConnection(connection_id, connection);

    const credential_id = "test-credential-delete";
    const credential = {
      connection_id,
      token: {
        access_token: "access-del",
        expires_in: 3600,
        scope: "scope",
        token_type: "Bearer",
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putCredential(credential_id, credential);
    await tokenStorage.deleteCredential(credential_id);

    const result = await tokenStorage.getCredential(credential_id);
    expect(result).toBeNull();
  });

  test("getCredentials lists all credentials", async () => {
    const oauth_client_id = "oauth-for-list-cred";
    const oauthClient = {
      client_id: "client-list-cred",
      project_id: "project-list-cred",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-list-cred",
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putOAuthClient(oauth_client_id, oauthClient);

    const connection_id = "conn-for-list-cred";
    const connection = {
      oauth_client_id,
      scope: ["scope"],
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putConnection(connection_id, connection);

    const cred1 = {
      connection_id,
      token: {
        access_token: "access-1",
        expires_in: 3600,
        scope: "scope",
        token_type: "Bearer",
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    const cred2 = {
      connection_id,
      token: {
        access_token: "access-2",
        expires_in: 3600,
        scope: "scope",
        token_type: "Bearer",
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putCredential("cred-1", cred1);
    await tokenStorage.putCredential("cred-2", cred2);

    const credentials = [];
    for await (const cred of tokenStorage.getCredentials()) {
      credentials.push(cred);
    }

    expect(credentials.length).toBeGreaterThanOrEqual(2);
    expect(credentials).toContainEqual({ credential_id: "cred-1", ...cred1 });
    expect(credentials).toContainEqual({ credential_id: "cred-2", ...cred2 });
  });

  test("getToken retrieves token from credential", async () => {
    const oauth_client_id = "oauth-for-token";
    const oauthClient = {
      client_id: "client-token",
      project_id: "project-token",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-token",
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putOAuthClient(oauth_client_id, oauthClient);

    const connection_id = "conn-for-token";
    const connection = {
      oauth_client_id,
      scope: ["scope"],
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putConnection(connection_id, connection);

    const credential_id = "cred-for-token";
    const token = {
      access_token: "access-token-xyz",
      expires_in: 7200,
      refresh_token: "refresh-token-xyz",
      scope: "scope",
      token_type: "Bearer",
      id_token: "id-token-xyz",
      created_at: new Date().toISOString(),
    };

    const credential = {
      connection_id,
      token,
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putCredential(credential_id, credential);

    const retrievedToken = await tokenStorage.getToken(credential_id);
    expect(retrievedToken).toEqual(token);
  });

  test("getStats returns correct counts", async () => {
    const oauth_client_id = "oauth-stats";
    const oauthClient = {
      client_id: "client-stats",
      project_id: "project-stats",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-stats",
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putOAuthClient(oauth_client_id, oauthClient);

    const connection_id = "conn-stats";
    const connection = {
      oauth_client_id,
      scope: ["scope"],
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putConnection(connection_id, connection);

    const credential_id = "cred-stats";
    const credential = {
      connection_id,
      token: {
        access_token: "access-stats",
        expires_in: 3600,
        scope: "scope",
        token_type: "Bearer",
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putCredential(credential_id, credential);

    const stats = await tokenStorage.getStats();
    expect(stats.oauth_clients).toBeGreaterThanOrEqual(1);
    expect(stats.connections).toBeGreaterThanOrEqual(1);
    expect(stats.tokens).toBeGreaterThanOrEqual(1);
  });
});

describe("HTTPStorageInstance middleware", () => {
  const port = 5481;
  let server: Bun.Server<any>;

  beforeEach(async () => {
    const tokenStorageBackend = new TokenStorage();

    const { jsonRpcRouter } = new TokenStorageHTTPTransport(
      tokenStorageBackend,
    );

    server = serve({
      port,
      routes: {
        "/rpc": jsonRpcRouter.fetch,
      },
    });
  });

  afterEach(async () => {
    await server.stop();
  });

  test("middleware can intercept and modify requests", async () => {
    const requestHeaders: string[] = [];

    const middleware = (fetch: (request: Request) => Promise<Response>) => {
      return async (request: Request) => {
        // Capture the request header
        requestHeaders.push(request.headers.get("X-Custom-Header") || "none");

        // Add a custom header to the request
        const modifiedRequest = new Request(request, {
          headers: {
            ...Object.fromEntries(request.headers.entries()),
            "X-Modified": "true",
          },
        });

        return await fetch(modifiedRequest);
      };
    };

    const httpStorage = new HTTPStorageInstance(new URL("/rpc", server.url), {
      middleware,
    });

    const tokenStorage = new TokenStorage({ db: httpStorage });

    await tokenStorage.getStats();

    expect(requestHeaders.length).toBe(1);
    expect(requestHeaders[0]).toBe("none");
  });

  test("middleware can intercept and modify responses", async () => {
    const middleware = (fetch: (request: Request) => Promise<Response>) => {
      return async (request: Request) => {
        const response = await fetch(request);

        // Modify the response by adding a custom header
        const modifiedResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            "X-Response-Modified": "true",
          },
        });

        return modifiedResponse;
      };
    };

    const httpStorage = new HTTPStorageInstance(new URL("/rpc", server.url), {
      middleware,
    });

    const tokenStorage = new TokenStorage({ db: httpStorage });

    const stats = await tokenStorage.getStats();

    expect(stats).toEqual({
      connections: 0,
      oauth_clients: 0,
      tokens: 0,
    });
  });

  test("middleware can add authentication headers", async () => {
    const capturedHeaders: Record<string, string> = {};

    // Create a middleware that adds auth headers
    const authMiddleware = (fetch: (request: Request) => Promise<Response>) => {
      return async (request: Request) => {
        const modifiedRequest = new Request(request, {
          headers: {
            ...Object.fromEntries(request.headers.entries()),
            Authorization: "Bearer test-token-123",
          },
        });

        // Capture all headers
        modifiedRequest.headers.forEach((value, key) => {
          capturedHeaders[key] = value;
        });

        return await fetch(modifiedRequest);
      };
    };

    const httpStorage = new HTTPStorageInstance(new URL("/rpc", server.url), {
      middleware: authMiddleware,
    });

    const tokenStorage = new TokenStorage({ db: httpStorage });

    await tokenStorage.getStats();

    expect(capturedHeaders["authorization"]).toBe("Bearer test-token-123");
  });

  test("middleware can handle errors and retry", async () => {
    let attemptCount = 0;

    const retryMiddleware = (
      fetch: (request: Request) => Promise<Response>,
    ) => {
      return async (request: Request) => {
        attemptCount++;

        // Simulate failure on first attempt
        if (attemptCount === 1) {
          return new Response(JSON.stringify({ error: "Temporary error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Succeed on second attempt
        return await fetch(request);
      };
    };

    const httpStorage = new HTTPStorageInstance(new URL("/rpc", server.url), {
      middleware: retryMiddleware,
    });

    const tokenStorage = new TokenStorage({ db: httpStorage });

    // First call should fail
    try {
      await tokenStorage.getStats();
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
    }

    // Second call should succeed
    const stats = await tokenStorage.getStats();
    expect(stats).toEqual({
      connections: 0,
      oauth_clients: 0,
      tokens: 0,
    });

    expect(attemptCount).toBe(2);
  });

  test("middleware can log requests", async () => {
    const logs: string[] = [];

    const loggingMiddleware = (
      fetch: (request: Request) => Promise<Response>,
    ) => {
      return async (request: Request) => {
        const startTime = Date.now();
        logs.push(`Request started: ${request.method} ${request.url}`);

        const response = await fetch(request);

        const duration = Date.now() - startTime;
        logs.push(
          `Request completed in ${duration}ms with status ${response.status}`,
        );

        return response;
      };
    };

    const httpStorage = new HTTPStorageInstance(new URL("/rpc", server.url), {
      middleware: loggingMiddleware,
    });

    const tokenStorage = new TokenStorage({ db: httpStorage });

    await tokenStorage.getStats();

    expect(logs.length).toBe(2);
    expect(logs[0]).toContain("Request started: POST");
    expect(logs[1]).toContain("Request completed in");
    expect(logs[1]).toContain("with status 200");
  });

  test("multiple operations work with middleware", async () => {
    let requestCount = 0;

    const countingMiddleware = (
      fetch: (request: Request) => Promise<Response>,
    ) => {
      return async (request: Request) => {
        requestCount++;
        return await fetch(request);
      };
    };

    const httpStorage = new HTTPStorageInstance(new URL("/rpc", server.url), {
      middleware: countingMiddleware,
    });

    const tokenStorage = new TokenStorage({ db: httpStorage });

    const oauth_client_id = "test-middleware-oauth";
    const oauthClient = {
      client_id: "client-middleware",
      project_id: "project-middleware",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "secret-middleware",
      created_at: new Date().toISOString(),
    };

    await tokenStorage.putOAuthClient(oauth_client_id, oauthClient);
    const retrieved = await tokenStorage.getOAuthClient(oauth_client_id);
    await tokenStorage.deleteOAuthClient(oauth_client_id);

    expect(retrieved).toEqual({
      oauth_client_id,
      ...oauthClient,
    });

    expect(requestCount).toBe(3); // put, get, delete
  });

  test("server validates x-authorization-token header", async () => {
    const VALID_TOKEN = "secret-token-12345";

    // Create a backend with token validation
    const tokenStorageBackend = new TokenStorage();
    const { jsonRpcRouter } = new TokenStorageHTTPTransport(
      tokenStorageBackend,
    );

    // Create a server that validates the token
    const secureServer = serve({
      port: 5482,
      routes: {
        "/rpc": async (req) => {
          const token = req.headers.get("x-authorization-token");

          // Validate token
          if (token !== VALID_TOKEN) {
            return new Response(
              JSON.stringify({
                error: "Unauthorized",
                message: "Invalid or missing x-authorization-token",
              }),
              {
                status: 401,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // If token is valid, proceed with the request
          return await jsonRpcRouter.fetch(req);
        },
      },
    });

    try {
      // Test 1: Request without token should fail
      const httpStorageWithoutToken = new HTTPStorageInstance(
        new URL("/rpc", secureServer.url),
      );

      const tokenStorageWithoutToken = new TokenStorage({
        db: httpStorageWithoutToken,
      });

      try {
        await tokenStorageWithoutToken.getStats();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        expect(String(error)).toContain("401");
      }

      // Test 2: Request with invalid token should fail
      const invalidTokenMiddleware = (
        fetch: (request: Request) => Promise<Response>,
      ) => {
        return async (request: Request) => {
          const modifiedRequest = new Request(request, {
            headers: {
              ...Object.fromEntries(request.headers.entries()),
              "x-authorization-token": "invalid-token",
            },
          });
          return await fetch(modifiedRequest);
        };
      };

      const httpStorageWithInvalidToken = new HTTPStorageInstance(
        new URL("/rpc", secureServer.url),
        { middleware: invalidTokenMiddleware },
      );

      const tokenStorageWithInvalidToken = new TokenStorage({
        db: httpStorageWithInvalidToken,
      });

      try {
        await tokenStorageWithInvalidToken.getStats();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        expect(String(error)).toContain("401");
      }

      // Test 3: Request with valid token should succeed
      const validTokenMiddleware = (
        fetch: (request: Request) => Promise<Response>,
      ) => {
        return async (request: Request) => {
          const modifiedRequest = new Request(request, {
            headers: {
              ...Object.fromEntries(request.headers.entries()),
              "x-authorization-token": VALID_TOKEN,
            },
          });
          return await fetch(modifiedRequest);
        };
      };

      const httpStorageWithValidToken = new HTTPStorageInstance(
        new URL("/rpc", secureServer.url),
        { middleware: validTokenMiddleware },
      );

      const tokenStorageWithValidToken = new TokenStorage({
        db: httpStorageWithValidToken,
      });

      const stats = await tokenStorageWithValidToken.getStats();
      expect(stats).toEqual({
        connections: 0,
        oauth_clients: 0,
        tokens: 0,
      });

      // Test 4: Multiple operations with valid token
      const oauth_client_id = "test-secure-oauth";
      const oauthClient = {
        client_id: "client-secure",
        project_id: "project-secure",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_secret: "secret-secure",
        created_at: new Date().toISOString(),
      };

      await tokenStorageWithValidToken.putOAuthClient(
        oauth_client_id,
        oauthClient,
      );
      const retrieved =
        await tokenStorageWithValidToken.getOAuthClient(oauth_client_id);

      expect(retrieved).toEqual({
        oauth_client_id,
        ...oauthClient,
      });
    } finally {
      await secureServer.stop();
    }
  });
});
