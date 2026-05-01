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

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

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

```bash
# API endpoint for live demos
PUBLIC_API_URL=https://api.chidionyema.dev
```
