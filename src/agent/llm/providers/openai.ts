// OpenAI provider for memcode agent

import type {
  LLMProvider,
  LLMProviderConfig,
  LLMResponse,
  Message,
  StreamChunk,
  ToolCall,
  ToolDefinition
} from '../types.js';

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAIResponse {
  id: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string | null;
      reasoning_content?: string | null; // For reasoning models like o1, Kimi
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: 'stop' | 'tool_calls' | 'length';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'o1',
  'o1-mini',
  'o1-preview'
];

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private baseURL: string;
  private isAzure: boolean;

  constructor(config: LLMProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o';
    this.maxTokens = config.maxTokens || 8192;
    this.temperature = config.temperature ?? 0.7;
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    // Detect Azure endpoint
    this.isAzure = this.baseURL.includes('azure') || this.baseURL.includes('cognitive.microsoft.com');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Azure uses 'api-key', OpenAI uses 'Authorization: Bearer'
    if (this.isAzure) {
      headers['api-key'] = this.apiKey;
    } else {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  async complete(
    messages: Message[],
    tools?: ToolDefinition[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    const openAIMessages = this.convertMessages(messages, systemPrompt);

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: openAIMessages
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
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    return this.parseResponse(data);
  }

  async *stream(
    messages: Message[],
    tools?: ToolDefinition[],
    systemPrompt?: string
  ): AsyncGenerator<StreamChunk> {
    const openAIMessages = this.convertMessages(messages, systemPrompt);

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: openAIMessages,
      stream: true,
      stream_options: { include_usage: true }
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
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentToolCalls: Map<number, Partial<ToolCall> & { argumentsJson: string }> = new Map();
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

            // Capture usage if available
            if (event.usage) {
              inputTokens = event.usage.prompt_tokens || 0;
              outputTokens = event.usage.completion_tokens || 0;
            }

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
                    arguments: {},
                    argumentsJson: ''
                  });
                  yield {
                    type: 'tool_call_start',
                    toolCall: { id: tc.id, name: tc.function?.name }
                  };
                }

                if (tc.function?.arguments) {
                  const current = currentToolCalls.get(index);
                  if (current) {
                    current.argumentsJson += tc.function.arguments;
                  }
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
                try {
                  toolCall.arguments = JSON.parse(toolCall.argumentsJson || '{}');
                } catch {
                  toolCall.arguments = {};
                }
                yield {
                  type: 'tool_call_end',
                  toolCall: {
                    id: toolCall.id!,
                    name: toolCall.name!,
                    arguments: toolCall.arguments!
                  }
                };
              }
              currentToolCalls.clear();
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
    return OPENAI_MODELS;
  }

  getCurrentModel(): string {
    return this.model;
  }

  setModel(model: string): void {
    this.model = model;
  }

  private convertMessages(messages: Message[], systemPrompt?: string): OpenAIMessage[] {
    const result: OpenAIMessage[] = [];

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
        const assistantMsg: OpenAIMessage = {
          role: 'assistant',
          content: msg.content || null
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

  private parseResponse(data: OpenAIResponse): LLMResponse {
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

    // Handle reasoning models - use reasoning_content if content is null
    const content = message.content || message.reasoning_content || '';

    return {
      content,
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
