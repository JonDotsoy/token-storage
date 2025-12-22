import type {
  StorageInstance,
  Connection,
  Credential,
  OAuthClient,
  Stats,
  OAuthClientInput,
  ConnectionInput,
  CredentialInput,
  PaginatedResponse,
} from "./dtos/storage-instance.dto.js";

export class MemoryStorage implements StorageInstance {
  #connections = new Map<string, Connection>();
  #credentials = new Map<string, Credential>();
  #oauthClients = new Map<string, OAuthClient>();

  async putOAuthClient(
    oauth_client_id: string,
    oauthClient: OAuthClientInput,
  ): Promise<void> {
    this.#oauthClients.set(oauth_client_id, {
      ...oauthClient,
      oauth_client_id,
    });
  }

  async getOAuthClient(oauth_client_id: string): Promise<OAuthClient | null> {
    return this.#oauthClients.get(oauth_client_id) ?? null;
  }

  async deleteOAuthClient(oauth_client_id: string): Promise<void> {
    this.#oauthClients.delete(oauth_client_id);
  }

  async *getOAuthClients(): AsyncIterable<OAuthClient> {
    for (const client of this.#oauthClients.values()) {
      yield client;
    }
  }

  async putConnection(
    connection_id: string,
    connection: ConnectionInput,
  ): Promise<void> {
    this.#connections.set(connection_id, { ...connection, connection_id });
  }

  async getConnection(connection_id: string): Promise<Connection | null> {
    return this.#connections.get(connection_id) ?? null;
  }

  async deleteConnection(connection_id: string): Promise<void> {
    this.#connections.delete(connection_id);
  }

  async *getConnections(): AsyncIterable<Connection> {
    for (const connection of this.#connections.values()) {
      yield connection;
    }
  }

  async putCredential(
    credential_id: string,
    credential: CredentialInput,
  ): Promise<void> {
    this.#credentials.set(credential_id, { ...credential, credential_id });
  }

  async getCredential(credential_id: string): Promise<Credential | null> {
    return this.#credentials.get(credential_id) ?? null;
  }

  async deleteCredential(credential_id: string): Promise<void> {
    this.#credentials.delete(credential_id);
  }

  async *getCredentials(): AsyncIterable<Credential> {
    for (const credential of this.#credentials.values()) {
      yield credential;
    }
  }

  async getStats(): Promise<Stats> {
    return {
      oauth_clients: this.#oauthClients.size,
      connections: this.#connections.size,
      tokens: this.#credentials.size,
    };
  }
}
