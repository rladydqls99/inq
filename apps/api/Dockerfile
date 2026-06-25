FROM node:22-alpine AS deps

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY . .
RUN pnpm --filter @inq/db prisma generate
RUN pnpm --filter @inq/web build
RUN pnpm --filter @inq/api build

FROM nginx:1.27-alpine AS web

COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

FROM node:22-alpine AS api

RUN apk add --no-cache openssl
RUN corepack enable
WORKDIR /app

ENV NODE_ENV=production
COPY --from=build /app /app

EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @inq/db prisma migrate deploy && pnpm --filter @inq/api start"]
