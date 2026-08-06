# ADR 0006: Local Governance Authority

- Status: Accepted
- Date: 2026-08-06

## Context

Project decisions previously depended on an external notebook-style judge and a
remote collaboration mirror. That design introduced login, quota, cache and
availability failure modes into local development and release verification.
External prose also risked drifting away from the versioned code, migrations and
runbooks that actually define system behavior.

## Decision

The Git repository is the sole project authority. The binding hierarchy is:

1. `AGENTS.md` for operating, security and halt rules;
2. versioned ADRs for architecture decisions and exceptions;
3. migrations, schemas and runtime contracts for data authority;
4. runbooks and security documents for operations and recovery;
5. task plans and GitHub issues for execution state;
6. CI, tests, scans and runtime smoke evidence for completion.

Google Docs may remain as an optional collaboration mirror. Mirror availability,
authentication or freshness can never block development, CI, release or incident
response. Disagreements are resolved in the repository and only then mirrored.

The governance preflight is offline and deterministic. It verifies required
artifacts, AGENTS invariants, the canonical SSOT file list, absence of retired
external-governance hooks, and unsupported documentation drift.

## Consequences

- No external login or network access is required for governance checks.
- CI and local execution use the same gate.
- Architecture changes require a committed ADR and passing repository gates.
- External mirrors are non-authoritative and may be unavailable without creating
  a product or release blocker.
