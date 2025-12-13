FROM oven/bun:1.3.4 AS base

WORKDIR /usr/src/app

FROM base as install

RUN mkdir -p /temp/dev
WORKDIR /temp/dev

COPY package.json bun.lock /temp/dev/

RUN bun install --frozen-lockfile

WORKDIR /temp/prod

COPY package.json bun.lock /temp/prod/

RUN bun install --frozen-lockfile --production

# RELEASE
FROM base
COPY --from=install /temp/prod /usr/src/app
COPY src /usr/src/app/src

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

CMD [ "bun", "run", "src/serve.ts" ]
