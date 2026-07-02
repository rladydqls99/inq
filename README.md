# inq

Personal PIN-protected quiz PWA.

## Requirements

- mise
- Node.js 22 and pnpm 10.29.1 from `mise.toml`
- Docker, for production-style Nginx/API deployment

## Local Development

```bash
mise install
pnpm install --frozen-lockfile
pnpm db:generate
DATABASE_URL="file:./dev.db" pnpm db:migrate
pnpm dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- The Vite dev server proxies `/api` to `http://127.0.0.1:3000`.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @inq/web test:e2e
```

## Production-Style Docker Run

Create a local `.env` from `.env.example` and set a long random
`SESSION_SECRET`.

```bash
cp .env.example .env
pnpm docker:build
pnpm docker:up
```

Open `http://localhost:8080` unless `NGINX_PORT` is changed.

The API container runs Prisma migrations before starting the API. SQLite data is
stored in the named Docker volume `inq-sqlite`.

## Persistence Check

1. Start the stack with `pnpm docker:up`.
2. Create a PIN, then create a deck from the mobile deck screen or desktop upload
   flow.
3. Stop the stack with `Ctrl+C`.
4. Start it again with `pnpm docker:up`.
5. Confirm the deck still exists.

To remove the persisted SQLite volume intentionally:

```bash
pnpm docker:down -- --volumes
```
