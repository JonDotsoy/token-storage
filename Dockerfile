FROM oven/bun:1.3.4 AS base

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

RUN bun build /usr/src/app/src/serve.ts

# RELEASE
FROM base
COPY --from=install /temp/prod /usr/src/app
COPY src /usr/src/app/src

EXPOSE 5454

ENV NODE_ENV=production
ENV PORT=5454
ENV HOST=0.0.0.0
ENV CORS_ORIGIN=*
ENV DB_PATH=/data/db.duckdb
ENV CORS_ORIGIN=*

# RUN mkdir /data
VOLUME ["/data"]

CMD [ "bun", "run", "src/serve.ts" ]
