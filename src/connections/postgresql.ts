import type { Client } from "pg";
import { Migration } from "../utils/migration.js";

const create_table_oauth_clients_sql = `
    CREATE TABLE IF NOT EXISTS oauth_clients (
        oauth_client_id VARCHAR PRIMARY KEY,
        client_id VARCHAR NOT NULL,
        project_id VARCHAR NOT NULL,
        auth_uri VARCHAR NOT NULL,
        token_uri VARCHAR NOT NULL,
        auth_provider_x509_cert_url VARCHAR NOT NULL,
        client_secret VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

const create_table_connections_sql = `
    CREATE TABLE IF NOT EXISTS connections (
        connection_id VARCHAR PRIMARY KEY,
        client_id VARCHAR NOT NULL,
        scope JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

const create_table_tokens_sql = `
    CREATE TABLE IF NOT EXISTS credentials (
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
`;

type OAUTH_CLIENT = {
  oauth_client_id: string;
  client_id: string;
  project_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_secret: string;
  created_at: string;
};

type CONNECTION = {
  connection_id: string;
  client_id: string;
  scope: string[];
  created_at: Date;
};

type CREDENTIAL = {
  authorization_id: string;
  connection_id: string;
  access_token: string;
  expires_in: number;
  refresh_token: string | null;
  scope: string;
  token_type: string;
  id_token: string | null;
  created_at: Date;
};

export class MigrationPostgresQL {
  constructor(
    readonly connection: Client,
    readonly migrated = Promise.resolve()
      .then(async () => {
        await connection.query(`
                        CREATE TABLE IF NOT EXISTS migrations (
                            id SERIAL PRIMARY KEY,
                            version INTEGER NOT NULL,
                            name VARCHAR,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    `);
      })
      .then(() => {
        return new Migration({
          connection,
          getVersion: async () => {
            const result = await connection.query(
              "SELECT version FROM migrations ORDER BY id DESC LIMIT 1",
            );
            const obj = result.rows[0];
            return Number(obj?.version ?? 0);
          },
          putVersion: async (version: number, name?: string) => {
            await connection.query(
              "INSERT INTO migrations (version, name) VALUES ($1, $2)",
              [version, name ?? null],
            );
          },
        }).next({
          version: 1,
          name: "create oauth_clients",
          up: (connection) => {
            return {
              async run() {
                await connection.query(create_table_oauth_clients_sql);
                await connection.query(create_table_connections_sql);
                await connection.query(create_table_tokens_sql);
              },
              utils: {
                async getOAuthClients() {
                  const result = await connection.query(
                    "SELECT * FROM oauth_clients",
                  );
                  return result.rows.map((obj) => ({
                    ...obj,
                    created_at: new Date(obj.created_at).toISOString(),
                  })) as OAUTH_CLIENT[];
                },
                async putOAuthClient(
                  oauth_client_id: OAUTH_CLIENT["oauth_client_id"],
                  data: Omit<OAUTH_CLIENT, "oauth_client_id">,
                ) {
                  await connection.query(
                    `
                                            INSERT INTO oauth_clients (
                                                oauth_client_id,
                                                client_id,
                                                project_id,
                                                auth_uri,
                                                token_uri,
                                                auth_provider_x509_cert_url,
                                                client_secret,
                                                created_at
                                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                                        `,
                    [
                      oauth_client_id,
                      data.client_id,
                      data.project_id,
                      data.auth_uri,
                      data.token_uri,
                      data.auth_provider_x509_cert_url,
                      data.client_secret,
                      data.created_at,
                    ],
                  );
                },
                async getOAuthClient(
                  oauth_client_id: OAUTH_CLIENT["oauth_client_id"],
                ) {
                  const result = await connection.query(
                    "SELECT * FROM oauth_clients WHERE oauth_client_id = $1",
                    [oauth_client_id],
                  );
                  const obj = result.rows[0] ?? null;
                  if (!obj) return null;
                  return {
                    ...obj,
                    created_at: new Date(obj.created_at).toISOString(),
                  } as OAUTH_CLIENT;
                },
                async deleteOAuthClient(
                  oauth_client_id: OAUTH_CLIENT["oauth_client_id"],
                ) {
                  await connection.query(
                    "DELETE FROM oauth_clients WHERE oauth_client_id = $1",
                    [oauth_client_id],
                  );
                },
                async countDocumentsOAuthClients() {
                  const result = await connection.query(
                    "SELECT COUNT(*) as count FROM oauth_clients",
                  );
                  return Number(result.rows[0]?.count ?? 0);
                },
                async getConnections() {
                  const result = await connection.query(
                    "SELECT * FROM connections ORDER BY created_at DESC",
                  );
                  return result.rows.map((obj) => ({
                    ...obj,
                    scope: obj.scope,
                    created_at: new Date(obj.created_at),
                  })) as CONNECTION[];
                },
                async putConnection(
                  connection_id: CONNECTION["connection_id"],
                  data: Omit<CONNECTION, "connection_id">,
                ) {
                  await connection.query(
                    `
                                            INSERT INTO connections (
                                                connection_id,
                                                client_id,
                                                scope,
                                                created_at
                                            ) VALUES ($1, $2, $3, $4)
                                        `,
                    [
                      connection_id,
                      data.client_id,
                      JSON.stringify(data.scope),
                      new Date(data.created_at).toISOString(),
                    ],
                  );
                },
                async getConnection(
                  connection_id: CONNECTION["connection_id"],
                ) {
                  const result = await connection.query(
                    "SELECT * FROM connections WHERE connection_id = $1",
                    [connection_id],
                  );
                  const obj = result.rows[0];
                  if (!obj) return null;
                  return {
                    ...obj,
                    scope: obj.scope,
                    created_at: new Date(obj.created_at),
                  } as CONNECTION;
                },
                async deleteConnection(
                  connection_id: CONNECTION["connection_id"],
                ) {
                  await connection.query(
                    "DELETE FROM connections WHERE connection_id = $1",
                    [connection_id],
                  );
                },
                async countDocumentsConnections() {
                  const result = await connection.query(
                    "SELECT COUNT(*) as count FROM connections",
                  );
                  return Number(result.rows[0]?.count ?? 0);
                },
                async getCredentials() {
                  const result = await connection.query(
                    "SELECT * FROM credentials",
                  );
                  return result.rows.map((obj) => ({
                    ...obj,
                    created_at: new Date(obj.created_at),
                  })) as CREDENTIAL[];
                },
                async getCredentialsByConnectionId(connection_id: string) {
                  const result = await connection.query(
                    "SELECT * FROM credentials WHERE connection_id = $1",
                    [connection_id],
                  );
                  return result.rows.map((obj) => ({
                    ...obj,
                    created_at: new Date(obj.created_at),
                  })) as CREDENTIAL[];
                },
                async putCredential(
                  authorization_id: CREDENTIAL["authorization_id"],
                  data: Omit<CREDENTIAL, "authorization_id">,
                ) {
                  await connection.query(
                    `
                                            INSERT INTO credentials (
                                                authorization_id,
                                                connection_id,
                                                access_token,
                                                expires_in,
                                                refresh_token,
                                                scope,
                                                token_type,
                                                id_token,
                                                created_at
                                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                                        `,
                    [
                      authorization_id,
                      data.connection_id,
                      data.access_token,
                      data.expires_in,
                      data.refresh_token,
                      data.scope,
                      data.token_type,
                      data.id_token,
                      new Date(data.created_at).toISOString(),
                    ],
                  );
                },
                async getCredential(
                  authorization_id: CREDENTIAL["authorization_id"],
                ) {
                  const result = await connection.query(
                    "SELECT * FROM credentials WHERE authorization_id = $1",
                    [authorization_id],
                  );
                  const obj = result.rows[0];
                  if (!obj) return null;
                  return {
                    ...obj,
                    created_at: new Date(obj.created_at),
                  } as CREDENTIAL;
                },
                async deleteCredential(
                  authorization_id: CREDENTIAL["authorization_id"],
                ) {
                  await connection.query(
                    "DELETE FROM credentials WHERE authorization_id = $1",
                    [authorization_id],
                  );
                },
                async countDocumentsCredentials() {
                  const result = await connection.query(
                    "SELECT COUNT(*) as count FROM credentials",
                  );
                  return Number(result.rows[0]?.count ?? 0);
                },
              },
            };
          },
        }).migrated;
      }),
  ) {}
}
