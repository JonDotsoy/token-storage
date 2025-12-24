# HTTP JSON-RPC Transport

El `TokenStorageHTTPTransport` expone una instancia de `TokenStorage` a través de un servidor HTTP usando el protocolo JSON-RPC 2.0. Permite que clientes remotos accedan al storage mediante llamadas RPC estándar.

## Características

- **JSON-RPC 2.0**: Protocolo estándar para comunicación cliente-servidor
- **Validación automática**: Usa Zod para validar inputs y outputs
- **Type-safe**: Garantiza tipos correctos en requests y responses
- **Introspección**: Soporta `system.listMethods` para descubrir métodos disponibles
- **Framework agnóstico**: Funciona con cualquier servidor HTTP (Express, Bun, Node.js)

## Uso Básico

### Con Bun

```typescript
import { TokenStorage } from "token-storage";
import { TokenStorageHTTPTransport } from "token-storage/transports/http-transport";
import { DuckDBStorage } from "token-storage/storage/duckdb-storage";

// Crear storage
const storage = new TokenStorage({
  db: new DuckDBStorage({
    database: { path: "./tokens.db" },
  }),
});

// Crear transport
const transport = new TokenStorageHTTPTransport(storage);

// Servidor HTTP
Bun.serve({
  port: 5454,
  async fetch(req) {
    if (req.method === "POST" && new URL(req.url).pathname === "/rpc") {
      return await transport.jsonRpcRouter.fetch(req);
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log("JSON-RPC server running on http://localhost:5454/rpc");
```

### Con Express

```typescript
import express from "express";
import { TokenStorage } from "token-storage";
import { TokenStorageHTTPTransport } from "token-storage/transports/http-transport";
import { PostgresQLStorage } from "token-storage/storage/postgresql-storage";
import { Client } from "pg";

const app = express();
app.use(express.json());

// Crear storage
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
await client.connect();

const storage = new TokenStorage({
  db: new PostgresQLStorage({ client }),
});

// Crear transport
const transport = new TokenStorageHTTPTransport(storage);

// Endpoint JSON-RPC
app.post("/rpc", async (req, res) => {
  const request = new Request(`http://localhost:5454/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  });
  const response = await transport.jsonRpcRouter.fetch(request);
  const result = await response.json();
  res.json(result);
});

app.listen(5454, () => {
  console.log("JSON-RPC server running on http://localhost:5454/rpc");
});
```

### Con Node.js HTTP

```typescript
import http from "http";
import { TokenStorage } from "token-storage";
import { TokenStorageHTTPTransport } from "token-storage/transports/http-transport";
import { MemoryStorage } from "token-storage/storage/memory-storage";

const storage = new TokenStorage({
  db: new MemoryStorage(),
});

const transport = new TokenStorageHTTPTransport(storage);

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/rpc") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      const request = new Request("http://localhost:5454/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const response = await transport.jsonRpcRouter.fetch(request);
      const result = await response.text();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(result);
    });
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(5454);
```

## Métodos Disponibles

El transport expone todos los métodos de `TokenStorage` via JSON-RPC:

### OAuthClient

#### `OAuthClient.put`

Crear o actualizar un OAuth client.

**Request:**

```json
{
  "id": 1,
  "jsonrpc": "2.0",
  "method": "OAuthClient.put",
  "params": {
    "oauth_client_id": "client_123",
    "oauthClient": {
      "client_id": "your-client-id",
      "project_id": "your-project",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_secret": "your-secret",
      "created_at": "2023-12-21T10:00:00Z"
    }
  }
}
```

**Response:**

```json
{
  "id": 1,
  "jsonrpc": "2.0",
  "result": true
}
```

#### `OAuthClient.get`

Obtener un OAuth client por ID.

**Request:**

```json
{
  "id": 2,
  "jsonrpc": "2.0",
  "method": "OAuthClient.get",
  "params": {
    "oauth_client_id": "client_123"
  }
}
```

**Response:**

```json
{
  "id": 2,
  "jsonrpc": "2.0",
  "result": {
    "oauth_client_id": "client_123",
    "client_id": "your-client-id",
    "project_id": "your-project",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "your-secret",
    "created_at": "2023-12-21T10:00:00Z"
  }
}
```

#### `OAuthClient.delete`

Eliminar un OAuth client.

**Request:**

```json
{
  "id": 3,
  "jsonrpc": "2.0",
  "method": "OAuthClient.delete",
  "params": {
    "oauth_client_id": "client_123"
  }
}
```

**Response:**

```json
{
  "id": 3,
  "jsonrpc": "2.0",
  "result": true
}
```

#### `OAuthClient.list`

Listar todos los OAuth clients.

**Request:**

```json
{
  "id": 4,
  "jsonrpc": "2.0",
  "method": "OAuthClient.list"
}
```

**Response:**

```json
{
  "id": 4,
  "jsonrpc": "2.0",
  "result": [
    {
      "oauth_client_id": "client_123",
      "client_id": "your-client-id",
      "project_id": "your-project",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_secret": "your-secret",
      "created_at": "2023-12-21T10:00:00Z"
    }
  ]
}
```

### Connection

- `connection.put` - Crear/actualizar una conexión
- `connection.get` - Obtener una conexión por ID
- `connection.delete` - Eliminar una conexión
- `connection.list` - Listar todas las conexiones

### Credential

- `credential.put` - Crear/actualizar una credencial
- `credential.get` - Obtener una credencial por ID
- `credential.delete` - Eliminar una credencial
- `credential.list` - Listar todas las credenciales

### Auth & Token

#### `auth.getURL`

Generar URL de autorización OAuth.

**Request:**

```json
{
  "id": 5,
  "jsonrpc": "2.0",
  "method": "auth.getURL",
  "params": {
    "connection_id": "conn_123",
    "redirect_uri": "https://myapp.com/callback"
  }
}
```

**Response:**

```json
{
  "id": 5,
  "jsonrpc": "2.0",
  "result": "https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=..."
}
```

#### `auth.exchangeCode`

Intercambiar código de autorización por credenciales.

**Request:**

```json
{
  "id": 6,
  "jsonrpc": "2.0",
  "method": "auth.exchangeCode",
  "params": {
    "connection_id": "conn_123",
    "redirect_uri": "https://myapp.com/callback",
    "code": "4/0AY0e-g7..."
  }
}
```

**Response:**

```json
{
  "id": 6,
  "jsonrpc": "2.0",
  "result": {
    "credential_id": "cred_abc123"
  }
}
```

#### `token.get`

Obtener token (con refresco automático si expiró).

**Request:**

```json
{
  "id": 7,
  "jsonrpc": "2.0",
  "method": "token.get",
  "params": {
    "credential_id": "cred_abc123"
  }
}
```

**Response:**

```json
{
  "id": 7,
  "jsonrpc": "2.0",
  "result": {
    "access_token": "ya29.a0AfH6SMBx...",
    "expires_in": 3600,
    "refresh_token": "1//0gHZKp...",
    "scope": "email profile",
    "token_type": "Bearer",
    "created_at": "2023-12-21T10:00:00Z"
  }
}
```

### Stats

#### `stats.get`

Obtener estadísticas del storage.

**Request:**

```json
{
  "id": 8,
  "jsonrpc": "2.0",
  "method": "stats.get"
}
```

**Response:**

```json
{
  "id": 8,
  "jsonrpc": "2.0",
  "result": {
    "oauth_clients": 5,
    "connections": 12,
    "tokens": 8
  }
}
```

### System

#### `system.listMethods`

Listar todos los métodos disponibles (introspección).

**Request:**

```json
{
  "id": 9,
  "jsonrpc": "2.0",
  "method": "system.listMethods"
}
```

**Response:**

```json
{
  "id": 9,
  "jsonrpc": "2.0",
  "result": [
    "OAuthClient.put",
    "OAuthClient.get",
    "OAuthClient.delete",
    "OAuthClient.list",
    "connection.put",
    "connection.get",
    "connection.delete",
    "connection.list",
    "credential.put",
    "credential.get",
    "credential.delete",
    "credential.list",
    "stats.get",
    "auth.getURL",
    "auth.exchangeCode",
    "token.get",
    "system.listMethods"
  ]
}
```

## Manejo de Errores

Cuando ocurre un error, el servidor responde con un objeto de error JSON-RPC:

**Error Response:**

```json
{
  "id": 1,
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": {
      "details": "Missing required parameter: oauth_client_id"
    }
  }
}
```

### Códigos de Error Comunes

- `-32700` - Parse error (JSON inválido)
- `-32600` - Invalid Request (request malformado)
- `-32601` - Method not found (método no existe)
- `-32602` - Invalid params (parámetros inválidos)
- `-32603` - Internal error (error interno del servidor)

## Middleware y Autenticación

### Autenticación con Bearer Token

```typescript
import { TokenStorageHTTPTransport } from "token-storage/transports/http-transport";

const transport = new TokenStorageHTTPTransport(storage);

Bun.serve({
  port: 5454,
  async fetch(req) {
    // Verificar autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    if (token !== process.env.API_TOKEN) {
      return Response.json({ error: "Invalid token" }, { status: 403 });
    }

    // Procesar request
    if (req.method === "POST" && new URL(req.url).pathname === "/rpc") {
      return await transport.jsonRpcRouter.fetch(req);
    }

    return new Response("Not Found", { status: 404 });
  },
});
```

### CORS

```typescript
Bun.serve({
  port: 5454,
  async fetch(req) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
    };

    // Handle preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (req.method === "POST" && new URL(req.url).pathname === "/rpc") {
      const response = await transport.jsonRpcRouter.fetch(req);
      const result = await response.text();
      return new Response(result, { headers });
    }

    return new Response("Not Found", { status: 404 });
  },
});
```

### Rate Limiting

```typescript
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimiter.get(ip);

  if (!limit || now > limit.resetAt) {
    rateLimiter.set(ip, {
      count: 1,
      resetAt: now + 60000, // 1 minuto
    });
    return true;
  }

  if (limit.count >= 100) {
    return false;
  }

  limit.count++;
  return true;
}

Bun.serve({
  port: 5454,
  async fetch(req) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    if (!checkRateLimit(ip)) {
      return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    if (req.method === "POST" && new URL(req.url).pathname === "/rpc") {
      return await transport.jsonRpcRouter.fetch(req);
    }

    return new Response("Not Found", { status: 404 });
  },
});
```

## Logging

```typescript
const transport = new TokenStorageHTTPTransport(storage);

Bun.serve({
  port: 5454,
  async fetch(req) {
    if (req.method === "POST" && new URL(req.url).pathname === "/rpc") {
      const body = await req.json();

      console.log(`[${new Date().toISOString()}] RPC Call:`, {
        id: body.id,
        method: body.method,
        params: body.params ? Object.keys(body.params) : [],
      });

      const start = Date.now();
      const response = await transport.jsonRpcRouter.fetch(req);
      const duration = Date.now() - start;
      const result = await response.json();

      console.log(`[${new Date().toISOString()}] RPC Response:`, {
        id: body.id,
        duration: `${duration}ms`,
        success: !("error" in result),
      });

      return Response.json(result);
    }

    return new Response("Not Found", { status: 404 });
  },
});
```

## Cliente HTTP

Para consumir el transport desde un cliente, usa `HTTPStorage`:

```typescript
import { TokenStorage } from "token-storage";
import { HTTPStorage } from "token-storage/storage/http-storage";

const storage = new TokenStorage({
  db: new HTTPStorage(new URL("http://localhost:5454/rpc")),
});

// Usar normalmente
const stats = await storage.getStats();
console.log(stats);
```

Ver [docs/data-sources/http-storage.md](../data-sources/http-storage.md) para más detalles sobre el cliente.

## Ventajas

- **Estándar**: JSON-RPC 2.0 es un protocolo ampliamente adoptado
- **Type-safe**: Validación automática de inputs y outputs
- **Introspección**: Los clientes pueden descubrir métodos disponibles
- **Framework agnóstico**: Funciona con cualquier servidor HTTP
- **Simple**: API clara y fácil de usar

## Limitaciones

- **HTTP overhead**: Cada llamada requiere un round-trip HTTP
- **Sin streaming**: No soporta respuestas en streaming (aunque los métodos list cargan todo en memoria)
- **Stateless**: Cada request es independiente

## Cuándo usar

✅ **Usar cuando:**

- Necesitas exponer el storage a clientes remotos
- Quieres centralizar la gestión de tokens
- Construyes una arquitectura de microservicios
- Necesitas un protocolo estándar y bien documentado

❌ **Considerar alternativas cuando:**

- Todo está en el mismo proceso (usa storage directo)
- Necesitas máximo rendimiento (usa storage local)
- Requieres streaming de datos en tiempo real
