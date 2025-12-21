# Token Storage - Documentación del Proyecto

## Descripción General

Token Storage es un sistema de gestión de tokens OAuth 2.0 que proporciona almacenamiento, renovación automática y gestión del ciclo de vida de credenciales OAuth. El proyecto está diseñado para facilitar la integración con proveedores OAuth y mantener tokens actualizados de forma transparente.

## Arquitectura

### TokenStorage (Elemento Raíz)

`TokenStorage` es la clase principal que orquesta todo el sistema. Actúa como una fachada que proporciona una interfaz unificada para:

- Gestión de clientes OAuth
- Gestión de conexiones
- Gestión de credenciales
- Flujo de autorización OAuth 2.0
- Renovación automática de tokens

#### Características Principales

1. **Abstracción de Almacenamiento**: Permite usar diferentes backends de almacenamiento (memoria, DuckDB)
2. **Renovación Automática**: Detecta tokens expirados y los renueva automáticamente
3. **Flujo OAuth Completo**: Implementa el flujo de autorización OAuth 2.0 completo
4. **Gestión de Ciclo de Vida**: Maneja la creación, lectura, actualización y eliminación de entidades

## Componentes del Sistema

### 1. Entidades Principales

#### OAuthClient

Representa un cliente OAuth registrado con un proveedor de identidad.

**Propiedades:**

- `oauth_client_id`: Identificador único del cliente
- `client_id`: ID del cliente proporcionado por el proveedor OAuth
- `client_secret`: Secreto del cliente para autenticación
- `project_id`: ID del proyecto asociado
- `auth_uri`: URI de autorización del proveedor
- `token_uri`: URI para intercambio de tokens
- `auth_provider_x509_cert_url`: URL del certificado X.509 del proveedor
- `created_at`: Fecha de creación (ISO 8601)

#### Connection

Representa una conexión entre un cliente OAuth y los scopes solicitados.

**Propiedades:**

- `connection_id`: Identificador único de la conexión
- `oauth_client_id`: Referencia al cliente OAuth
- `scope`: Array de scopes OAuth solicitados
- `created_at`: Fecha de creación (ISO 8601)

#### Credential

Representa las credenciales OAuth obtenidas (tokens).

**Propiedades:**

- `credential_id`: Identificador único de la credencial
- `connection_id`: Referencia a la conexión asociada
- `token`: Objeto Token con los datos OAuth
- `created_at`: Fecha de creación (ISO 8601)

#### Token

Estructura que contiene los datos del token OAuth.

**Propiedades:**

- `access_token`: Token de acceso para autenticar peticiones API
- `expires_in`: Segundos hasta que expire el token
- `refresh_token`: Token para obtener nuevos access tokens (opcional)
- `scope`: Lista de scopes OAuth concedidos (separados por espacios)
- `token_type`: Tipo de token, típicamente 'Bearer'
- `id_token`: Token ID de OpenID Connect (opcional)
- `created_at`: Timestamp de creación del token (ISO 8601)

### 2. Capa de Almacenamiento

El sistema implementa el patrón Strategy para el almacenamiento mediante la interfaz `StorageInstance`.

#### StorageInstance (Interfaz)

Define el contrato que deben cumplir todas las implementaciones de almacenamiento:

**Métodos para OAuthClient:**

- `putOAuthClient(oauth_client_id, oauthClient)`: Crear/actualizar cliente
- `getOAuthClient(oauth_client_id)`: Obtener cliente por ID
- `deleteOAuthClient(oauth_client_id)`: Eliminar cliente
- `getOAuthClients()`: Iterar sobre todos los clientes

**Métodos para Connection:**

- `putConnection(connection_id, connection)`: Crear/actualizar conexión
- `getConnection(connection_id)`: Obtener conexión por ID
- `deleteConnection(connection_id)`: Eliminar conexión
- `getConnections()`: Iterar sobre todas las conexiones

**Métodos para Credential:**

- `putCredential(credential_id, credential)`: Crear/actualizar credencial
- `getCredential(credential_id)`: Obtener credencial por ID
- `deleteCredential(credential_id)`: Eliminar credencial
- `getCredentials()`: Iterar sobre todas las credenciales

**Métodos de Utilidad:**

- `getStats()`: Obtener estadísticas del sistema

#### Implementaciones Disponibles

##### MemoryInstance

Almacenamiento en memoria usando `Map` de JavaScript.

**Características:**

- Rápido y ligero
- Ideal para desarrollo y testing
- Los datos se pierden al reiniciar
- Sin dependencias externas

**Uso:**

```typescript
import { TokenStorage } from "./token-storage";
import { MemoryInstance } from "./storage/memory-storage";

const storage = new TokenStorage({
  db: new MemoryInstance(),
});
```

##### DuckDBStorageInstance

Almacenamiento persistente usando DuckDB.

**Características:**

- Persistencia en disco
- Ideal para producción
- Soporte para consultas SQL
- Migraciones automáticas

**Uso:**

```typescript
import { TokenStorage } from "./token-storage";
import { DuckDBStorageInstance } from "./storage/duckdb-storage";

const storage = new TokenStorage({
  db: new DuckDBStorageInstance({
    database: { path: "./tokens.db" },
  }),
});
```

## Flujo de Trabajo OAuth

### 1. Configuración Inicial

```typescript
// Crear instancia de TokenStorage
const tokenStorage = new TokenStorage();

// Registrar un cliente OAuth
await tokenStorage.putOAuthClient("client-123", {
  client_id: "your-client-id",
  client_secret: "your-client-secret",
  project_id: "project-id",
  auth_uri: "https://provider.com/oauth/authorize",
  token_uri: "https://provider.com/oauth/token",
  auth_provider_x509_cert_url: "https://provider.com/certs",
  created_at: new Date().toISOString(),
});

// Crear una conexión con scopes específicos
await tokenStorage.putConnection("conn-456", {
  oauth_client_id: "client-123",
  scope: ["read", "write"],
  created_at: new Date().toISOString(),
});
```

### 2. Flujo de Autorización

```typescript
// Obtener URL de autorización
const authUrl = await tokenStorage.getAuthURL(
  "conn-456",
  "http://localhost:3000/callback",
);

// Redirigir al usuario a authUrl
// El usuario autoriza y es redirigido con un código

// Intercambiar código por tokens
const { credential_id } = await tokenStorage.exchangeCode(
  "conn-456",
  "http://localhost:3000/callback",
  "authorization-code-from-callback",
);
```

### 3. Uso de Tokens

```typescript
// Obtener token (se renueva automáticamente si está expirado)
const token = await tokenStorage.getToken("credential-id");

// Usar el access_token en peticiones API
fetch("https://api.example.com/data", {
  headers: {
    Authorization: `Bearer ${token.access_token}`,
  },
});
```

## Renovación Automática de Tokens

TokenStorage implementa renovación automática de tokens usando la API Temporal:

1. **Detección de Expiración**: Calcula si el token expirará en menos de 1 segundo
2. **Renovación Transparente**: Si está expirado, usa el `refresh_token` para obtener uno nuevo
3. **Actualización Automática**: Guarda el nuevo token y lo devuelve

```typescript
// Este método maneja la renovación automáticamente
const token = await tokenStorage.getToken(credential_id);
// Si el token estaba expirado, ya se renovó
```

## Estadísticas del Sistema

```typescript
const stats = await tokenStorage.getStats();
console.log(stats);
// {
//   oauth_clients: 5,
//   connections: 12,
//   tokens: 8
// }
```

## Gestión de Entidades

### Listar Entidades

Todas las entidades se pueden iterar usando async iterables:

```typescript
// Listar todos los clientes OAuth
for await (const client of tokenStorage.getOAuthClients()) {
  console.log(client.oauth_client_id, client.client_id);
}

// Listar todas las conexiones
for await (const connection of tokenStorage.getConnections()) {
  console.log(connection.connection_id, connection.scope);
}

// Listar todas las credenciales
for await (const credential of tokenStorage.getCredentials()) {
  console.log(credential.credential_id, credential.token.access_token);
}
```

### Eliminar Entidades

```typescript
// Eliminar cliente OAuth
await tokenStorage.deleteOAuthClient("client-123");

// Eliminar conexión
await tokenStorage.deleteConnection("conn-456");

// Eliminar credencial
await tokenStorage.deleteCredential("cred-789");
```

## Consideraciones de Seguridad

- Los `client_secret` deben mantenerse seguros y nunca exponerse al cliente
- Los tokens de acceso tienen vida limitada y se renuevan automáticamente
- El sistema usa HTTPS para todas las comunicaciones OAuth
- Los tokens se almacenan de forma segura según la implementación de storage elegida

## Próximos Pasos

Para comenzar a usar Token Storage:

1. Instala las dependencias: `bun install`
2. Crea una instancia de `TokenStorage`
3. Registra tus clientes OAuth
4. Implementa el flujo de autorización en tu aplicación
5. Usa `getToken()` para obtener tokens válidos automáticamente
