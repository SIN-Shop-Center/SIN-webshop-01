# NotebookLM Judge Protocol

## Project Identity

- `PROJECT_ROOT=/Users/jeremy/dev/projects/family-projects/simone-webshop-01`
- `PROJECT_NOTEBOOK_ID=8a11c91e-7ca0-4b0a-9fc0-78a5d6cd0f54`
- `PROJECT_NOTEBOOK_URL=https://notebooklm.google.com/notebook/8a11c91e-7ca0-4b0a-9fc0-78a5d6cd0f54`
- `PROJECT_GOOGLE_DOC_ID=1wwA4zgr7GCmS-9fBaEi8NOi3Atd0WjRkK_WQwR9VtLQ`
- `PROJECT_GOOGLE_DOC_TITLE=simone-webshop-01 - SSOT-v2`
- `OPTIONAL_INFO_NOTEBOOK_ID=ab67c7ae-5e83-4316-9587-83ac5fabe396`
- `SSOT=NotebookLM + Master Google Doc`
- `SOURCE_COUNT_REQUIRED=1`

## Hard Rules

1. Query NotebookLM before any architecture or code change and require at least one citation-backed answer.
2. Return `BLOCKED` and stop immediately if citation evidence is missing, NotebookLM access fails, or the notebook is not bound to exactly one source.
3. Treat the NotebookLM notebook and its single Google Doc source as the only authoritative source of truth for governance and design decisions.
4. Protect local project Markdown documentation files. `README.md`, `ARCHITECTURE.md`, `docs/**`, and other project Markdown docs remain in the repo and must never be deleted solely because a Google Doc mirror exists.
5. Treat the project Google Doc as the collaborative SSOT mirror of the local Markdown set and keep repo Markdown plus the Google Doc mirror in sync.
6. After Google Doc documentation updates, sync the Drive source in NotebookLM before relying on citation-backed governance answers.
7. Require explicit human approval before destructive, high-risk, or browser-automation actions.
8. If browser-workflow rules are requested, halt until `<interaction_invariant>` and `<security_gate>` are defined in the Master Google Doc and queryable via NotebookLM.
9. If the source terminology is being revised, keep the NotebookLM wording as the current source state and mark the replacement vocabulary as a draft until the Master Google Doc is updated.

## Mandatory Queries

Run these with `--json` before governed work:

```bash
nlm notebook query "$PROJECT_NOTEBOOK_ID" "Welche <critical_invariant> und <halt_condition> gelten fuer dieses Projekt?" --json
nlm notebook query "$PROJECT_NOTEBOOK_ID" "Welche Verzeichnisstruktur und Dateien muessen initial angelegt werden (Greenpause, no code)?" --json
nlm notebook query "$PROJECT_NOTEBOOK_ID" "Welche Dokumente sind bis Definition of Done Pflicht (README, Architektur, ADR, RFC, Security, SRE, Standards)?" --json
nlm notebook query "$PROJECT_NOTEBOOK_ID" "Welche Regeln muessen in AGENTS.md stehen, damit jeder Coder-Agent immer NotebookLM als Richter nutzt?" --json
nlm notebook query "$PROJECT_NOTEBOOK_ID" "Welche <interaction_invariant> und <security_gate> gelten fuer Browser-Workflows?" --json
```

## Evidence Snapshot

- `2026-03-07 Q1`: Fail-closed governance, citation-first execution, single-source policy, and halt on missing evidence were confirmed from the law notebook.
- `2026-03-07 Q2`: Fail-closed governance and single-source execution were established, but the original local-doc interpretation was later superseded by the 2026-03-19 documentation mirror policy update.
- `2026-03-07 Q3`: README, architecture, security/design, backend, and standards remain required artifacts; the current source model keeps them in local Markdown and mirrors them into the project Google Doc.
- `2026-03-07 Q4`: `AGENTS.md` must encode NotebookLM preflight queries, fail-closed blocking behavior, project IDs, and citation requirements.
- `2026-03-07 Q5`: Browser-workflow governance is currently `BLOCKED` because `<interaction_invariant>` and `<security_gate>` are not defined in the notebook source.
- `2026-03-09 Q1`: Storefront governance constraints, single-source enforcement, source-count validation, and fail-closed execution were reconfirmed with citation-backed NotebookLM output.
- `2026-03-09 Q2`: The early "local docs restricted to AGENTS.md" interpretation is superseded by the 2026-03-19 source sync confirming that local Markdown docs stay in repo and are mirrored to Google Docs.
- `2026-03-09 Q3`: README, architecture, security/design, backend, infrastructure, and standards remain required DoD artifacts; the current source model keeps them as local Markdown plus Google Doc mirror.
- `2026-03-19 Q6`: Local Markdown docs such as `README.md`, `ARCHITECTURE.md`, and `docs/**` remain in the repo, must never be deleted because of the Google Doc mirror, and are protected by governance tooling.
- `2026-03-19 Q7`: The project Google Doc mirrors the same documentation set as the repo and should use one child tab per canonical Markdown document once the approved tab-creation path is available.
- `2026-03-19 Q8`: Each project uses its own NotebookLM notebook bound to exactly one Google Doc source for that same project, and the Drive source must be synced after documentation updates before relying on citations.
- `2026-03-20 Q9`: The previous SSOT Google Doc had a broken API write lane; the project now uses the writable replacement doc `simone-webshop-01 - SSOT-v2`, mirrored into NotebookLM source `34567ee6-d1c6-4a9f-96c6-1d573cf3da9e` with one child tab per canonical Markdown file.
- `2026-03-09 Q4`: `AGENTS.md` requirements were reconfirmed: mandatory preflight queries, citation minimums, `BLOCKED` on missing evidence, and SSOT project identifiers.
- `2026-03-09 Q5`: Browser-workflow governance is now defined in `01_DESIGN/DESIGN.md` and queryable via NotebookLM after a forced Drive-source sync on source `6ec7f1bb-7184-4ff2-9af0-4625838f03d0`.

## Draft Replacement Vocabulary

- `interaction_invariant`: The fixed behavioral rules for a browser workflow. It defines what the flow is trying to complete, which user-visible states must be preserved, which sequence must remain stable, and which actions are never allowed to drift.
- `execution_boundary`: The permitted operating envelope of a browser workflow. It defines which domains, pages, entry points, stored sessions, and action classes belong to the flow, and where the workflow must stop because it has left its intended scope.
- `halt_condition`: The concrete stop conditions for a browser workflow. It defines which missing markers, unexpected redirects, unresolved prompts, missing evidence, or ambiguous states force an immediate stop instead of heuristic continuation.
- `evidence_trace`: The minimum proof bundle for one browser run. It defines which URL, state markers, action log entries, screenshots, and outcome markers must be captured so the run can be reviewed deterministically afterward.

## Draft Browser Definition Pattern

Use this pattern when the Master Google Doc is updated:

```text
<interaction_invariant>
- Goal:
- Stable user-visible states:
- Allowed action sequence:
- Non-negotiable stop points:

<execution_boundary>
- Allowed domains:
- Allowed entry URLs:
- Allowed stored-session sources:
- Allowed action classes:
- Out-of-scope surfaces:

<halt_condition>
- Hard stop events:
- Ambiguous-state events:
- Missing-evidence events:
- Recovery policy:

<evidence_trace>
- Required screenshots:
- Required state markers:
- Required logs:
- Required final outcome proof:
```

## Notebook State Verified On 2026-03-20

- `notebook_id=8a11c91e-7ca0-4b0a-9fc0-78a5d6cd0f54`
- `title=simone-webshop-01 - SSOT-v2`
- `source_count=1`
- `source_id=34567ee6-d1c6-4a9f-96c6-1d573cf3da9e`
- `source_title=simone-webshop-01 - SSOT-v2`

## Current Blockers

- `NONE`: The current SSOT uses `simone-webshop-01 - SSOT-v2`, which is writable through the approved Docs API lane and already mirrors one child tab per canonical Markdown file.

## Infrastructure (OCI VM 92.5.60.87)

- **VM**: `92.5.60.87` (ARM64/aarch64, Ubuntu, hostname `sinsupabase`)
- **SSH**: `ssh -i ~/.ssh/id_ed25519 ubuntu@92.5.60.87`
- **Self-hosted Supabase**: Docker-based, PostgreSQL on port 5433 (internal `supabase-db:5433`)
- **Webshop DB**: `shop` schema in `postgres` database, 82 tables, 49 products, 24 categories
- **DB User**: `simone:simone123` (full access to `shop` schema)
- **Go API**: Docker container `simone-api` on port 8080, health=ready, 49 active products
- **Go Worker**: Docker container `simone-worker`, polling every 5s
- **Cloudflare Tunnel**: `simone-api` tunnel → `api.delqhi.com` → `localhost:8080` (systemd service `cloudflared-simone-api`)
- **Cloudflare Worker**: `simone-worldbest-shop` on `delqhi.com/*`, `INTERNAL_API_URL=https://api.delqhi.com`
- **CJ Dropshipping**: Supplier ID `afe83509-b0d5-44fb-85b8-1bd5ce0df2ab`, API key `CJ5240573@api@d5d074918b1f434995c26af2fc932bb8`, openId `37995`
- **CJ Payment Flow**: `payType=2` (3-step: createOrder→confirmOrder→payBalance), requires CJ Balance > $0 for auto-pay
- **CJ Balance**: Currently $0 — orders created+confirmed but UNPAID until balance funded
- **Stripe Instant Payouts**: NOT YET ENABLED on account `acct_1TEhmvAZZTxFQVSB` — needs manual activation in Stripe Dashboard
- **Stripe Bank Account**: No external bank account configured yet — required for payouts
- **Resend Email**: Primary email provider (API key `re_YAnqVXrV...`, send-only scope), Gmail API as fallback
- **Resend From**: `Delqhi Shop <onboarding@resend.dev>` until delqhi.com domain verified, then `shop@delqhi.com`
- **n8n**: Port 5678, 12 workflows imported, login `zukunftsorientierte.energie@gmail.com` / `simone2026`
- **Stripe**: Live mode, account `acct_1TEhmvAZZTxFQVSB` (DE), webhook `we_1Tb9KHAZZTxFQVSBxnWV6N1p`
- **Go API env**: `/home/ubuntu/simone-api.env` on VM
- **CJ Bundle Repo**: https://github.com/SIN-Shop-Center/SIN-CJDropshipping-Bundle (CLI + MCP + docs + scripts)
- **Supabase Bundle Repo**: https://github.com/SIN-Shop-Center/SIN-Supabase-OCI-Bundle (docker-compose + migrations + provisioning scripts)

### Infisical (Primary Secrets Manager)

26 secrets populated (2026-05-26, includes RESEND_API_KEY), replaces SOPS for onboarding:
- **Console**: https://eu.infisical.com/organizations/a83c52af-795b-437f-8f17-f1b68d3ab65c
- **Project**: `secret-management` / `fa7758b4-f84c-4297-966e-710056d531ef`
- **Path**: `/SIN-Webshop-01`, **Env**: `dev`

| Category | Keys |
|----------|------|
| Supabase/DB | `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `DATABASE_URL_EXTERNAL`, `DB_USER`, `DB_PASSWORD`, `DB_SCHEMA` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ACCOUNT_ID` |
| CJ | `CJ_API_KEY`, `CJ_OPEN_ID` |
| Cloudflare | `CLOUDFLARE_GLOBAL_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_TUNNEL_ID` |
| Infra | `OCI_VM_IP`, `N8N_ENCRYPTION_KEY` |
| App | `JWT_REQUIRED`, `APP_ENV`, `CJ_MARKUP`, `CURRENCY`, `FX_RATE`, `RESEND_API_KEY` |

```bash
# Pull all secrets
infisical export --domain https://eu.infisical.com \
  --project-id fa7758b4-f84c-4297-966e-710056d531ef \
  --path /SIN-Webshop-01 --env dev -f .env
```

SOPS (`secrets/agents.enc.env`) remains in repo for backward compat but is no longer needed for onboarding.

### Schema Note

Go API SQL uses explicit `shop.` schema prefix (was `public.` before migration). All Go source files under `apps/api/` were updated via bulk replace. Only `cmd/migrate/db_ops.go` retains `public.app_migrations`.

### Skills

- **cj-dropshipping**: `.opencode/skills/cj-dropshipping/SKILL.md` — CJ API 73-endpoint reference, CLI, MCP tools
- **database-shop-schema**: `.opencode/skills/database-shop-schema/SKILL.md` — shop schema reference
- **storefront-operations**: `.opencode/skills/storefront-operations/SKILL.md` — Storefront + API ops
- **stripe-operations**: `.opencode/skills/stripe-operations/SKILL.md` — Stripe payment management
- **infrastructure-ops**: `.opencode/skills/infrastructure-ops/SKILL.md` — VM/Docker/Tunnel/Supabase

### CJ Bundle (Standalone Repo)

Full CJ Dropshipping tooling lives in **SIN-Shop-Center/SIN-CJDropshipping-Bundle**:
- `cli/cj-cli.py` — 73-endpoint CLI with auto token management
- `mcp-server/cj-mcp-server.py` — 75-tool MCP server (`cj_*` prefix)
- `scripts/` — Product import, stock sync, token refresh
- `docs/` — API reference, order flow, webhook docs
- `skills/` — All 5 skill files mirrored

Local copies in `tools/cj-cli.py` and `tools/cj-mcp-server.py` are kept in sync.

## SIN A2A Runtime Rules

- Secret operations must route through `SIN-Passwordmanager` (`SPM`) instead of ad-hoc local secret handling.
- The current SIN-A2A registry lives in `config/sin-a2a/registry.json` and is the local source for public guide hosts, A2A endpoints, MCP endpoints and Google-Docs tab bindings.
- If a matching SIN-A2A agent exists in the registry, prefer that agent over improvised local delegation.
- Public directory surface: `https://a2a.delqhi.com` routed from `/a2a`.
