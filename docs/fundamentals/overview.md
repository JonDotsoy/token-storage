# Fundamentals - Overview

Token Storage se basa en tres conceptos fundamentales que representan el flujo completo de autenticación OAuth 2.0:

## Conceptos Principales

### [OAuthClient](./OAuthClient.md)

Configuración del cliente OAuth 2.0 que identifica tu aplicación ante el proveedor de identidad.

**Contiene:**

- Credenciales del cliente (client_id, client_secret)
- Endpoints del proveedor (auth_uri, token_uri)
- Información del proyecto

**Ejemplo:**

```typescript
await storage.putOAuthClient("google-client", {
  client_id: "123456.apps.googleusercontent.com",
  client_secret: "secret",
  project_id: "my-project",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  created_at: new Date().toISOString(),
});
```

### [Connection](./Connection.md)

Configuración de una conexión específica que define qué permisos (scopes) solicitar.

**Contiene:**

- Referencia al OAuthClient
- Lista de scopes solicitados
- Identificador único de la conexión

**Ejemplo:**

```typescript
await storage.putConnection("google-drive", {
  oauth_client_id: "google-client",
  scope: ["https://www.googleapis.com/auth/drive.readonly"],
  created_at: new Date().toISOString(),
});
```

### [Credential](./Credential.md)

Tokens OAuth obtenidos después de que el usuario autoriza la aplicación.

**Contiene:**

- Access token para autenticar requests
- Refresh token para renovar el access token
- Metadata de expiración y scopes otorgados

**Ejemplo:**

```typescript
const token = await storage.getToken(credential_id);
// Token Storage renueva automáticamente si está expirado
```

## Flujo de Trabajo

```
1. OAuthClient
   └─> Define las credenciales de tu app
       │
2. Connection
   └─> Define qué permisos necesitas
       │
3. Authorization URL
   └─> Usuario autoriza tu app
       │
4. Exchange Code
   └─> Obtienes los tokens
       │
5. Credential
   └─> Tokens listos para usar (con auto-refresco)
```

## Relaciones

```
OAuthClient (1) ──┐
                  │
                  ├──> Connection (N) ──┐
                  │                     │
                  │                     ├──> Credential (N)
                  │                     │
                  └─────────────────────┘
```

- Un **OAuthClient** puede tener múltiples **Connections**
- Una **Connection** puede generar múltiples **Credentials** (una por cada usuario que autorice)
- Cada **Credential** está vinculada a una **Connection** específica
