import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import type {
  OAuthClient,
  OAuthClientInput,
  Connection,
  ConnectionInput,
  Token,
  PaginatedResponse,
} from "./schemas";

let instance: DuckDBInstance;
let conn: DuckDBConnection;

export async function initDB() {
  instance = await DuckDBInstance.create("./db");
  conn = await instance.connect();

  // Create tables
  await conn.run(`
    CREATE TABLE IF NOT EXISTS oauth_clients (
      client_id VARCHAR PRIMARY KEY,
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
      scope JSON NOT NULL
    )
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS tokens (
      authorization_id VARCHAR PRIMARY KEY,
      connection_id VARCHAR NOT NULL,
      access_token VARCHAR NOT NULL,
      expires_in INTEGER NOT NULL,
      token_type VARCHAR NOT NULL,
      scope VARCHAR NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// OAuth Clients
export async function putOAuthClient(
  client_id: string,
  data: OAuthClientInput
): Promise<void> {
  await conn.run(
    `INSERT OR REPLACE INTO oauth_clients 
     (client_id, project_id, auth_uri, token_uri, auth_provider_x509_cert_url, client_secret)
     VALUES (?, ?, ?, ?, ?, ?)`,
    client_id,
    data.project_id,
    data.auth_uri,
    data.token_uri,
    data.auth_provider_x509_cert_url,
    data.client_secret
  );
}

export async function getOAuthClient(
  client_id: string
): Promise<OAuthClient | null> {
  const result = await conn.run(
    `SELECT * FROM oauth_clients WHERE client_id = ?`,
    client_id
  );
  const rows = result.getRows();
  return rows.length > 0 ? (rows[0] as OAuthClient) : null;
}

export async function deleteOAuthClient(client_id: string): Promise<void> {
  await conn.run(`DELETE FROM oauth_clients WHERE client_id = ?`, client_id);
}

export async function getOAuthClients(): Promise<PaginatedResponse<OAuthClient>> {
  const result = await conn.run(`SELECT * FROM oauth_clients`);
  const rows = result.getRows();
  return {
    items: rows as OAuthClient[],
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
    connection_id,
    data.client_id,
    JSON.stringify(data.scope)
  );
}

export async function getConnection(
  connection_id: string
): Promise<Connection | null> {
  const result = await conn.run(
    `SELECT * FROM connections WHERE connection_id = ?`,
    connection_id
  );
  const rows = result.getRows();
  if (rows.length === 0) return null;

  const row = rows[0] as any;
  return {
    connection_id: row.connection_id,
    client_id: row.client_id,
    scope: JSON.parse(row.scope),
  };
}

export async function deleteConnection(connection_id: string): Promise<void> {
  await conn.run(
    `DELETE FROM connections WHERE connection_id = ?`,
    connection_id
  );
}

export async function getConnections(): Promise<PaginatedResponse<Connection>> {
  const result = await conn.run(`SELECT * FROM connections`);
  const rows = result.getRows();
  return {
    items: rows.map((row: any) => ({
      connection_id: row.connection_id,
      client_id: row.client_id,
      scope: JSON.parse(row.scope),
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
     (authorization_id, connection_id, access_token, expires_in, token_type, scope)
     VALUES (?, ?, ?, ?, ?, ?)`,
    authorization_id,
    connection_id,
    token.access_token,
    token.expires_in,
    token.token_type,
    token.scope
  );
  return { authorization_id };
}

export async function getToken(
  authorization_id: string
): Promise<Token | null> {
  const result = await conn.run(
    `SELECT access_token, expires_in, token_type, scope 
     FROM tokens WHERE authorization_id = ?`,
    authorization_id
  );
  const rows = result.getRows();
  return rows.length > 0 ? (rows[0] as Token) : null;
}

export function getDB() {
  return { instance, conn };
}
