# Development Guide

## Prerequisites

- Node.js 20+
- PostgreSQL (provided by Replit's built-in DB)

## Setup

```bash
npm install
npm run db:push      # Apply database schema
npm run dev          # Start dev server (frontend + backend)
```

The app runs at the Replit preview URL. The backend Express server runs on port 5000; Vite proxies API calls from the frontend.

## Key Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Express + Vite dev server |
| `npm run build` | Build frontend (Vite) + backend (esbuild) |
| `npm run start` | Run production build |
| `npm run check` | TypeScript type-check only |
| `npm run db:push` | Push Drizzle schema to DB (never write raw SQL) |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (set by Replit) |

## Project Structure

```
client/src/
  components/       React UI components (organized by feature)
  domain/           Domain-driven stores (credits, inventory)
  engine/           Babylon.js rendering abstraction layer
  hooks/            Custom React hooks
  lib/
    stores/         Zustand state stores
    terrain/        Procedural terrain generation
    utils/          Helpers and utilities
  providers/        React context providers
  services/         API clients and cloud sync
server/
  routes.ts         REST API endpoints
  services/         Backend services
shared/
  schema.ts         Drizzle database schema
```

## URL Parameters

| Parameter | Effect |
|-----------|--------|
| `?babylon=true` | Open the Babylon.js test/debug page |

## Dev Console Commands (browser console, DEV mode only)

| Command | Description |
|---------|-------------|
| `window.testNotifications()` | Trigger all toast notification types |
| `window.memoryProfile()` | Print GPU/memory status |
| `window.forceCleanup()` | Force resource cleanup |
| `window.showMemoryTrend()` | Display memory usage over time |
| `window.exportMemoryData()` | Export profiling data |
| `window.resetMemoryProfiler()` | Reset the profiler |

## Debug Logging

Logs are gated by the `debug.ts` utility. To enable verbose logging in the browser:

```js
window.setVerboseMode(true)      // All categories
window.setDebugCategory('babylon', true)  // Specific category
```

## Troubleshooting

**Black screen / no 3D**: WebGL2 is required. Check your browser supports it at `get.webgl.org`. If the engine crashes, the `EngineErrorBoundary` shows a "Try Again" button.

**Mobile layout on desktop**: The app auto-detects viewport width < 768px as mobile. Resize the browser window to trigger desktop mode.

**Database issues**: Run `npm run db:push` after any schema changes to `shared/schema.ts`.
