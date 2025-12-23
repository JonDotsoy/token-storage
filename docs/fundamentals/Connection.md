# Connection

Una `Connection` representa la configuración de una conexión OAuth específica entre tu aplicación y un proveedor de identidad, definiendo los permisos (scopes) solicitados.

## Estructura

```typescript
{
  connection_id: string;         // Identificador único de la conexión
  oauth_client_id: string;       // Referencia al OAuthClient utilizado
  scope: string[];               // Lista de permisos OAuth solicitados
  created_at: string;            // Timestamp ISO 8601 de creación
}
```

## Propósito

La `Connection` define:

- Qué `OAuthClient` se utilizará para la autenticación
- Qué permisos (scopes) se solicitarán al usuario
- La configuración específica para un flujo de autorización

## Uso

### Crear una Connection

```typescript
await tokenStorage.putConnection("conn_123", {
  oauth_client_id: "oauth_client_123",
  scope: [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],
  created_at: new Date().toISOString(),
});
```

### Obtener una Connection

```typescript
const connection = await tokenStorage.getConnection("conn_123");
```

### Listar todas las Connections

```typescript
for await (const connection of tokenStorage.getConnections()) {
  console.log(connection.connection_id, connection.scope);
}
```

### Eliminar una Connection

```typescript
await tokenStorage.deleteConnection("conn_123");
```

## Flujo de Autorización

### 1. Generar URL de autorización

```typescript
const authUrl = await tokenStorage.getAuthURL(
  "conn_123",
  "https://your-app.com/callback",
);
// Redirige al usuario a authUrl
```

### 2. Intercambiar código por credenciales

Después de que el usuario autorice, el proveedor redirige con un código:

```typescript
const { credential_id } = await tokenStorage.exchangeCode(
  "conn_123",
  "https://your-app.com/callback",
  "authorization_code_from_provider",
);
```

## Relaciones

- Una `Connection` pertenece a un `OAuthClient` (relación many-to-one)
- Una `Connection` puede tener múltiples `Credential` asociadas (relación one-to-many)

## Scopes

Los scopes definen los permisos que tu aplicación solicita. Ejemplos comunes:

**Google:**

- `https://www.googleapis.com/auth/userinfo.email` - Acceso al email
- `https://www.googleapis.com/auth/userinfo.profile` - Acceso al perfil
- `https://www.googleapis.com/auth/drive.readonly` - Lectura de Google Drive

**GitHub:**

- `user:email` - Acceso al email del usuario
- `repo` - Acceso a repositorios privados

**Microsoft:**

- `User.Read` - Leer perfil del usuario
- `Mail.Read` - Leer correos electrónicos
