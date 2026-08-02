# Repository Structure

The repository has six visible top-level directories. Framework configuration,
workspace manifests and operator entry points stay in the root; implementation
files do not.

| Directory | Responsibility |
|---|---|
| `src/` | Next.js application, reusable UI, server actions, domain code, i18n and application types |
| `packages/` | Independently testable shared workspace packages |
| `platform/` | Agents, workers, infrastructure, deployment assets, governance and encrypted secret assets |
| `tooling/` | Build, migration, pipeline and maintenance scripts plus unit, integration and E2E tests |
| `docs/` | Product, architecture, ADR, runbook and audit documentation |
| `public/` | Static web assets served unchanged |

## Source boundaries

```text
src/
├── app/          # Next.js routes, layouts, route handlers and route-local UI only
├── actions/      # Cross-route server actions
├── components/   # Shared React components
├── config/       # Application-owned, non-secret configuration
├── i18n/         # Locale routing and request configuration
├── lib/          # Domain services, integrations and persistence adapters
├── messages/     # Translation catalogs
└── types/        # Shared application types
```

`src/app` is a routing tree, not a general source bucket. Shared components,
services and actions must never be reintroduced below it.

## Platform boundaries

```text
platform/
├── agents/       # A2A implementations and registry
├── deploy/       # launchd and deployment wrappers
├── governance/   # Project SSOT configuration
├── infra/        # Versioned database and infrastructure definitions
├── secrets/      # Encrypted secret material only
└── workers/      # Deployable worker workspaces
```

Database schema changes have one authority: `platform/infra/supabase/migrations`.
Operational SQL helpers in `tooling/scripts/supabase` must not become a second
migration source of truth.

## Tooling boundaries

All executable repository automation lives below `tooling/scripts`; all tests
live below `tooling/tests`. Product runtime code must not import from `tooling`.
Maintenance probes and screenshots belong in `tooling/scripts/maintenance`, not
in the root.

## Enforcement

Run `pnpm check:structure`. CI rejects additional visible root directories,
legacy root directories, shared code below `src/app`, and generated state files
in the root. Any deliberate topology change requires updating this document and
`tooling/scripts/check-repository-structure.mjs` in the same change.
