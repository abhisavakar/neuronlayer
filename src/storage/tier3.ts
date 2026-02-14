import type Database from 'better-sqlite3';

interface ArchivedSession {
  id: string;
  startTime: number;
  endTime: number | null;
  filesViewed: string[];
  summary: string | null;
}

interface ArchiveSearchResult {
  type: 'session';
  summary: string;
  relevance: number;
}

export class Tier3Storage {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // Archive a session
  archiveSession(
    id: string,
    startTime: Date,
    endTime: Date | null,
    filesViewed: string[],
    summary: string | null
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, start_time, end_time, files_viewed, summary)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        end_time = excluded.end_time,
        files_viewed = excluded.files_viewed,
        summary = excluded.summary
    `);
    stmt.run(
      id,
      Math.floor(startTime.getTime() / 1000),
      endTime ? Math.floor(endTime.getTime() / 1000) : null,
      JSON.stringify(filesViewed),
      summary
    );
  }

  // Get recent sessions
  getRecentSessions(limit: number = 10): ArchivedSession[] {
    const stmt = this.db.prepare(`
      SELECT id, start_time, end_time, files_viewed, summary
      FROM sessions
      ORDER BY start_time DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as Array<{
      id: string;
      start_time: number;
      end_time: number | null;
      files_viewed: string;
      summary: string | null;
    }>;

    return rows.map(row => ({
      id: row.id,
      startTime: row.start_time,
      endTime: row.end_time,
      filesViewed: JSON.parse(row.files_viewed || '[]'),
      summary: row.summary
    }));
  }

  // Search archived content (basic keyword search for now)
  searchRelevant(query: string, limit: number = 3): ArchiveSearchResult[] {
    // Simple keyword search in session summaries
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);

    if (keywords.length === 0) {
      return [];
    }

    const sessions = this.getRecentSessions(50);
    const results: ArchiveSearchResult[] = [];

    for (const session of sessions) {
      if (!session.summary) continue;

      const summaryLower = session.summary.toLowerCase();
      let matchCount = 0;

      for (const keyword of keywords) {
        if (summaryLower.includes(keyword)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        results.push({
          type: 'session',
          summary: session.summary,
          relevance: matchCount / keywords.length
        });
      }
    }

    // Sort by relevance and return top results
    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, limit);
  }

  // Clean up old sessions (keep last N)
  cleanup(keepCount: number = 100): number {
    const stmt = this.db.prepare(`
      DELETE FROM sessions
      WHERE id NOT IN (
        SELECT id FROM sessions ORDER BY start_time DESC LIMIT ?
      )
    `);
    const result = stmt.run(keepCount);
    return result.changes;
  }
}
