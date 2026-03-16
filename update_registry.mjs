import fs from 'fs';
const registry = JSON.parse(fs.readFileSync('config/sin-a2a/registry.json', 'utf8'));
registry.agents.push({
      "id": "sin-shop-logistic",
      "slug": "sin-shop-logistic",
      "shortName": "SSL",
      "name": "SIN-Shop-Logistic",
      "teamId": "shop",
      "status": "active",
      "description": "Spezialisierter Shop-Agent fuer Droppshipping-Lieferanten-Registrierung, Produktintegration und Synchrone TikTok-Shop-Anbindung.",
      "repo": {
        "name": "sin-shop-logistic",
        "status": "active"
      },
      "guide": {
        "host": "sin-shop-logistic.delqhi.com",
        "route": "/a2a/sin-shop-logistic"
      },
      "a2a": {
        "host": "ssl-a2a.delqhi.com",
        "baseUrl": "http://127.0.0.1:4647",
        "jsonRpcPath": "/a2a/jsonrpc",
        "restPath": "/a2a/rest",
        "agentCardWellKnownPath": "/.well-known/agent-card.json",
        "cardPath": "/.well-known/agent.json",
        "oauthClientPath": "/.well-known/oauth-client.json",
        "port": 4647
      },
      "mcp": {
        "host": "ssl-mcp.delqhi.com",
        "baseUrl": "http://127.0.0.1:8651",
        "path": "/mcp",
        "transport": [
          "stdio",
          "streamable_http"
        ],
        "port": 8651
      },
      "cloudflare": {
        "directoryHostname": "sin-shop-logistic.delqhi.com",
        "a2aHostname": "ssl-a2a.delqhi.com",
        "mcpHostname": "ssl-mcp.delqhi.com"
      },
      "googleDocs": {
        "documentId": "1RtoHn4I0GntuEEOHHkqoh_dMuGzgMwQz7_8oxAOpQbw",
        "referenceTabId": "t.m4146wq7h87z",
        "teamsRootTabId": "t.93gdhv1dh74",
        "teamTabId": "t.4ldzbgjj6taf",
        "agentTabId": "t.sxvfaomy910j"
      },
      "paths": {
        "agentRoot": "~/.a2a/SIN-Solver/team-shop/A2A-SIN-Shop-Logistic",
        "a2aRuntime": "a2a/team-shop/sin-shop-logistic",
        "mcpRuntime": "a2a/team-shop/sin-shop-logistic"
      },
      "skills": [
        "dropshipping-supplier-registration",
        "lucrative-product-integration",
        "synchronous-tiktok-shop-sync"
      ],
      "commands": [
        "python3 a2a/team-shop/sin-shop-logistic/browser-automator/run_flow.py"
      ],
      "apiEndpoints": [
        "POST /a2a/jsonrpc",
        "POST /a2a/rest",
        "GET /health"
      ]
});
fs.writeFileSync('config/sin-a2a/registry.json', JSON.stringify(registry, null, 2) + '\n');
