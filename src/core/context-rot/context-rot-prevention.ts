import type Database from 'better-sqlite3';
import type {
  ContextHealth,
  CompactionResult,
  CompactionOptions,
  CompactionSuggestion,
  CriticalContext,
  DriftResult
} from '../../types/documentation.js';
import { ContextHealthMonitor } from './context-health.js';
import { DriftDetector } from './drift-detector.js';
import { CompactionEngine } from './compaction.js';
import { CriticalContextManager } from './critical-context.js';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export class ContextRotPrevention {
  private healthMonitor: ContextHealthMonitor;
  private driftDetector: DriftDetector;
  private compactionEngine: CompactionEngine;
  private criticalManager: CriticalContextManager;
  private db: Database.Database;

  constructor(db: Database.Database, tokenLimit?: number) {
    this.db = db;
    this.criticalManager = new CriticalContextManager(db);
    this.healthMonitor = new ContextHealthMonitor(db, this.criticalManager, tokenLimit);
    this.driftDetector = new DriftDetector(this.criticalManager);
    this.compactionEngine = new CompactionEngine(this.healthMonitor, this.criticalManager);
  }

  // ========== Context Health ==========

  getContextHealth(): ContextHealth {
    const driftResult = this.driftDetector.detectDrift();
    return this.healthMonitor.getHealth(driftResult.driftScore);
  }

  setTokenLimit(limit: number): void {
    this.healthMonitor.setTokenLimit(limit);
  }

  setCurrentTokens(tokens: number): void {
    this.healthMonitor.setCurrentTokens(tokens);
  }

  addContextChunk(content: string, tokens: number, type: 'message' | 'decision' | 'requirement' | 'instruction' | 'code' = 'message'): void {
    this.healthMonitor.addChunk({
      content,
      tokens,
      timestamp: new Date(),
      type
    });
  }

  // ========== Message Tracking ==========

  addMessage(message: Message): void {
    this.driftDetector.addMessage(message);

    // Also add as context chunk
    const tokens = this.healthMonitor.estimateTokens(message.content);
    this.addContextChunk(message.content, tokens, 'message');
  }

  clearConversation(): void {
    this.driftDetector.clearHistory();
    this.healthMonitor.clearChunks();
  }

  // ========== Drift Detection ==========

  detectDrift(): DriftResult {
    return this.driftDetector.detectDrift();
  }

  addRequirement(requirement: string): void {
    this.driftDetector.addRequirement(requirement);
  }

  getRequirements(): string[] {
    return this.driftDetector.getInitialRequirements();
  }

  // ========== Critical Context ==========

  markCritical(
    content: string,
    options?: {
      type?: CriticalContext['type'];
      reason?: string;
      source?: string;
    }
  ): CriticalContext {
    return this.criticalManager.markCritical(content, options);
  }

  getCriticalContext(type?: CriticalContext['type']): CriticalContext[] {
    return this.criticalManager.getCriticalContext(type);
  }

  removeCritical(id: string): boolean {
    return this.criticalManager.removeCritical(id);
  }

  getAllCriticalContent(): string {
    return this.criticalManager.getAllCriticalContent();
  }

  // ========== Compaction ==========

  suggestCompaction(): CompactionSuggestion {
    return this.compactionEngine.suggestCompaction();
  }

  triggerCompaction(options: CompactionOptions): CompactionResult {
    const result = this.compactionEngine.compact(options);

    // Log compaction event
    this.logCompactionEvent(result);

    return result;
  }

  autoCompact(): CompactionResult {
    const result = this.compactionEngine.autoCompact();
    this.logCompactionEvent(result);
    return result;
  }

  private logCompactionEvent(result: CompactionResult): void {
    try {
      const stmt = this.db.prepare(`
        UPDATE context_health_history
        SET compaction_triggered = 1
        WHERE id = (SELECT MAX(id) FROM context_health_history)
      `);
      stmt.run();
    } catch {
      // Ignore logging errors
    }
  }

  // ========== Health History ==========

  getHealthHistory(limit: number = 20): Array<{
    timestamp: Date;
    health: ContextHealth['health'];
    utilizationPercent: number;
    driftScore: number;
  }> {
    return this.healthMonitor.getHealthHistory(limit);
  }

  // ========== Utilities ==========

  estimateTokens(text: string): number {
    return this.healthMonitor.estimateTokens(text);
  }

  isCritical(content: string): boolean {
    return this.criticalManager.isCritical(content);
  }

  extractCriticalFromText(text: string): Array<{ content: string; type: CriticalContext['type'] }> {
    return this.criticalManager.extractCriticalFromText(text);
  }

  // ========== Summary for AI ==========

  getContextSummaryForAI(): string {
    const health = this.getContextHealth();
    const critical = this.getAllCriticalContent();
    const drift = this.detectDrift();

    const parts: string[] = [];

    // Health status
    parts.push(`Context Health: ${health.health.toUpperCase()} (${health.utilizationPercent}% used)`);

    if (health.driftDetected) {
      parts.push(`\nWARNING: Drift detected (score: ${health.driftScore})`);

      if (drift.missingRequirements.length > 0) {
        parts.push('\nMissing requirements:');
        for (const req of drift.missingRequirements.slice(0, 3)) {
          parts.push(`- ${req}`);
        }
      }

      if (drift.suggestedReminders.length > 0) {
        parts.push('\nReminders:');
        for (const reminder of drift.suggestedReminders.slice(0, 3)) {
          parts.push(`- ${reminder}`);
        }
      }
    }

    if (critical) {
      parts.push(`\n${critical}`);
    }

    if (health.compactionNeeded) {
      parts.push(`\nSuggestion: ${health.suggestions[0] || 'Consider compacting context'}`);
    }

    return parts.join('\n');
  }
}
