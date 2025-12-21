import z from "zod";
import type { TokenStorage } from "../token-storage.ts";
import * as schemas from "../../schemas.ts";
import { JsonRpcRouter } from "artur";

export class TokenStorageHTTPTransport {
  readonly jsonRpcRouter: JsonRpcRouter;

  constructor(instance: TokenStorage) {
    const jsonRpcRouter = new JsonRpcRouter();

    jsonRpcRouter.method(
      "OAuthClient.put",
      async (params) => {
        await instance.putOAuthClient(
          params.oauth_client_id,
          params.oauthClient,
        );
        return true;
      },
      {
        inputValidation: z.object({
          oauth_client_id: z.string(),
          oauthClient: schemas.OAuthClientInputSchema,
        }),
        outputValidation: z.boolean(),
      },
    );

    jsonRpcRouter.method(
      "OAuthClient.get",
      (params) => instance.getOAuthClient(params.oauth_client_id),
      {
        inputValidation: z.object({
          oauth_client_id: z.string(),
        }),
        outputValidation: schemas.OAuthClientSchema.nullable(),
      },
    );

    jsonRpcRouter.method(
      "OAuthClient.delete",
      async (params) => {
        await instance.deleteOAuthClient(params.oauth_client_id);
        return true;
      },
      {
        inputValidation: z.object({
          oauth_client_id: z.string(),
        }),
        outputValidation: z.boolean(),
      },
    );

    jsonRpcRouter.method(
      "OAuthClient.list",
      async () => {
        const clients = [];
        for await (const client of instance.getOAuthClients()) {
          clients.push(client);
        }
        return clients;
      },
      {
        outputValidation: z.array(schemas.OAuthClientSchema),
      },
    );

    jsonRpcRouter.method(
      "connection.put",
      async (params) => {
        await instance.putConnection(params.connection_id, params.connection);
        return true;
      },
      {
        inputValidation: z.object({
          connection_id: z.string(),
          connection: schemas.ConnectionInputSchema,
        }),
        outputValidation: z.boolean(),
      },
    );

    jsonRpcRouter.method(
      "connection.get",
      (params) => instance.getConnection(params.connection_id),
      {
        inputValidation: z.object({
          connection_id: z.string(),
        }),
        outputValidation: schemas.ConnectionSchema.nullable(),
      },
    );

    jsonRpcRouter.method(
      "connection.delete",
      async (params) => {
        await instance.deleteConnection(params.connection_id);
        return true;
      },
      {
        inputValidation: z.object({
          connection_id: z.string(),
        }),
        outputValidation: z.boolean(),
      },
    );

    jsonRpcRouter.method(
      "connection.list",
      async () => {
        const connections = [];
        for await (const connection of instance.getConnections()) {
          connections.push(connection);
        }
        return connections;
      },
      {
        outputValidation: z.array(schemas.ConnectionSchema),
      },
    );

    jsonRpcRouter.method(
      "credential.put",
      async (params) => {
        await instance.putCredential(params.credential_id, params.credential);
        return true;
      },
      {
        inputValidation: z.object({
          credential_id: z.string(),
          credential: schemas.CredentialInputSchema,
        }),
        outputValidation: z.boolean(),
      },
    );

    jsonRpcRouter.method(
      "credential.get",
      (params) => instance.getCredential(params.credential_id),
      {
        inputValidation: z.object({
          credential_id: z.string(),
        }),
        outputValidation: schemas.CredentialSchema.nullable(),
      },
    );

    jsonRpcRouter.method(
      "credential.delete",
      async (params) => {
        await instance.deleteCredential(params.credential_id);
        return true;
      },
      {
        inputValidation: z.object({
          credential_id: z.string(),
        }),
        outputValidation: z.boolean(),
      },
    );

    jsonRpcRouter.method(
      "credential.list",
      async () => {
        const credentials = [];
        for await (const credential of instance.getCredentials()) {
          credentials.push(credential);
        }
        return credentials;
      },
      {
        outputValidation: z.array(schemas.CredentialSchema),
      },
    );

    jsonRpcRouter.method("stats.get", () => instance.getStats(), {
      outputValidation: schemas.StatsSchema,
    });

    jsonRpcRouter.method(
      "auth.getURL",
      (params) =>
        instance.getAuthURL(params.connection_id, params.redirect_uri),
      {
        inputValidation: z.object({
          connection_id: z.string(),
          redirect_uri: z.string(),
        }),
        outputValidation: z.string(),
      },
    );

    jsonRpcRouter.method(
      "auth.exchangeCode",
      (params) =>
        instance.exchangeCode(
          params.connection_id,
          params.redirect_uri,
          params.code,
        ),
      {
        inputValidation: z.object({
          connection_id: z.string(),
          redirect_uri: z.string(),
          code: z.string(),
        }),
        outputValidation: z.object({
          credential_id: z.string(),
        }),
      },
    );

    jsonRpcRouter.method(
      "token.get",
      (params) => instance.getToken(params.credential_id),
      {
        inputValidation: z.object({
          credential_id: z.string(),
        }),
        outputValidation: schemas.TokenSchema,
      },
    );

    jsonRpcRouter.enableMethodListing("system.listMethods");

    this.jsonRpcRouter = jsonRpcRouter;
  }
}
