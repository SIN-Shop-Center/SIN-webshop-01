import * as http from 'http';
import { AGENT_METADATA } from './metadata';

const ONE_PAGE_HTML = `<!DOCTYPE html>
<html>
<head><title>SIN-Shop-Logistic A2A Card</title></head>
<body>
  <h1>SIN-Shop-Logistic</h1>
  <p>Status: Active</p>
  <p>CIMD Same-Origin: True (Served natively from HF Space / Cloudflare Tunnel)</p>
  <p>Agent Card JSON: <a href="/.well-known/agent-card.json">/.well-known/agent-card.json</a></p>
  <p>JSON-RPC Endpoint: <a href="/a2a/v1">/a2a/v1</a></p>
</body>
</html>`;

export function startA2A(port: number) {
    const server = http.createServer((req, res) => {
        if (req.url === '/') {
            // Serve the Public One-Page HTML directly on Root (Same-Origin CIMD compliance)
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(ONE_PAGE_HTML);
        } else if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: "ok" }));
        } else if (req.url === '/a2a/v1' || req.url === '/.well-known/agent-card.json' || req.url === '/.well-known/agent.json') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(AGENT_METADATA));
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    server.listen(port, () => {
        console.log(`[A2A] HTTP JSON-RPC & CIMD One-Page Server active on port ${port}`);
    });
}
