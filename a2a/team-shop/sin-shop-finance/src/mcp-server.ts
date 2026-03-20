import * as http from "http";
import { AGENT_METADATA } from "./metadata";

export function startMCP(port: number) {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: `${AGENT_METADATA.id}-mcp` }));
      return;
    }

    if (req.url === "/mcp" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          transport: ["stdio", "streamable_http"],
          agent: AGENT_METADATA.id,
          actions: AGENT_METADATA.actions,
        }),
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
  });

  server.listen(port, () => {
    console.log(`[MCP] SIN-Shop-Finance MCP bridge active on ${port}`);
  });

  return server;
}
