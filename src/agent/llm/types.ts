// LLM Provider Types for memcode agent

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason?: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
}

export interface StreamChunk {
  type: 'text' | 'tool_call_start' | 'tool_call_delta' | 'tool_call_end' | 'done';
  text?: string;
  toolCall?: Partial<ToolCall>;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface LLMProviderConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseURL?: string;
}

export interface LLMProvider {
  name: string;

  // Non-streaming completion
  complete(
    messages: Message[],
    tools?: ToolDefinition[],
    systemPrompt?: string
  ): Promise<LLMResponse>;

  // Streaming completion
  stream(
    messages: Message[],
    tools?: ToolDefinition[],
    systemPrompt?: string
  ): AsyncGenerator<StreamChunk>;

  // Get available models
  getModels(): string[];

  // Get current model
  getCurrentModel(): string;

  // Set model
  setModel(model: string): void;
}

export interface CostInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
}

export interface ProviderFactory {
  create(config: LLMProviderConfig): LLMProvider;
}
