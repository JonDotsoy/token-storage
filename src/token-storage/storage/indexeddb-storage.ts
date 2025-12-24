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
import { IndexedDBMigratory } from "./migrants/indexeddb-migratory.js";

export interface IndexedDBStorageOptions {
  db?: {
    name?: string;
  };
  collections?: {
    oauth_clients?: string;
    connections?: string;
    credentials?: string;
  };
}

export class IndexedDBStorage implements StorageInstance {
  readonly migrated =
    Promise.withResolvers<Awaited<IndexedDBMigratory["migrated"]>>();

  constructor(options?: IndexedDBStorageOptions) {
    this.#setup(options).then(
      ({ migrated }) => {
        this.migrated.resolve(migrated);
      },
      (reason) => {
        this.migrated.reject(reason);
      },
    );
  }

  async #setup(options?: IndexedDBStorageOptions) {
    const migrated = await new IndexedDBMigratory(options).migrated;
    return {
      migrated,
    };
  }

  async putOAuthClient(
    oauth_client_id: string,
    oauthClient: OAuthClientInput,
  ): Promise<void> {
    const utils = await this.migrated.promise;
    await utils.putOAuthClient(oauth_client_id, oauthClient);
  }

  async getOAuthClient(oauth_client_id: string): Promise<OAuthClient | null> {
    const utils = await this.migrated.promise;
    return await utils.getOAuthClient(oauth_client_id);
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

  async putConnection(
    connection_id: string,
    connection: ConnectionInput,
  ): Promise<void> {
    const utils = await this.migrated.promise;
    await utils.putConnection(connection_id, connection);
  }

  async getConnection(connection_id: string): Promise<Connection | null> {
    const utils = await this.migrated.promise;
    return await utils.getConnection(connection_id);
  }

  async deleteConnection(connection_id: string): Promise<void> {
    const utils = await this.migrated.promise;
    await utils.deleteConnection(connection_id);
  }

  async *getConnections(): AsyncIterable<Connection> {
    const utils = await this.migrated.promise;
    const connections = await utils.getConnections();
    for (const connection of connections) {
      yield connection;
    }
  }

  async putCredential(
    credential_id: string,
    credential: CredentialInput,
  ): Promise<void> {
    const utils = await this.migrated.promise;
    await utils.putCredential(credential_id, credential);
  }

  async getCredential(credential_id: string): Promise<Credential | null> {
    const utils = await this.migrated.promise;
    return await utils.getCredential(credential_id);
  }

  async deleteCredential(credential_id: string): Promise<void> {
    const utils = await this.migrated.promise;
    await utils.deleteCredential(credential_id);
  }

  async *getCredentials(): AsyncIterable<Credential> {
    const utils = await this.migrated.promise;
    const credentials = await utils.getCredentials();
    for (const credential of credentials) {
      yield credential;
    }
  }

  async getStats(): Promise<Stats> {
    const utils = await this.migrated.promise;
    const [oauth_clients, connections, tokens] = await Promise.all([
      utils.countDocumentsOAuthClients(),
      utils.countDocumentsConnections(),
      utils.countDocumentsCredentials(),
    ]);
    return { oauth_clients, connections, tokens };
  }
}
