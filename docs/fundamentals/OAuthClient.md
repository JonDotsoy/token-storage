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
