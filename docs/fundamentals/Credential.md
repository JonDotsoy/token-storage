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
