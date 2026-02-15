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
  getConfigDir
} from './config/index.js';
import {
  createReadlineInterface,
  readlineGenerator,
  write,
  printBanner,
  Spinner,
  formatToolCall,
  formatToolResult,
  formatMarkdown
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

  // Determine model and provider
  const modelString = args.model || config.defaultModel;
  const { provider: providerName, model } = parseModelString(modelString);

  // Get API key
  let apiKey: string | undefined = args.apiKey;
  if (!apiKey) {
    if (args.provider) {
      apiKey = getApiKey(args.provider as 'anthropic' | 'openrouter' | 'openai') ?? undefined;
    } else {
      apiKey = getApiKey(providerName as 'anthropic' | 'openrouter' | 'openai') ?? undefined;
    }
  }

  if (!apiKey && providerName !== 'local') {
    console.error(`\n❌ No API key found for ${providerName}`);
    console.error(`\nSet it via:`);
    console.error(`  - Environment variable: ${providerName.toUpperCase()}_API_KEY`);
    console.error(`  - Command line: --api-key <key>`);
    console.error(`  - Config file: ~/.memcode/config.json\n`);
    process.exit(1);
  }

  // Print banner
  printBanner();

  // Create MemoryLayer engine config
  const engineConfig = getDefaultConfig(projectPath);
  engineConfig.dataDir = getConfigDir();

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
  const selectedProvider = (args.provider || providerName) as 'anthropic' | 'openrouter' | 'openai' | 'local';
  const baseURL = getBaseURL(selectedProvider as 'anthropic' | 'openrouter' | 'openai');

  const providerConfig: LLMProviderConfig = {
    apiKey: apiKey || '',
    model,
    maxTokens: config.agent.maxTokensPerTurn,
    baseURL: baseURL ?? undefined
  };

  const provider = createProvider(selectedProvider, providerConfig);

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
