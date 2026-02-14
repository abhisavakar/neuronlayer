import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import type { Tier1Context, Decision, ActiveFile, ContextSnippet, Session } from '../types/index.js';

const MAX_RECENT_DECISIONS = 20;
const MAX_IMMEDIATE_CONTEXT = 10;
const MAX_FILES_VIEWED = 50;

export class Tier1Storage {
  private filePath: string;
  private context: Tier1Context;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, 'tier1.json');
    this.context = this.load();
  }

  private getDefaultContext(): Tier1Context {
    return {
      activeFile: null,
      recentDecisions: [],
      session: {
        startTime: new Date(),
        filesViewed: [],
        currentGoal: undefined
      },
      immediateContext: []
    };
  }

  load(): Tier1Context {
    try {
      if (existsSync(this.filePath)) {
        const data = JSON.parse(readFileSync(this.filePath, 'utf-8'));
        // Parse dates
        if (data.session?.startTime) {
          data.session.startTime = new Date(data.session.startTime);
        }
        if (data.recentDecisions) {
          data.recentDecisions = data.recentDecisions.map((d: Decision) => ({
            ...d,
            createdAt: new Date(d.createdAt)
          }));
        }
        if (data.immediateContext) {
          data.immediateContext = data.immediateContext.map((c: ContextSnippet) => ({
            ...c,
            timestamp: new Date(c.timestamp)
          }));
        }
        return data;
      }
    } catch (error) {
      console.error('Error loading tier1 context:', error);
    }
    return this.getDefaultContext();
  }

  save(): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.filePath, JSON.stringify(this.context, null, 2));
    } catch (error) {
      console.error('Error saving tier1 context:', error);
    }
  }

  getContext(): Tier1Context {
    return this.context;
  }

  setActiveFile(file: ActiveFile | null): void {
    this.context.activeFile = file;

    if (file && !this.context.session.filesViewed.includes(file.path)) {
      this.context.session.filesViewed.unshift(file.path);
      // Limit files viewed list
      if (this.context.session.filesViewed.length > MAX_FILES_VIEWED) {
        this.context.session.filesViewed = this.context.session.filesViewed.slice(0, MAX_FILES_VIEWED);
      }
    }

    this.save();
  }

  addDecision(decision: Decision): void {
    // Remove existing decision with same ID if present
    this.context.recentDecisions = this.context.recentDecisions.filter(d => d.id !== decision.id);

    // Add new decision at the beginning
    this.context.recentDecisions.unshift(decision);

    // Limit recent decisions
    if (this.context.recentDecisions.length > MAX_RECENT_DECISIONS) {
      this.context.recentDecisions = this.context.recentDecisions.slice(0, MAX_RECENT_DECISIONS);
    }

    this.save();
  }

  getRecentDecisions(limit: number = 10): Decision[] {
    return this.context.recentDecisions.slice(0, limit);
  }

  addImmediateContext(snippet: ContextSnippet): void {
    this.context.immediateContext.unshift(snippet);

    if (this.context.immediateContext.length > MAX_IMMEDIATE_CONTEXT) {
      this.context.immediateContext = this.context.immediateContext.slice(0, MAX_IMMEDIATE_CONTEXT);
    }

    this.save();
  }

  setCurrentGoal(goal: string | undefined): void {
    this.context.session.currentGoal = goal;
    this.save();
  }

  startNewSession(): void {
    this.context = this.getDefaultContext();
    this.save();
  }

  getSession(): Session {
    return this.context.session;
  }

  getFilesViewed(): string[] {
    return this.context.session.filesViewed;
  }
}
