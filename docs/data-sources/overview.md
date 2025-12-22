# Data Sources - Overview

Los data sources son implementaciones de la interfaz `StorageInstance` que definen dónde y cómo se almacenan los datos de OAuth (clientes, conexiones y credenciales). Token Storage soporta múltiples backends de almacenamiento, cada uno optimizado para diferentes casos de uso.

## Interfaz StorageInstance

Todos los data sources implementan la misma interfaz, lo que permite cambiar entre ellos sin modificar el código de tu aplicación:

```typescript
interface StorageInstance {
  // OAuth Clients
  putOAuthClient(
    oauth_client_id: string,
    oauthClient: OAuthClientInput,
  ): Promise<void>;
  getOAuthClient(oauth_client_id: string): Promise<OAuthClient | null>;
  deleteOAuthClient(oauth_client_id: string): Promise<void>;
  getOAuthClients(): AsyncIterable<OAuthClient>;

  // Connections
  putConnection(
    connection_id: string,
    connection: ConnectionInput,
  ): Promise<void>;
  getConnection(connection_id: string): Promise<Connection | null>;
  deleteConnection(connection_id: string): Promise<void>;
  getConnections(): AsyncIterable<Connection>;

  // Credentials
  putCredential(
    credential_id: string,
    credential: CredentialInput,
  ): Promise<void>;
  getCredential(credential_id: string): Promise<Credential | null>;
  deleteCredential(credential_id: string): Promise<void>;
  getCredentials(): AsyncIterable<Credential>;

  // Stats
  getStats(): Promise<Stats>;
}
```

## Data Sources Disponibles

### [Memory Storage](./memory.md)

Almacenamiento en memoria usando estructuras `Map` de JavaScript.

**Ideal para:**

- Desarrollo y testing
- Prototipos rápidos
- Datos temporales

**Características:**

- ✅ Cero configuración
- ✅ Máxima velocidad
- ✅ Sin dependencias
- ❌ No persistente
- ❌ Limitado por memoria RAM

```typescript
import { TokenStorage } from "token-storage";
import { MemoryStorage } from "token-storage/storage/memory-storage";

const storage = new TokenStorage({
  db: new MemoryStorage(),
});
```

### [DuckDB Storage](./duckdb.md)

Base de datos analítica embebida con persistencia en archivo.

**Ideal para:**

- Aplicaciones de escritorio (Electron, Tauri)
- CLIs y herramientas de línea de comandos
- Aplicaciones standalone
- Servidores con un solo proceso

**Características:**

- ✅ Persistente
- ✅ Sin servidor externo
- ✅ Alto rendimiento
- ✅ Respaldos simples (copiar archivo)
- ⚠️ Concurrencia limitada

```typescript
import { TokenStorage } from "token-storage";
import { DuckDBStorage } from "token-storage/storage/duckdb-storage";

const storage = new TokenStorage({
  db: new DuckDBStorage({
    database: { path: "./tokens.db" },
  }),
});
```

### [PostgreSQL Storage](./postgresql.md)

Base de datos relacional robusta para producción.

**Ideal para:**

- Aplicaciones web en producción
- Múltiples instancias de la aplicación
- Alta concurrencia
- Replicación y alta disponibilidad

**Características:**

- ✅ Persistente y robusto
- ✅ Transacciones ACID
- ✅ Alta concurrencia
- ✅ Replicación y HA
- ❌ Requiere servidor PostgreSQL

```typescript
import { TokenStorage } from "token-storage";
import { PostgresQLStorage } from "token-storage/storage/postgresql-storage";
import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
await client.connect();

const storage = new TokenStorage({
  db: new PostgresQLStorage({ client }),
});
```

### [HTTP Storage](./http-storage.md)

Cliente que se conecta a un servidor remoto via JSON-RPC 2.0.

**Ideal para:**

- Aplicaciones frontend (React, Vue, Angular)
- Microservicios
- Arquitecturas distribuidas
- Múltiples aplicaciones compartiendo tokens

**Características:**

- ✅ Almacenamiento centralizado
- ✅ Múltiples clientes
- ✅ Separación de concerns
- ✅ Funciona en browser
- ❌ Latencia de red
- ❌ Requiere servidor

```typescript
import { TokenStorage } from "token-storage";
import { HTTPStorage } from "token-storage/storage/http-storage";

const storage = new TokenStorage({
  db: new HTTPStorage(new URL("http://localhost:5454/rpc")),
});
```

## Comparación

| Característica       | Memory   | DuckDB         | PostgreSQL | HTTP          |
| -------------------- | -------- | -------------- | ---------- | ------------- |
| **Persistencia**     | ❌       | ✅             | ✅         | ✅ (servidor) |
| **Servidor externo** | ❌       | ❌             | ✅         | ✅            |
| **Configuración**    | Ninguna  | Mínima         | Media      | Media         |
| **Latencia**         | Muy baja | Baja           | Media      | Alta          |
| **Concurrencia**     | Baja     | Media          | Alta       | Muy alta      |
| **Escalabilidad**    | Baja     | Media          | Alta       | Muy alta      |
| **Respaldos**        | N/A      | Copiar archivo | pg_dump    | Servidor      |
| **Replicación**      | ❌       | ❌             | ✅         | ✅            |
| **Multi-proceso**    | ❌       | ⚠️             | ✅         | ✅            |
| **Browser support**  | ✅       | ❌             | ❌         | ✅            |

## Guía de Selección

### Desarrollo y Testing

```typescript
// Usa Memory para tests rápidos
const storage = new TokenStorage(); // Memory por defecto
```

**Por qué:**

- Cero configuración
- Tests aislados
- Máxima velocidad

### Aplicación de Escritorio

```typescript
// Usa DuckDB para persistencia local
const storage = new TokenStorage({
  db: new DuckDBStorage({
    database: { path: path.join(app.getPath("userData"), "tokens.db") },
  }),
});
```

**Por qué:**

- Sin servidor externo
- Persistencia confiable
- Respaldos simples

### Aplicación Web (Backend)

```typescript
// Usa PostgreSQL para producción
const storage = new TokenStorage({
  db: new PostgresQLStorage({ client }),
});
```

**Por qué:**

- Múltiples instancias
- Alta concurrencia
- Replicación y HA

### Aplicación Web (Frontend)

```typescript
// Usa HTTP para conectar al backend
const storage = new TokenStorage({
  db: new HTTPStorage(new URL("https://api.myapp.com/rpc")),
});
```

**Por qué:**

- Funciona en browser
- Tokens centralizados
- Seguridad (tokens en servidor)

### Microservicios

```typescript
// Usa HTTP para compartir tokens entre servicios
const storage = new TokenStorage({
  db: new HTTPStorage(new URL(process.env.TOKEN_SERVICE_URL), {
    middleware: (fetch) => async (req) => {
      req.headers.set("X-Service-Token", process.env.SERVICE_TOKEN);
      return await fetch(req);
    },
  }),
});
```

**Por qué:**

- Centralización
- Auditoría
- Separación de concerns

## Migración entre Data Sources

Cambiar de un data source a otro es simple gracias a la interfaz común:

### De Memory a DuckDB

```typescript
// Desarrollo
const devStorage = new TokenStorage();

// Producción
const prodStorage = new TokenStorage({
  db: new DuckDBStorage({ database: { path: "./tokens.db" } }),
});
```

### De DuckDB a PostgreSQL

```typescript
// Antes
const storage = new TokenStorage({
  db: new DuckDBStorage({ database: { path: "./tokens.db" } }),
});

// Después
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const storage = new TokenStorage({
  db: new PostgresQLStorage({ client }),
});
```

### Migrar datos

```typescript
async function migrateData(source: TokenStorage, target: TokenStorage) {
  // Migrar OAuth Clients
  for await (const client of source.getOAuthClients()) {
    await target.putOAuthClient(client.oauth_client_id, client);
  }

  // Migrar Connections
  for await (const conn of source.getConnections()) {
    await target.putConnection(conn.connection_id, conn);
  }

  // Migrar Credentials
  for await (const cred of source.getCredentials()) {
    await target.putCredential(cred.credential_id, cred);
  }

  console.log("Migration complete!");
}
```

## Implementar un Data Source Personalizado

Puedes crear tu propio data source implementando la interfaz `StorageInstance`:

```typescript
import type { StorageInstance } from "token-storage/storage/dtos/storage-instance.dto";

class RedisStorage implements StorageInstance {
  constructor(private redis: RedisClient) {}

  async putOAuthClient(oauth_client_id: string, oauthClient: OAuthClientInput) {
    await this.redis.set(
      `oauth_client:${oauth_client_id}`,
      JSON.stringify(oauthClient),
    );
  }

  async getOAuthClient(oauth_client_id: string): Promise<OAuthClient | null> {
    const data = await this.redis.get(`oauth_client:${oauth_client_id}`);
    return data ? JSON.parse(data) : null;
  }

  // ... implementar resto de métodos
}

// Usar
const storage = new TokenStorage({
  db: new RedisStorage(redisClient),
});
```

## Mejores Prácticas

### 1. Usa el data source apropiado

No uses PostgreSQL si solo necesitas almacenamiento local. No uses Memory si necesitas persistencia.

### 2. Configura desde variables de entorno

```typescript
function createStorage() {
  const type = process.env.STORAGE_TYPE || "memory";

  switch (type) {
    case "duckdb":
      return new DuckDBStorage({
        database: { path: process.env.DB_PATH || "./tokens.db" },
      });
    case "postgresql":
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      return new PostgresQLStorage({ client });
    case "http":
      return new HTTPStorage(new URL(process.env.STORAGE_URL));
    default:
      return new MemoryStorage();
  }
}

const storage = new TokenStorage({ db: createStorage() });
```

### 3. Maneja errores apropiadamente

```typescript
try {
  const token = await storage.getToken(credential_id);
} catch (error) {
  if (error instanceof HTTPStorageInstanceError) {
    // Error de red o servidor
    console.error("Storage unavailable:", error.message);
  } else {
    // Otro tipo de error
    console.error("Unexpected error:", error);
  }
}
```

### 4. Implementa health checks

```typescript
async function checkStorageHealth() {
  try {
    await storage.getStats();
    return { status: "healthy" };
  } catch (error) {
    return { status: "unhealthy", error: error.message };
  }
}
```

### 5. Considera el rendimiento

- **Memory**: Ideal para operaciones frecuentes en memoria
- **DuckDB**: Bueno para lecturas analíticas
- **PostgreSQL**: Mejor para escrituras concurrentes
- **HTTP**: Añade latencia de red, usa caché si es necesario

## Recursos

- [Memory Storage](./memory.md)
- [DuckDB Storage](./duckdb.md)
- [PostgreSQL Storage](./postgresql.md)
- [HTTP Storage](./http-storage.md)
- [HTTP JSON-RPC Transport](../transports/http-json-rpc.md)
