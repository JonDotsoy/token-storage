FROM oven/bun:1.3.5 AS base

WORKDIR /usr/src/app

FROM base AS install

RUN mkdir -p /temp/dev
WORKDIR /temp/dev

COPY package.json bun.lock /temp/dev/

RUN bun install --frozen-lockfile

WORKDIR /temp/prod

COPY package.json bun.lock /temp/prod/

RUN bun install --frozen-lockfile --production

# Test
FROM base AS testing
COPY --from=install /temp/dev /usr/src/app
COPY src /usr/src/app/src

ENV NODE_ENV=test

RUN bun test

# Build
FROM base AS build
COPY --from=install /temp/dev /usr/src/app
COPY src /usr/src/app/src

RUN bun build --target bun --external @duckdb/node-api /usr/src/app/src/serve.ts --outfile /usr/src/app/tokens-serve.ts

# RELEASE
FROM oven/bun:1.3.5-alpine

WORKDIR /usr/src/app

RUN bun install --production @duckdb/node-api

COPY --from=build /usr/src/app/tokens-serve.ts /usr/src/app/src/serve.ts
COPY --from=build /usr/src/app/src/healthcheck.ts /usr/src/app/src/healthcheck.ts

EXPOSE 5454

ENV NODE_ENV=production
ENV PORT=5454
ENV HOST=0.0.0.0
ENV CORS_ORIGIN=*
ENV DB_URI=
ENV TOKENSTORAGE_TELEMETRY_DISABLED=true

HEALTHCHECK --interval=5m --timeout=3s \
  CMD bun src/healthcheck.ts

CMD [ "bun", "run", "src/serve.ts" ]
