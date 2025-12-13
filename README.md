# Tokens - OAuth Token Management Service

Servicio para gestionar clientes OAuth, conexiones y tokens de autorización.

## Instalación

```bash
bun install
```

## Ejecución

```bash
bun run src/serve.ts
```

## API Endpoints

### Health & Stats

#### `GET /health`
Verifica el estado del servicio.

**Response:**
```json
{
  "status": "ok"
}
```

#### `GET /stats`
Obtiene estadísticas del servicio (clientes OAuth, conexiones y autorizaciones).

**Response:**
```json
{
  "oauth_clients": 5,
  "connections": 10,
  "authorizations": 25
}
```

---

### OAuth Clients

#### `PUT /oauth_clients/:client_id`
Crea o actualiza un cliente OAuth.

**Body:**
```json
{
  "client_id": "string",
  "project_id": "string",
  "auth_uri": "string",
  "token_uri": "string",
  "auth_provider_x509_cert_url": "string",
  "client_secret": "string"
}
```

**Response:**
```json
{
  "success": true
}
```

#### `GET /oauth_clients/:client_id`
Obtiene un cliente OAuth por ID.

**Response:**
```json
{
  "oauth_client_id": "string",
  "client_id": "string",
  "project_id": "string",
  "auth_uri": "string",
  "token_uri": "string",
  "auth_provider_x509_cert_url": "string",
  "client_secret": "string"
}
```

#### `DELETE /oauth_clients/:client_id`
Elimina un cliente OAuth.

**Response:**
```json
{
  "success": true
}
```

#### `GET /oauth_clients`
Lista todos los clientes OAuth.

**Response:**
```json
[
  {
    "oauth_client_id": "string",
    "client_id": "string",
    "project_id": "string",
    "auth_uri": "string",
    "token_uri": "string",
    "auth_provider_x509_cert_url": "string",
    "client_secret": "string"
  }
]
```

---

### Connections

#### `PUT /connections/:connection_id`
Crea o actualiza una conexión.

**Body:**
```json
{
  "client_id": "string",
  "scope": ["scope1", "scope2"]
}
```

**Response:**
```json
{
  "success": true
}
```

#### `GET /connections/:connection_id`
Obtiene una conexión por ID.

**Response:**
```json
{
  "connection_id": "string",
  "client_id": "string",
  "scope": ["scope1", "scope2"]
}
```

#### `DELETE /connections/:connection_id`
Elimina una conexión.

**Response:**
```json
{
  "success": true
}
```

#### `GET /connections`
Lista todas las conexiones.

**Response:**
```json
[
  {
    "connection_id": "string",
    "client_id": "string",
    "scope": ["scope1", "scope2"]
  }
]
```

---

### Authorization Flow

#### `GET /connections/:connection_id/auth_url`
Genera la URL de autorización OAuth.

**Query Parameters:**
- `redirect_url` (opcional): URL de redirección después de la autorización

**Response:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=...&response_type=code&scope=...&access_type=offline&state=..."
}
```

#### `POST /connections/:connection_id/exchange`
Intercambia el código de autorización por un token de acceso.

**Query Parameters:**
- `code` (requerido): Código de autorización recibido del proveedor OAuth
- `redirect_uri` (requerido): URI de redirección usado en la autorización

**Response:**
```json
{
  "authorization_id": "uuid",
  "token": {
    "access_token": "string",
    "expires_in": 3600,
    "refresh_token": "string",
    "scope": "scope1 scope2",
    "token_type": "Bearer",
    "id_token": "string"
  }
}
```

#### `GET /authorizations/:authorization_id/token`
Obtiene un token de autorización guardado.

**Response:**
```json
{
  "access_token": "string",
  "expires_in": 3600,
  "refresh_token": "string",
  "scope": "scope1 scope2",
  "token_type": "Bearer",
  "id_token": "string"
}
```

#### `GET /connections/:connection_id/tokens`
Lista todos los tokens asociados a una conexión.

**Response:**
```json
{
  "items": [
    {
      "authorization_id": "uuid",
      "access_token": "string",
      "expires_in": 3600,
      "refresh_token": "string",
      "scope": "scope1 scope2",
      "token_type": "Bearer",
      "id_token": "string"
    }
  ]
}
```

---

## CORS

El servicio soporta CORS configurable mediante variables de entorno. Ver `src/config.ts` para más detalles.

---

## Tecnologías

- [Bun](https://bun.com) - Runtime JavaScript
- [Artur](https://github.com/alexalannunes/artur) - Router HTTP
- [Zod](https://zod.dev) - Validación de schemas
- SQLite - Base de datos
