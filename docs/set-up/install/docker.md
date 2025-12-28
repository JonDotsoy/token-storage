# Run TokenStorage Docker image

Una solución lista para usar con observabilidad integrada. TokenStorage puede conectarse a diferentes datasources como PostgreSQL, HTTP Storage, DuckDB, IndexedDB y Memory Storage.

La imagen oficial está disponible en Docker Hub: [`jondotsoy/token-storage`](https://hub.docker.com/repository/docker/jondotsoy/token-storage/general)

## Corre TokenStorage via Docker CLI

Ejecuta el siguiente comando para iniciar TokenStorage:

```bash
docker run -d -p "5454:5454" --name tokenstorage jondotsoy/token-storage
```

Este comando:

- Ejecuta el contenedor en modo detached (`-d`)
- Mapea el puerto 5454 del host al puerto 5454 del contenedor
- Asigna el nombre `tokenstorage` al contenedor

## Variables de entorno

TokenStorage puede configurarse mediante las siguientes variables de entorno:

### Configuración del servidor

| Variable | Descripción                          | Valor por defecto |
| -------- | ------------------------------------ | ----------------- |
| `PORT`   | Puerto en el que escucha el servidor | `5454`            |
| `HOST`   | Hostname del servidor                | `localhost`       |

### Configuración de base de datos

| Variable | Descripción                        | Valor por defecto    |
| -------- | ---------------------------------- | -------------------- |
| `DB_URI` | URI de conexión a la base de datos | `null` (usa memoria) |

Datasources soportados:

- **PostgreSQL**: `postgresql://user:password@host:port/database`
- **HTTP Storage**: `http://host:port/path` o `https://host:port/path`
- **Memory**: No especificar `DB_URI` (por defecto)

### Configuración de CORS

| Variable      | Descripción                              | Valor por defecto                                   |
| ------------- | ---------------------------------------- | --------------------------------------------------- |
| `CORS_ORIGIN` | Orígenes permitidos (separados por coma) | `*` (todos los orígenes)                            |
| -             | Métodos permitidos                       | `GET, POST, PUT, DELETE, OPTIONS` (no configurable) |
| -             | Headers permitidos                       | `Content-Type, Authorization` (no configurable)     |
| -             | Credentials                              | `true` (no configurable)                            |

### Configuración de métricas

| Variable                      | Descripción                                            | Valor por defecto                        |
| ----------------------------- | ------------------------------------------------------ | ---------------------------------------- |
| `METRICS_ENABLED`             | Habilitar o deshabilitar métricas (`true` o `on`)      | `false`                                  |
| `METRICS_MAX_AGE_SECONDS`     | Tiempo máximo de retención de métricas en segundos     | `600` (10 minutos)                       |
| `METRICS_AGE_BUCKETS`         | Número de buckets de edad para métricas                | `5`                                      |
| `METRICS_SUMMARY_PERCENTILES` | Percentiles para métricas summary (separados por coma) | `P50,P90,P95,P99`                        |
| `METRICS_HISTOGRAM_BUCKETS`   | Buckets para histogramas (separados por coma)          | `10ms,50ms,100ms,200ms,500ms,1s,1.5s,2s` |
| `METRICS_ENABLE_SUMMARY`      | Habilitar métricas tipo summary (`true` o `on`)        | `false`                                  |

### Configuración de telemetría

| Variable                          | Descripción                                             | Valor por defecto                            |
| --------------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| `TOKENSTORAGE_TELEMETRY_DISABLED` | Deshabilitar telemetría (`true`, `on` o `1`)            | `false` (telemetría habilitada)              |
| `TOKENSTORAGE_TELEMETRY_URL`      | URL del servidor de telemetría                          | `https://telemetry.tokenstorage.dev/collect` |
| `TOKENSTORAGE_TELEMETRY_DEBUG`    | Habilitar modo debug de telemetría (`true`, `on` o `1`) | `false`                                      |

### Ejemplo con variables de entorno

```bash
docker run -d \
  -p "5454:5454" \
  -e "PORT=5454" \
  -e "HOST=0.0.0.0" \
  -e "DB_URI=postgresql://user:password@postgres:5432/mydb" \
  -e "CORS_ORIGIN=https://example.com,https://app.example.com" \
  -e "METRICS_ENABLED=true" \
  -e "METRICS_ENABLE_SUMMARY=true" \
  --name tokenstorage \
  jondotsoy/token-storage
```

## Configuración con telemetría (Prometheus y Grafana)

Para una solución completa con observabilidad, puedes usar Docker Compose con Prometheus y Grafana integrados.

### Archivo docker-compose.yml

```yaml
services:
  app:
    image: jondotsoy/token-storage:latest
    ports:
      - 5454:5454
    volumes:
      - ./db:/data
    environment:
      - METRICS_ENABLED=true
      - METRICS_MAX_AGE_SECONDS=10
      - METRICS_AGE_BUCKETS=2
      - METRICS_ENABLE_SUMMARY=true

  prometheus:
    image: prom/prometheus:latest
    depends_on:
      - app
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"

  grafana:
    image: grafana/grafana:latest
    depends_on:
      - prometheus
    ports:
      - "9091:3000"
    volumes:
      - ./grafana.yaml:/etc/grafana/provisioning/datasources/tokensstorage-prometheus.yml
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: true
      GF_AUTH_ANONYMOUS_ORG_ROLE: Admin
      GF_AUTH_DISABLE_LOGIN_FORM: true
```

### Archivo prometheus.yml

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "tokenstorage"
    static_configs:
      - targets: ["app:5454"]
```

### Archivo grafana.yaml

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

### Iniciar el stack completo

```bash
docker-compose up -d
```

Esto iniciará:

- **TokenStorage** en `http://localhost:5454`
- **Prometheus** en `http://localhost:9090`
- **Grafana** en `http://localhost:9091`

### Endpoints disponibles

- `/rpc` - Endpoint JSON-RPC para operaciones de token storage
- `/health` - Health check del servicio
- `/metrics` - Métricas en formato Prometheus

## Persistencia de datos

Para persistir datos, monta un volumen en el contenedor:

```bash
docker run -d \
  -p "5454:5454" \
  -v ./data:/data \
  --name tokenstorage \
  jondotsoy/token-storage
```
