# IDP Portal

Internal Developer Platform portal — a modern, self-service interface for managing services, deployments, environments, and infrastructure costs.

## Tech Stack

- **React 18** — UI framework with hooks and Suspense
- **TypeScript** — Type-safe development
- **Vite** — Fast build tooling and HMR
- **Material UI (MUI) v5** — Component library with custom dark theme
- **React Router v6** — Client-side routing with lazy loading
- **Inter** — Primary typeface

## Getting Started

### With Docker (recommended)

```bash
docker compose up portal
```

### Local Development

```bash
# From the monorepo root
pnpm install
pnpm --filter @idp/portal dev
```

The portal runs at `http://localhost:5173` by default.

## Project Structure

```
apps/portal/
├── src/
│   ├── api/              # API client and request utilities
│   ├── auth/             # Authentication provider, login page, protected routes
│   ├── components/       # Shared UI components (skeletons, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── layout/           # AppLayout with sidebar and top bar
│   ├── plugins/          # Feature pages (plugin-based architecture)
│   │   ├── catalog/      # Service catalog browser
│   │   ├── cost/         # Cost analysis dashboard
│   │   ├── dashboard/    # Main overview dashboard
│   │   ├── deployments/  # Deployment management
│   │   ├── environments/ # Environment provisioning & management
│   │   ├── health/       # Platform health monitoring
│   │   └── settings/     # User settings (profile, notifications, API keys)
│   ├── types/            # Shared TypeScript types
│   ├── App.tsx           # Root component with theme and routing
│   └── main.tsx          # Entry point
├── public/               # Static assets
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
└── package.json
```

## Available Pages

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard | Platform overview with key metrics |
| `/catalog` | Service Catalog | Browse and manage registered services |
| `/deployments` | Deployments | Track and manage deployments |
| `/environments` | Environments | Provision and manage environments |
| `/health` | Health Monitor | Service health, SLOs, and incidents |
| `/cost` | Cost Analysis | Spending breakdown and optimization |
| `/settings` | Settings | Profile, notifications, API keys, appearance |

## Design System

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Background (page) | `#0d1117` | Main page background |
| Background (card) | `#161b22` | Card and panel surfaces |
| Background (hover) | `#1c2128` | Hover states |
| Text (body) | `#c9d1d9` | Primary body text |
| Text (heading) | `#ffffff` | Headings and emphasis |
| Text (secondary) | `#8b949e` | Captions and labels |
| Primary | `#6C63FF` | Actions, links, active states |
| Success | `#3fb950` | Healthy, passing, positive |
| Warning | `#d29922` | Degraded, expiring, caution |
| Error | `#f85149` | Down, failed, critical |
| Border | `rgba(255,255,255,0.06)` | Subtle dividers |

### Typography

- **Font**: Inter (fallback: Roboto, Helvetica, Arial)
- **Headings**: 700 weight, tight letter-spacing
- **Body**: 400–500 weight, 1.6 line-height

### Spacing & Radius

- Card border radius: `12px`
- Button border radius: `8px`
- Standard spacing unit: `8px` (MUI default)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3001` |
| `VITE_AUTH_DOMAIN` | Auth provider domain | — |

## Scripts

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm typecheck    # Run TypeScript checks
pnpm lint         # Run ESLint
```
