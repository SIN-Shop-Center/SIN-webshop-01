import { startMCP } from './mcp-server';
import { startA2A } from './a2a-http';

async function bootstrap() {
    console.log("[RUNTIME] Starting SIN-Shop-Logistic A2A and MCP Servers...");
    startMCP(8651);
    startA2A(4647);
}

bootstrap().catch(console.error);
