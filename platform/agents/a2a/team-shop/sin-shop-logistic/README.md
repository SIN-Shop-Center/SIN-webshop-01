# sin-shop-logistic

Dry-run-first logistics agent for supplier registration, product integration and
TikTok draft synchronization. The runtime never logs in, solves CAPTCHA,
accepts legal terms, pays, orders or publishes. Those steps are explicit human
gates and require an operator-owned browser session.

## Local Runtime

```bash
pnpm --filter @shopsin/sin-shop-logistic test
pnpm --filter @shopsin/sin-shop-logistic start
curl http://127.0.0.1:4647/health
```

The A2A server listens on `4647`; the Streamable-HTTP MCP endpoint listens on
`8651`. Both bind to loopback by default. Deployment must inject public URLs and
secrets from a secret manager; no browser credentials are accepted by this
runtime.

## Browser Dry Run

```bash
python3 browser-automator/automator.py \
  --flow tiktok-draft-sync \
  --inputs-json '{"product_id":"test-only"}'
```

Audit files and screenshot checkpoints are written below `.artifacts/`, which is
gitignored. `--execute` always fails closed. Production deployment, external
account setup and Google-Docs governance sync are separate human-approved gates.
