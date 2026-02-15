import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import type { CriticalContext } from '../../types/documentation.js';

// Patterns for automatically detecting critical content
const CRITICAL_PATTERNS = [
  // Explicit instructions
  { pattern: /\b(always|never|must|required|mandatory)\b/i, type: 'instruction' as const },

  // Decisions
  { pattern: /\b(we decided|the decision|chose to|decided to|will use)\b/i, type: 'decision' as const },

  // Requirements
  { pattern: /\b(requirement|constraint|rule|spec|specification)\b/i, type: 'requirement' as const },

  // User preferences
  { pattern: /\b(i prefer|i want|don't want|please don't|make sure)\b/i, type: 'instruction' as const },

  // Technical constraints
  { pattern: /\b(cannot|must not|impossible|not allowed|forbidden)\b/i, type: 'requirement' as const },

  // Important markers
  { pattern: /\b(important|critical|essential|crucial|key point)\b/i, type: 'instruction' as const }
];

export class CriticalContextManager {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  markCritical(
    content: string,
    options?: {
      type?: CriticalContext['type'];
      reason?: string;
      source?: string;
      neverCompress?: boolean;
    }
  ): CriticalContext {
    const id = randomUUID();
    const type = options?.type || this.inferType(content);
    const neverCompress = options?.neverCompress ?? true;

    const critical: CriticalContext = {
      id,
      type,
      content,
      reason: options?.reason,
      source: options?.source,
      createdAt: new Date(),
      neverCompress
    };

    const stmt = this.db.prepare(`
      INSERT INTO critical_context (id, type, content, reason, source, never_compress, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      type,
      content,
      options?.reason || null,
      options?.source || null,
      neverCompress ? 1 : 0,
      Math.floor(Date.now() / 1000)
    );

    return critical;
  }

  getCriticalContext(type?: CriticalContext['type']): CriticalContext[] {
    let query = `
      SELECT id, type, content, reason, source, never_compress, created_at
      FROM critical_context
    `;
    const params: string[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = (params.length > 0 ? stmt.all(params[0]) : stmt.all()) as Array<{
      id: string;
      type: string;
      content: string;
      reason: string | null;
      source: string | null;
      never_compress: number;
      created_at: number;
    }>;

    return rows.map(row => ({
      id: row.id,
      type: row.type as CriticalContext['type'],
      content: row.content,
      reason: row.reason || undefined,
      source: row.source || undefined,
      createdAt: new Date(row.created_at * 1000),
      neverCompress: row.never_compress === 1
    }));
  }

  getCriticalById(id: string): CriticalContext | null {
    const stmt = this.db.prepare(`
      SELECT id, type, content, reason, source, never_compress, created_at
      FROM critical_context
      WHERE id = ?
    `);

    const row = stmt.get(id) as {
      id: string;
      type: string;
      content: string;
      reason: string | null;
      source: string | null;
      never_compress: number;
      created_at: number;
    } | undefined;

    if (!row) return null;

    return {
      id: row.id,
      type: row.type as CriticalContext['type'],
      content: row.content,
      reason: row.reason || undefined,
      source: row.source || undefined,
      createdAt: new Date(row.created_at * 1000),
      neverCompress: row.never_compress === 1
    };
  }

  removeCritical(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM critical_context WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getCriticalCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM critical_context');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  isCritical(content: string): boolean {
    return CRITICAL_PATTERNS.some(p => p.pattern.test(content));
  }

  inferType(content: string): CriticalContext['type'] {
    for (const { pattern, type } of CRITICAL_PATTERNS) {
      if (pattern.test(content)) {
        return type;
      }
    }
    return 'custom';
  }

  extractCriticalFromText(text: string): Array<{ content: string; type: CriticalContext['type'] }> {
    const results: Array<{ content: string; type: CriticalContext['type'] }> = [];

    // Split into sentences
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

    for (const sentence of sentences) {
      if (this.isCritical(sentence)) {
        results.push({
          content: sentence,
          type: this.inferType(sentence)
        });
      }
    }

    return results;
  }

  getAllCriticalContent(): string {
    const critical = this.getCriticalContext();

    if (critical.length === 0) {
      return '';
    }

    const grouped = {
      decision: [] as string[],
      requirement: [] as string[],
      instruction: [] as string[],
      custom: [] as string[]
    };

    for (const item of critical) {
      const arr = grouped[item.type as keyof typeof grouped];
      if (arr) {
        arr.push(item.content);
      }
    }

    const parts: string[] = [];

    if (grouped.decision.length > 0) {
      parts.push('DECISIONS:\n' + grouped.decision.map(d => `- ${d}`).join('\n'));
    }
    if (grouped.requirement.length > 0) {
      parts.push('REQUIREMENTS:\n' + grouped.requirement.map(r => `- ${r}`).join('\n'));
    }
    if (grouped.instruction.length > 0) {
      parts.push('INSTRUCTIONS:\n' + grouped.instruction.map(i => `- ${i}`).join('\n'));
    }
    if (grouped.custom.length > 0) {
      parts.push('OTHER CRITICAL:\n' + grouped.custom.map(c => `- ${c}`).join('\n'));
    }

    return parts.join('\n\n');
  }
}
