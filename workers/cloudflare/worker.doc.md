# What does this file do?
Cloudflare Worker storefront stub serving legal pages, proxying API requests, and providing health checks.

## Which other files import / touch it?
- `../config/storefront-legal.mjs` - imported legal constants
- `../../apps/web/dist/` - static files to be served (not yet built)
- `scripts/deploy-cloudflare-worker.sh` - deploys this worker

## Important config values & limits
- `API_BASE_URL`: Backend API endpoint (default: https://api.delqhi.com)
- Health endpoint: `/health` returns `{ok, service, buildDate}`
- Legal pages: `/impressum`, `/datenschutz`, `/agb`, `/widerrufsrecht`

## Why certain decisions were made
- Proxies to Vite dev server (localhost:5173) in local dev mode for HMR support
- Legal pages served directly from shared config to avoid duplication
- Production placeholder until static file serving is implemented

## Usage examples
```bash
# Local development
pnpm dev:storefront

# Production deployment (NOT READY - stub only!)
# pnpm deploy:cloudflare
```

## Known caveats or footguns
- **STUB**: This is a minimal stub, not the full production worker!
- Do NOT deploy to production without implementing static file serving
- The original production worker source was lost and needs to be rebuilt
- Workers Sites configuration is commented out in wrangler.toml
