# Docker

## Docker Hub Repository

[jondotsoy/token-storage](https://hub.docker.com/repository/docker/jondotsoy/token-storage/general)

## Quick Start

Pull the latest version:

```bash
docker pull jondotsoy/token-storage:latest
```

Run the container:

```bash
docker run -p 5454:5454 jondotsoy/token-storage:latest
```

## Environment Variables

- `PORT` - Server port (default: `5454`)
- `HOST` - Server hostname (default: `0.0.0.0`)
- `DB_URI` - Database URI connection string (default: `null`)

## Supported Database URIs

The `DB_URI` environment variable accepts the following URI formats:

### PostgreSQL

```bash
DB_URI=postgresql://user:password@host:5432/database
```

Connect to a PostgreSQL database server.

### HTTP/HTTPS

```bash
DB_URI=http://localhost:5454/rpc
DB_URI=https://api.example.com/rpc
```

Connect to a remote Token Storage server via JSON-RPC 2.0.

### Memory (default)

If `DB_URI` is not set or is `null`, the server will use in-memory storage (non-persistent).

## Example with Custom Configuration

### Using PostgreSQL

```bash
docker run -p 5454:5454 \
  -e DB_URI=postgresql://user:password@postgres:5432/tokens \
  jondotsoy/token-storage:latest
```

### Using Remote Token Storage

```bash
docker run -p 5454:5454 \
  -e DB_URI=https://tokens.example.com/rpc \
  jondotsoy/token-storage:latest
```

### Custom Port

```bash
docker run -p 8080:8080 \
  -e PORT=8080 \
  jondotsoy/token-storage:latest
```
