// memcode - AI Coding Assistant powered by MemoryLayer

import { resolve } from 'path';
import { MemoryLayerEngine } from '../core/engine.js';
import { getDefaultConfig } from '../utils/config.js';
import { Orchestrator } from './core/orchestrator.js';
import {
  createProvider,
  parseModelString,
  type LLMProviderConfig
} from './llm/index.js';
import {
  parseArgs,
  printHelp,
  loadConfig,
  getApiKey,
  getBaseURL,
  getAzureConfig,
  getConfigDir,
  getProjectDataDir
} from './config/index.js';
import {
  createReadlineInterface,
  readlineGenerator,
  write,
  printBanner,
  printStatus,
  printCost,
  Spinner,
  formatToolCall,
  formatToolResult,
  formatMarkdown,
  c
} from './ui/cli.js';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Handle help
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Handle version
  if (args.version) {
    console.log('memcode v0.1.0 (MemoryLayer Agent)');
    process.exit(0);
  }

  // Load config
  const config = loadConfig();

  // Resolve project path
  const projectPath = resolve(args.projectPath);

  // Azure OpenAI with Kimi - hardcoded for reliability
  const finalProvider = 'openai' as const;
  const model = args.model || 'Kimi-K2.5';
  const baseURL = 'https://swedencentral.api.cognitive.microsoft.com/openai/v1';
  // Use config file key first, then fallback to hardcoded (env var may be stale)
  const configKey = loadConfig().providers?.azure?.apiKey;
  const apiKey = args.apiKey || (configKey && configKey.length > 10 ? configKey : null) || '91hH1JEzd1G83v4vgKHDjsAEsOsSl0fxmE7eDv7vqNS7Lvdc2vo3JQQJ99CBACfhMk5XJ3w3AAAAACOG6DCi';

  if (!apiKey) {
    console.error(`\n❌ No API key found`);
    console.error(`\nSet it via:`);
    console.error(`  - Environment variable: AZURE_OPENAI_API_KEY`);
    console.error(`  - Command line: --api-key <key>`);
    console.error(`  - Config file: ~/.memcode/config.json\n`);
    process.exit(1);
  }

  // Print banner
  printBanner();

  // Create MemoryLayer engine config with project-specific data directory
  const engineConfig = getDefaultConfig(projectPath);
  engineConfig.dataDir = getProjectDataDir(projectPath);

  // Initialize MemoryLayer engine
  const spinner = new Spinner('Initializing MemoryLayer...');
  spinner.start();

  let engine: MemoryLayerEngine;
  try {
    engine = new MemoryLayerEngine(engineConfig);
    await engine.initialize();
    spinner.stop('✅ MemoryLayer initialized');
  } catch (error) {
    spinner.stop(`❌ Failed to initialize MemoryLayer: ${error}`);
    process.exit(1);
  }

  // Create LLM provider
  const providerConfig: LLMProviderConfig = {
    apiKey: apiKey || '',
    model,
    maxTokens: config.agent.maxTokensPerTurn,
    baseURL
  };

  const provider = createProvider(finalProvider, providerConfig);

  // Create orchestrator
  const orchestrator = new Orchestrator({
    engine,
    provider,
    projectPath,
    dataDir: getConfigDir(),
    maxTurns: config.agent.maxTurns,
    streamOutput: config.agent.streamResponses,
    onText: (text) => {
      write(formatMarkdown(text));
    },
    onToolStart: (name, toolArgs) => {
      write(`\n${formatToolCall(name, toolArgs)}\n`);
    },
    onToolEnd: (name, result, isError) => {
      write(`${formatToolResult(name, result, isError)}\n`);
    }
  });

  // Handle continue session
  if (args.continue) {
    const sessionId = typeof args.continue === 'string' ? args.continue : undefined;
    if (sessionId) {
      const success = orchestrator.loadSession(sessionId);
      if (success) {
        write(`\n✅ Continued session: ${sessionId}\n`);
      } else {
        write(`\n⚠️ Session not found: ${sessionId}, starting new session\n`);
      }
    } else {
      // Continue most recent
      // SessionManager handles this via getMostRecentSession
    }
  }

  // Setup readline
  const rl = createReadlineInterface();
  const readline = readlineGenerator(rl);

  // Handle graceful shutdown
  const shutdown = () => {
    orchestrator.saveSession();
    engine.shutdown();
    rl.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Run interactive loop
  try {
    await orchestrator.runInteractive(readline, write);
  } finally {
    shutdown();
  }
}

// Export for programmatic use
export { Orchestrator } from './core/orchestrator.js';
export { Conversation } from './core/conversation.js';
export { ToolExecutor } from './tools/executor.js';
export { SessionManager } from './session/manager.js';
export * from './llm/index.js';
export * from './config/index.js';

// Run main if executed directly
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
