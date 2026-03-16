# NotebookLM Judge Protocol

## Project Identity

- `PROJECT_ROOT=/Users/jeremy/dev/projects/family-projects/simone-webshop-01`
- `PROJECT_NOTEBOOK_ID=784c4f30-b524-41d9-a0cc-3752b8303cf3`
- `PROJECT_NOTEBOOK_URL=https://notebooklm.google.com/notebook/784c4f30-b524-41d9-a0cc-3752b8303cf3`
- `PROJECT_GOOGLE_DOC_ID=1CWNvxXU7aXgO2rCA_RzCkTILuO34_e09vwCWISoOijQ`
- `PROJECT_GOOGLE_DOC_TITLE=SIMONE-WEBSHOP-SSOT-v1`
- `OPTIONAL_INFO_NOTEBOOK_ID=ab67c7ae-5e83-4316-9587-83ac5fabe396`
- `SSOT=NotebookLM + Master Google Doc`
- `SOURCE_COUNT_REQUIRED=1`

## Hard Rules

1. Query NotebookLM before any architecture or code change and require at least one citation-backed answer.
2. Return `BLOCKED` and stop immediately if citation evidence is missing, NotebookLM access fails, or the notebook is not bound to exactly one source.
3. Treat the NotebookLM notebook and its single Google Doc source as the only authoritative source of truth for governance and design decisions.
4. Do not create or update local documentation files other than this `AGENTS.md`; documentation changes belong in the Master Google Doc.
5. Require explicit human approval before destructive, high-risk, or browser-automation actions.
6. If browser-workflow rules are requested, halt until `<interaction_invariant>` and `<security_gate>` are defined in the Master Google Doc and queryable via NotebookLM.
7. If the source terminology is being revised, keep the NotebookLM wording as the current source state and mark the replacement vocabulary as a draft until the Master Google Doc is updated.

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
- `2026-03-07 Q2`: Local creation scope is limited to `AGENTS.md`; the notebook requires the wider documentation tree to live in the Master Google Doc, not in repo markdown files.
- `2026-03-07 Q3`: README, architecture, security/design, backend, and standards are required artifacts, but the notebook places them in the Google Doc tab hierarchy rather than local markdown.
- `2026-03-07 Q4`: `AGENTS.md` must encode NotebookLM preflight queries, fail-closed blocking behavior, project IDs, and citation requirements.
- `2026-03-07 Q5`: Browser-workflow governance is currently `BLOCKED` because `<interaction_invariant>` and `<security_gate>` are not defined in the notebook source.
- `2026-03-09 Q1`: Storefront governance constraints, single-source enforcement, source-count validation, and fail-closed execution were reconfirmed with citation-backed NotebookLM output.
- `2026-03-09 Q2`: Local documentation remains restricted to `AGENTS.md`; the required project structure lives in the Master Google Doc tab hierarchy.
- `2026-03-09 Q3`: README, architecture, security/design, backend, infrastructure, and standards remain required DoD artifacts in the Google Doc kernel, not as new local markdown files; ADR/RFC stay embedded unless the source model changes.
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

## Notebook State Verified On 2026-03-09

- `notebook_id=784c4f30-b524-41d9-a0cc-3752b8303cf3`
- `title=AIOMETRICS 10 Agent Judge Kernel - DEV`
- `source_count=1`
- `source_id=6ec7f1bb-7184-4ff2-9af0-4625838f03d0`
- `source_title=AIOMETRICS-AGENT-KERNEL-MASTER-DOC-v1`

## Current Blockers

- `BLOCKED`: Creating or refreshing local files such as `ARCHITECTURE.md`, `STANDARDS_BASELINE.md`, `docs/...`, or `01-NOTEBOOKLM/...` would conflict with the current NotebookLM evidence.

## SIN A2A Runtime Rules

- Secret operations must route through `SIN-Passwordmanager` (`SPM`) instead of ad-hoc local secret handling.
- The current SIN-A2A registry lives in `config/sin-a2a/registry.json` and is the local source for public guide hosts, A2A endpoints, MCP endpoints and Google-Docs tab bindings.
- If a matching SIN-A2A agent exists in the registry, prefer that agent over improvised local delegation.
- Public directory surface: `https://a2a.delqhi.com` routed from `/a2a`.
