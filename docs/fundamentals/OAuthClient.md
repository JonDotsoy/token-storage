# OAuthClient

Un `OAuthClient` representa la configuración de un cliente OAuth 2.0 que se utiliza para autenticar aplicaciones con proveedores de identidad externos.

## Estructura

```typescript
{
  oauth_client_id: string; // Identificador único del cliente OAuth
  client_id: string; // ID del cliente proporcionado por el proveedor
  project_id: string; // ID del proyecto asociado
  auth_uri: string; // URI de autorización del proveedor
  token_uri: string; // URI para intercambiar códigos por tokens
  auth_provider_x509_cert_url: string; // URL del certificado X.509 del proveedor
  client_secret: string; // Secreto del cliente (confidencial)
  created_at: string; // Timestamp ISO 8601 de creación
}
```

## Propósito

El `OAuthClient` almacena las credenciales y endpoints necesarios para:

- Iniciar flujos de autorización OAuth 2.0
- Intercambiar códigos de autorización por tokens de acceso
- Refrescar tokens expirados
- Validar la identidad del proveedor OAuth

## Uso

### Crear un OAuthClient

```typescript
await tokenStorage.putOAuthClient("oauth_client_123", {
  client_id: "your-client-id",
  project_id: "your-project",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_secret: "your-client-secret",
  created_at: new Date().toISOString(),
});
```

### Obtener un OAuthClient

```typescript
const oauthClient = await tokenStorage.getOAuthClient("oauth_client_123");
```

### Listar todos los OAuthClients

```typescript
for await (const client of tokenStorage.getOAuthClients()) {
  console.log(client.oauth_client_id);
}
```

### Eliminar un OAuthClient

```typescript
await tokenStorage.deleteOAuthClient("oauth_client_123");
```

## Relaciones

- Un `OAuthClient` puede tener múltiples `Connection` asociadas
- Cada `Connection` referencia un `oauth_client_id` específico

## Seguridad

El `client_secret` es información sensible y debe:

- Almacenarse de forma segura
- No exponerse en logs o respuestas de API
- Rotarse periódicamente según las políticas de seguridad
