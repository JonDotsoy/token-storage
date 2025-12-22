# Memory Storage

El `MemoryStorage` es un data source que almacena todos los datos en memoria usando estructuras `Map` de JavaScript. Es ideal para desarrollo, testing y casos de uso donde la persistencia no es necesaria.

## Características

- **Sin dependencias externas**: No requiere bases de datos ni configuración adicional
- **Rápido**: Todas las operaciones son síncronas en memoria
- **Volátil**: Los datos se pierden cuando el proceso termina
- **Simple**: Implementación minimalista sin complejidad adicional

## Uso

### Configuración básica

```typescript
import { TokenStorage } from "token-storage";
import { MemoryStorage } from "token-storage/storage/memory-storage";

const storage = new TokenStorage({
  db: new MemoryStorage(),
});
```

### Configuración por defecto

Si no especificas un data source, `MemoryStorage` se usa automáticamente:

```typescript
import { TokenStorage } from "token-storage";

// Usa MemoryStorage por defecto
const storage = new TokenStorage();
```

## Casos de Uso

### Desarrollo y Testing

Perfecto para pruebas unitarias y desarrollo local:

```typescript
import { describe, it, expect } from "vitest";
import { TokenStorage } from "token-storage";

describe("OAuth Flow", () => {
  it("should exchange code for credentials", async () => {
    const storage = new TokenStorage(); // Usa memoria por defecto

    await storage.putOAuthClient("client_1", {
      client_id: "test-client",
      project_id: "test-project",
      auth_uri: "https://auth.example.com",
      token_uri: "https://token.example.com",
      auth_provider_x509_cert_url: "https://certs.example.com",
      client_secret: "secret",
      created_at: new Date().toISOString(),
    });

    // ... resto del test
  });
});
```

### Aplicaciones efímeras

Para aplicaciones donde los datos no necesitan persistir entre reinicios:

```typescript
const storage = new TokenStorage();

// Los datos existen solo durante la ejecución
await storage.putConnection("conn_1", {
  oauth_client_id: "client_1",
  scope: ["email", "profile"],
  created_at: new Date().toISOString(),
});
```

### Caché temporal

Como capa de caché sobre otro storage:

```typescript
class CachedStorage {
  private cache = new MemoryStorage();
  private persistent: StorageInstance;

  constructor(persistent: StorageInstance) {
    this.persistent = persistent;
  }

  async getOAuthClient(id: string) {
    // Intenta obtener de caché primero
    let client = await this.cache.getOAuthClient(id);
    if (client) return client;

    // Si no está en caché, obtiene de storage persistente
    client = await this.persistent.getOAuthClient(id);
    if (client) {
      await this.cache.putOAuthClient(id, client);
    }
    return client;
  }
}
```

## Implementación

El `MemoryStorage` usa tres `Map` privados para almacenar datos:

```typescript
class MemoryStorage {
  #connections = new Map<string, Connection>();
  #credentials = new Map<string, Credential>();
  #oauthClients = new Map<string, OAuthClient>();
}
```

### Operaciones soportadas

Todas las operaciones estándar de `StorageInstance`:

- `putOAuthClient` / `getOAuthClient` / `deleteOAuthClient` / `getOAuthClients`
- `putConnection` / `getConnection` / `deleteConnection` / `getConnections`
- `putCredential` / `getCredential` / `deleteCredential` / `getCredentials`
- `getStats`

## Ventajas

- **Cero configuración**: Funciona inmediatamente sin setup
- **Velocidad**: Operaciones instantáneas en memoria
- **Aislamiento**: Cada instancia es independiente
- **Testing**: Ideal para tests que requieren estado limpio

## Limitaciones

- **No persistente**: Los datos se pierden al reiniciar
- **Memoria limitada**: No apto para grandes volúmenes de datos
- **Sin concurrencia**: No compartible entre procesos
- **Sin transacciones**: No hay rollback ni atomicidad garantizada

## Cuándo usar

✅ **Usar cuando:**

- Estás desarrollando o haciendo testing
- Los datos son temporales o desechables
- Necesitas máxima velocidad sin I/O
- Quieres prototipar rápidamente

❌ **No usar cuando:**

- Necesitas persistencia entre reinicios
- Manejas datos sensibles que deben respaldarse
- Tienes múltiples procesos que necesitan compartir datos
- El volumen de datos puede exceder la memoria disponible

## Migración a storage persistente

Cambiar de memoria a storage persistente es simple:

```typescript
// Antes (desarrollo)
const storage = new TokenStorage();

// Después (producción)
import { DuckDBStorage } from "token-storage/storage/duckdb-storage";

const storage = new TokenStorage({
  db: new DuckDBStorage({
    database: { path: "./data/tokens.db" },
  }),
});
```

La API es idéntica, solo cambia la implementación del storage.
