# Transports - Overview

Los transports son componentes que exponen una instancia de `TokenStorage` a través de diferentes protocolos de comunicación. Permiten que clientes remotos accedan al storage mediante APIs estándar, habilitando arquitecturas distribuidas y centralizadas.

## ¿Qué es un Transport?

Un transport toma una instancia de `TokenStorage` y la expone a través de un protocolo específico:

```
┌─────────────────┐
│  TokenStorage   │
│   + Storage     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Transport    │  ◄── Expone via protocolo
└────────┬────────┘
         │
         ▼
    Clientes remotos
```

## Transports Disponibles

### [HTTP JSON-RPC Transport](./http-json-rpc.md)

Expone `TokenStorage` via HTTP usando el protocolo JSON-RPC 2.0.

**Características:**

- ✅ Protocolo estándar (JSON-RPC 2.0)
- ✅ Validación automática con Zod
- ✅ Introspección de métodos
- ✅ Framework agnóstico
- ✅ Type-safe

**Uso básico:**

```typescript
import { TokenStorage } from "token-storage";
import { TokenStorageHTTPTransport } from "token-storage/transports/http-transport";
import { DuckDBStorage } from "token-storage/storage/duckdb-storage";

// Crear storage
const storage = new TokenStorage({
  db: new DuckDBStorage({ database: { path: "./tokens.db" } }),
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
```

**Cliente:**

```typescript
import { TokenStorage } from "token-storage";
import { HTTPStorage } from "token-storage/storage/http-storage";

const storage = new TokenStorage({
  db: new HTTPStorage(new URL("http://localhost:5454/rpc")),
});

// Usar normalmente
const stats = await storage.getStats();
```

## Casos de Uso

### 1. Centralizar Tokens para Múltiples Aplicaciones

```
┌──────────────┐
│  React App   │──┐
└──────────────┘  │
                  │
┌──────────────┐  │    HTTP/JSON-RPC     ┌─────────────────┐
│  Vue App     │──┼─────────────────────►│  HTTP Transport │
└──────────────┘  │                      │  + TokenStorage │
                  │                      └─────────────────┘
┌──────────────┐  │
│  Mobile App  │──┘
└──────────────┘
```

**Beneficios:**

- Un solo lugar para gestionar tokens
- Auditoría centralizada
- Políticas de seguridad consistentes

### 2. Microservicios

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Service A   │     │  Service B   │     │  Service C   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  Token Service  │
                   │  (HTTP Transport)│
                   └─────────────────┘
```

**Beneficios:**

- Separación de concerns
- Escalabilidad independiente
- Gestión centralizada de credenciales

### 3. Aplicaciones Frontend

```
┌──────────────────┐
│   Browser App    │
│  (HTTPStorage)   │
└────────┬─────────┘
         │ HTTPS
         ▼
┌──────────────────┐
│   Backend API    │
│ (HTTP Transport) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   PostgreSQL     │
└──────────────────┘
```

**Beneficios:**

- Tokens nunca en el cliente
- Seguridad mejorada
- CORS configurado apropiadamente

## Arquitectura Cliente-Servidor

### Servidor (Transport)

El servidor expone `TokenStorage` via un protocolo:

```typescript
// server.ts
import { TokenStorage } from "token-storage";
import { TokenStorageHTTPTransport } from "token-storage/transports/http-transport";
import { PostgresQLStorage } from "token-storage/storage/postgresql-storage";
import { Client } from "pg";

// Storage backend
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const storage = new TokenStorage({
  db: new PostgresQLStorage({ client }),
});

// Transport
const transport = new TokenStorageHTTPTransport(storage);

// Servidor
Bun.serve({
  port: 5454,
  async fetch(req) {
    // Autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Procesar RPC
    if (req.method === "POST" && new URL(req.url).pathname === "/rpc") {
      return await transport.jsonRpcRouter.fetch(req);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log("Token service running on http://localhost:5454");
```

### Cliente (Storage)

El cliente usa `HTTPStorage` para conectarse:

```typescript
// client.ts
import { TokenStorage } from "token-storage";
import { HTTPStorage } from "token-storage/storage/http-storage";

const storage = new TokenStorage({
  db: new HTTPStorage(new URL("http://localhost:5454/rpc"), {
    middleware: (fetch) => async (req) => {
      req.headers.set("Authorization", `Bearer ${process.env.API_TOKEN}`);
      return await fetch(req);
    },
  }),
});

// Usar normalmente
const authUrl = await storage.getAuthURL(
  "conn_123",
  "http://localhost:3000/callback",
);
```

## Seguridad

### Autenticación

Siempre implementa autenticación en el servidor:

```typescript
// Servidor
Bun.serve({
  port: 5454,
  async fetch(req) {
    // Verificar token
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!isValidToken(token)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Procesar request
    if (req.method === "POST" && new URL(req.url).pathname === "/rpc") {
      return await transport.jsonRpcRouter.fetch(req);
    }

    return new Response("Not Found", { status: 404 });
  },
});
```

### HTTPS

Usa siempre HTTPS en producción:

```typescript
// Cliente
const storage = new TokenStorage({
  db: new HTTPStorage(new URL("https://api.example.com/rpc")), // ✅ HTTPS
});
```

### CORS

Configura CORS apropiadamente:

```typescript
// Servidor
Bun.serve({
  port: 5454,
  async fetch(req) {
    const headers = {
      "Access-Control-Allow-Origin": "https://myapp.com", // Específico
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // ... resto del handler
  },
});
```

## Middleware

Los transports y clientes soportan middleware para interceptar requests:

### Logging

```typescript
const loggingMiddleware = (fetch) => async (req) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  const start = Date.now();
  const response = await fetch(req);
  console.log(
    `[${new Date().toISOString()}] ${response.status} (${Date.now() - start}ms)`,
  );
  return response;
};

const storage = new TokenStorage({
  db: new HTTPStorage(new URL("http://localhost:5454/rpc"), {
    middleware: loggingMiddleware,
  }),
});
```

### Retry

```typescript
const retryMiddleware = (fetch) => async (req) => {
  const maxRetries = 3;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(req.clone());
      if (response.ok || response.status < 500) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    if (i < maxRetries - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000),
      );
    }
  }

  throw lastError;
};
```

### Autenticación

```typescript
const authMiddleware = (fetch) => async (req) => {
  req.headers.set("Authorization", `Bearer ${getToken()}`);
  return await fetch(req);
};
```

## Monitoreo

### Health Check

```typescript
// Servidor
app.get("/health", async (req, res) => {
  try {
    await storage.getStats();
    res.json({ status: "healthy" });
  } catch (error) {
    res.status(503).json({ status: "unhealthy", error: error.message });
  }
});
```

### Métricas

```typescript
let requestCount = 0;
let errorCount = 0;

const metricsMiddleware = (fetch) => async (req) => {
  requestCount++;
  try {
    const response = await fetch(req);
    if (!response.ok) errorCount++;
    return response;
  } catch (error) {
    errorCount++;
    throw error;
  }
};

// Exponer métricas
app.get("/metrics", (req, res) => {
  res.json({
    requests: requestCount,
    errors: errorCount,
    errorRate: ((errorCount / requestCount) * 100).toFixed(2) + "%",
  });
});
```

## Deployment

### Docker

```dockerfile
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

EXPOSE 5454

CMD ["bun", "run", "server.ts"]
```

### Docker Compose

```yaml
version: "3.8"
services:
  token-service:
    build: .
    ports:
      - "5454:5454"
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/tokens
      API_TOKEN: ${API_TOKEN}
    depends_on:
      - postgres

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: tokens
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: token-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: token-service
  template:
    metadata:
      labels:
        app: token-service
    spec:
      containers:
        - name: token-service
          image: myregistry/token-service:latest
          ports:
            - containerPort: 5454
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: token-service-secrets
                  key: database-url
            - name: API_TOKEN
              valueFrom:
                secretKeyRef:
                  name: token-service-secrets
                  key: api-token
---
apiVersion: v1
kind: Service
metadata:
  name: token-service
spec:
  selector:
    app: token-service
  ports:
    - port: 5454
      targetPort: 5454
  type: LoadBalancer
```

## Mejores Prácticas

### 1. Implementa autenticación robusta

No expongas el transport sin autenticación en producción.

### 2. Usa HTTPS siempre

Protege los tokens en tránsito con TLS.

### 3. Configura CORS apropiadamente

No uses `*` en producción, especifica orígenes permitidos.

### 4. Implementa rate limiting

Protege contra abuso:

```typescript
const rateLimiter = new Map();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimiter.get(ip);

  if (!limit || now > limit.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (limit.count >= 100) return false;

  limit.count++;
  return true;
}
```

### 5. Monitorea el servicio

Implementa health checks, métricas y logging.

### 6. Maneja errores gracefully

```typescript
try {
  return await transport.jsonRpcRouter.fetch(req);
} catch (error) {
  console.error("Transport error:", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
```

### 7. Usa variables de entorno

No hardcodees credenciales o URLs:

```typescript
const storage = new TokenStorage({
  db: new HTTPStorage(new URL(process.env.TOKEN_SERVICE_URL)),
});
```

## Comparación: Local vs Remote

| Aspecto            | Storage Local | Transport + HTTPStorage |
| ------------------ | ------------- | ----------------------- |
| **Latencia**       | Muy baja      | Media-Alta (red)        |
| **Complejidad**    | Baja          | Media-Alta              |
| **Escalabilidad**  | Limitada      | Alta                    |
| **Centralización** | ❌            | ✅                      |
| **Seguridad**      | Local         | Requiere autenticación  |
| **Mantenimiento**  | Simple        | Requiere servidor       |
| **Costo**          | Bajo          | Medio-Alto              |

## Cuándo Usar Transports

✅ **Usar cuando:**

- Múltiples aplicaciones necesitan acceder a los mismos tokens
- Construyes una arquitectura de microservicios
- Necesitas centralizar la gestión de credenciales
- Desarrollas aplicaciones frontend que necesitan tokens
- Quieres separar concerns (storage vs lógica de aplicación)

❌ **No usar cuando:**

- Aplicación standalone simple
- Latencia es crítica
- No quieres mantener infraestructura adicional
- Estás en desarrollo local

## Futuras Extensiones

Los transports pueden extenderse para soportar otros protocolos:

- **gRPC Transport**: Para comunicación de alto rendimiento
- **WebSocket Transport**: Para actualizaciones en tiempo real
- **GraphQL Transport**: Para queries flexibles
- **Message Queue Transport**: Para comunicación asíncrona

## Recursos

- [HTTP JSON-RPC Transport](./http-json-rpc.md) - Documentación completa
- [HTTP Storage](../data-sources/http-storage.md) - Cliente HTTP
- [Data Sources Overview](../data-sources/overview.md) - Backends de almacenamiento
