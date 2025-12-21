import type {
  Connection,
  ConnectionInput,
  Credential,
  CredentialInput,
  OAuthClient,
  OAuthClientInput,
  Stats,
  StorageInstance,
} from "./storage/dtos/storage-instance.dto";
import { MemoryInstance } from "./storage/memory-storage";
import { ulid } from "ulid";
import { Temporal } from "temporal-polyfill";

interface TokenStorageOptions {
  db: StorageInstance;
}

export class TokenStorage implements StorageInstance {
  #options: TokenStorageOptions;

  constructor(options?: Partial<TokenStorageOptions>) {
    this.#options = {
      db: options?.db ?? new MemoryInstance(),
    };
  }

  async putOAuthClient(
    oauth_client_id: string,
    oauthClient: OAuthClientInput,
  ): Promise<void> {
    return await this.#options.db.putOAuthClient(oauth_client_id, oauthClient);
  }

  async getOAuthClient(oauth_client_id: string): Promise<OAuthClient | null> {
    return await this.#options.db.getOAuthClient(oauth_client_id);
  }

  async deleteOAuthClient(oauth_client_id: string): Promise<void> {
    return await this.#options.db.deleteOAuthClient(oauth_client_id);
  }

  getOAuthClients(): AsyncIterable<OAuthClient> {
    return this.#options.db.getOAuthClients();
  }

  async putConnection(
    connection_id: string,
    connection: ConnectionInput,
  ): Promise<void> {
    return await this.#options.db.putConnection(connection_id, connection);
  }

  async getConnection(connection_id: string): Promise<Connection | null> {
    return await this.#options.db.getConnection(connection_id);
  }

  async deleteConnection(connection_id: string): Promise<void> {
    return await this.#options.db.deleteConnection(connection_id);
  }

  getConnections(): AsyncIterable<Connection> {
    return this.#options.db.getConnections();
  }

  async putCredential(
    credential_id: string,
    credential: CredentialInput,
  ): Promise<void> {
    return await this.#options.db.putCredential(credential_id, credential);
  }

  async getCredential(credential_id: string): Promise<Credential | null> {
    return await this.#options.db.getCredential(credential_id);
  }

  async deleteCredential(credential_id: string): Promise<void> {
    return await this.#options.db.deleteCredential(credential_id);
  }

  getCredentials(): AsyncIterable<Credential> {
    return this.#options.db.getCredentials();
  }

  async getStats(): Promise<Stats> {
    return await this.#options.db.getStats();
  }

  async stats() {
    return await this.#options.db.getStats();
  }

  async getAuthURL(
    connection_id: string,
    redirect_uri: string,
  ): Promise<string> {
    if (this.#options.db.getAuthURL)
      return await this.#options.db.getAuthURL(connection_id, redirect_uri);

    const connection = await this.getConnection(connection_id);
    if (!connection) {
      throw new Error("Connection not found");
    }
    const oauthClient = await this.getOAuthClient(connection.oauth_client_id);
    if (!oauthClient) {
      throw new Error("OAuth client not found");
    }
    const url = new URL(oauthClient.auth_uri);
    url.searchParams.set("client_id", oauthClient.client_id);
    url.searchParams.set("redirect_uri", redirect_uri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", connection.scope.join(" "));
    url.searchParams.set("state", `${connection_id}`);
    return url.toString();
  }

  async exchangeCode(
    connection_id: string,
    redirect_uri: string,
    code: string,
  ) {
    if (this.#options.db.exchangeCode)
      return await this.#options.db.exchangeCode(
        connection_id,
        redirect_uri,
        code,
      );

    const connection = await this.getConnection(connection_id);
    if (!connection) {
      throw new Error("Connection not found");
    }
    const oauthClient = await this.getOAuthClient(connection.oauth_client_id);
    if (!oauthClient) {
      throw new Error("OAuth client not found");
    }
    const url = new URL(oauthClient.token_uri);
    const body = new URLSearchParams();
    body.set("client_id", oauthClient.client_id);
    body.set("client_secret", oauthClient.client_secret);
    body.set("code", code);
    body.set("grant_type", "authorization_code");
    body.set("redirect_uri", redirect_uri);
    const response = await fetch(url.toString(), {
      method: "POST",
      body,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error("Failed to exchange code", {
        cause: {
          status: response.status,
          statusText: response.statusText,
          body: text,
        },
      });
    }
    const data: any = JSON.parse(text);
    const credential_id = ulid();
    await this.putCredential(credential_id, {
      connection_id,
      token: data,
      created_at: new Date(Date.now()).toISOString(),
    });
    return { credential_id };
  }

  private async refreshToken(
    credential: Credential,
    oauthClient: OAuthClient,
  ): Promise<any> {
    const url = new URL(oauthClient.token_uri);
    const body = new URLSearchParams();
    body.set("client_id", oauthClient.client_id);
    body.set("client_secret", oauthClient.client_secret);
    body.set("refresh_token", credential.token.refresh_token!);
    body.set("grant_type", "refresh_token");
    const res = await fetch(url.toString(), {
      method: "POST",
      body,
    });
    return res.json();
  }

  async getToken(credential_id: string): Promise<Credential["token"]> {
    if (this.#options.db.getToken)
      return await this.#options.db.getToken(credential_id);

    const credential = await this.getCredential(credential_id);
    if (!credential) {
      throw new Error("Credential not found");
    }
    const connection = await this.getConnection(credential.connection_id);
    if (!connection) {
      throw new Error("Connection not found");
    }
    const oauthClient = await this.getOAuthClient(connection.oauth_client_id);
    if (!oauthClient) {
      throw new Error("OAuth client not found");
    }

    const expiration_at = Temporal.Instant.from(credential.created_at).add({
      seconds: credential.token.expires_in,
    });

    const untilNow = Temporal.Now.instant().until(expiration_at);

    const isExpired = untilNow.total({ unit: "seconds" }) <= 1;

    console.log({
      instant: expiration_at.toString(),
      untilNow: untilNow.total({ unit: "seconds" }),
      isExpired,
    });

    if (isExpired) {
      const nextToken = await this.refreshToken(credential, oauthClient);
      await this.putCredential(credential_id, {
        connection_id: credential.connection_id,
        token: nextToken,
        created_at: new Date(Date.now()).toISOString(),
      });
      return nextToken;
    }

    return credential.token;
  }
}
