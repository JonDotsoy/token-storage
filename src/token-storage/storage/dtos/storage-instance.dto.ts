import type {
  Stats,
  Connection,
  ConnectionInput,
  OAuthClient,
  OAuthClientInput,
  CredentialInput,
  Credential,
  PaginatedResponse,
} from "../../../schemas.js";
export type {
  Stats,
  Connection,
  ConnectionInput,
  OAuthClient,
  OAuthClientInput,
  CredentialInput,
  Credential,
  PaginatedResponse,
} from "../../../schemas.js";

export interface StorageInstance {
  putOAuthClient(
    oauth_client_id: string,
    oauthClient: OAuthClientInput,
  ): Promise<void>;
  getOAuthClient(oauth_client_id: string): Promise<OAuthClient | null>;
  deleteOAuthClient(oauth_client_id: string): Promise<void>;
  getOAuthClients(): AsyncIterable<OAuthClient>;

  putConnection(
    connection_id: string,
    connection: ConnectionInput,
  ): Promise<void>;
  getConnection(connection_id: string): Promise<Connection | null>;
  deleteConnection(connection_id: string): Promise<void>;
  getConnections(): AsyncIterable<Connection>;

  putCredential(
    credential_id: string,
    credential: CredentialInput,
  ): Promise<void>;
  getCredential(credential_id: string): Promise<Credential | null>;
  deleteCredential(credential_id: string): Promise<void>;
  getCredentials(): AsyncIterable<Credential>;

  getStats(): Promise<Stats>;
}
