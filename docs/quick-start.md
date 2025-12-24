# Quick Start

Esta guía te ayudará a comenzar con Token Storage en menos de 5 minutos.

## Crea tu primera instancia

La forma más simple de comenzar es crear una instancia sin parámetros, que usa almacenamiento en memoria:

```typescript
import { TokenStorage } from "@jondotsoy/token-storage";

const storage = new TokenStorage();
```

### Conecta un data source

Para aplicaciones en producción, elige un data source persistente:

**Frontend (navegador):**

```typescript
import { TokenStorage } from "@jondotsoy/token-storage";
import { IndexedDBStorage } from "@jondotsoy/token-storage/storage/indexeddb-storage";

const storage = new TokenStorage({
  db: new IndexedDBStorage({ databaseName: "my-app-tokens" }),
});
```

**Backend (servidor):**

```typescript
import { TokenStorage } from "@jondotsoy/token-storage";
import { PostgresQLStorage } from "@jondotsoy/token-storage/storage/postgresql-storage";
import { Client } from "pg";

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const storage = new TokenStorage({
  db: new PostgresQLStorage({ client }),
});
```

## Configura tu OAuth Client

Registra las credenciales de tu aplicación OAuth:

```typescript
await storage.putOAuthClient("google-client", {
  client_id: process.env.GOOGLE_CLIENT_ID!,
  client_secret: process.env.GOOGLE_CLIENT_SECRET!,
  project_id: "my-project",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  created_at: new Date().toISOString(),
});
```

## Crea una conexión

Define los scopes que necesitas para tu aplicación:

```typescript
await storage.putConnection("google-drive", {
  oauth_client_id: "google-client",
  scope: ["https://www.googleapis.com/auth/drive.readonly"],
  created_at: new Date().toISOString(),
});
```

## Genera la URL de autorización

Obtén la URL para que el usuario autorice tu aplicación:

```typescript
const authUrl = await storage.getAuthURL(
  "google-drive",
  "http://localhost:3000/callback",
);

console.log("Autoriza tu aplicación en:", authUrl);
// Redirige al usuario a esta URL
```

## Intercambia el código por tokens

Después de que el usuario autorice, intercambia el código por tokens:

```typescript
const { credential_id } = await storage.exchangeCode(
  "google-drive",
  "http://localhost:3000/callback",
  code, // Código recibido en el callback
);
```

## Obtén el token con auto-refresco

Usa el token en tus requests. Token Storage lo renovará automáticamente si expira:

```typescript
const token = await storage.getToken(credential_id);

// Usa el token en tus llamadas a la API
const response = await fetch("https://www.googleapis.com/drive/v3/files", {
  headers: {
    Authorization: `Bearer ${token.access_token}`,
  },
});
```
