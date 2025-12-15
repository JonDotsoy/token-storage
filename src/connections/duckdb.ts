import type { DuckDBConnection } from "@duckdb/node-api";
import { Migration } from "../utils/migration";

const create_table_oauth_clients_sql = `
    CREATE TABLE IF NOT EXISTS oauth_clients (
        oauth_client_id VARCHAR PRIMARY KEY,
        client_id VARCHAR NOT NULL,
        project_id VARCHAR NOT NULL,
        auth_uri VARCHAR NOT NULL,
        token_uri VARCHAR NOT NULL,
        auth_provider_x509_cert_url VARCHAR NOT NULL,
        client_secret VARCHAR NOT NULL
    )
`;

const create_table_connections_sql = `
    CREATE TABLE IF NOT EXISTS connections (
        connection_id VARCHAR PRIMARY KEY,
        client_id VARCHAR NOT NULL,
        scope JSON NOT NULL
    )
`

const alter_table_connections_v2_sql = `
    ALTER TABLE connections ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    UPDATE connections SET created_at = CURRENT_TIMESTAMP;
`

const create_table_tokens_sql = `
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
`

type OAUTH_CLIENT = {
    oauth_client_id: string
    client_id: string
    project_id: string
    auth_uri: string
    token_uri: string
    auth_provider_x509_cert_url: string
    client_secret: string
}

type CONNECTION = {
    connection_id: string
    client_id: string
    scope: string[]
}

type CONNECTION_V2 = {
    connection_id: string
    client_id: string
    scope: string[]
    created_at: Date
}

type TOKENS = {
    authorization_id: string
    connection_id: string
    access_token: string
    expires_in: number
    refresh_token: string | null
    scope: string
    token_type: string
    id_token: string | null
    created_at: Date
}

export class MigrationDuckDB {
    constructor(
        readonly connection: DuckDBConnection,
        readonly migrated = Promise.resolve()
            .then(async () =>{
                await connection
                    .run(`
                        CREATE SEQUENCE IF NOT EXISTS migrations_id_sequence START 1;
                        CREATE TABLE IF NOT EXISTS migrations (
                            id INTEGER PRIMARY KEY DEFAULT nextval('migrations_id_sequence'),
                            version INTEGER NOT NULL,
                            name VARCHAR,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                        CHECKPOINT;
                    `)
            })
            .then(() => {
                return new Migration({
                    connection,
                    getVersion: async () => {
                        const result = await connection.runAndReadAll("SELECT version FROM migrations ORDER BY id DESC LIMIT 1");
                        const [obj] = result.getRowObjectsJS()
                        return Number(obj?.version ?? 0)
                    },
                    putVersion: async (version: number, name?: string) => {
                        await connection.run("INSERT INTO migrations (version, name) VALUES (?, ?)", [version, name ?? null])
                        await connection.run("CHECKPOINT")
                    },
                })
                    .next({
                        version: 1,
                        name: "create oauth_clients",
                        up: (connection) => {
                            return {
                                async run() {
                                    await connection.run(create_table_oauth_clients_sql)
                                    await connection.run(create_table_connections_sql)
                                    await connection.run(create_table_tokens_sql)
                                },
                                utils: {
                                    async getOAuthClients() {
                                        const result = await connection.runAndReadAll("SELECT * FROM oauth_clients")
                                        return result.getRowObjectsJS() as OAUTH_CLIENT[]
                                    },
                                    async putOAuthClient(oauth_client_id: OAUTH_CLIENT["oauth_client_id"], data: Omit<OAUTH_CLIENT, 'oauth_client_id'>) {
                                        await connection.run(`
                                            INSERT INTO oauth_clients (
                                                oauth_client_id,
                                                client_id,
                                                project_id,
                                                auth_uri,
                                                token_uri,
                                                auth_provider_x509_cert_url,
                                                client_secret
                                            ) VALUES (?, ?, ?, ?, ?, ?, ?)
                                        `, [
                                            oauth_client_id,
                                            data.client_id,
                                            data.project_id,
                                            data.auth_uri,
                                            data.token_uri,
                                            data.auth_provider_x509_cert_url,
                                            data.client_secret
                                        ])
                                    },
                                    async getOAuthClient(oauth_client_id: OAUTH_CLIENT["oauth_client_id"]) {
                                        const result = await connection.runAndReadAll("SELECT * FROM oauth_clients WHERE oauth_client_id = ?", [oauth_client_id])
                                        const [obj] = result.getRowObjectsJS()
                                        return obj as OAUTH_CLIENT | null
                                    },
                                    async deleteOAuthClient(oauth_client_id: OAUTH_CLIENT["oauth_client_id"]) {
                                        await connection.run("DELETE FROM oauth_clients WHERE oauth_client_id = ?", [oauth_client_id])
                                    },
                                    async countDocumentsOAuthClients() {
                                        const result = await connection.runAndReadAll("SELECT COUNT(*) FROM oauth_clients")
                                        const [obj] = result.getRowObjectsJS()
                                        return Number(obj?.count ?? 0)
                                    },
                                    async getConnections_v1() {
                                        const result = await connection.runAndReadAll("SELECT * FROM connections")
                                        return result.getRowObjectsJS() as CONNECTION[]
                                    },
                                    async putConnection_v1(connection_id: CONNECTION["connection_id"], data: Omit<CONNECTION, 'connection_id'>) {
                                        await connection.run(`
                                            INSERT INTO connections (
                                                connection_id,
                                                client_id,
                                                scope
                                            ) VALUES (?, ?, ?)
                                        `, [
                                            connection_id,
                                            data.client_id,
                                            JSON.stringify(data.scope)
                                        ])
                                    },
                                    async getConnection_v1(connection_id: CONNECTION["connection_id"]) {
                                        const result = await connection.runAndReadAll("SELECT * FROM connections WHERE connection_id = ?", [connection_id])
                                        const [obj] = result.getRowObjectsJS()
                                        return obj as CONNECTION | null
                                    },
                                    async deleteConnection_v1(connection_id: CONNECTION["connection_id"]) {
                                        await connection.run("DELETE FROM connections WHERE connection_id = ?", [connection_id])
                                    },
                                    async countDocumentsConnections() {
                                        const result = await connection.runAndReadAll("SELECT COUNT(*) FROM connections")
                                        const [obj] = result.getRowObjectsJS()
                                        return Number(obj?.count ?? 0)
                                    },
                                    async getTokens() {
                                        const result = await connection.runAndReadAll("SELECT * FROM tokens")
                                        return result.getRowObjectsJS() as TOKENS[]
                                    },
                                    async getTokensByConnectionId(connection_id: string) {
                                        const result = await connection.runAndReadAll("SELECT * FROM tokens WHERE connection_id = ?", [connection_id]);
                                        return result.getRowObjectsJS() as TOKENS[]
                                    },
                                    async putToken(authorization_id: TOKENS["authorization_id"], data: Omit<TOKENS, 'authorization_id'>) {
                                        await connection.run(`
                                            INSERT INTO tokens (
                                                authorization_id,
                                                connection_id,
                                                access_token,
                                                expires_in,
                                                refresh_token,
                                                scope,
                                                token_type,
                                                id_token
                                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                        `, [
                                            authorization_id,
                                            data.connection_id,
                                            data.access_token,
                                            data.expires_in,
                                            data.refresh_token,
                                            data.scope,
                                            data.token_type,
                                            data.id_token
                                        ])
                                    },
                                    async getToken(authorization_id: TOKENS["authorization_id"]) {
                                        const result = await connection.runAndReadAll("SELECT * FROM tokens WHERE authorization_id = ?", [authorization_id])
                                        const [obj] = result.getRowObjectsJS()
                                        return obj as TOKENS | null
                                    },
                                    async deleteToken(authorization_id: TOKENS["authorization_id"]) {
                                        await connection.run("DELETE FROM tokens WHERE authorization_id = ?", [authorization_id])
                                    },
                                    async countDocumentsTokens() {
                                        const result = await connection.runAndReadAll("SELECT COUNT(*) FROM tokens")
                                        const [obj] = result.getRowObjectsJS()
                                        return Number(obj?.count ?? 0)
                                    },
                                }
                            }
                        }
                    })
                    .next({
                        version: 2,
                        name: "alter_table_connections_v2",
                        up: (connection) => {
                            return {
                                async run() {
                                    await connection.run(alter_table_connections_v2_sql)
                                    await connection.run("CHECKPOINT")
                                },
                                utils: {
                                    async getConnections() {
                                        const result = await connection.runAndReadAll("SELECT * FROM connections ORDER BY created_at DESC")
                                        return result.getRowObjectsJS().map(obj => ({
                                            ...obj,
                                            scope: JSON.parse(`${obj.scope}`),
                                            created_at: new Date(`${obj.created_at}`)
                                        })) as CONNECTION_V2[]
                                    },
                                    async putConnection(connection_id: CONNECTION_V2["connection_id"], data: Omit<CONNECTION_V2, 'connection_id'>) {
                                        await connection.run(`
                                            INSERT INTO connections (
                                                connection_id,
                                                client_id,
                                                scope,
                                                created_at
                                            ) VALUES (?, ?, ?, ?)
                                        `, [
                                            connection_id,
                                            data.client_id,
                                            JSON.stringify(data.scope),
                                            new Date(data.created_at).toISOString()
                                        ])
                                    },
                                    async getConnection(connection_id: CONNECTION_V2["connection_id"]) {
                                        const result = await connection.runAndReadAll("SELECT * FROM connections WHERE connection_id = ?", [connection_id])
                                        const [obj] = result.getRowObjectsJS()
                                        if (!obj) return null;
                                        console.log(obj.scope)
                                        return {
                                            ...obj,
                                            scope: JSON.parse(`${obj.scope}`),
                                            created_at: new Date(`${obj.created_at}`)
                                        } as CONNECTION_V2 | null
                                    },
                                    async deleteConnection(connection_id: CONNECTION_V2["connection_id"]) {
                                        await connection.run("DELETE FROM connections WHERE connection_id = ?", [connection_id])
                                    }
                                }
                            }
                        }
                    })
                    .migrated
            })
    ) {
    }
}