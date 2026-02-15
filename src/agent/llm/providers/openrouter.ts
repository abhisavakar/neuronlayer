// OpenRouter provider for memcode agent - supports 200+ models

import type {
  LLMProvider,
  LLMProviderConfig,
  LLMResponse,
  Message,
  StreamChunk,
  ToolCall,
  ToolDefinition
} from '../types.js';

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: OpenRouterToolCall[];
  tool_call_id?: string;
}

interface OpenRouterToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: OpenRouterToolCall[];
    };
    finish_reason: 'stop' | 'tool_calls' | 'length';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

const POPULAR_MODELS = [
  'anthropic/claude-sonnet-4-20250514',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-opus',
  'anthropic/claude-3-haiku',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/gpt-4-turbo',
  'openai/o1',
  'openai/o1-mini',
  'google/gemini-pro-1.5',
  'google/gemini-flash-1.5',
  'meta-llama/llama-3.1-405b-instruct',
  'meta-llama/llama-3.1-70b-instruct',
  'mistralai/mistral-large',
  'mistralai/mixtral-8x22b-instruct'
];

export class OpenRouterProvider implements LLMProvider {
  name = 'openrouter';
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private baseURL: string;

  constructor(config: LLMProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'anthropic/claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens || 8192;
    this.temperature = config.temperature ?? 0.7;
    this.baseURL = config.baseURL || 'https://openrouter.ai/api/v1';
  }

  async complete(
    messages: Message[],
    tools?: ToolDefinition[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    const openRouterMessages = this.convertMessages(messages, systemPrompt);

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: openRouterMessages
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema
        }
      }));
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/memorylayer/memcode',
        'X-Title': 'memcode'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OpenRouterResponse;
    return this.parseResponse(data);
  }

  async *stream(
    messages: Message[],
    tools?: ToolDefinition[],
    systemPrompt?: string
  ): AsyncGenerator<StreamChunk> {
    const openRouterMessages = this.convertMessages(messages, systemPrompt);

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: openRouterMessages,
      stream: true
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema
        }
      }));
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/memorylayer/memcode',
        'X-Title': 'memcode'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentToolCalls: Map<number, Partial<ToolCall>> = new Map();
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
          if (data === '[DONE]') {
            yield {
              type: 'done',
              usage: { inputTokens, outputTokens }
            };
            continue;
          }

          try {
            const event = JSON.parse(data);
            const choice = event.choices?.[0];

            if (!choice) continue;

            const delta = choice.delta;

            // Handle text content
            if (delta?.content) {
              yield {
                type: 'text',
                text: delta.content
              };
            }

            // Handle tool calls
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const index = tc.index ?? 0;

                if (tc.id) {
                  // New tool call starting
                  currentToolCalls.set(index, {
                    id: tc.id,
                    name: tc.function?.name,
                    arguments: {}
                  });
                  yield {
                    type: 'tool_call_start',
                    toolCall: currentToolCalls.get(index)
                  };
                }

                if (tc.function?.arguments) {
                  yield {
                    type: 'tool_call_delta',
                    text: tc.function.arguments
                  };
                }
              }
            }

            // Handle finish
            if (choice.finish_reason) {
              for (const [, toolCall] of currentToolCalls) {
                yield {
                  type: 'tool_call_end',
                  toolCall
                };
              }
              currentToolCalls.clear();
            }

            // Capture usage if available
            if (event.usage) {
              inputTokens = event.usage.prompt_tokens || 0;
              outputTokens = event.usage.completion_tokens || 0;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  getModels(): string[] {
    return POPULAR_MODELS;
  }

  getCurrentModel(): string {
    return this.model;
  }

  setModel(model: string): void {
    this.model = model;
  }

  private convertMessages(messages: Message[], systemPrompt?: string): OpenRouterMessage[] {
    const result: OpenRouterMessage[] = [];

    // Add system prompt first
    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === 'system') {
        result.push({ role: 'system', content: msg.content });
        continue;
      }

      if (msg.role === 'user') {
        result.push({ role: 'user', content: msg.content });
        continue;
      }

      if (msg.role === 'assistant') {
        const assistantMsg: OpenRouterMessage = {
          role: 'assistant',
          content: msg.content || ''
        };

        if (msg.toolCalls && msg.toolCalls.length > 0) {
          assistantMsg.tool_calls = msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments)
            }
          }));
        }

        result.push(assistantMsg);

        // Add tool results as separate messages
        if (msg.toolResults) {
          for (const tr of msg.toolResults) {
            result.push({
              role: 'tool',
              tool_call_id: tr.toolCallId,
              content: typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result)
            });
          }
        }
      }
    }

    return result;
  }

  private parseResponse(data: OpenRouterResponse): LLMResponse {
    const choice = data.choices[0];
    const message = choice?.message;

    if (!message) {
      throw new Error('No message in response');
    }

    const toolCalls: ToolCall[] = [];
    if (message.tool_calls) {
      for (const tc of message.tool_calls) {
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments)
        });
      }
    }

    return {
      content: message.content || '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens
      },
      stopReason: choice.finish_reason === 'stop' ? 'end_turn' :
                  choice.finish_reason === 'tool_calls' ? 'tool_use' : 'max_tokens'
    };
  }
}
