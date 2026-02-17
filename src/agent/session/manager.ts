// Session management for memcode agent

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { Message } from '../llm/types.js';
import { Conversation } from '../core/conversation.js';

export interface SessionMetadata {
  id: string;
  projectPath: string;
  startedAt: Date;
  lastActiveAt: Date;
  messageCount: number;
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
}

export interface SessionData {
  metadata: SessionMetadata;
  conversation: {
    messages: Message[];
    systemPrompt: string;
  };
}

export class SessionManager {
  private sessionsDir: string;
  private currentSession: SessionData | null = null;

  constructor(dataDir: string) {
    this.sessionsDir = join(dataDir, 'agent-sessions');
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  createSession(projectPath: string, model: string): SessionData {
    const id = this.generateSessionId();
    const now = new Date();

    this.currentSession = {
      metadata: {
        id,
        projectPath,
        startedAt: now,
        lastActiveAt: now,
        messageCount: 0,
        model,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        estimatedCost: 0
      },
      conversation: {
        messages: [],
        systemPrompt: ''
      }
    };

    return this.currentSession;
  }

  getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  updateSession(
    conversation: Conversation,
    inputTokens: number,
    outputTokens: number,
    cost: number
  ): void {
    if (!this.currentSession) return;

    this.currentSession.metadata.lastActiveAt = new Date();
    this.currentSession.metadata.messageCount = conversation.getMessageCount();
    this.currentSession.metadata.totalInputTokens += inputTokens;
    this.currentSession.metadata.totalOutputTokens += outputTokens;
    this.currentSession.metadata.estimatedCost += cost;

    this.currentSession.conversation = conversation.toJSON() as SessionData['conversation'];
  }

  saveSession(): string | null {
    if (!this.currentSession) return null;

    const filename = `${this.currentSession.metadata.id}.json`;
    const filepath = join(this.sessionsDir, filename);

    writeFileSync(filepath, JSON.stringify(this.currentSession, null, 2));
    return filepath;
  }

  loadSession(sessionId: string): SessionData | null {
    const filepath = join(this.sessionsDir, `${sessionId}.json`);
    if (!existsSync(filepath)) {
      return null;
    }

    try {
      const data = JSON.parse(readFileSync(filepath, 'utf-8'));
      // Convert date strings back to Date objects
      data.metadata.startedAt = new Date(data.metadata.startedAt);
      data.metadata.lastActiveAt = new Date(data.metadata.lastActiveAt);

      this.currentSession = data;
      return data;
    } catch (error) {
      console.error(`Error loading session ${sessionId}:`, error);
      return null;
    }
  }

  getRecentSessions(limit: number = 10): SessionMetadata[] {
    try {
      const files = readdirSync(this.sessionsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const filepath = join(this.sessionsDir, f);
          try {
            const data = JSON.parse(readFileSync(filepath, 'utf-8'));
            return {
              ...data.metadata,
              startedAt: new Date(data.metadata.startedAt),
              lastActiveAt: new Date(data.metadata.lastActiveAt)
            } as SessionMetadata;
          } catch {
            return null;
          }
        })
        .filter((m): m is SessionMetadata => m !== null)
        .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());

      return files.slice(0, limit);
    } catch {
      return [];
    }
  }

  getMostRecentSession(): SessionMetadata | null {
    const sessions = this.getRecentSessions(1);
    return sessions[0] || null;
  }

  getSessionConversation(sessionId: string): Conversation | null {
    const data = this.loadSession(sessionId);
    if (!data) return null;

    return Conversation.fromJSON(data.conversation);
  }

  deleteSession(sessionId: string): boolean {
    const filepath = join(this.sessionsDir, `${sessionId}.json`);
    if (!existsSync(filepath)) {
      return false;
    }

    try {
      const { unlinkSync } = require('fs');
      unlinkSync(filepath);
      return true;
    } catch {
      return false;
    }
  }

  setModel(model: string): void {
    if (this.currentSession) {
      this.currentSession.metadata.model = model;
    }
  }

  getStats(): {
    totalSessions: number;
    totalTokens: number;
    totalCost: number;
  } {
    const sessions = this.getRecentSessions(1000); // Get all sessions
    return {
      totalSessions: sessions.length,
      totalTokens: sessions.reduce((sum, s) => sum + s.totalInputTokens + s.totalOutputTokens, 0),
      totalCost: sessions.reduce((sum, s) => sum + s.estimatedCost, 0)
    };
  }

  private generateSessionId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const random = Math.random().toString(36).slice(2, 6);
    return `${dateStr}-${timeStr}-${random}`;
  }
}
