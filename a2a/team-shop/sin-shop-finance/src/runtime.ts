import { startMCP } from "./mcp-server";
import { startA2A } from "./a2a-http";

async function bootstrap() {
  console.log("[RUNTIME] Starting SIN-Shop-Finance A2A and MCP servers...");
  startMCP(8652);
  startA2A(4648);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
