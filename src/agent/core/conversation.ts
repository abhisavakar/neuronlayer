// Conversation management for memcode agent

import type { Message, ToolCall, ToolResult } from '../llm/types.js';
import { SYSTEM_PROMPT } from '../prompts/system.js';

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
    this.systemPrompt = options.systemPrompt || SYSTEM_PROMPT;
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
