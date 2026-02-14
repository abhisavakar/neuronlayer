import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import type Database from 'better-sqlite3';
import type { Tier2Storage } from '../../storage/tier2.js';
import type {
  ActivityResult,
  ActivityChange,
  ActivityDecision
} from '../../types/documentation.js';

export class ActivityTracker {
  private projectPath: string;
  private db: Database.Database;
  private tier2: Tier2Storage;
  private isGitRepo: boolean;

  constructor(projectPath: string, db: Database.Database, tier2: Tier2Storage) {
    this.projectPath = projectPath;
    this.db = db;
    this.tier2 = tier2;
    this.isGitRepo = existsSync(join(projectPath, '.git'));
  }

  async whatHappened(since: string, scope?: string): Promise<ActivityResult> {
    const sinceDate = this.parseSinceString(since);
    const untilDate = new Date();

    const gitActivity = this.getGitActivity(sinceDate, untilDate, scope);
    const decisions = this.getDecisionActivity(sinceDate, untilDate);
    const filesAffected = this.getAffectedFiles(gitActivity);

    return {
      timeRange: { since: sinceDate, until: untilDate },
      scope: scope || 'all',
      summary: this.generateSummary(gitActivity, decisions),
      changes: gitActivity,
      decisions,
      filesAffected
    };
  }

  logActivity(
    activityType: string,
    description: string,
    filePath?: string,
    metadata?: Record<string, unknown>,
    commitHash?: string
  ): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO activity_log (activity_type, description, file_path, metadata, commit_hash)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        activityType,
        description,
        filePath || null,
        metadata ? JSON.stringify(metadata) : null,
        commitHash || null
      );
    } catch {
      // Ignore logging errors
    }
  }

  private parseSinceString(since: string): Date {
    const now = new Date();
    const lower = since.toLowerCase();

    if (lower === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return yesterday;
    }
    if (lower === 'today') {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return today;
    }
    if (lower === 'this week') {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);
      return startOfWeek;
    }
    if (lower === 'this month') {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (lower === 'last week') {
      const dayOfWeek = now.getDay();
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - dayOfWeek - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      return startOfLastWeek;
    }
    if (lower === 'last month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return lastMonth;
    }

    // Try parsing as a date string
    const parsed = new Date(since);
    return isNaN(parsed.getTime()) ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) : parsed;
  }

  private getGitActivity(since: Date, until: Date, scope?: string): ActivityChange[] {
    const changes: ActivityChange[] = [];

    if (!this.isGitRepo) {
      return changes;
    }

    try {
      const sinceStr = since.toISOString().split('T')[0];
      const untilStr = until.toISOString().split('T')[0];

      let gitCmd = `git log --since="${sinceStr}" --until="${untilStr}" --format="%H|%s|%an|%ad" --date=iso-strict`;

      // If scope is provided, filter by path
      if (scope && scope !== 'all') {
        gitCmd += ` -- "${scope}"`;
      }

      const output = execSync(gitCmd, {
        cwd: this.projectPath,
        encoding: 'utf-8',
        maxBuffer: 5 * 1024 * 1024
      });

      const lines = output.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        const [hash, subject, author, dateStr] = line.split('|');
        if (!hash || !subject) continue;

        // Get files changed in this commit
        const files = this.getCommitFiles(hash);

        changes.push({
          timestamp: new Date(dateStr || Date.now()),
          type: 'commit',
          description: subject,
          details: {
            hash: hash.slice(0, 8),
            author,
            files
          }
        });
      }
    } catch {
      // Git command failed
    }

    // Also get activity from activity_log table
    try {
      const sinceUnix = Math.floor(since.getTime() / 1000);
      const untilUnix = Math.floor(until.getTime() / 1000);

      let query = `
        SELECT timestamp, activity_type, description, file_path, metadata
        FROM activity_log
        WHERE timestamp >= ? AND timestamp <= ?
      `;
      const params: (number | string)[] = [sinceUnix, untilUnix];

      if (scope && scope !== 'all') {
        query += ' AND file_path LIKE ?';
        params.push(`%${scope}%`);
      }

      query += ' ORDER BY timestamp DESC';

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as Array<{
        timestamp: number;
        activity_type: string;
        description: string;
        file_path: string | null;
        metadata: string | null;
      }>;

      for (const row of rows) {
        changes.push({
          timestamp: new Date(row.timestamp * 1000),
          type: 'file_change',
          description: row.description,
          details: {
            activityType: row.activity_type,
            filePath: row.file_path,
            ...(row.metadata ? JSON.parse(row.metadata) : {})
          }
        });
      }
    } catch {
      // Database query failed
    }

    // Sort by timestamp descending
    changes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return changes;
  }

  private getCommitFiles(hash: string): string[] {
    try {
      const output = execSync(
        `git show --name-only --format="" "${hash}"`,
        { cwd: this.projectPath, encoding: 'utf-8', maxBuffer: 1024 * 1024 }
      );
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  private getDecisionActivity(since: Date, until: Date): ActivityDecision[] {
    const decisions: ActivityDecision[] = [];

    try {
      const sinceUnix = Math.floor(since.getTime() / 1000);
      const untilUnix = Math.floor(until.getTime() / 1000);

      const stmt = this.db.prepare(`
        SELECT id, title, created_at
        FROM decisions
        WHERE created_at >= ? AND created_at <= ?
        ORDER BY created_at DESC
      `);

      const rows = stmt.all(sinceUnix, untilUnix) as Array<{
        id: string;
        title: string;
        created_at: number;
      }>;

      for (const row of rows) {
        decisions.push({
          id: row.id,
          title: row.title,
          date: new Date(row.created_at * 1000)
        });
      }
    } catch {
      // Database query failed
    }

    return decisions;
  }

  private getAffectedFiles(changes: ActivityChange[]): string[] {
    const filesSet = new Set<string>();

    for (const change of changes) {
      if (change.details.files && Array.isArray(change.details.files)) {
        for (const file of change.details.files) {
          filesSet.add(file as string);
        }
      }
      if (change.details.filePath) {
        filesSet.add(change.details.filePath as string);
      }
    }

    return Array.from(filesSet).sort();
  }

  private generateSummary(changes: ActivityChange[], decisions: ActivityDecision[]): string {
    const commits = changes.filter(c => c.type === 'commit').length;
    const fileChanges = changes.filter(c => c.type === 'file_change').length;
    const decisionCount = decisions.length;

    const parts: string[] = [];

    if (commits > 0) {
      parts.push(`${commits} commit${commits !== 1 ? 's' : ''}`);
    }
    if (fileChanges > 0) {
      parts.push(`${fileChanges} file change${fileChanges !== 1 ? 's' : ''}`);
    }
    if (decisionCount > 0) {
      parts.push(`${decisionCount} decision${decisionCount !== 1 ? 's' : ''}`);
    }

    if (parts.length === 0) {
      return 'No activity in this time period';
    }

    // Get unique files affected
    const filesAffected = this.getAffectedFiles(changes);

    return `${parts.join(', ')} affecting ${filesAffected.length} file${filesAffected.length !== 1 ? 's' : ''}`;
  }
}
