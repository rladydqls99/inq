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

## VPS Domain Deployment

The app Nginx container serves the built SPA and proxies `/api` to the API
container. Caddy serves the public domain and obtains HTTPS certificates
automatically.

1. Point the domain's `A` record (and `AAAA` when IPv6 is configured) to the VPS.
2. Create `.env` from `.env.example` and set at least:

   ```dotenv
   DOMAIN=quiz.example.com
   SESSION_SECRET=replace-with-the-generated-random-value
   INITIAL_PIN=replace-with-your-pin
   SONIOX_API_KEY=replace-with-your-soniox-api-key
   ```

3. Build and start the public stack:

   ```bash
   pnpm docker:deploy:build
   pnpm docker:deploy:up
   ```

4. Verify the deployment:

   ```bash
   curl --fail https://quiz.example.com/api/health
   docker compose -f deploy/docker-compose.prod.yml ps
   ```

The API container runs Prisma migrations before starting. SQLite data is stored
in the named Docker volume `inq-sqlite`. Preserve that volume when stopping the
stack:

```bash
pnpm docker:deploy:down
```

`INITIAL_PIN` initializes only an empty database. After the first start, change
the PIN inside the app; editing `.env` does not replace a PIN already stored in
the SQLite volume.

## Persistence Check

1. Start the stack with `pnpm docker:deploy:up`.
2. Create a PIN, then create a deck from the mobile deck screen or desktop upload
   flow.
3. Stop the stack with `pnpm docker:deploy:down`.
4. Start it again with `pnpm docker:deploy:up`.
5. Confirm the deck still exists.

To remove the persisted SQLite volume intentionally:

```bash
pnpm docker:deploy:down -- --volumes
```
