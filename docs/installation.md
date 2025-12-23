# Instalación

## Requisitos Previos

- Node.js 18+ o Bun 1.0+
- npm, yarn, pnpm o bun como gestor de paquetes

## Instalación del Paquete

### Usando npm

```bash
npm add token-storage
```

### Usando yarn

```bash
yarn add token-storage
```

### Usando pnpm

```bash
pnpm add token-storage
```

### Usando bun

```bash
bun add token-storage
```

## Dependencias Opcionales

### Para usar DuckDB como almacenamiento persistente

Si planeas usar `DuckDBStorageInstance` para almacenamiento persistente, las dependencias necesarias ya están incluidas en el paquete.

## Verificación de la Instalación

Puedes verificar que la instalación fue exitosa creando una instancia básica:

```typescript
import { TokenStorage } from "token-storage";

const storage = new TokenStorage();
console.log("Token Storage instalado correctamente");
```

## Configuración Inicial

### Opción 1: Almacenamiento en Memoria (por defecto)

```typescript
import { TokenStorage } from "token-storage";

const storage = new TokenStorage();
```

### Opción 2: Almacenamiento Persistente con DuckDB

```typescript
import { TokenStorage } from "token-storage";
import { DuckDBStorageInstance } from "token-storage/storage/duckdb-storage";

const storage = new TokenStorage({
  db: new DuckDBStorageInstance({
    database: { path: "./tokens.db" },
  }),
});
```

## Próximos Pasos

Una vez instalado, consulta la [documentación general](./overview.md) para aprender a usar Token Storage en tu aplicación.
