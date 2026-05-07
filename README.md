# Portfolio Showcase

A world-class portfolio site showcasing distributed systems expertise with live, interactive demos.

## Features

- **Live Checkout Demo** - Real order flow with event streaming
- **Event Flow Visualization** - Saga patterns and transactional outbox
- **Circuit Breaker Demo** - Interactive resilience patterns
- **Vault Rotation Demo** - Zero-downtime credential rotation
- **Architecture Explorer** - Interactive system diagrams

## Tech Stack

- **Framework**: Astro 4 with React islands
- **Styling**: TailwindCSS
- **Animation**: Framer Motion
- **Real-time**: SignalR
- **Deployment**: Cloudflare Pages

## Development

```bash
# Install dependencies
npm install

# Start dev server (Astro on http://localhost:4321)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Local dev with the ritualworks backend (Aspire)

The five interactive demos call into the `ritualworks` monolith's
`DemoController` + `DemoHub` SignalR hub. To run them locally:

```bash
# Terminal 1 — bring up the backend (Aspire)
cd ../ritualworks
git checkout feature/ha-portfolio-integration
dotnet run --project src/haworks.AppHost
# API binds to http://localhost:5050 (and https://localhost:5051)
# (Not :5000 — macOS Control Center / AirPlay Receiver squats on it.)
# Wait for "Distributed application started." in the console.

# Terminal 2 — bring up the portfolio site
cd ../portfolio-site
cp .env.example .env.local      # one-time
npm install && npm run dev
# Open http://localhost:4321
```

CORS for `http://localhost:4321` (Astro's default) is allow-listed by the
ritualworks AppHost in dev mode. No auth or API key needed for the demo
endpoints — they're all `[AllowAnonymous]`.

## Deployment

Auto-deploys to Cloudflare Pages via GitHub Actions on every push to `main`,
gated on CI passing. Mirrors the backend's Fly auto-deploy pattern (see
`ritualworks-platform/.github/workflows/deploy.yml`).

### One-time setup

1. Create the Cloudflare Pages project (any machine with `wrangler` logged
   in to your Cloudflare account):

   ```bash
   npx wrangler login
   npx wrangler pages project create chidionyema-dev --production-branch main
   ```

2. In **GitHub repo → Settings → Secrets and variables → Actions**:

   **Secrets:**
   - `CLOUDFLARE_API_TOKEN` — create at
     [dash.cloudflare.com → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens),
     template: *Edit Cloudflare Workers* (or custom token with
     `Account → Cloudflare Pages → Edit`).
   - `CLOUDFLARE_ACCOUNT_ID` — copy from any Cloudflare dashboard URL.

   **Variables** (visible in build logs, easy to tweak):
   - `CLOUDFLARE_PAGES_PROJECT` — `chidionyema-dev` (or whatever you
     named it in step 1).
   - `PUBLIC_API_URL` — production BFF URL, e.g.
     `https://ritualworks-bffweb.fly.dev`.
   - `PUBLIC_SIGNALR_URL` — same host, hub path, e.g.
     `https://ritualworks-bffweb.fly.dev/hubs/demo`.
   - `PUBLIC_CLUSTER_LABEL` — optional; defaults to `production`.

3. In **Cloudflare dashboard → Pages → chidionyema-dev → Custom domains**,
   add `chidionyema.dev` and follow the DNS instructions.

That's it. After this, every merge to `main` triggers CI, and on success
the deploy workflow runs `npm run build` with the production env vars
and pushes the `dist/` to Cloudflare Pages.

### Manual deploy

For one-off emergency or first-deploy from a developer machine:

```bash
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... \
PUBLIC_API_URL=https://ritualworks-bffweb.fly.dev \
PUBLIC_SIGNALR_URL=https://ritualworks-bffweb.fly.dev/hubs/demo \
npm run deploy
```

## Project Structure

```
src/
├── components/
│   ├── ui/           # Base components
│   ├── hero/         # Hero section
│   ├── demo/         # Interactive demos
│   ├── architecture/ # Architecture explorer
│   └── about/        # About section
├── hooks/            # React hooks
├── lib/              # Utilities
├── styles/           # Global styles
├── layouts/          # Page layouts
└── pages/            # Route pages
```

## Environment Variables

See [`.env.example`](./.env.example) for the full contract. Production
defaults are baked into the deploy; local dev overrides via `.env.local`:

```bash
PUBLIC_API_URL=http://localhost:5050        # ritualworks API on Aspire
PUBLIC_SIGNALR_URL=http://localhost:5050/hubs/demo
```
