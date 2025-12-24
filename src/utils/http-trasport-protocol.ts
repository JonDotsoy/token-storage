import * as schemas from "../schemas.js";
import z from "zod";

interface Method {
  name: string;
  input: z.ZodTypeAny;
  output: z.ZodTypeAny;
}

export namespace httpTransportProtocol {
  export const version = "2025-12-23";

  export namespace methods {
    export const OAuthClientPut = {
      name: "OAuthClient.put",
      input: z.object({
        oauth_client_id: z.string(),
        oauthClient: schemas.OAuthClientInputSchema,
      }),
      output: z.boolean(),
    } as const satisfies Method;
    export const OAuthClientGet = {
      name: "OAuthClient.get",
      input: z.object({
        oauth_client_id: z.string(),
      }),
      output: schemas.OAuthClientSchema.nullable(),
    } as const satisfies Method;
    export const OAuthClientDelete = {
      name: "OAuthClient.delete",
      input: z.object({
        oauth_client_id: z.string(),
      }),
      output: z.boolean(),
    } as const satisfies Method;
    export const OAuthClientList = {
      name: "OAuthClient.list",
      input: z.object({}).optional(),
      output: z.array(schemas.OAuthClientSchema),
    } as const satisfies Method;

    export const ConnectionPut = {
      name: "connection.put",
      input: z.object({
        connection_id: z.string(),
        connection: schemas.ConnectionInputSchema,
      }),
      output: z.boolean(),
    } as const satisfies Method;
    export const ConnectionGet = {
      name: "connection.get",
      input: z.object({
        connection_id: z.string(),
      }),
      output: schemas.ConnectionSchema.nullable(),
    } as const satisfies Method;
    export const ConnectionDelete = {
      name: "connection.delete",
      input: z.object({
        connection_id: z.string(),
      }),
      output: z.boolean(),
    } as const satisfies Method;
    export const ConnectionList = {
      name: "connection.list",
      input: z.object({}).optional(),
      output: z.array(schemas.ConnectionSchema),
    } as const satisfies Method;

    export const CredentialPut = {
      name: "credential.put",
      input: z.object({
        credential_id: z.string(),
        credential: schemas.CredentialInputSchema,
      }),
      output: z.boolean(),
    } as const satisfies Method;
    export const CredentialGet = {
      name: "credential.get",
      input: z.object({
        credential_id: z.string(),
      }),
      output: schemas.CredentialSchema.nullable(),
    } as const satisfies Method;
    export const CredentialDelete = {
      name: "credential.delete",
      input: z.object({
        credential_id: z.string(),
      }),
      output: z.boolean(),
    } as const satisfies Method;
    export const CredentialList = {
      name: "credential.list",
      input: z.object({}).optional(),
      output: z.array(schemas.CredentialSchema),
    } as const satisfies Method;

    export const StatsGet = {
      name: "stats.get",
      input: z.object({}).optional(),
      output: schemas.StatsSchema,
    } as const satisfies Method;

    export const AuthGetURL = {
      name: "auth.getURL",
      input: z.object({
        connection_id: z.string(),
        redirect_uri: z.string(),
      }),
      output: z.string(),
    } as const satisfies Method;
    export const AuthExchangeCode = {
      name: "auth.exchangeCode",
      input: z.object({
        connection_id: z.string(),
        redirect_uri: z.string(),
        code: z.string(),
      }),
      output: z.object({
        credential_id: z.string(),
      }),
    } as const satisfies Method;

    export const TokenGet = {
      name: "token.get",
      input: z.object({
        credential_id: z.string(),
      }),
      output: schemas.TokenSchema,
    } as const satisfies Method;
  }
}
