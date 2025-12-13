import type {
  OAuthClient,
  OAuthClientInput,
  Connection,
  ConnectionInput,
  Token,
  PaginatedResponse,
  AuthUrlResponse,
} from "./schemas";

export interface ClientOptions {
  baseUrl?: string;
}

export class Client {
  private _baseUrl: string;

  constructor(options?: ClientOptions) {
    this._baseUrl = options?.baseUrl || "http://localhost";
  }

  baseUrl(url: string) {
    this._baseUrl = url;
    return this;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = new URL(path, this._baseUrl);
    const response = await fetch(url.toString(), {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as any;
  }

  // OAuth Clients
  async putOAuthClient(
    clientId: string,
    data: OAuthClientInput
  ): Promise<void> {
    await this.request("PUT", `/oauth_clients/${clientId}`, data);
  }

  async getOAuthClient(clientId: string): Promise<OAuthClient> {
    return this.request("GET", `/oauth_clients/${clientId}`);
  }

  async deleteOAuthClient(clientId: string): Promise<void> {
    await this.request("DELETE", `/oauth_clients/${clientId}`);
  }

  async getOAuthClients(): Promise<PaginatedResponse<OAuthClient>> {
    return this.request("GET", "/oauth_clients");
  }

  // Connections
  async putConnection(
    connectionId: string,
    data: ConnectionInput
  ): Promise<void> {
    await this.request("PUT", `/connections/${connectionId}`, data);
  }

  async getConnection(connectionId: string): Promise<Connection> {
    return this.request("GET", `/connections/${connectionId}`);
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.request("DELETE", `/connections/${connectionId}`);
  }

  async getConnections(): Promise<PaginatedResponse<Connection>> {
    return this.request("GET", "/connections");
  }

  // Auth URL
  async getAuthUrl(
    connectionId: string,
    redirectUrl?: string
  ): Promise<AuthUrlResponse> {
    const url = new URL(
      `/connections/${connectionId}/auth_url`,
      this._baseUrl
    );
    if (redirectUrl) {
      url.searchParams.set("redirect_url", redirectUrl);
    }
    return this.request("GET", `${url}`);
  }

  // Authorizations
  async exchangeCode(connectionId: string, code: string, redirect_uri?: string): Promise<Token & { authorization_id: string }> {
    const url = new URL(`/connections/${connectionId}/exchange`, this._baseUrl);
    url.searchParams.set("code", code);
    if (redirect_uri) {
      url.searchParams.set("redirect_uri", redirect_uri);
    }
    return this.request("POST", `${url}`);
  }

  async getToken(authorizationId: string): Promise<Token> {
    return this.request("GET", `/authorizations/${authorizationId}/token`);
  }
}
