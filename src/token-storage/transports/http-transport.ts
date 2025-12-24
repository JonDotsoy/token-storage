import type { TokenStorage } from "../token-storage.js";
import { JsonRpcRouter } from "artur";
import { httpTransportProtocol } from "../../utils/http-trasport-protocol.js";

export class TokenStorageHTTPTransport {
  readonly jsonRpcRouter: JsonRpcRouter;

  constructor(instance: TokenStorage) {
    const jsonRpcRouter = new JsonRpcRouter();

    jsonRpcRouter.method(
      httpTransportProtocol.methods.OAuthClientPut.name,
      async (params) => {
        await instance.putOAuthClient(
          params.oauth_client_id,
          params.oauthClient,
        );
        return true;
      },
      {
        inputValidation: httpTransportProtocol.methods.OAuthClientPut.input,
        outputValidation: httpTransportProtocol.methods.OAuthClientPut.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.OAuthClientGet.name,
      (params) => instance.getOAuthClient(params.oauth_client_id),
      {
        inputValidation: httpTransportProtocol.methods.OAuthClientGet.input,
        outputValidation: httpTransportProtocol.methods.OAuthClientGet.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.OAuthClientDelete.name,
      async (params) => {
        await instance.deleteOAuthClient(params.oauth_client_id);
        return true;
      },
      {
        inputValidation: httpTransportProtocol.methods.OAuthClientDelete.input,
        outputValidation:
          httpTransportProtocol.methods.OAuthClientDelete.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.OAuthClientList.name,
      async () => {
        const clients = [];
        for await (const client of instance.getOAuthClients()) {
          clients.push(client);
        }
        return clients;
      },
      {
        inputValidation: httpTransportProtocol.methods.OAuthClientList.input,
        outputValidation: httpTransportProtocol.methods.OAuthClientList.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.ConnectionPut.name,
      async (params) => {
        await instance.putConnection(params.connection_id, params.connection);
        return true;
      },
      {
        inputValidation: httpTransportProtocol.methods.ConnectionPut.input,
        outputValidation: httpTransportProtocol.methods.ConnectionPut.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.ConnectionGet.name,
      (params) => instance.getConnection(params.connection_id),
      {
        inputValidation: httpTransportProtocol.methods.ConnectionGet.input,
        outputValidation: httpTransportProtocol.methods.ConnectionGet.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.ConnectionDelete.name,
      async (params) => {
        await instance.deleteConnection(params.connection_id);
        return true;
      },
      {
        inputValidation: httpTransportProtocol.methods.ConnectionDelete.input,
        outputValidation: httpTransportProtocol.methods.ConnectionDelete.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.ConnectionList.name,
      async () => {
        const connections = [];
        for await (const connection of instance.getConnections()) {
          connections.push(connection);
        }
        return connections;
      },
      {
        inputValidation: httpTransportProtocol.methods.ConnectionList.input,
        outputValidation: httpTransportProtocol.methods.ConnectionList.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.CredentialPut.name,
      async (params) => {
        await instance.putCredential(params.credential_id, params.credential);
        return true;
      },
      {
        inputValidation: httpTransportProtocol.methods.CredentialPut.input,
        outputValidation: httpTransportProtocol.methods.CredentialPut.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.CredentialGet.name,
      (params) => instance.getCredential(params.credential_id),
      {
        inputValidation: httpTransportProtocol.methods.CredentialGet.input,
        outputValidation: httpTransportProtocol.methods.CredentialGet.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.CredentialDelete.name,
      async (params) => {
        await instance.deleteCredential(params.credential_id);
        return true;
      },
      {
        inputValidation: httpTransportProtocol.methods.CredentialDelete.input,
        outputValidation: httpTransportProtocol.methods.CredentialDelete.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.CredentialList.name,
      async () => {
        const credentials = [];
        for await (const credential of instance.getCredentials()) {
          credentials.push(credential);
        }
        return credentials;
      },
      {
        inputValidation: httpTransportProtocol.methods.CredentialList.input,
        outputValidation: httpTransportProtocol.methods.CredentialList.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.StatsGet.name,
      () => instance.getStats(),
      {
        inputValidation: httpTransportProtocol.methods.StatsGet.input,
        outputValidation: httpTransportProtocol.methods.StatsGet.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.AuthGetURL.name,
      (params) =>
        instance.getAuthURL(params.connection_id, params.redirect_uri),
      {
        inputValidation: httpTransportProtocol.methods.AuthGetURL.input,
        outputValidation: httpTransportProtocol.methods.AuthGetURL.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.AuthExchangeCode.name,
      (params) =>
        instance.exchangeCode(
          params.connection_id,
          params.redirect_uri,
          params.code,
        ),
      {
        inputValidation: httpTransportProtocol.methods.AuthExchangeCode.input,
        outputValidation: httpTransportProtocol.methods.AuthExchangeCode.output,
      },
    );

    jsonRpcRouter.method(
      httpTransportProtocol.methods.TokenGet.name,
      (params) => instance.getToken(params.credential_id),
      {
        inputValidation: httpTransportProtocol.methods.TokenGet.input,
        outputValidation: httpTransportProtocol.methods.TokenGet.output,
      },
    );

    jsonRpcRouter.enableMethodListing("system.listMethods");

    this.jsonRpcRouter = jsonRpcRouter;
  }
}
