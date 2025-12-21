import { z } from "zod";

export const OAuthClientInputSchema = z.object({
  client_id: z.string(),
  project_id: z.string(),
  auth_uri: z.string(),
  token_uri: z.string(),
  auth_provider_x509_cert_url: z.string(),
  client_secret: z.string(),
  created_at: z.iso.datetime(),
});

export const OAuthClientSchema = OAuthClientInputSchema.extend({
  oauth_client_id: z.string(),
});

export const ConnectionInputSchema = z.object({
  oauth_client_id: z.string(),
  scope: z.array(z.string()),
  created_at: z.iso.datetime(),
});

export const ConnectionSchema = ConnectionInputSchema.extend({
  connection_id: z.string(),
});

export const TokenSchema = z.object({
  access_token: z
    .string()
    .describe("OAuth 2.0 access token used to authenticate API requests"),
  expires_in: z
    .number()
    .describe("Number of seconds until the access token expires"),
  refresh_token: z
    .string()
    .optional()
    .describe("OAuth 2.0 refresh token used to obtain new access tokens"),
  scope: z.string().describe("Space-delimited list of granted OAuth scopes"),
  token_type: z.string().describe("Type of token issued, typically 'Bearer'"),
  id_token: z
    .string()
    .optional()
    .describe("OpenID Connect ID token containing user identity claims"),
  created_at: z.iso.datetime().describe("Timestamp when the token was created"),
});

export const CredentialInputSchema = z.object({
  connection_id: z.string(),
  token: TokenSchema,
  created_at: z.iso.datetime(),
});

export const CredentialSchema = CredentialInputSchema.extend({
  credential_id: z.string(),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  z.object({
    next_cursor: z.string().optional(),
    items: z.array(itemSchema),
  });

export const AuthUrlResponseSchema = z.object({
  auth_url: z.string(),
});

export const StatsSchema = z.object({
  oauth_clients: z.number(),
  connections: z.number(),
  tokens: z.number(),
});

export type OAuthClientInput = z.infer<typeof OAuthClientInputSchema>;
export type OAuthClient = z.infer<typeof OAuthClientSchema>;

export type ConnectionInput = z.infer<typeof ConnectionInputSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;

export type CredentialInput = z.infer<typeof CredentialInputSchema>;
export type Credential = z.infer<typeof CredentialSchema>;

export type Token = z.infer<typeof TokenSchema>;
export type PaginatedResponse<T> = {
  next_cursor?: string;
  items: T[];
};
export type AuthUrlResponse = z.infer<typeof AuthUrlResponseSchema>;
export type Stats = z.infer<typeof StatsSchema>;
