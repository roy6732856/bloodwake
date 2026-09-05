# Cloudflare Workers + D1

## First deployment

Install Node.js 22 or later (including npm), then run in the project directory:

```sh
npm ci
npx wrangler login --scopes account:read user:read workers:write workers_scripts:write d1:write
npm run cloud:setup
npm run deploy
```

Select the intended Cloudflare account in the official authorization page. If more than one account is authorized, set `CLOUDFLARE_ACCOUNT_ID` in your shell to the intended account ID before setup/deploy. Do not put an API token in source code.

Setup creates or reuses `bloodwake-saves` (Asia Pacific location hint), writes the actual D1 UUID into the ignored `wrangler.deploy.json`, and applies the migration. It never deploys with the all-zero local database ID. Deploy publishes the `bloodwake` Worker and prints its `workers.dev` URL. Use a dedicated Worker name if that name already belongs to another application in your account.

`wrangler.deploy.json` and `.wrangler/` are intentionally excluded from Git. Recreate the deploy config by running setup when moving development machines. Login credentials remain in Wrangler's local credential storage, outside this repository.

Subsequent code updates: `npm run deploy`. For a new SQL migration, run `npm run cloud:setup` first. Migrations are additive; the initial migration does not delete data. D1 backups/Time Travel are administered from Cloudflare.

## Local validation

```sh
npm run dev:cloud
# In another terminal:
npm test
npm run test:cloud
```

This serves the production asset bundle and real local D1 at `http://127.0.0.1:8787`. The cloud integration suite intentionally only targets localhost; it does not touch production records. `node server.mjs` still runs the game without Wrangler at port 4173, with file import/export and local saves.

## Free resources

As checked against Cloudflare documentation on 2026-09-05:

| Resource | Workers Free included allowance |
|---|---|
| Static asset requests/storage | Free, unlimited asset requests |
| Worker API requests | 100,000 per day; 10 ms CPU per request |
| D1 | 5 million rows read/day, 100,000 rows written/day, 5 GB total storage |

Sources: [static asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [Worker limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).

Only `/api/*` invokes the Worker before asset lookup; game JS, images, and Three.js are served directly by Static Assets. Each player has one D1 row looked up by its primary key. Saves happen at settlement or purchases, not per frame. No paid add-on is required by this project. These quotas are shared with other apps in the account, and existing account plan choices still apply. On the Free plan, reaching a quota can temporarily stop cloud sync; local progress is retained. This setup does not change your account's billing plan.

## Save API

- `GET /api/health`: availability flag; no player information.
- `GET /api/save`: read the authenticated player's snapshot.
- `PUT /api/save`: `{version, requestId, save}`. Version 0 creates; subsequent versions compare-and-swap. Stale writes return 409 with the current snapshot. A retry with the same request ID returns the already-saved revision.
- Authorization is a 256-bit random recovery code supplied as a Bearer header; D1 stores only its SHA-256 hash. Responses are never cached. Writes require a matching Origin, JSON content type, a validated bounded snapshot and a body of at most 4 KB. No CORS access is enabled.

The game is a client-simulated single-player prototype: saves are private but scores and currency are not server-authoritative. It does not publish a competitive leaderboard. A public launch can still attract automated API use; monitor usage in the Cloudflare dashboard. Account, moderation, anti-cheat and multiplayer systems are separate future features.

The production `dist/` contains only `index.html`, `src/`, `vendor/`, `assets/`, and security headers. Tests, `.git`, SQL, config, local D1 data and credentials are not served. All static game assets remain usable if the save API is temporarily unavailable.
