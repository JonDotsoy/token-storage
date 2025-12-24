# Token Storage

Token Storage es un sistema de gestión de tokens OAuth 2.0 que proporciona almacenamiento, renovación automática y gestión del ciclo de vida de credenciales OAuth. Diseñado para facilitar la integración con proveedores OAuth tanto en aplicaciones frontend como backend, mantiene los tokens actualizados de forma transparente y soporta múltiples backends de almacenamiento (memoria, DuckDB, PostgreSQL, IndexedDB) y arquitecturas distribuidas mediante HTTP JSON-RPC.

## Documentación

- [Quick Start](./quick-start.md) - Comienza en menos de 5 minutos
- [Fundamentals](./fundamentals/overview.md) - OAuthClient, Connection y Credential
- [Data Sources](./data-sources/overview.md) - Memory, IndexedDB, DuckDB, PostgreSQL, HTTP
- [Transports](./transports/overview.md) - HTTP JSON-RPC
- [Customize](./customize/overview.md) - Extiende Token Storage con data sources personalizados
