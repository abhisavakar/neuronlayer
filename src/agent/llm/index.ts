// LLM Provider Factory for memcode agent

import type { LLMProvider, LLMProviderConfig } from './types.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { OpenRouterProvider } from './providers/openrouter.js';
import { OpenAIProvider } from './providers/openai.js';

export type ProviderName = 'anthropic' | 'openrouter' | 'openai' | 'azure' | 'local';

export interface ProviderConfig {
  anthropic?: LLMProviderConfig;
  openrouter?: LLMProviderConfig;
  openai?: LLMProviderConfig;
  azure?: LLMProviderConfig;
  local?: LLMProviderConfig;
}

export function createProvider(name: ProviderName, config: LLMProviderConfig): LLMProvider {
  switch (name) {
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openrouter':
      return new OpenRouterProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'azure':
      // Azure OpenAI - uses OpenAI-compatible API with Azure endpoint
      return new OpenAIProvider({
        ...config,
        baseURL: config.baseURL || 'https://swedencentral.api.cognitive.microsoft.com/openai/v1/'
      });
    case 'local':
      // Use OpenAI-compatible API for local models (Ollama, etc.)
      return new OpenAIProvider({
        ...config,
        baseURL: config.baseURL || 'http://localhost:11434/v1',
        apiKey: config.apiKey || 'ollama' // Ollama doesn't need a real key
      });
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

export function detectProviderFromModel(model: string): ProviderName {
  if (model.startsWith('claude') || model.startsWith('anthropic/')) {
    return model.includes('/') ? 'openrouter' : 'anthropic';
  }
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('openai/')) {
    return model.includes('/') ? 'openrouter' : 'openai';
  }
  if (model.startsWith('Kimi') || model.startsWith('kimi')) {
    // Kimi models default to Azure
    return 'azure';
  }
  if (model.includes('/')) {
    // Assumes format like "meta-llama/llama-3.1-70b" for OpenRouter
    return 'openrouter';
  }
  // Default to local for unknown models
  return 'local';
}

export function parseModelString(modelString: string): { provider: ProviderName; model: string } {
  // Format: "provider/model" or just "model"
  // Examples:
  //   "anthropic/claude-3.5-sonnet" -> { provider: 'anthropic', model: 'claude-3.5-sonnet' }
  //   "openrouter/anthropic/claude-3.5-sonnet" -> { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' }
  //   "gpt-4o" -> { provider: 'openai', model: 'gpt-4o' }
  //   "claude-3.5-sonnet" -> { provider: 'anthropic', model: 'claude-3.5-sonnet' }

  const parts = modelString.split('/');

  if (parts.length === 1) {
    // No prefix, auto-detect
    const modelPart = parts[0] || modelString;
    const provider = detectProviderFromModel(modelPart);
    return { provider, model: modelPart };
  }

  // Check if first part is a provider name
  const firstPart = (parts[0] || '').toLowerCase() as ProviderName;
  if (['anthropic', 'openrouter', 'openai', 'azure', 'local'].includes(firstPart)) {
    return {
      provider: firstPart,
      model: parts.slice(1).join('/') || modelString
    };
  }

  // Assume OpenRouter format (org/model)
  return {
    provider: 'openrouter',
    model: modelString
  };
}

// Cost tracking (per 1M tokens)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
  'claude-3-opus-20240229': { input: 15, output: 75 },
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'o1': { input: 15, output: 60 },
  'o1-mini': { input: 3, output: 12 },
  // Azure / Kimi
  'Kimi-K2.5': { input: 0, output: 0 },  // Free tier on Azure
  'kimi-k2.5': { input: 0, output: 0 },
  // OpenRouter variants
  'anthropic/claude-sonnet-4-20250514': { input: 3, output: 15 },
  'anthropic/claude-3.5-sonnet': { input: 3, output: 15 },
  'anthropic/claude-3-opus': { input: 15, output: 75 },
  'openai/gpt-4o': { input: 2.5, output: 10 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  // Free/cheap models
  'meta-llama/llama-3.1-405b-instruct': { input: 2, output: 2 },
  'meta-llama/llama-3.1-70b-instruct': { input: 0.35, output: 0.4 },
  'google/gemini-pro-1.5': { input: 1.25, output: 5 },
  'google/gemini-flash-1.5': { input: 0.075, output: 0.3 }
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || { input: 1, output: 2 }; // Default fallback
  return (costs.input * inputTokens + costs.output * outputTokens) / 1_000_000;
}

export { LLMProvider, LLMProviderConfig, Message, ToolCall, ToolResult, ToolDefinition, LLMResponse, StreamChunk } from './types.js';
