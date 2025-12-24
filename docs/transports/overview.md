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
