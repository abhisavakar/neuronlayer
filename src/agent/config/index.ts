// Configuration for memcode agent

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface MemcodeConfig {
  defaultModel: string;
  providers: {
    anthropic?: { apiKey: string };
    openrouter?: { apiKey: string };
    openai?: { apiKey: string };
    local?: { baseURL: string };
  };
  agent: {
    maxTokensPerTurn: number;
    maxTurns: number;
    autoContext: boolean;
    streamResponses: boolean;
  };
  ui: {
    showCosts: boolean;
    showTokens: boolean;
    colorOutput: boolean;
  };
}

const DEFAULT_CONFIG: MemcodeConfig = {
  defaultModel: 'claude-sonnet-4-20250514',
  providers: {},
  agent: {
    maxTokensPerTurn: 8192,
    maxTurns: 10,
    autoContext: true,
    streamResponses: true
  },
  ui: {
    showCosts: true,
    showTokens: true,
    colorOutput: true
  }
};

export function getConfigDir(): string {
  const dir = join(homedir(), '.memcode');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

export function loadConfig(): MemcodeConfig {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const data = JSON.parse(readFileSync(configPath, 'utf-8'));
    return {
      ...DEFAULT_CONFIG,
      ...data,
      providers: {
        ...DEFAULT_CONFIG.providers,
        ...data.providers
      },
      agent: {
        ...DEFAULT_CONFIG.agent,
        ...data.agent
      },
      ui: {
        ...DEFAULT_CONFIG.ui,
        ...data.ui
      }
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: MemcodeConfig): void {
  const configPath = getConfigPath();
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function getApiKey(provider: 'anthropic' | 'openrouter' | 'openai'): string | null {
  // Check environment variables first
  const envVars: Record<'anthropic' | 'openrouter' | 'openai', string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    openai: 'OPENAI_API_KEY'
  };

  // Check for Azure Foundry key first for Anthropic
  if (provider === 'anthropic') {
    const foundryKey = process.env['ANTHROPIC_FOUNDRY_API_KEY'];
    if (foundryKey) return foundryKey;
  }

  const envVarName = envVars[provider];
  const envKey = process.env[envVarName];
  if (envKey) return envKey;

  // Check config file
  const config = loadConfig();
  return config.providers[provider]?.apiKey || null;
}

export function getBaseURL(provider: 'anthropic' | 'openrouter' | 'openai'): string | null {
  // Check for Azure Foundry URL for Anthropic
  if (provider === 'anthropic') {
    const foundryURL = process.env['ANTHROPIC_FOUNDRY_BASE_URL'];
    if (foundryURL) return foundryURL;
  }

  // Check for OpenAI base URL (for Azure OpenAI or other compatible endpoints)
  if (provider === 'openai') {
    const baseURL = process.env['OPENAI_BASE_URL'];
    if (baseURL) return baseURL;
  }

  return null;
}

export function setApiKey(provider: 'anthropic' | 'openrouter' | 'openai', apiKey: string): void {
  const config = loadConfig();
  if (!config.providers[provider]) {
    config.providers[provider] = { apiKey };
  } else {
    config.providers[provider]!.apiKey = apiKey;
  }
  saveConfig(config);
}

export interface CLIArgs {
  projectPath: string;
  model?: string;
  continue?: boolean | string;
  help?: boolean;
  version?: boolean;
  apiKey?: string;
  provider?: string;
}

export function parseArgs(args: string[]): CLIArgs {
  const result: CLIArgs = {
    projectPath: process.cwd()
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--project':
      case '-p':
        result.projectPath = args[++i] || process.cwd();
        break;

      case '--model':
      case '-m':
        result.model = args[++i];
        break;

      case '--continue':
      case '-c':
        // Check if next arg is a session ID or another flag
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          result.continue = nextArg;
          i++;
        } else {
          result.continue = true;
        }
        break;

      case '--help':
      case '-h':
        result.help = true;
        break;

      case '--version':
      case '-v':
        result.version = true;
        break;

      case '--api-key':
        result.apiKey = args[++i];
        break;

      case '--provider':
        result.provider = args[++i];
        break;

      default:
        // If it looks like a path, use it as project path
        if (arg && !arg.startsWith('-') && !result.projectPath) {
          result.projectPath = arg;
        }
        break;
    }
  }

  return result;
}

export function printHelp(): void {
  console.log(`
memcode - AI Coding Assistant powered by MemoryLayer

Usage:
  memcode [options] [project-path]
  npx memorylayer agent [options]

Options:
  -p, --project <path>    Project directory (default: current directory)
  -m, --model <model>     LLM model to use (default: claude-sonnet-4-20250514)
  -c, --continue [id]     Continue last session or specific session ID
  --api-key <key>         API key for the provider
  --provider <name>       Provider: anthropic, openrouter, openai, local
  -h, --help              Show this help message
  -v, --version           Show version

Environment Variables:
  ANTHROPIC_API_KEY       Anthropic API key
  OPENROUTER_API_KEY      OpenRouter API key
  OPENAI_API_KEY          OpenAI API key

Config File:
  ~/.memcode/config.json  Persistent configuration

Models:
  Anthropic:   claude-sonnet-4-20250514, claude-3.5-sonnet, claude-3-opus
  OpenAI:      gpt-4o, gpt-4o-mini, o1, o1-mini
  OpenRouter:  200+ models (prefix with provider e.g. anthropic/claude-3.5-sonnet)

Examples:
  memcode                           # Start in current directory
  memcode -p ./my-project           # Start in specific project
  memcode --model gpt-4o            # Use GPT-4o
  memcode --continue                # Resume last session
  memcode -c 20250215-123456-ab12   # Resume specific session

In-Session Commands:
  /help       Show available commands
  /model      Show or switch model
  /context    Show current context
  /cost       Show cost summary
  /exit       Exit memcode
`);
}
