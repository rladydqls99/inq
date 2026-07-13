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

Create a local `.env` from `.env.example`. Set a long random `SESSION_SECRET`
and a non-empty `INITIAL_PIN`; production startup rejects missing values.

```bash
cp .env.example .env
# Generate a value, then paste it into SESSION_SECRET in .env.
openssl rand -base64 48
pnpm docker:build
pnpm docker:up
```

Open `http://localhost:8080` unless `NGINX_PORT` is changed. The port is bound
to `127.0.0.1`, so it is not exposed directly to the public network.

The API container runs Prisma migrations before starting the API. SQLite data is
stored in the named Docker volume `inq-sqlite`.

## VPS Domain Deployment

The app Nginx container serves the built SPA and proxies `/api` to the API
container. A Caddy edge container handles public ports, automatic HTTPS, and
certificate renewal.

1. Point the domain's `A` record (and `AAAA` when IPv6 is configured) to the VPS.
2. Allow inbound TCP ports `80` and `443`; allow UDP `443` for HTTP/3.
3. Create `.env` from `.env.example` and set at least:

   ```dotenv
   DOMAIN=quiz.example.com
   SESSION_SECRET=replace-with-the-generated-random-value
   INITIAL_PIN=replace-with-your-pin
   ```

4. Build and start the public stack:

   ```bash
   pnpm docker:deploy:build
   pnpm docker:deploy:up
   ```

5. Verify the deployment:

   ```bash
   curl --fail https://quiz.example.com/api/health
   docker compose -f deploy/docker-compose.prod.yml \
     -f deploy/docker-compose.edge.yml ps
   ```

Use `pnpm docker:deploy:down` to stop the public stack. The `caddy-data` volume
must be preserved so Caddy can retain certificate state.

`INITIAL_PIN` initializes only an empty database. After the first start, change
the PIN inside the app; editing `.env` does not replace a PIN already stored in
the SQLite volume.

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
