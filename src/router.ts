import { Router, params } from "artur";
import { z } from "zod";
import {
  OAuthClientInputSchema,
  ConnectionInputSchema,
  TokenSchema,
} from "./schemas";
import {
  putOAuthClient,
  getOAuthClient,
  deleteOAuthClient,
  getOAuthClients,
  putConnection,
  getConnection,
  deleteConnection,
  getConnections,
  saveToken,
  getToken,
} from "./db";

export const router = new Router();

router.route("ALL", "/health", async () => {
  return Response.json({ status: "ok" });
});

// OAuth Clients
router.route("PUT", "/oauth_clients/:client_id", async (req: Request): Promise<Response> => {
  const { client_id } = params(req);
  if (!client_id) {
    return new Response("Missing client_id", { status: 400 });
  }
  
  const body = await req.json();
  const data = OAuthClientInputSchema.parse(body);
  await putOAuthClient(client_id, data);
  
  return Response.json({ success: true });
});

router.route("GET", "/oauth_clients/:client_id", async (req: Request): Promise<Response> => {
  const { client_id } = params(req);
  if (!client_id) {
    return new Response("Missing client_id", { status: 400 });
  }
  
  const client = await getOAuthClient(client_id);
  if (!client) {
    return new Response("Client not found", { status: 404 });
  }
  
  return Response.json(client);
});

router.route("DELETE", "/oauth_clients/:client_id", async (req: Request): Promise<Response> => {
  const { client_id } = params(req);
  if (!client_id) {
    return new Response("Missing client_id", { status: 400 });
  }
  
  await deleteOAuthClient(client_id);
  
  return Response.json({ success: true });
});

router.route("GET", "/oauth_clients", async () => {
  return Response.json(await getOAuthClients());
});

// Connections
router.route("PUT", "/connections/:connection_id", async (req: Request): Promise<Response> => {
  const { connection_id } = params(req);
  if (!connection_id) {
    return new Response("Missing connection_id", { status: 400 });
  }
  
  const body = await req.json();
  const data = ConnectionInputSchema.parse(body);
  await putConnection(connection_id, data);
  
  return Response.json({ success: true });
});

router.route("GET", "/connections/:connection_id", async (req: Request): Promise<Response> => {
  const { connection_id } = params(req);
  if (!connection_id) {
    return new Response("Missing connection_id", { status: 400 });
  }
  
  const connection = await getConnection(connection_id);
  if (!connection) {
    return new Response("Connection not found", { status: 404 });
  }
  
  return Response.json(connection);
});

router.route("DELETE", "/connections/:connection_id", async (req: Request): Promise<Response> => {
  const { connection_id } = params(req);
  if (!connection_id) {
    return new Response("Missing connection_id", { status: 400 });
  }
  
  await deleteConnection(connection_id);
  
  return Response.json({ success: true });
});

router.route("GET", "/connections", async (req: Request): Promise<Response> => {
  return Response.json(await getConnections());
});

// Auth URL
router.route("GET", "/connections/:connection_id/auth_url", async (req: Request): Promise<Response> => {
  const { connection_id } = params(req);
  if (!connection_id) {
    return new Response("Missing connection_id", { status: 400 });
  }
  
  const url = new URL(req.url);
  const redirect_url = url.searchParams.get("redirect_url");
  
  const connection = await getConnection(connection_id);
  if (!connection) {
    return new Response("Connection not found", { status: 404 });
  }
  
  const client = await getOAuthClient(connection.client_id);
  if (!client) {
    return new Response("OAuth client not found", { status: 404 });
  }
  
  const authUrl = new URL(client.auth_uri);
  authUrl.searchParams.set("client_id", client.client_id);
  if (redirect_url) {
    authUrl.searchParams.set("redirect_uri", redirect_url);
  }
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", connection.scope.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("state", connection_id);
  
  return Response.json({ auth_url: authUrl.toString() });
});

// Authorizations
router.route("POST", "/connections/:connection_id/exchange", async (req: Request): Promise<Response> => {
  const { connection_id } = params(req);
  if (!connection_id) {
    return new Response("Missing connection_id", { status: 400 });
  }
  
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const redirect_uri = url.searchParams.get("redirect_uri");
  if (!code) {
    return new Response("Missing code query parameter", { status: 400 });
  }
  
  const connection = await getConnection(connection_id);
  if (!connection) {
    return new Response("Connection not found", { status: 404 });
  }
  
  const client = await getOAuthClient(connection.client_id);
  if (!client) {
    return new Response("OAuth client not found", { status: 404 });
  }
  
  // Exchange code for token
  const tokenResponse = await fetch(client.token_uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: client.client_id,
      client_secret: client.client_secret,
      grant_type: "authorization_code",
      redirect_uri: redirect_uri!,
    }),
  });
  
  if (!tokenResponse.ok) {
    return new Response("Failed to exchange code for token", { status: 500 });
  }
  
  const tokenData = await tokenResponse.json();
  console.log("tokenData",tokenData)
  const token = TokenSchema.parse(tokenData);
  
  // Save token to database
  const authorization_id = crypto.randomUUID();
  const result = await saveToken(authorization_id, connection_id, token);
  
  return Response.json({
    ...token,
    authorization_id: result.authorization_id,
  });
});

router.route("GET", "/authorizations/:authorization_id/token", async (req: Request): Promise<Response> => {
  const { authorization_id } = params(req);
  if (!authorization_id) {
    return new Response("Missing authorization_id", { status: 400 });
  }
  
  const token = await getToken(authorization_id);
  if (!token) {
    return new Response("Token not found", { status: 404 });
  }
  
  return Response.json(token);
});
