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
