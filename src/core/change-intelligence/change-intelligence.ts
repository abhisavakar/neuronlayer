import type Database from 'better-sqlite3';
import type { Tier2Storage } from '../../storage/tier2.js';
import type { EmbeddingGenerator } from '../../indexing/embeddings.js';
import type {
  Change,
  ChangeQueryResult,
  ChangeQueryOptions,
  Diagnosis,
  PastBug,
  FixSuggestion,
  Bug
} from '../../types/documentation.js';
import { ChangeTracker } from './change-tracker.js';
import { BugCorrelator } from './bug-correlator.js';
import { FixSuggester } from './fix-suggester.js';

export class ChangeIntelligence {
  private changeTracker: ChangeTracker;
  private bugCorrelator: BugCorrelator;
  private fixSuggester: FixSuggester;
  private initialized = false;
  private lastKnownHead: string | null = null;
  private lastBugScanHead: string | null = null;

  constructor(
    projectPath: string,
    db: Database.Database,
    tier2: Tier2Storage,
    embeddingGenerator: EmbeddingGenerator
  ) {
    this.changeTracker = new ChangeTracker(projectPath, db);
    this.bugCorrelator = new BugCorrelator(db, this.changeTracker, tier2, embeddingGenerator);
    this.fixSuggester = new FixSuggester(db, this.bugCorrelator, this.changeTracker);
  }

  // Initialize by syncing git history
  initialize(): number {
    if (this.initialized) return 0;

    const synced = this.changeTracker.syncFromGit(100);
    this.initialized = true;
    return synced;
  }

  // Sync recent git changes on-demand (event-driven alternative to polling)
  syncFromGit(limit: number = 20): number {
    return this.changeTracker.syncFromGit(limit);
  }

  /**
   * Get the last known HEAD commit
   */
  getLastKnownHead(): string | null {
    return this.lastKnownHead;
  }

  /**
   * Update the last known HEAD (call this after syncing)
   */
  setLastKnownHead(head: string): void {
    this.lastKnownHead = head;
  }

  /**
   * Get the last HEAD where we scanned for bug fixes
   */
  getLastBugScanHead(): string | null {
    return this.lastBugScanHead;
  }

  /**
   * Update the last bug scan HEAD (call this after scanning)
   */
  setLastBugScanHead(head: string): void {
    this.lastBugScanHead = head;
  }

  // Query what changed
  whatChanged(options: ChangeQueryOptions = {}): ChangeQueryResult {
    return this.changeTracker.queryChanges(options);
  }

  // Get changes for a specific file
  whatChangedIn(file: string, limit?: number): Change[] {
    return this.changeTracker.getFileChanges(file, limit);
  }

  // Get recent changes
  getRecentChanges(hours: number = 24): Change[] {
    return this.changeTracker.getRecentChanges(hours);
  }

  // Diagnose why something broke
  whyBroke(error: string, options?: { file?: string; line?: number }): Diagnosis {
    return this.bugCorrelator.diagnoseBug(error, options);
  }

  // Find similar bugs from history
  findSimilarBugs(error: string, limit?: number): PastBug[] {
    return this.bugCorrelator.findSimilarBugs(error, limit);
  }

  // Suggest fixes for an error
  suggestFix(error: string, context?: string): FixSuggestion[] {
    return this.fixSuggester.suggestFix(error, context);
  }

  // Record a bug for future reference
  recordBug(error: string, options?: {
    stackTrace?: string;
    file?: string;
    line?: number;
    relatedChanges?: string[];
  }): Bug {
    return this.bugCorrelator.recordBug(error, options);
  }

  // Record that a bug was fixed
  recordFix(bugId: string, fixDiff: string, cause?: string): boolean {
    return this.bugCorrelator.recordFix(bugId, fixDiff, cause);
  }

  /**
   * Scan git history for fix commits and auto-record as bugs
   * Called by background intelligence loop
   */
  scanForBugFixes(): number {
    return this.bugCorrelator.scanForBugFixes();
  }

  // Search changes by keyword
  searchChanges(keyword: string, limit?: number): Change[] {
    return this.changeTracker.searchChanges(keyword, limit);
  }

  // Get statistics
  getStats(): {
    changes: {
      total: number;
      last24h: number;
      lastWeek: number;
    };
    bugs: {
      total: number;
      open: number;
      fixed: number;
      avgTimeToFix: number;
    };
  } {
    const last24h = this.changeTracker.getRecentChanges(24);
    const lastWeek = this.changeTracker.queryChanges({ since: 'last week' });
    const bugStats = this.bugCorrelator.getBugStats();

    return {
      changes: {
        total: lastWeek.changes.length,
        last24h: last24h.length,
        lastWeek: lastWeek.changes.length
      },
      bugs: bugStats
    };
  }

  // Format diagnosis for display
  static formatDiagnosis(diagnosis: Diagnosis): string {
    const lines: string[] = [];

    lines.push('\u{1F50D} Bug Diagnosis\n');

    if (diagnosis.likelyCause) {
      const change = diagnosis.likelyCause;
      const hoursAgo = Math.round((Date.now() - change.timestamp.getTime()) / (1000 * 60 * 60));

      lines.push(`\u{1F4CD} Likely Cause (${diagnosis.confidence}% confidence)`);
      lines.push(`File: ${change.file}`);
      lines.push(`Changed: ${hoursAgo}h ago by ${change.author}`);
      lines.push(`Commit: ${change.commitMessage.slice(0, 50)}`);

      if (change.diff) {
        lines.push('\nDiff:');
        lines.push(change.diff.slice(0, 300));
      }
    } else {
      lines.push('\u{2139}\u{FE0F} Could not identify a specific cause');
    }

    if (diagnosis.pastSimilarBugs.length > 0) {
      lines.push('\n\u{1F4A1} Similar Bugs Found');
      for (const bug of diagnosis.pastSimilarBugs.slice(0, 2)) {
        lines.push(`- ${bug.error.slice(0, 50)} (${bug.similarity}% similar)`);
        if (bug.fix) {
          lines.push(`  Fix: ${bug.fix}`);
        }
      }
    }

    if (diagnosis.suggestedFix) {
      lines.push('\n\u{1F527} Suggested Fix');
      lines.push(diagnosis.suggestedFix);
    }

    lines.push('\n' + diagnosis.reasoning);

    return lines.join('\n');
  }

  // Format changes for display
  static formatChanges(result: ChangeQueryResult): string {
    const lines: string[] = [];

    lines.push(`\u{1F4CB} Changes: ${result.period}\n`);
    lines.push(`Files Changed: ${result.totalFiles}`);
    lines.push(`Lines: +${result.totalLinesAdded}, -${result.totalLinesRemoved}`);
    lines.push('');

    if (result.changes.length === 0) {
      lines.push('No changes found in this period.');
      return lines.join('\n');
    }

    lines.push('Key Changes:');
    for (const change of result.changes.slice(0, 10)) {
      const time = change.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      lines.push(`\u251C\u2500\u2500 ${change.file} (${time})`);
      lines.push(`\u2502   ${change.commitMessage.slice(0, 50)}`);
      lines.push(`\u2502   +${change.linesAdded} lines, -${change.linesRemoved} lines`);
      lines.push(`\u2502   Author: ${change.author}`);
    }

    if (result.changes.length > 10) {
      lines.push(`\u2514\u2500\u2500 ${result.changes.length - 10} more changes...`);
    }

    return lines.join('\n');
  }

  // Format fix suggestions for display
  static formatFixSuggestions(suggestions: FixSuggestion[]): string {
    if (suggestions.length === 0) {
      return 'No fix suggestions available.';
    }

    const lines: string[] = [];
    lines.push('\u{1F527} Fix Suggestions\n');

    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      const icon = s.confidence >= 80 ? '\u{1F7E2}' :
                   s.confidence >= 60 ? '\u{1F7E1}' : '\u{1F7E0}';

      lines.push(`${i + 1}. ${icon} ${s.fix} (${s.confidence}% confidence)`);
      lines.push(`   Reason: ${s.reason}`);
      if (s.diff) {
        lines.push(`   ${s.diff}`);
      }
      if (s.pastFix) {
        lines.push(`   Based on fix from ${s.pastFix.date.toLocaleDateString()}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
