// Conversation management for memcode agent

import type { Message, ToolCall, ToolResult } from '../llm/types.js';

export interface ConversationOptions {
  maxMessages?: number;
  systemPrompt?: string;
}

export class Conversation {
  private messages: Message[] = [];
  private systemPrompt: string;
  private maxMessages: number;

  constructor(options: ConversationOptions = {}) {
    this.maxMessages = options.maxMessages || 100;
    this.systemPrompt = options.systemPrompt || this.getDefaultSystemPrompt();
  }

  private getDefaultSystemPrompt(): string {
    return `You are memcode, an intelligent coding assistant powered by MemoryLayer.

You have access to powerful memory and code intelligence tools that let you:
- Search and understand the codebase semantically
- Track and recall architectural decisions
- Learn patterns and enforce consistency
- Predict relevant files and context
- Diagnose bugs and suggest fixes
- Generate and validate documentation

Key capabilities:
1. **Persistent Memory**: Decisions, patterns, and context persist across sessions
2. **Semantic Understanding**: 384-dimensional embeddings for accurate code search
3. **Change Intelligence**: Track what changed, diagnose why things broke
4. **Architecture Enforcement**: Learn and validate patterns
5. **Test Awareness**: Predict test failures, suggest updates

When responding:
- Use tools to gather context before answering
- Be concise but thorough
- Reference specific files and line numbers
- Record important decisions for future sessions
- Validate code against established patterns

Always think step by step and use the available tools effectively.`;
  }

  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  addUserMessage(content: string): void {
    this.messages.push({ role: 'user', content });
    this.trimIfNeeded();
  }

  addAssistantMessage(content: string, toolCalls?: ToolCall[]): void {
    this.messages.push({ role: 'assistant', content, toolCalls });
    this.trimIfNeeded();
  }

  addToolResults(results: ToolResult[]): void {
    // Find the last assistant message and attach results
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.toolResults = results;
    }
  }

  clear(): void {
    this.messages = [];
  }

  private trimIfNeeded(): void {
    // Keep system context by preserving important messages
    if (this.messages.length > this.maxMessages) {
      // Keep first 10 messages (often contain important context)
      // and last (maxMessages - 10) messages
      const preserveStart = 10;
      const keepRecent = this.maxMessages - preserveStart;

      this.messages = [
        ...this.messages.slice(0, preserveStart),
        ...this.messages.slice(-keepRecent)
      ];
    }
  }

  getMessageCount(): number {
    return this.messages.length;
  }

  getLastUserMessage(): string | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      if (msg && msg.role === 'user') {
        return msg.content;
      }
    }
    return null;
  }

  getLastAssistantMessage(): string | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      if (msg && msg.role === 'assistant') {
        return msg.content;
      }
    }
    return null;
  }

  // Serialize for persistence
  toJSON(): object {
    return {
      messages: this.messages,
      systemPrompt: this.systemPrompt
    };
  }

  // Restore from persistence
  static fromJSON(data: { messages: Message[]; systemPrompt?: string }): Conversation {
    const conv = new Conversation({ systemPrompt: data.systemPrompt });
    conv.messages = data.messages || [];
    return conv;
  }
}
