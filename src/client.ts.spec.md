# src/client.ts

## API Syntax

```ts

const client = new Client()
const client = new Client({ baseUrl: "http://localhost" })

client.baseUrl("http://localhost")

// PUT /oauth_clients/{{client_id}}
await client.putOAuthClient("{{client_id}}", {
    project_id: "....",
    auth_uri: "....",
    token_uri: "....",
    auth_provider_x509_cert_url: "....",
    client_secret: "....",
})

// GET /oauth_clients/{{client_id}}
const clientSecret = await client.getOAuthClient("{{client_id}}");
// {
//     project_id: "....",
//     auth_uri: "....",
//     token_uri: "....",
//     auth_provider_x509_cert_url: "....",
//     client_secret: "....",
// }

// DELETE /oauth_clients/{{client_id}}
await client.deleteOAuthClient("{{client_id}}");

// GET /oauth_clients
const clients = await client.getOAuthClients();
// {
//   next_cursor: "...",
//   items: [
//     {
//       "client_id": "....",
//       "project_id": "....",
//       "auth_uri": "....",
//       "token_uri": "....",
//       "auth_provider_x509_cert_url": "....",
//       "client_secret": "...."
//     },
//     ...
//   ]
// }

// PUT /connections/{{connection_id}}
await client.putConnection("{{connection_id}}", {
    client_id: "{{client_id}}",
    scope: [
        "{{scope_1}}",
        "{{scope_2}}",
        ...
    ],
})

// GET /connections/{{connection_id}}
const connection = await client.getConnection("{{connection_id}}");
// {
//     client_id: "{{client_id}}",
//     scope: [
//         "{{scope_1}}",
//         "{{scope_2}}",
//         ...
//     ],
// }

// DELETE /connections/{{connection_id}}
await client.deleteConnection("{{connection_id}}");

// GET /connections
const connections = await client.getConnections();
// {
//   next_cursor: "...",
//   items: [
//     {
//       client_id: "{{client_id}}",
//       scope: [
//         "{{scope_1}}",
//         "{{scope_2}}",
//         ...
//       ],
//     },
//     ...
//   ]
// }

// GET /connections/{{connection_id}}/auth_url
const authUrl = await client.getAuthUrl("{{connection_id}}");
// Client set the redirect_url

// POST /authorizations/{{authorization_id}}/exchange?code={{code}}
const token = await client.exchangeCode("{{authorization_id}}", "{{code}}");
// {
//   access_token: "....",
//   expires_in: 3600,
//   token_type: "Bearer",
//   scope: "...."
// }

// GET /authorizations/{{authorization_id}}/token
const token = await client.getToken("{{authorization_id}}");
// {
//   access_token: "....",
//   expires_in: 3600,
//   token_type: "Bearer",
//   scope: "...."
// }


```

## Models

```ts
interface OAuthClient {
  client_id: string;
  project_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_secret: string;
}

interface OAuthClientInput {
  project_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_secret: string;
}

interface Connection {
  connection_id: string;
  client_id: string;
  scope: string[];
}

interface ConnectionInput {
  client_id: string;
  scope: string[];
}

interface Token {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface PaginatedResponse<T> {
  next_cursor?: string;
  items: T[];
}
```

## Routers (router.ts)

- PUT /oauth_clients/{{client_id}} body: OAuthClientInput
- GET /oauth_clients/{{client_id}} -> OAuthClient
- DELETE /oauth_clients/{{client_id}} -> void
- GET /oauth_clients -> PaginatedResponse<OAuthClient>
- PUT /connections/{{connection_id}} body: ConnectionInput
- GET /connections/{{connection_id}} -> Connection
- DELETE /connections/{{connection_id}} -> void
- GET /connections -> PaginatedResponse<Connection>
- GET /connections/{{connection_id}}/auth_url -> { auth_url: string }
- POST /authorizations/{{authorization_id}}/exchange?code={{code}} -> Token
- GET /authorizations/{{authorization_id}}/token -> Token
