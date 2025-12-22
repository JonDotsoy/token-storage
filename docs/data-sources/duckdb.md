# DuckDB Storage

El `DuckDBStorage` es un data source que almacena datos en DuckDB, una base de datos analítica embebida de alto rendimiento. Combina la simplicidad de SQLite con el poder de procesamiento de bases de datos columnares.

## Características

- **Embebida**: No requiere servidor separado, se ejecuta en el mismo proceso
- **Persistente**: Los datos se guardan en un archivo local
- **Alto rendimiento**: Optimizada para consultas analíticas y agregaciones
- **ACID**: Transacciones completas con garantías de consistencia
- **Migraciones automáticas**: El esquema se crea automáticamente
- **Cero configuración**: Solo especifica la ruta del archivo

## Instalación

```bash
bun add @duckdb/node-api
```

## Uso

### Configuración básica

```typescript
import { TokenStorage } from "token-storage";
import { DuckDBStorage } from "token-storage/storage/duckdb-storage";

const storage = new TokenStorage({
  db: new DuckDBStorage({
    database: { path: "./data/tokens.db" },
  }),
});

// Esperar a que las migraciones completen
await storage.migrated.promise;
```

### Configuración con ruta personalizada

```typescript
import path from "path";

const storage = new TokenStorage({
  db: new DuckDBStorage({
    database: {
      path: path.join(process.cwd(), "storage", "oauth-tokens.duckdb"),
    },
  }),
});
```

### Base de datos en memoria

Para testing o datos temporales:

```typescript
const storage = new TokenStorage({
  db: new DuckDBStorage({
    database: { path: ":memory:" },
  }),
});
```

## Esquema de Base de Datos

El `DuckDBStorage` crea automáticamente las siguientes tablas:

### oauth_clients

```sql
CREATE TABLE oauth_clients (
  oauth_client_id VARCHAR PRIMARY KEY,
  client_id VARCHAR NOT NULL,
  project_id VARCHAR NOT NULL,
  auth_uri VARCHAR NOT NULL,
  token_uri VARCHAR NOT NULL,
  auth_provider_x509_cert_url VARCHAR NOT NULL,
  client_secret VARCHAR NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

### connections

```sql
CREATE TABLE connections (
  connection_id VARCHAR PRIMARY KEY,
  client_id VARCHAR NOT NULL,
  scope VARCHAR[] NOT NULL,
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (client_id) REFERENCES oauth_clients(oauth_client_id)
);
```

### credentials

```sql
CREATE TABLE credentials (
  authorization_id VARCHAR PRIMARY KEY,
  connection_id VARCHAR NOT NULL,
  access_token VARCHAR NOT NULL,
  expires_in INTEGER NOT NULL,
  refresh_token VARCHAR,
  scope VARCHAR NOT NULL,
  token_type VARCHAR NOT NULL,
  id_token VARCHAR,
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (connection_id) REFERENCES connections(connection_id)
);
```

## Migraciones

Las migraciones se ejecutan automáticamente:

```typescript
const instance = new DuckDBStorage({
  database: { path: "./tokens.db" },
});

// Esperar a que las migraciones completen
await instance.migrated.promise;

console.log("DuckDB schema ready!");
```

## Ejemplos de Uso

### Aplicación de escritorio con Electron

```typescript
import { app } from "electron";
import path from "path";
import { TokenStorage } from "token-storage";
import { DuckDBStorage } from "token-storage/storage/duckdb-storage";

// Almacenar en el directorio de datos de usuario
const dbPath = path.join(app.getPath("userData"), "tokens.db");

const storage = new TokenStorage({
  db: new DuckDBStorage({
    database: { path: dbPath },
  }),
});

await storage.migrated.promise;
```

### CLI tool

```typescript
import { TokenStorage } from "token-storage";
import { DuckDBStorage } from "token-storage/storage/duckdb-storage";
import os from "os";
import path from "path";

// Almacenar en el home del usuario
const dbPath = path.join(os.homedir(), ".myapp", "tokens.db");

const storage = new TokenStorage({
  db: new DuckDBStorage({
    database: { path: dbPath },
  }),
});

await storage.migrated.promise;

// Comandos CLI
if (process.argv[2] === "list") {
  for await (const conn of storage.getConnections()) {
    console.log(conn.connection_id);
  }
}
```

### Servidor con persistencia local

```typescript
import { serve } from "bun";
import { TokenStorage } from "token-storage";
import { DuckDBStorage } from "token-storage/storage/duckdb-storage";

const storage = new TokenStorage({
  db: new DuckDBStorage({
    database: { path: "./data/tokens.db" },
  }),
});

await storage.migrated.promise;

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/stats") {
      const stats = await storage.getStats();
      return Response.json(stats);
    }

    return new Response("Not found", { status: 404 });
  },
});
```

## Configuración de Producción

### Docker

```dockerfile
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

# Crear directorio para la base de datos
RUN mkdir -p /app/data

# Volumen para persistencia
VOLUME /app/data

CMD ["bun", "run", "start"]
```

```yaml
# docker-compose.yml
version: "3.8"
services:
  app:
    build: .
    volumes:
      - ./data:/app/data
    environment:
      DB_PATH: /app/data/tokens.db
    ports:
      - "3000:3000"
```

### Variables de entorno

```typescript
import { Config } from "./config";

const config = Config.fromEnvironment();

const storage = new TokenStorage({
  db: new DuckDBStorage({
    database: { path: config.database.path },
  }),
});
```

```bash
# .env
DB_PATH=./data/tokens.db
```

## Ventajas

- **Sin servidor**: No requiere proceso separado de base de datos
- **Portabilidad**: Un solo archivo contiene toda la base de datos
- **Rendimiento**: Muy rápido para consultas analíticas
- **Simplicidad**: Configuración mínima, funciona out-of-the-box
- **Respaldos**: Simplemente copia el archivo .db

## Limitaciones

- **Concurrencia limitada**: Optimizado para lecturas, escrituras concurrentes limitadas
- **Tamaño**: Mejor para datasets pequeños a medianos (< 100GB)
- **Red**: No soporta acceso remoto nativo
- **Replicación**: No tiene replicación built-in

## Cuándo usar

✅ **Usar cuando:**

- Necesitas persistencia sin complejidad de servidor
- Estás construyendo aplicaciones de escritorio o CLI
- Quieres respaldos simples (copiar archivo)
- El acceso es principalmente de un solo proceso
- Necesitas análisis y agregaciones rápidas

❌ **Considerar alternativas cuando:**

- Tienes múltiples servidores que necesitan compartir datos (usa PostgreSQL)
- Requieres alta concurrencia de escrituras
- Necesitas replicación y alta disponibilidad
- El dataset es muy grande (> 100GB)

## Comparación con otras opciones

| Característica   | Memory   | DuckDB         | PostgreSQL |
| ---------------- | -------- | -------------- | ---------- |
| Persistencia     | ❌       | ✅             | ✅         |
| Servidor externo | ❌       | ❌             | ✅         |
| Configuración    | Ninguna  | Mínima         | Compleja   |
| Rendimiento      | Muy alto | Alto           | Alto       |
| Concurrencia     | Baja     | Media          | Alta       |
| Respaldos        | N/A      | Copiar archivo | pg_dump    |
| Producción       | ❌       | ✅             | ✅         |

## Mantenimiento

### Respaldos

```bash
# Backup simple - copiar el archivo
cp ./data/tokens.db ./backups/tokens-$(date +%Y%m%d).db

# Restore
cp ./backups/tokens-20231221.db ./data/tokens.db
```

### Compactación

```typescript
// DuckDB compacta automáticamente, pero puedes forzarlo
import { DuckDBInstance } from "@duckdb/node-api";

const instance = await DuckDBInstance.create("./tokens.db");
const conn = await instance.connect();
await conn.run("CHECKPOINT;");
await conn.run("VACUUM;");
```

### Monitoreo

```typescript
// Obtener estadísticas
const stats = await storage.getStats();
console.log(`Total OAuth Clients: ${stats.oauth_clients}`);
console.log(`Total Connections: ${stats.connections}`);
console.log(`Total Tokens: ${stats.tokens}`);

// Tamaño del archivo
import fs from "fs";
const size = fs.statSync("./data/tokens.db").size;
console.log(`Database size: ${(size / 1024 / 1024).toFixed(2)} MB`);
```

### Limpieza

```typescript
// Eliminar credentials antiguas
import { DuckDBInstance } from "@duckdb/node-api";

const instance = await DuckDBInstance.create("./tokens.db");
const conn = await instance.connect();

await conn.run(`
  DELETE FROM credentials 
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
`);
```

## Seguridad

- **Permisos de archivo**: Asegura que solo tu aplicación pueda leer el .db
- **Encriptación**: Considera encriptar el archivo en reposo
- **Respaldos**: Encripta los respaldos antes de almacenarlos

```bash
# Establecer permisos restrictivos
chmod 600 ./data/tokens.db

# Encriptar respaldo
gpg --encrypt --recipient your@email.com tokens.db
```

## Migración entre storages

### De Memory a DuckDB

```typescript
// Exportar de memoria
const memoryStorage = new TokenStorage();
const clients = [];
for await (const client of memoryStorage.getOAuthClients()) {
  clients.push(client);
}

// Importar a DuckDB
const duckStorage = new TokenStorage({
  db: new DuckDBStorage({
    database: { path: "./tokens.db" },
  }),
});

for (const client of clients) {
  await duckStorage.putOAuthClient(client.oauth_client_id, client);
}
```

### De DuckDB a PostgreSQL

Similar al ejemplo anterior, iterando sobre todos los registros y copiándolos al nuevo storage.
