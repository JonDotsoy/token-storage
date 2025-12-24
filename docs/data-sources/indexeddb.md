# IndexedDB Storage

El `IndexedDBStorage` es un data source que almacena datos en IndexedDB, la base de datos nativa del navegador. Es ideal para aplicaciones web que necesitan persistencia local en el cliente sin depender de un servidor.

## Características

- **Persistencia en browser**: Los datos persisten entre sesiones del navegador
- **Sin servidor**: Funciona completamente offline
- **Asíncrono**: API no bloqueante basada en promesas
- **Transaccional**: Operaciones ACID en el navegador
- **Migraciones automáticas**: El esquema se crea automáticamente
- **Configurable**: Nombres personalizables para base de datos y colecciones

## Instalación

No requiere dependencias adicionales, usa la API IndexedDB nativa del navegador.

## Uso

### Configuración básica

```typescript
import { TokenStorage } from "token-storage";
import { IndexedDBStorage } from "token-storage/storage/indexeddb-storage";

const storage = new TokenStorage({
  db: new IndexedDBStorage(),
});

// Esperar a que las migraciones completen
await storage.migrated.promise;
```

### Configuración con nombre personalizado

```typescript
const storage = new TokenStorage({
  db: new IndexedDBStorage({
    db: {
      name: "my-app-tokens", // Nombre de la base de datos
    },
  }),
});
```

### Configuración con colecciones personalizadas

```typescript
const storage = new TokenStorage({
  db: new IndexedDBStorage({
    db: {
      name: "my-app-tokens",
    },
    collections: {
      oauth_clients: "oauth_clients_v1",
      connections: "connections_v1",
      credentials: "credentials_v1",
    },
  }),
});
```

## Estructura de IndexedDB

El `IndexedDBStorage` crea automáticamente las siguientes object stores:

### oauth_clients

Almacena los clientes OAuth configurados.

**Key**: `oauth_client_id`

**Estructura:**

```typescript
{
  oauth_client_id: string;
  client_id: string;
  project_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_secret: string;
  created_at: string; // ISO 8601
}
```

### connections

Almacena las conexiones OAuth con sus scopes.

**Key**: `connection_id`

**Estructura:**

```typescript
{
  connection_id: string;
  oauth_client_id: string;
  scope: string[]; // Array de scopes
  created_at: string; // ISO 8601
}
```

### credentials

Almacena las credenciales OAuth (tokens).

**Key**: `credential_id`

**Estructura:**

```typescript
{
  credential_id: string;
  connection_id: string;
  token: {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
    token_type: string;
    id_token?: string;
    created_at: string; // ISO 8601
  };
  created_at: string; // ISO 8601
}
```

## Ejemplos de Uso

### Aplicación React

```typescript
import { TokenStorage } from 'token-storage';
import { IndexedDBStorage } from 'token-storage/storage/indexeddb-storage';
import { useEffect, useState } from 'react';

function App() {
  const [storage, setStorage] = useState<TokenStorage | null>(null);

  useEffect(() => {
    async function initStorage() {
      const tokenStorage = new TokenStorage({
        db: new IndexedDBStorage({
          db: { name: 'my-app-tokens' }
        })
      });

      // Esperar migraciones
      await tokenStorage.migrated.promise;

      setStorage(tokenStorage);
    }

    initStorage();
  }, []);

  if (!storage) return <div>Loading...</div>;

  return <OAuthFlow storage={storage} />;
}
```

### Aplicación Vue

```typescript
import { TokenStorage } from "token-storage";
import { IndexedDBStorage } from "token-storage/storage/indexeddb-storage";
import { ref, onMounted } from "vue";

export default {
  setup() {
    const storage = ref<TokenStorage | null>(null);

    onMounted(async () => {
      const tokenStorage = new TokenStorage({
        db: new IndexedDBStorage({
          db: { name: "my-app-tokens" },
        }),
      });

      await tokenStorage.migrated.promise;
      storage.value = tokenStorage;
    });

    return { storage };
  },
};
```

### Progressive Web App (PWA)

```typescript
import { TokenStorage } from "token-storage";
import { IndexedDBStorage } from "token-storage/storage/indexeddb-storage";

// Inicializar storage
const storage = new TokenStorage({
  db: new IndexedDBStorage({
    db: { name: "pwa-tokens" },
  }),
});

await storage.migrated.promise;

// Funciona offline
async function makeAuthenticatedRequest(credentialId: string) {
  try {
    const token = await storage.getToken(credentialId);

    const response = await fetch("https://api.example.com/data", {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });

    return await response.json();
  } catch (error) {
    console.error("Request failed:", error);
    // Manejar offline
  }
}
```

### Electron App (Renderer Process)

```typescript
import { TokenStorage } from "token-storage";
import { IndexedDBStorage } from "token-storage/storage/indexeddb-storage";

// En el renderer process de Electron
const storage = new TokenStorage({
  db: new IndexedDBStorage({
    db: { name: "electron-app-tokens" },
  }),
});

await storage.migrated.promise;

// Usar normalmente
const stats = await storage.getStats();
console.log(`Stored tokens: ${stats.tokens}`);
```

## Migraciones

Las migraciones se ejecutan automáticamente al crear la instancia:

```typescript
const storage = new IndexedDBStorage({
  db: { name: "my-app-tokens" },
});

// Esperar a que las migraciones completen
await storage.migrated.promise;

console.log("IndexedDB schema ready!");
```

## Inspección de Datos

Puedes inspeccionar los datos almacenados usando las DevTools del navegador:

### Chrome/Edge

1. Abre DevTools (F12)
2. Ve a la pestaña "Application"
3. En el panel izquierdo, expande "IndexedDB"
4. Selecciona tu base de datos (ej: "my-app-tokens")
5. Explora las object stores

### Firefox

1. Abre DevTools (F12)
2. Ve a la pestaña "Storage"
3. Expande "Indexed DB"
4. Selecciona tu base de datos
5. Explora las object stores

## Límites de Almacenamiento

IndexedDB tiene límites de almacenamiento que varían por navegador:

| Navegador | Límite por Origen                    |
| --------- | ------------------------------------ |
| Chrome    | ~60% del espacio en disco disponible |
| Firefox   | ~50% del espacio en disco disponible |
| Safari    | ~1GB (puede solicitar más)           |
| Edge      | ~60% del espacio en disco disponible |

### Verificar cuota disponible

```typescript
if ("storage" in navigator && "estimate" in navigator.storage) {
  const estimate = await navigator.storage.estimate();
  const percentUsed = (estimate.usage! / estimate.quota!) * 100;

  console.log(`Storage used: ${(estimate.usage! / 1024 / 1024).toFixed(2)} MB`);
  console.log(
    `Storage quota: ${(estimate.quota! / 1024 / 1024).toFixed(2)} MB`,
  );
  console.log(`Percent used: ${percentUsed.toFixed(2)}%`);
}
```

### Solicitar almacenamiento persistente

```typescript
if ("storage" in navigator && "persist" in navigator.storage) {
  const isPersisted = await navigator.storage.persist();
  console.log(`Persistent storage granted: ${isPersisted}`);
}
```

## Ventajas

- **Offline-first**: Funciona sin conexión a internet
- **Sin servidor**: No requiere backend para almacenamiento
- **Persistencia**: Los datos sobreviven recargas y cierres del navegador
- **Privacidad**: Los datos permanecen en el dispositivo del usuario
- **Rendimiento**: Acceso rápido a datos locales
- **Estándar web**: API nativa soportada por todos los navegadores modernos

## Limitaciones

- **Solo en browser**: No funciona en Node.js o Bun (usa DuckDB o PostgreSQL)
- **Límites de cuota**: Espacio limitado según el navegador
- **Puede ser borrado**: El usuario puede limpiar datos del navegador
- **Sin sincronización**: No sincroniza entre dispositivos automáticamente
- **Mismo origen**: Datos aislados por dominio (política same-origin)

## Cuándo usar

✅ **Usar cuando:**

- Construyes una aplicación web o PWA
- Necesitas persistencia local en el navegador
- Quieres funcionalidad offline
- Los datos deben permanecer en el cliente
- Construyes una extensión de navegador
- Desarrollas con Electron (renderer process)

❌ **Considerar alternativas cuando:**

- Estás en Node.js o Bun (usa DuckDB o PostgreSQL)
- Necesitas sincronización entre dispositivos (usa HTTPStorage)
- Manejas grandes volúmenes de datos (> 1GB)
- Requieres compartir datos entre múltiples aplicaciones
- Necesitas acceso desde el servidor

## Comparación con otras opciones

| Característica  | Memory  | IndexedDB | DuckDB | PostgreSQL | HTTP          |
| --------------- | ------- | --------- | ------ | ---------- | ------------- |
| Browser support | ✅      | ✅        | ❌     | ❌         | ✅            |
| Node.js support | ✅      | ❌        | ✅     | ✅         | ✅            |
| Persistencia    | ❌      | ✅        | ✅     | ✅         | ✅ (servidor) |
| Offline         | ✅      | ✅        | ✅     | ❌         | ❌            |
| Configuración   | Ninguna | Mínima    | Mínima | Media      | Media         |
| Límite de datos | RAM     | ~1GB+     | Disco  | Disco      | Servidor      |

## Seguridad

### Datos sensibles

Los tokens OAuth son datos sensibles. Consideraciones:

- **Same-origin policy**: IndexedDB está aislado por dominio
- **HTTPS**: Usa siempre HTTPS en producción
- **No encriptado**: Los datos no están encriptados por defecto
- **Acceso local**: Cualquier script en tu dominio puede acceder

### Encriptación (opcional)

Para mayor seguridad, puedes encriptar tokens antes de almacenarlos:

```typescript
import { TokenStorage } from "token-storage";
import { IndexedDBStorage } from "token-storage/storage/indexeddb-storage";

// Wrapper con encriptación
class EncryptedIndexedDBStorage extends IndexedDBStorage {
  async putCredential(credential_id: string, credential: CredentialInput) {
    // Encriptar token antes de guardar
    const encryptedCredential = {
      ...credential,
      token: {
        ...credential.token,
        access_token: await encrypt(credential.token.access_token),
        refresh_token: credential.token.refresh_token
          ? await encrypt(credential.token.refresh_token)
          : undefined,
      },
    };

    return super.putCredential(credential_id, encryptedCredential);
  }

  async getCredential(credential_id: string) {
    const credential = await super.getCredential(credential_id);
    if (!credential) return null;

    // Desencriptar token al leer
    return {
      ...credential,
      token: {
        ...credential.token,
        access_token: await decrypt(credential.token.access_token),
        refresh_token: credential.token.refresh_token
          ? await decrypt(credential.token.refresh_token)
          : undefined,
      },
    };
  }
}
```

### Limpieza de datos

Implementa limpieza de datos cuando el usuario cierra sesión:

```typescript
async function logout() {
  // Eliminar todas las credenciales
  for await (const credential of storage.getCredentials()) {
    await storage.deleteCredential(credential.credential_id);
  }

  // O eliminar toda la base de datos
  const dbName = "my-app-tokens";
  indexedDB.deleteDatabase(dbName);
}
```

## Mantenimiento

### Limpiar tokens expirados

```typescript
async function cleanExpiredTokens() {
  const now = Date.now();

  for await (const credential of storage.getCredentials()) {
    const expiresAt =
      new Date(credential.created_at).getTime() +
      credential.token.expires_in * 1000;

    // Si expiró hace más de 30 días y no tiene refresh_token
    if (
      expiresAt < now - 30 * 24 * 60 * 60 * 1000 &&
      !credential.token.refresh_token
    ) {
      await storage.deleteCredential(credential.credential_id);
    }
  }
}
```

### Exportar datos

```typescript
async function exportData() {
  const data = {
    oauth_clients: [],
    connections: [],
    credentials: [],
  };

  for await (const client of storage.getOAuthClients()) {
    data.oauth_clients.push(client);
  }

  for await (const conn of storage.getConnections()) {
    data.connections.push(conn);
  }

  for await (const cred of storage.getCredentials()) {
    data.credentials.push(cred);
  }

  // Descargar como JSON
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tokens-backup.json";
  a.click();
}
```

### Importar datos

```typescript
async function importData(jsonData: string) {
  const data = JSON.parse(jsonData);

  for (const client of data.oauth_clients) {
    await storage.putOAuthClient(client.oauth_client_id, client);
  }

  for (const conn of data.connections) {
    await storage.putConnection(conn.connection_id, conn);
  }

  for (const cred of data.credentials) {
    await storage.putCredential(cred.credential_id, cred);
  }
}
```

## Migración entre storages

### De IndexedDB a HTTPStorage

Cuando tu app crece y necesitas centralizar tokens:

```typescript
// Antes (local)
const localStorage = new TokenStorage({
  db: new IndexedDBStorage(),
});

// Después (remoto)
const remoteStorage = new TokenStorage({
  db: new HTTPStorage(new URL("https://api.myapp.com/rpc")),
});

// Migrar datos
async function migrateToRemote() {
  for await (const client of localStorage.getOAuthClients()) {
    await remoteStorage.putOAuthClient(client.oauth_client_id, client);
  }

  for await (const conn of localStorage.getConnections()) {
    await remoteStorage.putConnection(conn.connection_id, conn);
  }

  for await (const cred of localStorage.getCredentials()) {
    await remoteStorage.putCredential(cred.credential_id, cred);
  }

  console.log("Migration complete!");
}
```

## Debugging

### Habilitar logs

```typescript
// Wrapper con logging
class LoggedIndexedDBStorage extends IndexedDBStorage {
  async putCredential(credential_id: string, credential: CredentialInput) {
    console.log(`[IndexedDB] Storing credential: ${credential_id}`);
    return super.putCredential(credential_id, credential);
  }

  async getCredential(credential_id: string) {
    console.log(`[IndexedDB] Retrieving credential: ${credential_id}`);
    const result = await super.getCredential(credential_id);
    console.log(`[IndexedDB] Found: ${result !== null}`);
    return result;
  }
}
```

### Verificar estado

```typescript
async function checkStorageHealth() {
  try {
    const stats = await storage.getStats();
    console.log("Storage health:", {
      oauth_clients: stats.oauth_clients,
      connections: stats.connections,
      tokens: stats.tokens,
      status: "healthy",
    });
  } catch (error) {
    console.error("Storage health check failed:", error);
  }
}
```

## Recursos

- [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Memory Storage](./memory.md)
- [DuckDB Storage](./duckdb.md)
- [HTTP Storage](./http-storage.md)
- [Data Sources Overview](./overview.md)
