# PostgreSQL Storage

El `PostgresQLStorage` es un data source que almacena datos en una base de datos PostgreSQL, proporcionando persistencia robusta, transacciones ACID y escalabilidad para entornos de producción.

## Características

- **Persistencia duradera**: Los datos sobreviven reinicios y fallos
- **ACID compliant**: Transacciones atómicas, consistentes, aisladas y duraderas
- **Escalable**: Maneja grandes volúmenes de datos eficientemente
- **Migraciones automáticas**: El esquema se crea automáticamente al inicializar
- **Producción ready**: Usado ampliamente en aplicaciones empresariales

## Instalación

```bash
bun add pg
bun add -D @types/pg
```

## Uso

### Configuración básica

```typescript
import { TokenStorage } from "token-storage";
import { PostgresQLStorage } from "token-storage/storage/postgresql-storage";
import { Client } from "pg";

// Crear cliente PostgreSQL
const client = new Client({
  host: "localhost",
  port: 5432,
  database: "token_storage",
  user: "postgres",
  password: "your-password",
});

await client.connect();

// Crear storage con PostgreSQL
const storage = new TokenStorage({
  db: new PostgresQLStorage({ client }),
});

// Esperar a que las migraciones completen
await storage.migrated.promise;
```

### Configuración con variables de entorno

```typescript
import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

await client.connect();

const storage = new TokenStorage({
  db: new PostgresQLStorage({ client }),
});
```

### Configuración con pool de conexiones

Para mejor rendimiento en producción:

```typescript
import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "token_storage",
  user: "postgres",
  password: "your-password",
  max: 20, // máximo de conexiones
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Obtener un cliente del pool
const client = await pool.connect();

const storage = new TokenStorage({
  db: new PostgresQLStorage({ client }),
});

// Liberar el cliente cuando termines
// client.release();
```

## Esquema de Base de Datos

El `PostgresQLStorage` crea automáticamente las siguientes tablas:

### oauth_clients

```sql
CREATE TABLE oauth_clients (
  oauth_client_id VARCHAR(255) PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  project_id VARCHAR(255) NOT NULL,
  auth_uri TEXT NOT NULL,
  token_uri TEXT NOT NULL,
  auth_provider_x509_cert_url TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

### connections

```sql
CREATE TABLE connections (
  connection_id VARCHAR(255) PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(oauth_client_id),
  scope TEXT[] NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

### credentials

```sql
CREATE TABLE credentials (
  authorization_id VARCHAR(255) PRIMARY KEY,
  connection_id VARCHAR(255) NOT NULL REFERENCES connections(connection_id),
  access_token TEXT NOT NULL,
  expires_in INTEGER NOT NULL,
  refresh_token TEXT,
  scope TEXT NOT NULL,
  token_type VARCHAR(50) NOT NULL,
  id_token TEXT,
  created_at TIMESTAMP NOT NULL
);
```

## Migraciones

Las migraciones se ejecutan automáticamente al crear la instancia:

```typescript
const instance = new PostgresQLStorage({ client });

// Esperar a que las migraciones completen
await instance.migrated.promise;

console.log("Database schema ready!");
```

## Ejemplos de Uso

### Aplicación web con Express

```typescript
import express from "express";
import { Client } from "pg";
import { TokenStorage } from "token-storage";
import { PostgresQLStorage } from "token-storage/storage/postgresql-storage";

const app = express();

// Inicializar PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
await client.connect();

// Crear storage
const storage = new TokenStorage({
  db: new PostgresQLStorage({ client }),
});

// Esperar migraciones
await storage.migrated.promise;

// Endpoints
app.get("/auth/:connection_id", async (req, res) => {
  const authUrl = await storage.getAuthURL(
    req.params.connection_id,
    "https://myapp.com/callback",
  );
  res.redirect(authUrl);
});

app.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  const { credential_id } = await storage.exchangeCode(
    state as string,
    "https://myapp.com/callback",
    code as string,
  );
  res.json({ credential_id });
});

app.listen(3000);
```

### Manejo de errores

```typescript
try {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const storage = new TokenStorage({
    db: new PostgresQLStorage({ client }),
  });

  await storage.migrated.promise;
} catch (error) {
  if (error.code === "ECONNREFUSED") {
    console.error("Cannot connect to PostgreSQL");
  } else if (error.code === "28P01") {
    console.error("Authentication failed");
  } else {
    console.error("Database error:", error);
  }
  process.exit(1);
}
```

## Configuración de Producción

### Docker Compose

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: token_storage
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secure-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:secure-password@postgres:5432/token_storage
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### Variables de entorno

```bash
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/token_storage
NODE_ENV=production
```

## Ventajas

- **Confiabilidad**: Transacciones ACID garantizan integridad de datos
- **Escalabilidad**: Maneja millones de registros eficientemente
- **Respaldos**: Herramientas robustas de backup y recuperación
- **Índices**: Optimización automática de consultas
- **Replicación**: Soporte para alta disponibilidad

## Limitaciones

- **Complejidad**: Requiere configuración y mantenimiento de PostgreSQL
- **Recursos**: Consume más memoria y CPU que soluciones embebidas
- **Latencia**: Network overhead en cada operación
- **Costo**: Puede requerir infraestructura dedicada

## Cuándo usar

✅ **Usar cuando:**

- Necesitas persistencia confiable en producción
- Manejas datos sensibles que requieren transacciones
- Tienes múltiples instancias de la aplicación
- Requieres respaldos y recuperación ante desastres
- Ya tienes infraestructura PostgreSQL

❌ **Considerar alternativas cuando:**

- Estás en desarrollo local (usa Memory)
- Necesitas una solución embebida sin servidor (usa DuckDB)
- El volumen de datos es pequeño y simple
- Quieres minimizar dependencias externas

## Mantenimiento

### Respaldos

```bash
# Backup
pg_dump -U postgres token_storage > backup.sql

# Restore
psql -U postgres token_storage < backup.sql
```

### Monitoreo

```typescript
// Obtener estadísticas
const stats = await storage.getStats();
console.log(`OAuth Clients: ${stats.oauth_clients}`);
console.log(`Connections: ${stats.connections}`);
console.log(`Tokens: ${stats.tokens}`);
```

### Limpieza de tokens expirados

```sql
-- Eliminar credentials con tokens expirados (más de 30 días)
DELETE FROM credentials
WHERE created_at < NOW() - INTERVAL '30 days';
```

## Seguridad

- **Encriptación en tránsito**: Usa SSL en producción
- **Credenciales**: Nunca hardcodees passwords, usa variables de entorno
- **Permisos**: Crea usuarios con permisos mínimos necesarios
- **Auditoría**: Habilita logging de PostgreSQL para auditoría

```typescript
// Conexión segura en producción
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync("/path/to/ca-certificate.crt").toString(),
  },
});
```
