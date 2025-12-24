# TokenStorage

TokenStorage is an OAuth 2.0 token management system that provides storage, automatic renewal, and lifecycle management of OAuth credentials. Designed to facilitate integration with OAuth providers in both frontend and backend applications, it keeps tokens up-to-date transparently and supports multiple storage backends (memory, DuckDB, PostgreSQL) and distributed architectures via HTTP JSON-RPC.

## Installation

```bash
npm add @jondotsoy/token-storage
```

Or with your preferred package manager:

```bash
# yarn
yarn add @jondotsoy/token-storage

# pnpm
pnpm add @jondotsoy/token-storage

# bun
bun add @jondotsoy/token-storage
```

For more details, check out the [quick start guide](./docs/quick-start.md).

## Documentation

- [Quick Start](./docs/quick-start.md) - Get started in less than 5 minutes
- [Overview](./docs/overview.md) - System architecture and components
- [Data Sources](./docs/data-sources/overview.md) - Storage backend comparison
- [Transports](./docs/transports/overview.md) - Communication protocols

## Example

This example shows how to run an in-memory TokenStorage to manage OAuth tokens quickly and easily. In-memory storage is ideal for development, testing, and applications that don't require persistence between restarts.

```typescript
import { TokenStorage } from "@jondotsoy/token-storage";

async function main() {
  // Create instance with in-memory storage (default)
  const storage = new TokenStorage();

  // Register an OAuth client
  await storage.putOAuthClient("google-client", {
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    project_id: "my-project",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    created_at: new Date().toISOString(),
  });

  // Create a connection with specific scopes
  await storage.putConnection("google-drive", {
    oauth_client_id: "google-client",
    scope: ["https://www.googleapis.com/auth/drive.readonly"],
    created_at: new Date().toISOString(),
  });

  // Get authorization URL
  const authUrl = await storage.getAuthURL(
    "google-drive",
    "http://localhost:3000/callback",
  );

  console.log("Authorize your application at:", authUrl);

  // After user authorizes, exchange the code for tokens
  // const { credential_id } = await storage.exchangeCode(
  //   "google-drive",
  //   "http://localhost:3000/callback",
  //   code
  // );

  // Get token (automatically renewed if expired)
  // const token = await storage.getToken(credential_id);

  // Use the token in API requests
  // fetch("https://www.googleapis.com/drive/v3/files", {
  //   headers: {
  //     Authorization: `Bearer ${token.access_token}`,
  //   },
  // });
}

main();
```

### Key Features

✅ **Automatic renewal** - Tokens are automatically renewed when they expire  
✅ **Multiple backends** - Memory, DuckDB, PostgreSQL, HTTP  
✅ **Distributed architecture** - Supports remote storage via JSON-RPC  
✅ **Type-safe** - Fully typed with TypeScript  
✅ **Easy to use** - Simple and intuitive API

## License

TokenStorage is released under the MIT License. See [LICENSE](./LICENSE) for details.
