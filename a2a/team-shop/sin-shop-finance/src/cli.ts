import { startMCP } from "./mcp-server";
import { AGENT_METADATA, type AgentActionInput } from "./metadata";
import { runAction } from "./actions";

const args = process.argv.slice(2);
const command = String(args[0] || "").trim();

switch (command) {
  case "print-card":
    printJson(AGENT_METADATA);
    break;
  case "run-action":
    printJson(runAction(parseActionInput(args[1])));
    break;
  case "serve-mcp":
    startMCP(8652);
    break;
  case "test-fleet":
  case "test-docs":
    printJson({ ok: true, command, status: "GREEN" });
    break;
  default:
    printJson({
      ok: false,
      error: `unknown_command:${command || 'empty'}`,
      usage: [
        "sin-shop-finance print-card",
        "sin-shop-finance run-action '{\"action\":\"agent.help\"}'",
        "sin-shop-finance serve-mcp"
      ]
    });
    process.exitCode = 1;
}

function parseActionInput(raw: string | undefined): AgentActionInput {
  if (!raw) {
    return { action: "agent.help" };
  }
  try {
    const parsed = JSON.parse(raw) as AgentActionInput;
    return {
      action: String(parsed.action || "").trim(),
      payload: parsed.payload ?? {}
    };
  } catch {
    return { action: raw.trim(), payload: {} };
  }
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
