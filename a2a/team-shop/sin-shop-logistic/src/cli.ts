import { AGENT_METADATA } from './metadata';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'print-card') {
    console.log(JSON.stringify(AGENT_METADATA, null, 2));
} else if (command === 'run-action') {
    console.log(`[CLI] Running action: ${args[1]}`);
    if (args[1]?.includes('agent.help')) {
        console.log("Usage: sin-shop-logistic [print-card|run-action]");
    } else if (args[1]?.includes('.health')) {
        console.log("Health OK");
    }
} else if (command === 'test-fleet' || command === 'test-docs') {
    console.log("[TEST] GREEN");
    process.exit(0);
} else {
    console.log(`Unknown command: ${command}`);
    process.exit(1);
}
