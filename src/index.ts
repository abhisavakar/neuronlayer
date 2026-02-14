import { MCPServer } from './server/mcp.js';
import { getDefaultConfig, parseArgs } from './utils/config.js';
import { executeCLI, printHelp } from './cli/commands.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Check for CLI commands first
  const firstArg = args[0];
  const cliCommands = ['projects', 'export', 'help', '--help', '-h'];

  if (firstArg && cliCommands.includes(firstArg)) {
    // Handle CLI commands
    executeCLI(args);
    return;
  }

  // No arguments and not piped - show help
  if (args.length === 0 && process.stdin.isTTY) {
    printHelp();
    console.log('\nTo start as MCP server, use: memorylayer --project <path>\n');
    return;
  }

  // Parse command line arguments for MCP server mode
  const { projectPath } = parseArgs(args);

  // Get configuration
  const config = getDefaultConfig(projectPath);

  console.error('MemoryLayer starting...');
  console.error(`Project: ${config.projectPath}`);
  console.error(`Data directory: ${config.dataDir}`);

  // Create and start MCP server
  const server = new MCPServer(config);

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start MemoryLayer:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
