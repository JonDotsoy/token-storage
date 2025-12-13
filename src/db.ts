import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import type {
  OAuthClient,
  OAuthClientInput,
  Connection,
  ConnectionInput,
  Token,
  PaginatedResponse,
} from "./schemas";
import { TokenSchema } from "./schemas";
import config from "./config";

let instance: DuckDBInstance;
let conn: DuckDBConnection;

export async function initDB() {
  instance = await DuckDBInstance.create(config.database.path);
  conn = await instance.connect();

  // Create tables
  await conn.run(`
    CREATE TABLE IF NOT EXISTS oauth_clients (
      oauth_client_id VARCHAR PRIMARY KEY,
      client_id VARCHAR NOT NULL,
      project_id VARCHAR NOT NULL,
      auth_uri VARCHAR NOT NULL,
      token_uri VARCHAR NOT NULL,
      auth_provider_x509_cert_url VARCHAR NOT NULL,
      client_secret VARCHAR NOT NULL
    )
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS connections (
      connection_id VARCHAR PRIMARY KEY,
      client_id VARCHAR NOT NULL,
      scope JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS tokens (
      authorization_id VARCHAR PRIMARY KEY,
      connection_id VARCHAR NOT NULL,
      access_token VARCHAR NOT NULL,
      expires_in INTEGER NOT NULL,
      refresh_token VARCHAR,
      scope VARCHAR NOT NULL,
      token_type VARCHAR NOT NULL,
      id_token VARCHAR,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// OAuth Clients
export async function putOAuthClient(
  oauth_client_id: string,
  data: OAuthClientInput
): Promise<void> {
  await conn.run(
    `INSERT OR REPLACE INTO oauth_clients 
     (oauth_client_id, client_id, project_id, auth_uri, token_uri, auth_provider_x509_cert_url, client_secret)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      oauth_client_id,
      data.client_id,
      data.project_id,
      data.auth_uri,
      data.token_uri,
      data.auth_provider_x509_cert_url,
      data.client_secret,
    ]
  );
}

export async function getOAuthClient(
  oauth_client_id: string
): Promise<OAuthClient | null> {
  const result = await conn.run(
    `SELECT * FROM oauth_clients WHERE oauth_client_id = ?`,
    [oauth_client_id]
  );
  const rows = await result.getRowObjects();
  return rows.length > 0 ? (rows[0] as any as OAuthClient) : null;
}

export async function deleteOAuthClient(
  oauth_client_id: string
): Promise<void> {
  await conn.run(`DELETE FROM oauth_clients WHERE oauth_client_id = ?`, [
    oauth_client_id,
  ]);
}

export async function getOAuthClients(): Promise<PaginatedResponse<OAuthClient>> {
  const result = await conn.run(`SELECT * FROM oauth_clients`);
  const rows = await result.getRowObjects();
  return {
    items: rows as any as OAuthClient[],
  };
}

// Connections
export async function putConnection(
  connection_id: string,
  data: ConnectionInput
): Promise<void> {
  await conn.run(
    `INSERT OR REPLACE INTO connections 
     (connection_id, client_id, scope)
     VALUES (?, ?, ?)`,
    [connection_id, data.client_id, JSON.stringify(data.scope)]
  );
}

export async function getConnection(
  connection_id: string
): Promise<Connection | null> {
  const result = await conn.run(
    `SELECT * FROM connections WHERE connection_id = ?`,
    [connection_id]
  );
  const rows = await result.getRowObjects();
  if (rows.length === 0) return null;

  const row = rows[0] as any;
  return {
    connection_id: row.connection_id,
    client_id: row.client_id,
    scope: JSON.parse(row.scope),
    created_at: row.created_at,
  };
}

export async function deleteConnection(connection_id: string): Promise<void> {
  await conn.run(`DELETE FROM connections WHERE connection_id = ?`, [
    connection_id,
  ]);
}

export async function getConnections(): Promise<PaginatedResponse<Connection>> {
  const result = await conn.run(`SELECT * FROM connections ORDER BY created_at DESC`);
  const rows = await result.getRowObjects();
  return {
    items: rows.map((row: any) => ({
      connection_id: row.connection_id,
      client_id: row.client_id,
      scope: JSON.parse(row.scope),
      created_at: row.created_at,
    })),
  };
}

// Tokens
export async function saveToken(
  authorization_id: string,
  connection_id: string,
  token: Token
): Promise<{ authorization_id: string }> {
  await conn.run(
    `INSERT OR REPLACE INTO tokens 
     (authorization_id, connection_id, access_token, expires_in, refresh_token, scope, token_type, id_token)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      authorization_id,
      connection_id,
      token.access_token,
      token.expires_in,
      token.refresh_token ?? null,
      token.scope,
      token.token_type,
      token.id_token ?? null,
    ]
  );
  return { authorization_id };
}

export async function getToken(
  authorization_id: string
): Promise<Token | null> {
  const result = await conn.run(
    `SELECT access_token, expires_in, refresh_token, scope, token_type, id_token, created_at, connection_id
     FROM tokens WHERE authorization_id = ?`,
    [authorization_id]
  );
  const rows = await result.getRowObjects();
  if (rows.length === 0) return null;

  const row = rows[0] as any;
  const token = TokenSchema.parse(row);
  
  // Calcular si el token está expirado
  const createdAt = new Date(row.created_at).getTime();
  const expiresAt = createdAt + token.expires_in * 1000;
  const now = Date.now();
  const isExpired = now >= expiresAt;

  // Si está expirado y tiene refresh_token, refrescarlo
  if (isExpired && token.refresh_token) {
    const connection = await getConnection(row.connection_id);
    if (!connection) return token; // Retornar token expirado si no hay conexión

    const oauthClient = await getOAuthClient(connection.client_id);
    if (!oauthClient) return token; // Retornar token expirado si no hay cliente

    try {
      const refreshedToken = await refreshToken(
        oauthClient.token_uri,
        oauthClient.client_id,
        oauthClient.client_secret,
        token.refresh_token
      );

      // Guardar el nuevo token
      await saveToken(authorization_id, row.connection_id, refreshedToken);
      return refreshedToken;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return token; // Retornar token expirado si falla el refresh
    }
  }

  return token;
}

export async function getTokensByConnection(
  connection_id: string
): Promise<PaginatedResponse<Token & { authorization_id: string }>> {
  const result = await conn.run(
    `SELECT authorization_id, access_token, expires_in, refresh_token, scope, token_type, id_token
     FROM tokens WHERE connection_id = ?
     ORDER BY created_at DESC`,
    [connection_id]
  );
  const rows = await result.getRowObjects();
  
  return {
    items: rows.map((row: any) => ({
      authorization_id: row.authorization_id,
      access_token: row.access_token,
      expires_in: row.expires_in,
      refresh_token: row.refresh_token,
      scope: row.scope,
      token_type: row.token_type,
      id_token: row.id_token,
    })),
  };
}

async function refreshToken(
  tokenUri: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<Token> {
  const response = await fetch(tokenUri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  const data = await response.json() as any;
  return TokenSchema.parse({
    access_token: data.access_token,
    expires_in: data.expires_in,
    refresh_token: data.refresh_token || refreshToken, // Mantener el refresh_token anterior si no viene uno nuevo
    scope: data.scope,
    token_type: data.token_type,
    id_token: data.id_token,
  });
}

export async function getStats(): Promise<{
  oauth_clients: number;
  connections: number;
  tokens: number;
}> {
  const clientsResult = await conn.run(`SELECT COUNT(*) as count FROM oauth_clients`);
  const clientsRows = await clientsResult.getRowObjects();
  
  const connectionsResult = await conn.run(`SELECT COUNT(*) as count FROM connections`);
  const connectionsRows = await connectionsResult.getRowObjects();
  
  const tokensResult = await conn.run(`SELECT COUNT(*) as count FROM tokens`);
  const tokensRows = await tokensResult.getRowObjects();
  
  return {
    oauth_clients: Number((clientsRows[0] as any).count),
    connections: Number((connectionsRows[0] as any).count),
    tokens: Number((tokensRows[0] as any).count),
  };
}

export function getDB() {
  return { instance, conn };
}
