# Deploying the UI to Cloudflare Pages

End-to-end UI deploy. Pairs with the backend on Fly.io
(`ritualworks-platform/deploy/fly/`).

## TL;DR

```bash
deploy/cloudflare/up.sh
```

Idempotent — re-run safely. Runs the wizard: tools, auth, prompts for
project name + BFF URL, creates the Pages project, builds, deploys, and
wires GitHub Actions secrets so every push to `main` auto-deploys.

## What runs where

| Layer | Host | URL |
|---|---|---|
| UI (this repo) | Cloudflare Pages | `https://ritualworks.pages.dev` |
| BFF (ritualworks-platform) | Fly.io | `https://ritualworks-bffweb.fly.dev` |
| Backend services | Fly.io (private flycast) | `http://ritualworks-<svc>.flycast:8080` |

The UI bundle inlines `PUBLIC_API_URL` at build time (Astro's `PUBLIC_`
prefix). Browsers call the BFF directly; SignalR also negotiates against
the BFF. The BFF's CORS allowlist already includes
`https://ritualworks.pages.dev` and `https://portfolio-showcase.pages.dev`
by default — see `ritualworks-platform/src/BffWeb/BffWeb.Api/Program.cs`.

## Prerequisites

1. **Node 20+ and `npm`.**
2. **A Cloudflare account.** Free plan is fine for static-site hosting.
3. **macOS or Linux with `brew`** — the wizard installs `gh` if missing.
4. **The BFF deployed on Fly.** The wizard defaults `PUBLIC_API_URL` to
   `https://ritualworks-bffweb.fly.dev`; override if your BFF lives
   elsewhere.

## What `up.sh` does

1. **Tools** — installs `gh` if missing (asks first). `wrangler` runs
   via `npx`; npm install runs once if `node_modules/` is empty.
2. **Auth** — `gh auth login` and `wrangler login` if not already
   authenticated. Both browser-based.
3. **Config** — copies `.env.example` to `.env.local`, defaults the
   project name to `ritualworks` and the API URL to the canonical Fly
   BFF URL. Edit the file before running to override.
4. **Project** — creates the Cloudflare Pages project if missing.
5. **First deploy** — `npm run build` with `PUBLIC_API_URL` inlined,
   then `wrangler pages deploy dist`.
6. **GitHub secrets** — auto-detects Cloudflare Account ID via
   `wrangler whoami` and sets it as `CLOUDFLARE_ACCOUNT_ID`. Sets
   `PUBLIC_API_URL` from the local config. Walks you through generating
   a Cloudflare API token via the dashboard (the Cloudflare API doesn't
   create deploy tokens itself) and pipes it into
   `gh secret set CLOUDFLARE_API_TOKEN` — the token never lands on disk
   or in shell history.
7. **Status** — prints the live URL.

## Subsequent deploys

```bash
git push origin main
```

`.github/workflows/ci.yml` runs build + bundle-budget + Lighthouse; on
green, `.github/workflows/deploy.yml` fires automatically and deploys to
Cloudflare Pages. Manual options:

```bash
# Manual via gh
gh workflow run "Deploy" --repo chidionyema/portfolio-site

# Manual local deploy (skips CI)
PUBLIC_API_URL=https://ritualworks-bffweb.fly.dev npm run build
npx wrangler pages deploy dist --project-name=ritualworks --branch=main
```

## Custom domain

Add the domain to your Pages project in the Cloudflare dashboard, then
update `ritualworks-platform`:

```bash
# In ritualworks-platform/deploy/fly/.env.local:
PORTFOLIO_SITE_URL=https://your-custom-domain.com

# Re-run the BFF wizard so CORS picks it up
deploy/fly/up.sh
```

The BFF will redeploy with the custom domain in its CORS allowlist.

## Rotating the Cloudflare API token

```bash
FORCE_ROTATE_TOKEN=1 deploy/cloudflare/up.sh
```

The wizard walks you through creating a new token in the dashboard and
pipes it directly into `gh secret set`.

## Troubleshooting

**Build fails with 401 from Cloudflare on deploy.** API token expired or
its permissions were tightened. Rotate via `FORCE_ROTATE_TOKEN=1`.

**UI loads but API calls fail with CORS errors.** The BFF's CORS
allowlist doesn't include this UI's origin. Check
`ritualworks-platform/src/BffWeb/BffWeb.Api/Program.cs:62-92`. Default
list covers `*.pages.dev`; custom domains need `PORTFOLIO_SITE_URL` set
in the Fly bootstrap (see "Custom domain" above).

**SignalR negotiate gets a 403.** Same root cause as CORS — the
`/hubs/*` endpoints share the BFF's CORS policy. Once CORS is fixed,
SignalR works.

**`PUBLIC_API_URL` showing localhost in production.** The build env var
wasn't set during the GH Actions run. Verify:
`gh secret list --repo chidionyema/portfolio-site | grep PUBLIC_API_URL`.

## Files in this directory

```
.env.example       — template for .env.local
.env.local         — your filled-in config (gitignored)
up.sh              — the wizard
README.md          — this file
```
