import { DuckDBInstance } from "@duckdb/node-api";
import { MigrationDuckDB } from "../../connections/duckdb.js";
import type {
  StorageInstance,
  Connection,
  Credential,
  OAuthClient,
  Stats,
  OAuthClientInput,
  ConnectionInput,
  CredentialInput,
} from "./dtos/storage-instance.dto.js";

export class DuckDBStorageInstance implements StorageInstance {
  readonly migrated =
    Promise.withResolvers<Awaited<MigrationDuckDB["migrated"]>>();

  constructor(readonly options: { database: { path: string } }) {
    this.#setup().then(
      ({ migrated }) => {
        this.migrated.resolve(migrated);
      },
      (reason) => {
        this.migrated.reject(reason);
      },
    );
  }

  async #setup() {
    const instance = await DuckDBInstance.create(this.options.database.path);
    const conn = await instance.connect();
    const migrated = await new MigrationDuckDB(conn).migrated;
    return {
      instance,
      conn,
      migrated,
    };
  }

  // OAuth Client methods
  async putOAuthClient(
    oauth_client_id: string,
    oauthClient: OAuthClientInput,
  ): Promise<void> {
    const utils = await this.migrated.promise;
    await utils.putOAuthClient(oauth_client_id, oauthClient);
  }

  async getOAuthClient(oauth_client_id: string): Promise<OAuthClient | null> {
    const utils = await this.migrated.promise;
    const result = await utils.getOAuthClient(oauth_client_id);
    return result;
  }

  async deleteOAuthClient(oauth_client_id: string): Promise<void> {
    const utils = await this.migrated.promise;
    await utils.deleteOAuthClient(oauth_client_id);
  }

  async *getOAuthClients(): AsyncIterable<OAuthClient> {
    const utils = await this.migrated.promise;
    const clients = await utils.getOAuthClients();
    for (const client of clients) {
      yield client;
    }
  }

  // Connection methods
  async putConnection(
    connection_id: string,
    connection: ConnectionInput,
  ): Promise<void> {
    const utils = await this.migrated.promise;
    await utils.putConnection(connection_id, {
      client_id: connection.oauth_client_id,
      scope: connection.scope,
      created_at: new Date(connection.created_at),
    });
  }

  async getConnection(connection_id: string): Promise<Connection | null> {
    const utils = await this.migrated.promise;
    const result = await utils.getConnection(connection_id);
    if (!result) return null;
    return {
      connection_id: result.connection_id,
      oauth_client_id: result.client_id,
      scope: result.scope,
      created_at: result.created_at.toISOString(),
    };
  }

  async deleteConnection(connection_id: string): Promise<void> {
    const utils = await this.migrated.promise;
    await utils.deleteConnection(connection_id);
  }

  async *getConnections(): AsyncIterable<Connection> {
    const utils = await this.migrated.promise;
    const connections = await utils.getConnections();
    for (const conn of connections) {
      yield {
        connection_id: conn.connection_id,
        oauth_client_id: conn.client_id,
        scope: conn.scope,
        created_at: conn.created_at.toISOString(),
      };
    }
  }

  // Credential methods
  async putCredential(
    credential_id: string,
    credential: CredentialInput,
  ): Promise<void> {
    const utils = await this.migrated.promise;
    await utils.putCredential(credential_id, {
      connection_id: credential.connection_id,
      access_token: credential.token.access_token,
      expires_in: credential.token.expires_in,
      refresh_token: credential.token.refresh_token ?? null,
      scope: credential.token.scope,
      token_type: credential.token.token_type,
      id_token: credential.token.id_token ?? null,
      created_at: new Date(credential.created_at),
    });
  }

  async getCredential(credential_id: string): Promise<Credential | null> {
    const utils = await this.migrated.promise;
    const result = await utils.getCredential(credential_id);
    if (!result) return null;
    return {
      credential_id: result.authorization_id,
      connection_id: result.connection_id,
      token: {
        access_token: result.access_token,
        expires_in: result.expires_in,
        refresh_token: result.refresh_token ?? undefined,
        scope: result.scope,
        token_type: result.token_type,
        id_token: result.id_token ?? undefined,
        created_at: result.created_at.toISOString(),
      },
      created_at: result.created_at.toISOString(),
    };
  }

  async deleteCredential(credential_id: string): Promise<void> {
    const utils = await this.migrated.promise;
    await utils.deleteCredential(credential_id);
  }

  async *getCredentials(): AsyncIterable<Credential> {
    const utils = await this.migrated.promise;
    const credentials = await utils.getCredentials();
    for (const credential of credentials) {
      yield {
        credential_id: credential.authorization_id,
        connection_id: credential.connection_id,
        token: {
          access_token: credential.access_token,
          expires_in: credential.expires_in,
          refresh_token: credential.refresh_token ?? undefined,
          scope: credential.scope,
          token_type: credential.token_type,
          id_token: credential.id_token ?? undefined,
          created_at: credential.created_at.toISOString(),
        },
        created_at: credential.created_at.toISOString(),
      };
    }
  }

  // Stats method
  async getStats(): Promise<Stats> {
    const utils = await this.migrated.promise;
    const [oauth_clients, connections, tokens] = await Promise.all([
      utils.countDocumentsOAuthClients(),
      utils.countDocumentsConnections(),
      utils.countDocumentsCredentials(),
    ]);
    return {
      oauth_clients,
      connections,
      tokens,
    };
  }
}
