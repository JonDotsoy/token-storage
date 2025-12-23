# Guía de Contribución

## Tecnologías Utilizadas

- **TypeScript**: Lenguaje principal
- **Bun**: Runtime y gestor de paquetes
- **Zod**: Validación de esquemas
- **ULID**: Generación de identificadores únicos
- **Temporal Polyfill**: Manejo de fechas y tiempos
- **DuckDB**: Base de datos embebida (opcional)

## Patrones de Diseño

1. **Facade Pattern**: `TokenStorage` actúa como fachada del sistema
2. **Strategy Pattern**: Diferentes implementaciones de `StorageInstance`
3. **Repository Pattern**: Separación entre lógica de negocio y persistencia
4. **Async Iterator Pattern**: Para iterar sobre colecciones de forma eficiente
