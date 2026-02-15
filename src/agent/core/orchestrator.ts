// Orchestrator - Main agent loop for memcode

import type { LLMProvider, ToolCall, LLMResponse, StreamChunk, Message } from '../llm/types.js';
import type { MemoryLayerEngine } from '../../core/engine.js';
import { Conversation } from './conversation.js';
import { ToolExecutor } from '../tools/executor.js';
import { SessionManager } from '../session/manager.js';
import { estimateCost } from '../llm/index.js';

export interface OrchestratorConfig {
  engine: MemoryLayerEngine;
  provider: LLMProvider;
  projectPath: string;
  dataDir: string;
  maxTurns?: number;
  streamOutput?: boolean;
  onText?: (text: string) => void;
  onToolStart?: (name: string, args: Record<string, unknown>) => void;
  onToolEnd?: (name: string, result: unknown, isError: boolean) => void;
  onTurnComplete?: (response: LLMResponse) => void;
}

export interface TurnResult {
  content: string;
  toolsUsed: string[];
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  turnCount: number;
}

export class Orchestrator {
  private engine: MemoryLayerEngine;
  private provider: LLMProvider;
  private toolExecutor: ToolExecutor;
  private conversation: Conversation;
  private sessionManager: SessionManager;
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.engine = config.engine;
    this.provider = config.provider;
    this.toolExecutor = new ToolExecutor(config.engine, {
      projectPath: config.projectPath
    });
    this.conversation = new Conversation();
    this.sessionManager = new SessionManager(config.dataDir);

    // Start a new session
    this.sessionManager.createSession(config.projectPath, this.provider.getCurrentModel());
  }

  getConversation(): Conversation {
    return this.conversation;
  }

  setProvider(provider: LLMProvider): void {
    this.provider = provider;
    this.sessionManager.setModel(provider.getCurrentModel());
  }

  async processMessage(userMessage: string): Promise<TurnResult> {
    // Add user message to conversation
    this.conversation.addUserMessage(userMessage);

    // Track in MemoryLayer
    this.engine.trackQuery(userMessage, []);

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let turnCount = 0;
    const toolsUsed: string[] = [];
    let finalContent = '';

    const maxTurns = this.config.maxTurns || 10;

    while (turnCount < maxTurns) {
      turnCount++;

      let response: LLMResponse;

      if (this.config.streamOutput) {
        response = await this.processStreamingTurn();
      } else {
        response = await this.provider.complete(
          this.conversation.getMessages(),
          this.toolExecutor.getAllTools(),
          this.conversation.getSystemPrompt()
        );
      }

      // Track tokens
      if (response.usage) {
        totalInputTokens += response.usage.inputTokens;
        totalOutputTokens += response.usage.outputTokens;
      }

      // Emit turn complete
      this.config.onTurnComplete?.(response);

      // If no tool calls, we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        finalContent = response.content;
        this.conversation.addAssistantMessage(response.content);
        break;
      }

      // Process tool calls
      this.conversation.addAssistantMessage(response.content, response.toolCalls);

      const results = await Promise.all(
        response.toolCalls.map(async (tc) => {
          this.config.onToolStart?.(tc.name, tc.arguments);
          toolsUsed.push(tc.name);

          const result = await this.toolExecutor.execute(tc);

          this.config.onToolEnd?.(tc.name, result.result, result.isError || false);
          return result;
        })
      );

      // Add tool results to conversation
      this.conversation.addToolResults(results);

      // If this was the last turn, get the final content
      if (turnCount === maxTurns) {
        finalContent = response.content || 'Reached maximum number of turns.';
      }
    }

    // Calculate cost
    const model = this.provider.getCurrentModel();
    const cost = estimateCost(model, totalInputTokens, totalOutputTokens);

    // Update session
    this.sessionManager.updateSession(
      this.conversation,
      totalInputTokens,
      totalOutputTokens,
      cost
    );

    return {
      content: finalContent,
      toolsUsed,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      estimatedCost: cost,
      turnCount
    };
  }

  private async processStreamingTurn(): Promise<LLMResponse> {
    const stream = this.provider.stream(
      this.conversation.getMessages(),
      this.toolExecutor.getAllTools(),
      this.conversation.getSystemPrompt()
    );

    let content = '';
    const toolCalls: ToolCall[] = [];
    let currentToolCall: Partial<ToolCall> & { argumentsJson: string } | null = null;
    let usage = { inputTokens: 0, outputTokens: 0 };

    for await (const chunk of stream) {
      switch (chunk.type) {
        case 'text':
          content += chunk.text || '';
          this.config.onText?.(chunk.text || '');
          break;

        case 'tool_call_start':
          currentToolCall = {
            id: chunk.toolCall?.id,
            name: chunk.toolCall?.name,
            arguments: {},
            argumentsJson: ''
          };
          break;

        case 'tool_call_delta':
          if (currentToolCall) {
            currentToolCall.argumentsJson += chunk.text || '';
          }
          break;

        case 'tool_call_end':
          if (currentToolCall && currentToolCall.id && currentToolCall.name) {
            let parsedArgs: Record<string, unknown> = {};
            try {
              parsedArgs = JSON.parse(currentToolCall.argumentsJson || '{}');
            } catch {
              parsedArgs = {};
            }
            toolCalls.push({
              id: currentToolCall.id,
              name: currentToolCall.name,
              arguments: parsedArgs
            });
          }
          currentToolCall = null;
          break;

        case 'done':
          if (chunk.usage) {
            usage = chunk.usage;
          }
          break;
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage,
      stopReason: toolCalls.length > 0 ? 'tool_use' : 'end_turn'
    };
  }

  async runInteractive(
    readline: AsyncGenerator<string, void, unknown>,
    write: (text: string) => void
  ): Promise<void> {
    write('\n🧠 memcode - AI coding assistant powered by MemoryLayer\n');
    write(`📁 Project: ${this.config.projectPath}\n`);
    write(`🤖 Model: ${this.provider.getCurrentModel()}\n`);
    write(`🔧 Tools: ${this.toolExecutor.getToolCount()} available\n`);
    write('\nType your message or use /help for commands.\n\n');

    for await (const input of readline) {
      const trimmed = input.trim();

      if (!trimmed) continue;

      // Handle commands
      if (trimmed.startsWith('/')) {
        const handled = await this.handleCommand(trimmed, write);
        if (handled === 'exit') break;
        continue;
      }

      try {
        write('\n');

        const result = await this.processMessage(trimmed);

        // Show response
        if (!this.config.streamOutput) {
          write(result.content);
        }

        // Show stats
        write(`\n\n📊 ${result.inputTokens + result.outputTokens} tokens`);
        if (result.toolsUsed.length > 0) {
          write(` | 🔧 ${result.toolsUsed.length} tools`);
        }
        write(` | 💰 $${result.estimatedCost.toFixed(4)}\n\n`);

      } catch (error) {
        write(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n\n`);
      }
    }

    // Save session on exit
    const saved = this.sessionManager.saveSession();
    if (saved) {
      write(`\n💾 Session saved\n`);
    }
  }

  private async handleCommand(command: string, write: (text: string) => void): Promise<string | void> {
    const parts = command.slice(1).split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
        write('\n📚 Commands:\n');
        write('  /help          - Show this help\n');
        write('  /model [name]  - Show or switch model\n');
        write('  /models        - List available models\n');
        write('  /context       - Show current context\n');
        write('  /feature [name]- Set feature context\n');
        write('  /clear         - Clear conversation\n');
        write('  /save          - Save session\n');
        write('  /sessions      - List recent sessions\n');
        write('  /continue [id] - Continue a session\n');
        write('  /cost          - Show cost summary\n');
        write('  /exit          - Exit memcode\n');
        write('\n');
        break;

      case 'model':
        if (args[0]) {
          this.provider.setModel(args[0]);
          this.sessionManager.setModel(args[0]);
          write(`\n✅ Model switched to: ${args[0]}\n\n`);
        } else {
          write(`\n🤖 Current model: ${this.provider.getCurrentModel()}\n\n`);
        }
        break;

      case 'models':
        write('\n📋 Available models:\n');
        for (const model of this.provider.getModels()) {
          const current = model === this.provider.getCurrentModel() ? ' (current)' : '';
          write(`  ${model}${current}\n`);
        }
        write('\n');
        break;

      case 'context':
        const context = this.engine.getHotContext();
        write('\n📁 Active Context:\n');
        write(`  Summary: ${context.summary || 'None'}\n`);
        write(`  Files: ${context.files.length}\n`);
        write(`  Recent changes: ${context.changes.length}\n`);
        write(`  Recent queries: ${context.queries.length}\n\n`);
        break;

      case 'feature':
        if (args[0]) {
          this.engine.startFeatureContext(args.join(' '));
          write(`\n✅ Feature context set: ${args.join(' ')}\n\n`);
        } else {
          const summary = this.engine.getActiveContextSummary();
          if (summary) {
            write(`\n📋 Current feature: ${summary.name}\n`);
            write(`   Files: ${summary.files}, Changes: ${summary.changes}\n\n`);
          } else {
            write('\n📋 No active feature context\n\n');
          }
        }
        break;

      case 'clear':
        this.conversation.clear();
        write('\n✅ Conversation cleared\n\n');
        break;

      case 'save':
        const saved = this.sessionManager.saveSession();
        if (saved) {
          write(`\n💾 Session saved: ${saved}\n\n`);
        } else {
          write('\n❌ No active session to save\n\n');
        }
        break;

      case 'sessions':
        const sessions = this.sessionManager.getRecentSessions();
        if (sessions.length === 0) {
          write('\n📋 No recent sessions\n\n');
        } else {
          write('\n📋 Recent sessions:\n');
          for (const s of sessions) {
            const date = s.lastActiveAt.toLocaleString();
            write(`  ${s.id} - ${s.model} (${s.messageCount} msgs) - ${date}\n`);
          }
          write('\n');
        }
        break;

      case 'continue':
        if (args[0]) {
          const session = this.sessionManager.loadSession(args[0]);
          if (session) {
            this.conversation = Conversation.fromJSON(session.conversation);
            write(`\n✅ Continued session: ${args[0]}\n`);
            write(`   Messages: ${session.metadata.messageCount}\n\n`);
          } else {
            write(`\n❌ Session not found: ${args[0]}\n\n`);
          }
        } else {
          const recent = this.sessionManager.getMostRecentSession();
          if (recent) {
            const session = this.sessionManager.loadSession(recent.id);
            if (session) {
              this.conversation = Conversation.fromJSON(session.conversation);
              write(`\n✅ Continued most recent session: ${recent.id}\n\n`);
            }
          } else {
            write('\n❌ No sessions to continue\n\n');
          }
        }
        break;

      case 'cost':
        const stats = this.sessionManager.getStats();
        const current = this.sessionManager.getCurrentSession();
        write('\n💰 Cost Summary:\n');
        if (current) {
          write(`  This session: $${current.metadata.estimatedCost.toFixed(4)}\n`);
          write(`  Tokens: ${current.metadata.totalInputTokens + current.metadata.totalOutputTokens}\n`);
        }
        write(`  All time: $${stats.totalCost.toFixed(4)}\n`);
        write(`  Total sessions: ${stats.totalSessions}\n\n`);
        break;

      case 'exit':
      case 'quit':
        return 'exit';

      default:
        write(`\n❌ Unknown command: /${cmd}\n`);
        write('Use /help to see available commands.\n\n');
    }
  }

  saveSession(): string | null {
    return this.sessionManager.saveSession();
  }

  loadSession(sessionId: string): boolean {
    const session = this.sessionManager.loadSession(sessionId);
    if (session) {
      this.conversation = Conversation.fromJSON(session.conversation);
      return true;
    }
    return false;
  }
}
