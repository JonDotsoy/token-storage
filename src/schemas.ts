import { z } from "zod";

export const OAuthClientInputSchema = z.object({
  client_id: z.string(),
  project_id: z.string(),
  auth_uri: z.string(),
  token_uri: z.string(),
  auth_provider_x509_cert_url: z.string(),
  client_secret: z.string(),
});

export const OAuthClientSchema = OAuthClientInputSchema.extend({
  oauth_client_id: z.string(),
});

export const ConnectionInputSchema = z.object({
  client_id: z.string(),
  scope: z.array(z.string()),
  created_at: z.date(),
});

export const ConnectionSchema = ConnectionInputSchema.extend({
  connection_id: z.string(),
  created_at: z.date(),
});

export const TokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string(),
  token_type: z.string(),
  id_token: z.string().optional(),
  created_at: z.date(),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
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
export type Token = z.infer<typeof TokenSchema>;
export type PaginatedResponse<T> = {
  next_cursor?: string;
  items: T[];
};
export type AuthUrlResponse = z.infer<typeof AuthUrlResponseSchema>;
export type Stats = z.infer<typeof StatsSchema>;
