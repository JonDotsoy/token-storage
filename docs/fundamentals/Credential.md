# Credential

Una `Credential` representa un conjunto de tokens OAuth 2.0 obtenidos después de que un usuario autoriza una conexión. Contiene los tokens de acceso y refresco necesarios para realizar llamadas autenticadas a APIs.

## Estructura

```typescript
{
  credential_id: string;         // Identificador único de la credencial
  connection_id: string;         // Referencia a la Connection utilizada
  token: {
    access_token: string;        // Token de acceso para autenticar requests
    expires_in: number;          // Segundos hasta que expire el access_token
    refresh_token?: string;      // Token para obtener nuevos access_tokens
    scope: string;               // Scopes otorgados (delimitados por espacios)
    token_type: string;          // Tipo de token, típicamente "Bearer"
    id_token?: string;           // Token de identidad OpenID Connect
    created_at: string;          // Timestamp de creación del token
  };
  created_at: string;            // Timestamp ISO 8601 de creación
}
```

## Propósito

La `Credential` almacena:

- Tokens de acceso para autenticar requests a APIs
- Tokens de refresco para obtener nuevos access tokens
- Metadata sobre la expiración y permisos otorgados

## Uso

### Crear una Credential

Normalmente se crea automáticamente al intercambiar un código de autorización:

```typescript
const { credential_id } = await tokenStorage.exchangeCode(
  "conn_123",
  "https://your-app.com/callback",
  "authorization_code",
);
```

O manualmente:

```typescript
await tokenStorage.putCredential("cred_123", {
  connection_id: "conn_123",
  token: {
    access_token: "ya29.a0AfH6SMBx...",
    expires_in: 3600,
    refresh_token: "1//0gHZKp...",
    scope: "email profile",
    token_type: "Bearer",
    created_at: new Date().toISOString(),
  },
  created_at: new Date().toISOString(),
});
```

### Obtener un token válido

El método `getToken` automáticamente refresca el token si ha expirado:

```typescript
const token = await tokenStorage.getToken("cred_123");

// Usar el token en una request
const response = await fetch("https://api.example.com/user", {
  headers: {
    Authorization: `Bearer ${token.access_token}`,
  },
});
```

### Obtener una Credential

```typescript
const credential = await tokenStorage.getCredential("cred_123");
```

### Listar todas las Credentials

```typescript
for await (const credential of tokenStorage.getCredentials()) {
  console.log(credential.credential_id);
}
```

### Eliminar una Credential

```typescript
await tokenStorage.deleteCredential("cred_123");
```

## Ciclo de Vida del Token

### 1. Obtención inicial

Cuando el usuario autoriza, se obtiene un `access_token` y opcionalmente un `refresh_token`:

```typescript
const { credential_id } = await tokenStorage.exchangeCode(
  connection_id,
  redirect_uri,
  code,
);
```

### 2. Uso del token

```typescript
const token = await tokenStorage.getToken(credential_id);
// token.access_token está listo para usar
```

### 3. Refresco automático

Si el token ha expirado (menos de 1 segundo de vida), `getToken` automáticamente:

- Usa el `refresh_token` para obtener un nuevo `access_token`
- Actualiza la credencial con el nuevo token
- Retorna el token actualizado

```typescript
// Internamente verifica expiración
const isExpired = (created_at + expires_in) <= now + 1 second;

if (isExpired) {
  // Refresca automáticamente
  const newToken = await refreshToken(credential, oauthClient);
  await putCredential(credential_id, { ...credential, token: newToken });
}
```

## Relaciones

- Una `Credential` pertenece a una `Connection` (relación many-to-one)
- A través de la `Connection`, está asociada a un `OAuthClient`

## Seguridad

Los tokens son información altamente sensible:

- **access_token**: Permite acceso a recursos protegidos
- **refresh_token**: Permite obtener nuevos access tokens sin reautenticación

Mejores prácticas:

- Almacenar tokens de forma segura (encriptados en reposo)
- No exponer tokens en logs o URLs
- Implementar rotación de refresh tokens cuando sea posible
- Revocar tokens cuando ya no sean necesarios
- Usar HTTPS para todas las comunicaciones

## Tipos de Token

### Access Token

- Vida corta (típicamente 1 hora)
- Se incluye en cada request a la API
- Formato: JWT o token opaco

### Refresh Token

- Vida larga (días, semanas o meses)
- Solo se usa para obtener nuevos access tokens
- Debe almacenarse de forma muy segura

### ID Token (OpenID Connect)

- Contiene información de identidad del usuario
- Formato: JWT con claims estándar (sub, email, name, etc.)
- Se valida para verificar la identidad del usuario
