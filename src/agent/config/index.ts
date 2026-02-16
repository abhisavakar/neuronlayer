// Configuration for memcode agent

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface MemcodeConfig {
  defaultModel: string;
  defaultProvider: string;
  providers: {
    anthropic?: { apiKey: string };
    openrouter?: { apiKey: string };
    openai?: { apiKey: string; baseURL?: string };
    azure?: { apiKey: string; baseURL: string; deploymentName: string };
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
    showDiffs: boolean;
    diffContextLines: number;
    diffMaxLines: number;
  };
  keybinds: {
    submit: string;
    newline: string;
    exit: string;
    clear: string;
    help: string;
  };
  permissions: {
    allowShell: boolean;
    allowFileWrite: boolean;
    confirmFileWrite: boolean;
    confirmShell: boolean;
  };
}

const DEFAULT_CONFIG: MemcodeConfig = {
  defaultModel: 'Kimi-K2.5',
  defaultProvider: 'azure',
  providers: {
    azure: {
      apiKey: '',  // Set via AZURE_OPENAI_API_KEY env var
      baseURL: 'https://swedencentral.api.cognitive.microsoft.com/openai/v1/',
      deploymentName: 'Kimi-K2.5'
    }
  },
  agent: {
    maxTokensPerTurn: 8192,
    maxTurns: 10,
    autoContext: true,
    streamResponses: true
  },
  ui: {
    showCosts: true,
    showTokens: true,
    colorOutput: true,
    showDiffs: true,
    diffContextLines: 3,
    diffMaxLines: 50
  },
  keybinds: {
    submit: 'enter',
    newline: 'shift+enter',
    exit: 'ctrl+c',
    clear: 'ctrl+l',
    help: 'ctrl+h'
  },
  permissions: {
    allowShell: true,
    allowFileWrite: true,
    confirmFileWrite: false,
    confirmShell: false
  }
};

export function getConfigDir(): string {
  const dir = join(homedir(), '.memcode');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getProjectDataDir(projectPath: string): string {
  // Create a project-specific data directory using a simple hash of the project path
  // Simple hash function to avoid crypto import issues
  let hash = 0;
  for (let i = 0; i < projectPath.length; i++) {
    const char = projectPath.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hashStr = Math.abs(hash).toString(16).slice(0, 8);
  const projectName = projectPath.split(/[/\\]/).pop() || 'unknown';
  const dir = join(homedir(), '.memcode', 'projects', `${projectName}-${hashStr}`);
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
      },
      keybinds: {
        ...DEFAULT_CONFIG.keybinds,
        ...data.keybinds
      },
      permissions: {
        ...DEFAULT_CONFIG.permissions,
        ...data.permissions
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

export function getApiKey(provider: 'anthropic' | 'openrouter' | 'openai' | 'azure'): string | null {
  // Check environment variables first
  const envVars: Record<'anthropic' | 'openrouter' | 'openai' | 'azure', string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    openai: 'OPENAI_API_KEY',
    azure: 'AZURE_OPENAI_API_KEY'
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

export function getBaseURL(provider: 'anthropic' | 'openrouter' | 'openai' | 'azure'): string | null {
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

  // Check for Azure OpenAI
  if (provider === 'azure') {
    const baseURL = process.env['AZURE_OPENAI_BASE_URL'];
    if (baseURL) return baseURL;
    // Check config
    const config = loadConfig();
    return config.providers.azure?.baseURL || null;
  }

  return null;
}

export function getAzureConfig(): { apiKey: string; baseURL: string; deploymentName: string } | null {
  const config = loadConfig();
  const azure = config.providers.azure;

  // Get API key from env or config
  const apiKey = process.env['AZURE_OPENAI_API_KEY'] || azure?.apiKey;
  if (!apiKey) return null;

  // Get base URL from env or config
  const baseURL = process.env['AZURE_OPENAI_BASE_URL'] || azure?.baseURL;
  if (!baseURL) return null;

  // Get deployment name from env or config
  const deploymentName = process.env['AZURE_OPENAI_DEPLOYMENT'] || azure?.deploymentName;
  if (!deploymentName) return null;

  return { apiKey, baseURL, deploymentName };
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
  -m, --model <model>     LLM model to use (default: Kimi-K2.5)
  -c, --continue [id]     Continue last session or specific session ID
  --api-key <key>         API key for the provider
  --provider <name>       Provider: azure, anthropic, openrouter, openai, local
  -h, --help              Show this help message
  -v, --version           Show version

Environment Variables:
  AZURE_OPENAI_API_KEY    Azure OpenAI API key (default provider)
  AZURE_OPENAI_BASE_URL   Azure OpenAI endpoint
  ANTHROPIC_API_KEY       Anthropic API key
  OPENROUTER_API_KEY      OpenRouter API key
  OPENAI_API_KEY          OpenAI API key

Config File:
  ~/.memcode/config.json  Persistent configuration

  Example config:
  {
    "defaultModel": "Kimi-K2.5",
    "defaultProvider": "azure",
    "providers": {
      "azure": {
        "baseURL": "https://swedencentral.api.cognitive.microsoft.com/openai/v1/",
        "deploymentName": "Kimi-K2.5"
      }
    },
    "ui": {
      "showDiffs": true,
      "showCosts": true
    }
  }

Models:
  Azure:       Kimi-K2.5 (default)
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
  /feature    Set feature context
  /cost       Show cost summary
  /diff       Toggle diff display
  /save       Save session
  /sessions   List saved sessions
  /clear      Clear conversation
  /exit       Exit memcode
`);
}
