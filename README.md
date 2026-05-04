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

```bash
# Deploy to Cloudflare Pages
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
