# HTTP Storage

El `HTTPStorage` es un data source cliente que se comunica con un servidor remoto mediante JSON-RPC 2.0 sobre HTTP. Permite centralizar el almacenamiento de tokens en un servicio dedicado, ideal para arquitecturas distribuidas.

Este es el cliente que consume un servidor que usa `TokenStorageHTTPTransport`. Ver [docs/transports/http-json-rpc.md](../transports/http-json-rpc.md) para documentación del servidor.

## Características

- **Cliente remoto**: Se conecta a un servidor de storage centralizado
- **JSON-RPC 2.0**: Protocolo estándar para comunicación cliente-servidor
- **Middleware support**: Permite interceptar y modificar requests (autenticación, logging, etc.)
- **Type-safe**: Validación automática de respuestas con Zod
- **Error handling**: Manejo robusto de errores de red y del servidor
- **Transparente**: Misma API que otros storages locales

## Instalación

No requiere dependencias adicionales, usa el `fetch` API estándar.

## Uso

### Configuración básica

```typescript
import { TokenStorage } from "token-storage";
import { HTTPStorage } from "token-storage/storage/http-storage";

const storage = new TokenStorage({
  db: new HTTPStorage(new URL("http://localhost:5454/rpc")),
});

// Usar normalmente
const stats = await storage.getStats();
```

### Configuración con variables de entorno

```typescript
const storage = new TokenStorage({
  db: new HTTPStorage(
    new URL(process.env.STORAGE_URL || "http://localhost:5454/rpc"),
  ),
});
```

## Arquitectura Cliente-Servidor

```
┌─────────────────┐         HTTP/JSON-RPC        ┌─────────────────┐
│   HTTPStorage   │ ────────────────────────────> │  HTTP Transport │
│    (Cliente)    │                                │    (Servidor)   │
└─────────────────┘                                └─────────────────┘
                                                            │
                                                            ▼
                                                   ┌─────────────────┐
                                                   │  TokenStorage   │
                                                   │   + Storage     │
                                                   │  (DuckDB/PG)    │
                                                   └─────────────────┘
```

El cliente `HTTPStorage` se comunica con un servidor que usa `TokenStorageHTTPTransport` para exponer un `TokenStorage` via JSON-RPC 2.0.

## Protocolo

Todas las operaciones se realizan mediante JSON-RPC 2.0. El cliente maneja automáticamente:

- Serialización de requests
- Deserialización de responses
- Validación de tipos con Zod
- Manejo de errores
- Secuenciación de IDs

Ver [docs/transports/http-json-rpc.md](../transports/http-json-rpc.md) para detalles completos del protocolo y métodos disponibles.

## Middleware

El middleware permite interceptar y modificar requests antes de enviarlos:

### Autenticación con API Key

```typescript
import { HTTPStorage } from "token-storage/storage/http-storage";

const authMiddleware = (fetch) => async (request) => {
  request.headers.set("Authorization", `Bearer ${process.env.API_KEY}`);
  return await fetch(request);
};

const storage = new TokenStorage({
  db: new HTTPStorage(new URL("https://api.example.com/rpc"), {
    middleware: authMiddleware,
  }),
});
```

### Logging de requests

```typescript
const loggingMiddleware = (fetch) => async (request) => {
  console.log(`[HTTP] ${request.method} ${request.url}`);
  const start = Date.now();

  try {
    const response = await fetch(request);
    const duration = Date.now() - start;
    console.log(
      `[HTTP] ${response.status} ${response.statusText} (${duration}ms)`,
    );
    return response;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[HTTP] Error after ${duration}ms:`, error);
    throw error;
  }
};

const storage = new TokenStorage({
  db: new HTTPStorage(new URL("http://localhost:5454/rpc"), {
    middleware: loggingMiddleware,
  }),
});
```

### Retry con backoff

```typescript
const retryMiddleware = (fetch) => async (request) => {
  const maxRetries = 3;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(request.clone());
      if (response.ok || response.status < 500) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    // Exponential backoff
    if (i < maxRetries - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000),
      );
    }
  }

  throw lastError;
};

const storage = new TokenStorage({
  db: new HTTPStorage(new URL("http://localhost:5454/rpc"), {
    middleware: retryMiddleware,
  }),
});
```

### Composición de middleware

```typescript
const composeMiddleware = (...middlewares) => {
  return middlewares.reduce((acc, middleware) => {
    return (fetch) => middleware(acc(fetch));
  });
};

const storage = new TokenStorage({
  db: new HTTPStorage(new URL("http://localhost:5454/rpc"), {
    middleware: composeMiddleware(
      authMiddleware,
      loggingMiddleware,
      retryMiddleware,
    ),
  }),
});
```

## Servidor

Para usar `HTTPStorage`, necesitas un servidor JSON-RPC. Ejemplo básico:

```typescript
import { TokenStorage } from "token-storage";
import { TokenStorageHTTPTransport } from "token-storage/transports/http-transport";
import { DuckDBStorage } from "token-storage/storage/duckdb-storage";

const storage = new TokenStorage({
  db: new DuckDBStorage({ database: { path: "./tokens.db" } }),
});

const transport = new TokenStorageHTTPTransport(storage);

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

Ver [docs/transports/http-json-rpc.md](../transports/http-json-rpc.md) para documentación completa del servidor.

## Ejemplos de Uso

### Aplicación frontend (React)

```typescript
import { TokenStorage } from 'token-storage';
import { HTTPStorage } from 'token-storage/storage/http-storage';

// Conectar al backend
const storage = new TokenStorage({
  db: new HTTPStorage(new URL('https://api.myapp.com/rpc'))
});

function LoginButton({ connectionId }) {
  const handleLogin = async () => {
    const authUrl = await storage.getAuthURL(
      connectionId,
      window.location.origin + '/callback'
    );
    window.location.href = authUrl;
  };

  return <button onClick={handleLogin}>Login with OAuth</button>;
}

function CallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      storage.exchangeCode(
        state,
        window.location.origin + '/callback',
        code
      ).then(({ credential_id }) => {
        localStorage.setItem('credential_id', credential_id);
        window.location.href = '/dashboard';
      });
    }
  }, []);

  return <div>Processing login...</div>;
}
```

### Aplicación móvil (React Native)

```typescript
import { TokenStorage } from "token-storage";
import { HTTPStorage } from "token-storage/storage/http-storage";

const storage = new TokenStorage({
  db: new HTTPStorage(new URL("https://api.myapp.com/rpc")),
});

async function makeAuthenticatedRequest(credentialId: string) {
  const token = await storage.getToken(credentialId);

  const response = await fetch("https://api.example.com/user", {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
  });

  return response.json();
}
```

### Microservicio

```typescript
import { TokenStorage } from "token-storage";
import { HTTPStorage } from "token-storage/storage/http-storage";

// Conectar al servicio centralizado de tokens
const storage = new TokenStorage({
  db: new HTTPStorage(new URL(process.env.TOKEN_SERVICE_URL), {
    middleware: (fetch) => async (request) => {
      // Autenticación entre servicios
      request.headers.set("X-Service-Token", process.env.SERVICE_TOKEN);
      return await fetch(request);
    },
  }),
});

// Usar en tu microservicio
export async function getUserData(credentialId: string) {
  const token = await storage.getToken(credentialId);
  // ... usar el token
}
```

### CLI Tool

```typescript
import { TokenStorage } from "token-storage";
import { HTTPStorage } from "token-storage/storage/http-storage";

const storage = new TokenStorage({
  db: new HTTPStorage(new URL("http://localhost:5454/rpc")),
});

// Comando: listar conexiones
if (process.argv[2] === "list") {
  for await (const conn of storage.getConnections()) {
    console.log(`${conn.connection_id}: ${conn.scope.join(", ")}`);
  }
}

// Comando: obtener stats
if (process.argv[2] === "stats") {
  const stats = await storage.getStats();
  console.log(`OAuth Clients: ${stats.oauth_clients}`);
  console.log(`Connections: ${stats.connections}`);
  console.log(`Tokens: ${stats.tokens}`);
}
```

## Manejo de Errores

El cliente lanza `HTTPStorageInstanceError` cuando hay problemas de red o errores del servidor:

```typescript
import { HTTPStorageInstanceError } from "token-storage/storage/http-storage";

try {
  const client = await storage.getOAuthClient("client_123");
} catch (error) {
  if (error instanceof HTTPStorageInstanceError) {
    console.error("HTTP Error:", error.message);
    // POST http://localhost:5454/rpc: 500 Internal Server Error ...
  } else {
    console.error("Unexpected error:", error);
  }
}
```

### Tipos de errores

- **Network errors**: Servidor no disponible, timeout, etc.
- **HTTP errors**: 4xx, 5xx status codes
- **JSON-RPC errors**: Errores del protocolo (método no encontrado, parámetros inválidos, etc.)
- **Validation errors**: Respuesta no cumple con el schema esperado

## Ventajas

- **Centralización**: Un solo servidor de tokens para múltiples aplicaciones
- **Escalabilidad**: Escala el servidor independientemente de los clientes
- **Seguridad**: Los tokens nunca se almacenan en el cliente (solo en el servidor)
- **Flexibilidad**: Cambia el backend sin modificar clientes
- **Separación de concerns**: Lógica de storage separada de la aplicación
- **API transparente**: Misma interfaz que storages locales
- **Multi-plataforma**: Funciona en browser, Node.js, Bun, Deno, etc.

## Limitaciones

- **Latencia de red**: Cada operación requiere un round-trip HTTP
- **Disponibilidad**: Depende de la disponibilidad del servidor
- **Complejidad**: Requiere mantener un servidor adicional
- **Ancho de banda**: Más tráfico de red que storage local

## Cuándo usar

✅ **Usar cuando:**

- Tienes múltiples aplicaciones que comparten tokens
- Necesitas centralizar la gestión de credenciales
- Quieres separar el storage de la lógica de aplicación
- Construyes una arquitectura de microservicios
- Necesitas auditoría centralizada de acceso a tokens
- Desarrollas aplicaciones frontend (React, Vue, etc.)
- Construyes CLIs que necesitan acceso a tokens centralizados

❌ **Considerar alternativas cuando:**

- Estás construyendo una aplicación standalone (usa DuckDB o PostgreSQL)
- La latencia es crítica (usa storage local)
- No quieres mantener un servidor adicional
- Estás en desarrollo local (usa Memory)
- Necesitas funcionar offline

## Comparación con otras opciones

| Característica   | Memory   | DuckDB | PostgreSQL | HTTP          |
| ---------------- | -------- | ------ | ---------- | ------------- |
| Persistencia     | ❌       | ✅     | ✅         | ✅ (servidor) |
| Servidor externo | ❌       | ❌     | ✅         | ✅            |
| Latencia         | Muy baja | Baja   | Media      | Alta          |
| Centralización   | ❌       | ❌     | ✅         | ✅            |
| Escalabilidad    | Baja     | Media  | Alta       | Muy alta      |
| Complejidad      | Mínima   | Baja   | Media      | Alta          |

## Seguridad

### Autenticación

Siempre usa autenticación en producción. El servidor debe validar las credenciales:

```typescript
// Cliente
const storage = new TokenStorage({
  db: new HTTPStorage(new URL("https://api.example.com/rpc"), {
    middleware: (fetch) => async (request) => {
      request.headers.set("Authorization", `Bearer ${getAuthToken()}`);
      return await fetch(request);
    },
  }),
});
```

Ver [docs/transports/http-json-rpc.md#middleware-y-autenticación](../transports/http-json-rpc.md#middleware-y-autenticación) para ejemplos de autenticación en el servidor.

### HTTPS

Usa siempre HTTPS en producción para proteger tokens en tránsito:

```typescript
// ✅ Correcto
new HTTPStorage(new URL("https://api.example.com/rpc"));

// ❌ Inseguro en producción
new HTTPStorage(new URL("http://api.example.com/rpc"));
```

### Consideraciones

- **Tokens en tránsito**: Usa HTTPS para encriptar la comunicación
- **Autenticación**: Implementa autenticación robusta en el servidor
- **Rate limiting**: El servidor debe implementar rate limiting
- **CORS**: Configura CORS apropiadamente si usas desde browser
- **Auditoría**: El servidor puede loggear todos los accesos a tokens

## Monitoreo

### Métricas del cliente

```typescript
let requestCount = 0;
let errorCount = 0;

const metricsMiddleware = (fetch) => async (request) => {
  requestCount++;
  try {
    const response = await fetch(request);
    if (!response.ok) errorCount++;
    return response;
  } catch (error) {
    errorCount++;
    throw error;
  }
};

// Exponer métricas
setInterval(() => {
  console.log(`Requests: ${requestCount}, Errors: ${errorCount}`);
}, 60000);
```

### Health check

```typescript
async function checkHealth() {
  try {
    await storage.getStats();
    return { status: "healthy" };
  } catch (error) {
    return { status: "unhealthy", error: error.message };
  }
}
```

## Recursos Relacionados

- [HTTP JSON-RPC Transport](../transports/http-json-rpc.md) - Documentación del servidor
- [Memory Storage](./memory.md) - Storage en memoria para desarrollo
- [DuckDB Storage](./duckdb.md) - Storage embebido con persistencia
- [PostgreSQL Storage](./postgresql.md) - Storage con PostgreSQL
