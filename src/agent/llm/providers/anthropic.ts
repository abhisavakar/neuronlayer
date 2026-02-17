// Anthropic Claude provider for memcode agent

import type {
  LLMProvider,
  LLMProviderConfig,
  LLMResponse,
  Message,
  StreamChunk,
  ToolCall,
  ToolDefinition
} from '../types.js';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: AnthropicContent[];
}

type AnthropicContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContent[];
  model: string;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const ANTHROPIC_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229'
];

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private baseURL: string;
  private isAzure: boolean;

  constructor(config: LLMProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens || 8192;
    this.temperature = config.temperature ?? 0.7;
    this.baseURL = config.baseURL || 'https://api.anthropic.com';
    // Detect Azure Foundry endpoint
    this.isAzure = this.baseURL.includes('azure') || this.baseURL.includes('cognitive.microsoft.com');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    };

    // Azure uses 'api-key', Anthropic uses 'x-api-key'
    if (this.isAzure) {
      headers['api-key'] = this.apiKey;
    } else {
      headers['x-api-key'] = this.apiKey;
    }

    return headers;
  }

  async complete(
    messages: Message[],
    tools?: ToolDefinition[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    const anthropicMessages = this.convertMessages(messages);
    const anthropicTools = tools ? this.convertTools(tools) : undefined;

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      messages: anthropicMessages
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    if (anthropicTools && anthropicTools.length > 0) {
      body.tools = anthropicTools;
    }

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    return this.parseResponse(data);
  }

  async *stream(
    messages: Message[],
    tools?: ToolDefinition[],
    systemPrompt?: string
  ): AsyncGenerator<StreamChunk> {
    const anthropicMessages = this.convertMessages(messages);
    const anthropicTools = tools ? this.convertTools(tools) : undefined;

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      messages: anthropicMessages,
      stream: true
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    if (anthropicTools && anthropicTools.length > 0) {
      body.tools = anthropicTools;
    }

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentToolCall: Partial<ToolCall> | null = null;
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);

            switch (event.type) {
              case 'message_start':
                if (event.message?.usage) {
                  inputTokens = event.message.usage.input_tokens || 0;
                }
                break;

              case 'content_block_start':
                if (event.content_block?.type === 'tool_use') {
                  currentToolCall = {
                    id: event.content_block.id,
                    name: event.content_block.name,
                    arguments: {}
                  };
                  yield {
                    type: 'tool_call_start',
                    toolCall: currentToolCall
                  };
                }
                break;

              case 'content_block_delta':
                if (event.delta?.type === 'text_delta') {
                  yield {
                    type: 'text',
                    text: event.delta.text
                  };
                } else if (event.delta?.type === 'input_json_delta' && currentToolCall) {
                  yield {
                    type: 'tool_call_delta',
                    text: event.delta.partial_json
                  };
                }
                break;

              case 'content_block_stop':
                if (currentToolCall) {
                  yield {
                    type: 'tool_call_end',
                    toolCall: currentToolCall
                  };
                  currentToolCall = null;
                }
                break;

              case 'message_delta':
                if (event.usage) {
                  outputTokens = event.usage.output_tokens || 0;
                }
                break;

              case 'message_stop':
                yield {
                  type: 'done',
                  usage: { inputTokens, outputTokens }
                };
                break;
            }
          } catch {
            // Ignore parse errors for partial JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  getModels(): string[] {
    return ANTHROPIC_MODELS;
  }

  getCurrentModel(): string {
    return this.model;
  }

  setModel(model: string): void {
    this.model = model;
  }

  private convertMessages(messages: Message[]): AnthropicMessage[] {
    const result: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // System messages are handled separately
        continue;
      }

      const content: AnthropicContent[] = [];

      // Add text content
      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }

      // Add tool calls if present (for assistant messages)
      if (msg.toolCalls && msg.role === 'assistant') {
        for (const tc of msg.toolCalls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments
          });
        }
      }

      // Add tool results if present
      if (msg.toolResults) {
        for (const tr of msg.toolResults) {
          content.push({
            type: 'tool_result',
            tool_use_id: tr.toolCallId,
            content: typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result),
            is_error: tr.isError
          });
        }
      }

      if (content.length > 0) {
        result.push({
          role: msg.role as 'user' | 'assistant',
          content
        });
      }
    }

    return result;
  }

  private convertTools(tools: ToolDefinition[]): AnthropicTool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema
    }));
  }

  private parseResponse(data: AnthropicResponse): LLMResponse {
    let textContent = '';
    const toolCalls: ToolCall[] = [];

    for (const block of data.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input
        });
      }
    }

    return {
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens
      },
      stopReason: data.stop_reason
    };
  }
}
