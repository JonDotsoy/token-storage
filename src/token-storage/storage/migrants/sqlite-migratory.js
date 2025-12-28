import { Database } from "bun:sqlite";
import { Migration } from "../../../utils/migration.js";

const create_table_oauth_clients_sql = `
    CREATE TABLE IF NOT EXISTS oauth_clients (
        oauth_client_id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        auth_uri TEXT NOT NULL,
        token_uri TEXT NOT NULL,
        auth_provider_x509_cert_url TEXT NOT NULL,
        client_secret TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )
`;

const create_table_connections_sql = `
    CREATE TABLE IF NOT EXISTS connections (
        connection_id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )
`;

const create_table_tokens_sql = `
    CREATE TABLE IF NOT EXISTS credentials (
        authorization_id TEXT PRIMARY KEY,
        connection_id TEXT NOT NULL,
        access_token TEXT NOT NULL,
        expires_in INTEGER NOT NULL,
        refresh_token TEXT,
        scope TEXT NOT NULL,
        token_type TEXT NOT NULL,
        id_token TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    )
`;

export class SQLiteMigratory {
  constructor(
    db,
    migrated = Promise.resolve()
      .then(async () => {
        db.run(`
          CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version INTEGER NOT NULL,
            name TEXT,
            created_at TEXT DEFAULT (datetime('now'))
          )
        `);
      })
      .then(() => {
        return new Migration({
          connection: db,
          getVersion: async () => {
            const result = db
              .query("SELECT version FROM migrations ORDER BY id DESC LIMIT 1")
              .get();
            return Number(result?.version ?? 0);
          },
          putVersion: async (version, name) => {
            db.run("INSERT INTO migrations (version, name) VALUES (?, ?)", [
              version,
              name ?? null,
            ]);
          },
        }).next({
          version: 1,
          name: "create oauth_clients",
          up: (db) => {
            return {
              async run() {
                db.run(create_table_oauth_clients_sql);
                db.run(create_table_connections_sql);
                db.run(create_table_tokens_sql);
              },
              utils: {
                async getOAuthClients() {
                  const results = db.query("SELECT * FROM oauth_clients").all();
                  return results.map((obj) => ({
                    ...obj,
                    created_at: new Date(obj.created_at).toISOString(),
                  }));
                },
                async putOAuthClient(oauth_client_id, data) {
                  db.run(
                    `INSERT INTO oauth_clients (
                      oauth_client_id,
                      client_id,
                      project_id,
                      auth_uri,
                      token_uri,
                      auth_provider_x509_cert_url,
                      client_secret,
                      created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
                async getOAuthClient(oauth_client_id) {
                  const obj = db
                    .query(
                      "SELECT * FROM oauth_clients WHERE oauth_client_id = ?",
                    )
                    .get(oauth_client_id);
                  if (!obj) return null;
                  return {
                    ...obj,
                    created_at: new Date(obj.created_at).toISOString(),
                  };
                },
                async deleteOAuthClient(oauth_client_id) {
                  db.run(
                    "DELETE FROM oauth_clients WHERE oauth_client_id = ?",
                    [oauth_client_id],
                  );
                },
                async countDocumentsOAuthClients() {
                  const result = db
                    .query("SELECT COUNT(*) as count FROM oauth_clients")
                    .get();
                  return Number(result?.count ?? 0);
                },
                async getConnections() {
                  const results = db
                    .query("SELECT * FROM connections ORDER BY created_at DESC")
                    .all();
                  return results.map((obj) => ({
                    ...obj,
                    scope: JSON.parse(obj.scope),
                    created_at: new Date(obj.created_at),
                  }));
                },
                async putConnection(connection_id, data) {
                  db.run(
                    `INSERT INTO connections (
                      connection_id,
                      client_id,
                      scope,
                      created_at
                    ) VALUES (?, ?, ?, ?)`,
                    [
                      connection_id,
                      data.client_id,
                      JSON.stringify(data.scope),
                      new Date(data.created_at).toISOString(),
                    ],
                  );
                },
                async getConnection(connection_id) {
                  const obj = db
                    .query("SELECT * FROM connections WHERE connection_id = ?")
                    .get(connection_id);
                  if (!obj) return null;
                  return {
                    ...obj,
                    scope: JSON.parse(obj.scope),
                    created_at: new Date(obj.created_at),
                  };
                },
                async deleteConnection(connection_id) {
                  db.run("DELETE FROM connections WHERE connection_id = ?", [
                    connection_id,
                  ]);
                },
                async countDocumentsConnections() {
                  const result = db
                    .query("SELECT COUNT(*) as count FROM connections")
                    .get();
                  return Number(result?.count ?? 0);
                },
                async getCredentials() {
                  const results = db.query("SELECT * FROM credentials").all();
                  return results.map((obj) => ({
                    ...obj,
                    created_at: new Date(obj.created_at),
                  }));
                },
                async getCredentialsByConnectionId(connection_id) {
                  const results = db
                    .query("SELECT * FROM credentials WHERE connection_id = ?")
                    .all(connection_id);
                  return results.map((obj) => ({
                    ...obj,
                    created_at: new Date(obj.created_at),
                  }));
                },
                async putCredential(authorization_id, data) {
                  db.run(
                    `INSERT INTO credentials (
                      authorization_id,
                      connection_id,
                      access_token,
                      expires_in,
                      refresh_token,
                      scope,
                      token_type,
                      id_token,
                      created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                async getCredential(authorization_id) {
                  const obj = db
                    .query(
                      "SELECT * FROM credentials WHERE authorization_id = ?",
                    )
                    .get(authorization_id);
                  if (!obj) return null;
                  return {
                    ...obj,
                    created_at: new Date(obj.created_at),
                  };
                },
                async deleteCredential(authorization_id) {
                  db.run("DELETE FROM credentials WHERE authorization_id = ?", [
                    authorization_id,
                  ]);
                },
                async countDocumentsCredentials() {
                  const result = db
                    .query("SELECT COUNT(*) as count FROM credentials")
                    .get();
                  return Number(result?.count ?? 0);
                },
              },
            };
          },
        }).migrated;
      }),
  ) {
    this.db = db;
    this.migrated = migrated;
  }
}
