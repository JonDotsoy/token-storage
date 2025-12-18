import { DuckDBInstance } from "@duckdb/node-api";
import type {
  OAuthClient,
  OAuthClientInput,
  Connection,
  ConnectionInput,
  Token,
  PaginatedResponse,
} from "./schemas.js";
import { TokenSchema } from "./schemas.js";
import config from "./config.js";
import { MigrationDuckDB } from "./connections/duckdb.js";

async function initDB() {
  const instance = await DuckDBInstance.create(config.database.path);
  const conn = await instance.connect();
  const migrated = await new MigrationDuckDB(conn).migrated;

  return {
    connection: conn,
    migrated,
  };
}

const { migrated } = await initDB();

// OAuth Clients
export async function putOAuthClient(
  oauth_client_id: string,
  data: OAuthClientInput,
): Promise<void> {
  await migrated.putOAuthClient(oauth_client_id, data);
}

export async function getOAuthClient(
  oauth_client_id: string,
): Promise<OAuthClient | null> {
  return await migrated.getOAuthClient(oauth_client_id);
}

export async function deleteOAuthClient(
  oauth_client_id: string,
): Promise<void> {
  await migrated.deleteOAuthClient(oauth_client_id);
}

export async function getOAuthClients(): Promise<
  PaginatedResponse<OAuthClient>
> {
  return {
    items: await migrated.getOAuthClients(),
  };
}

// Connections
export async function putConnection(
  connection_id: string,
  data: ConnectionInput,
): Promise<void> {
  await migrated.putConnection(connection_id, {
    ...data,
    created_at: new Date(Date.now()),
  });
}

export async function getConnection(
  connection_id: string,
): Promise<Connection | null> {
  return migrated.getConnection(connection_id);
}

export async function deleteConnection(connection_id: string): Promise<void> {
  await migrated.deleteConnection(connection_id);
}

export async function getConnections(): Promise<PaginatedResponse<Connection>> {
  return {
    items: await migrated.getConnections(),
  };
}

// Tokens
export async function saveToken(
  authorization_id: string,
  connection_id: string,
  token: Token,
): Promise<{ authorization_id: string }> {
  await migrated.putToken(authorization_id, {
    connection_id: connection_id,
    token_type: token.token_type,
    access_token: token.access_token,
    refresh_token: token.refresh_token ?? null,
    id_token: token.id_token ?? null,
    created_at: new Date(),
    expires_in: token.expires_in,
    scope: token.scope,
  });

  return { authorization_id };
}

export async function getToken(
  authorization_id: string,
): Promise<Token | null> {
  const token = await migrated.getToken(authorization_id);

  if (!token) return null;

  // Calcular si el token está expirado
  const createdAt = new Date(token.created_at).getTime();
  const expiresAt = createdAt + token.expires_in * 1000;
  const now = Date.now();
  const isExpired = now >= expiresAt;

  // Si está expirado y tiene refresh_token, refrescarlo
  if (isExpired && token.refresh_token) {
    const connection = await getConnection(token.connection_id);
    if (!connection)
      return {
        access_token: token.access_token,
        created_at: token.created_at,
        expires_in: token.expires_in,
        scope: token.scope,
        token_type: token.token_type,
        id_token: token.id_token ?? undefined,
        refresh_token: token.refresh_token,
      }; // Retornar token expirado si no hay conexión

    const oauthClient = await getOAuthClient(connection.client_id);
    if (!oauthClient)
      return {
        access_token: token.access_token,
        created_at: token.created_at,
        expires_in: token.expires_in,
        scope: token.scope,
        token_type: token.token_type,
        id_token: token.id_token ?? undefined,
        refresh_token: token.refresh_token,
      }; // Retornar token expirado si no hay cliente

    try {
      const refreshedToken = await refreshToken(
        oauthClient.token_uri,
        oauthClient.client_id,
        oauthClient.client_secret,
        token.refresh_token,
      );

      // Guardar el nuevo token
      await saveToken(authorization_id, token.connection_id, refreshedToken);
      return refreshedToken;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return {
        access_token: token.access_token,
        created_at: token.created_at,
        expires_in: token.expires_in,
        scope: token.scope,
        token_type: token.token_type,
        id_token: token.id_token ?? undefined,
        refresh_token: token.refresh_token ?? undefined,
      }; // Retornar token expirado si falla el refresh
    }
  }

  return {
    access_token: token.access_token,
    created_at: token.created_at,
    expires_in: token.expires_in,
    scope: token.scope,
    token_type: token.token_type,
    id_token: token.id_token ?? undefined,
    refresh_token: token.refresh_token ?? undefined,
  };
}

export async function getTokensByConnection(
  connection_id: string,
): Promise<PaginatedResponse<Token & { authorization_id: string }>> {
  const tokens = await migrated.getTokensByConnectionId(connection_id);
  return {
    items: tokens.map((t): Token & { authorization_id: string } => ({
      access_token: t.access_token,
      authorization_id: t.authorization_id,
      created_at: t.created_at,
      expires_in: t.expires_in,
      scope: t.scope,
      token_type: t.token_type,
      id_token: t.id_token ?? undefined,
      refresh_token: t.refresh_token ?? undefined,
    })),
  };
}

async function refreshToken(
  tokenUri: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
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

  const data = (await response.json()) as any;
  return TokenSchema.parse({
    access_token: data.access_token,
    expires_in: data.expires_in,
    refresh_token: data.refresh_token || refreshToken, // Mantener el refresh_token anterior si no viene uno nuevo
    scope: data.scope,
    token_type: data.token_type,
    id_token: data.id_token,
  });
}

export async function getTokens(): Promise<
  PaginatedResponse<Token & { authorization_id: string; connection_id: string }>
> {
  const tokens = await migrated.getTokens();
  return {
    items: tokens.map(
      (t): Token & { authorization_id: string; connection_id: string } => ({
        access_token: t.access_token,
        authorization_id: t.authorization_id,
        connection_id: t.connection_id,
        created_at: t.created_at,
        expires_in: t.expires_in,
        scope: t.scope,
        token_type: t.token_type,
        id_token: t.id_token ?? undefined,
        refresh_token: t.refresh_token ?? undefined,
      }),
    ),
  };
}

export async function getStats(): Promise<{
  oauth_clients: number;
  connections: number;
  tokens: number;
}> {
  return {
    oauth_clients: await migrated.countDocumentsOAuthClients(),
    connections: await migrated.countDocumentsConnections(),
    tokens: await migrated.countDocumentsTokens(),
  };
}
