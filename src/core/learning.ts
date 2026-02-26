import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import type { SearchResult } from '../types/index.js';

export type UsageEventType =
  | 'query'           // User made a query
  | 'file_view'       // File was viewed
  | 'context_used'    // Context was included in response
  | 'context_ignored' // Context was retrieved but not used
  | 'decision_made'   // User made a decision
  | 'file_edit';      // User edited a file

interface UsageEvent {
  eventType: UsageEventType;
  filePath?: string;
  query?: string;
  contextUsed?: boolean;
}

interface FileAccessStats {
  fileId: number;
  accessCount: number;
  lastAccessed: number;
  relevanceScore: number;
}

interface QueryPattern {
  queryHash: string;
  queryText: string;
  resultFiles: string[];
  hitCount: number;
  avgUsefulness: number;
}

export class LearningEngine {
  private db: Database.Database;
  private hotCache: Map<string, { content: string; accessCount: number; lastAccessed: number }> = new Map();
  private readonly MAX_CACHE_SIZE = 50;
  private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private lastImportanceUpdate: number = 0;
  private readonly IMPORTANCE_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(db: Database.Database) {
    this.db = db;
  }

  // Track usage events
  trackEvent(event: UsageEvent): void {
    const stmt = this.db.prepare(`
      INSERT INTO usage_events (event_type, file_path, query, context_used, timestamp)
      VALUES (?, ?, ?, ?, unixepoch())
    `);
    stmt.run(
      event.eventType,
      event.filePath || null,
      event.query || null,
      event.contextUsed ? 1 : 0
    );

    // Update file access stats if file was accessed
    if (event.filePath && (event.eventType === 'file_view' || event.eventType === 'context_used')) {
      this.updateFileAccess(event.filePath);
    }
  }

  // Track a query and its results for pattern learning
  trackQuery(query: string, resultFiles: string[]): void {
    const queryHash = this.hashQuery(query);

    const stmt = this.db.prepare(`
      INSERT INTO query_patterns (query_hash, query_text, result_files, hit_count, last_used)
      VALUES (?, ?, ?, 1, unixepoch())
      ON CONFLICT(query_hash) DO UPDATE SET
        hit_count = hit_count + 1,
        last_used = unixepoch()
    `);
    stmt.run(queryHash, query, JSON.stringify(resultFiles));
  }

  // Update usefulness score for a query pattern
  updateQueryUsefulness(query: string, wasUseful: boolean): void {
    const queryHash = this.hashQuery(query);

    // Exponential moving average for usefulness
    const alpha = 0.3;
    const newScore = wasUseful ? 1.0 : 0.0;

    const stmt = this.db.prepare(`
      UPDATE query_patterns
      SET avg_usefulness = avg_usefulness * (1 - ?) + ? * ?
      WHERE query_hash = ?
    `);
    stmt.run(alpha, alpha, newScore, queryHash);
  }

  // Update file access statistics
  private updateFileAccess(filePath: string): void {
    // Get file ID
    const fileStmt = this.db.prepare('SELECT id FROM files WHERE path = ?');
    const file = fileStmt.get(filePath) as { id: number } | undefined;

    if (!file) return;

    const stmt = this.db.prepare(`
      INSERT INTO file_access (file_id, access_count, last_accessed, relevance_score)
      VALUES (?, 1, unixepoch(), 0.5)
      ON CONFLICT(file_id) DO UPDATE SET
        access_count = access_count + 1,
        last_accessed = unixepoch(),
        relevance_score = MIN(1.0, relevance_score + 0.05)
    `);
    stmt.run(file.id);

    // Update hot cache
    this.updateHotCache(filePath);
  }

  // Get personalized boost for a file based on usage patterns
  getPersonalizedBoost(filePath: string): number {
    const fileStmt = this.db.prepare('SELECT id FROM files WHERE path = ?');
    const file = fileStmt.get(filePath) as { id: number } | undefined;

    if (!file) return 1.0;

    const stmt = this.db.prepare(`
      SELECT access_count, last_accessed, relevance_score
      FROM file_access
      WHERE file_id = ?
    `);
    const stats = stmt.get(file.id) as FileAccessStats | undefined;

    if (!stats) return 1.0;

    // Calculate boost based on:
    // 1. Access frequency (log scale to avoid extreme boosts)
    // 2. Recency (decay over time)
    // 3. Learned relevance score

    const frequencyBoost = 1 + Math.log10(1 + stats.accessCount) * 0.2;

    const hoursSinceAccess = (Date.now() / 1000 - stats.lastAccessed) / 3600;
    const recencyBoost = Math.exp(-hoursSinceAccess / 168); // Decay over 1 week

    const relevanceBoost = 0.5 + stats.relevanceScore;

    return frequencyBoost * (0.7 + 0.3 * recencyBoost) * relevanceBoost;
  }

  // Apply personalized ranking to search results
  applyPersonalizedRanking(results: SearchResult[]): SearchResult[] {
    return results
      .map(r => ({
        ...r,
        score: (r.score || r.similarity) * this.getPersonalizedBoost(r.file)
      }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  // Get frequently accessed files for pre-fetching
  getFrequentFiles(limit: number = 20): string[] {
    const stmt = this.db.prepare(`
      SELECT f.path
      FROM file_access fa
      JOIN files f ON fa.file_id = f.id
      ORDER BY fa.access_count DESC, fa.last_accessed DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as { path: string }[];
    return rows.map(r => r.path);
  }

  // Get recently accessed files
  getRecentFiles(limit: number = 10): string[] {
    const stmt = this.db.prepare(`
      SELECT f.path
      FROM file_access fa
      JOIN files f ON fa.file_id = f.id
      ORDER BY fa.last_accessed DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as { path: string }[];
    return rows.map(r => r.path);
  }

  // Predict likely needed files based on current context
  predictNeededFiles(currentFile: string, query: string): string[] {
    const predictions: Set<string> = new Set();

    // 1. Files frequently accessed together with current file
    const coAccessStmt = this.db.prepare(`
      SELECT DISTINCT ue2.file_path
      FROM usage_events ue1
      JOIN usage_events ue2 ON ABS(ue1.timestamp - ue2.timestamp) < 300
      WHERE ue1.file_path = ?
        AND ue2.file_path != ?
        AND ue2.file_path IS NOT NULL
      GROUP BY ue2.file_path
      ORDER BY COUNT(*) DESC
      LIMIT 5
    `);
    const coAccessed = coAccessStmt.all(currentFile, currentFile) as { file_path: string }[];
    coAccessed.forEach(r => predictions.add(r.file_path));

    // 2. Files from similar past queries
    const queryHash = this.hashQuery(query);
    const similarQueryStmt = this.db.prepare(`
      SELECT result_files
      FROM query_patterns
      WHERE query_hash = ?
        OR query_text LIKE ?
      ORDER BY avg_usefulness DESC, hit_count DESC
      LIMIT 3
    `);
    const keywords = query.split(/\s+/).slice(0, 3).join('%');
    const similarQueries = similarQueryStmt.all(queryHash, `%${keywords}%`) as { result_files: string }[];

    for (const q of similarQueries) {
      try {
        const files = JSON.parse(q.result_files) as string[];
        files.slice(0, 3).forEach(f => predictions.add(f));
      } catch {
        // Invalid JSON, skip
      }
    }

    // 3. Files that import/are imported by current file
    const depStmt = this.db.prepare(`
      SELECT DISTINCT f2.path
      FROM files f1
      JOIN imports i ON i.file_id = f1.id
      JOIN files f2 ON f2.path LIKE '%' || REPLACE(i.imported_from, './', '') || '%'
      WHERE f1.path = ?
      LIMIT 5
    `);
    const deps = depStmt.all(currentFile) as { path: string }[];
    deps.forEach(r => predictions.add(r.path));

    return Array.from(predictions).slice(0, 10);
  }

  // Hot cache management
  private updateHotCache(filePath: string): void {
    const existing = this.hotCache.get(filePath);

    if (existing) {
      existing.accessCount++;
      existing.lastAccessed = Date.now();
    }

    // Evict old entries if cache is full
    if (this.hotCache.size >= this.MAX_CACHE_SIZE) {
      this.evictCacheEntries();
    }
  }

  private evictCacheEntries(): void {
    const now = Date.now();
    const entries = Array.from(this.hotCache.entries());

    // Remove expired entries
    for (const [key, value] of entries) {
      if (now - value.lastAccessed > this.CACHE_TTL_MS) {
        this.hotCache.delete(key);
      }
    }

    // If still too full, remove least accessed
    if (this.hotCache.size >= this.MAX_CACHE_SIZE) {
      entries
        .sort((a, b) => a[1].accessCount - b[1].accessCount)
        .slice(0, 10)
        .forEach(([key]) => this.hotCache.delete(key));
    }
  }

  addToHotCache(filePath: string, content: string): void {
    this.hotCache.set(filePath, {
      content,
      accessCount: 1,
      lastAccessed: Date.now()
    });
    this.updateHotCache(filePath);
  }

  getFromHotCache(filePath: string): string | null {
    const entry = this.hotCache.get(filePath);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      return entry.content;
    }
    return null;
  }

  isInHotCache(filePath: string): boolean {
    return this.hotCache.has(filePath);
  }

  getHotCacheStats(): { size: number; files: string[] } {
    return {
      size: this.hotCache.size,
      files: Array.from(this.hotCache.keys())
    };
  }

  // Query expansion for better retrieval
  expandQuery(query: string): string[] {
    const expansions: string[] = [query];
    const words = query.toLowerCase().split(/\s+/);

    // Add variations based on common patterns
    const synonyms: Record<string, string[]> = {
      'auth': ['authentication', 'login', 'authorization'],
      'db': ['database', 'sql', 'storage'],
      'api': ['endpoint', 'route', 'handler'],
      'ui': ['component', 'view', 'frontend'],
      'error': ['exception', 'failure', 'bug'],
      'test': ['spec', 'unit', 'integration'],
      'config': ['configuration', 'settings', 'options'],
      'user': ['account', 'profile', 'member'],
      'fix': ['bug', 'issue', 'problem'],
      'add': ['create', 'implement', 'new'],
    };

    // Expand synonyms
    for (const word of words) {
      const syns = synonyms[word];
      if (syns) {
        for (const syn of syns) {
          expansions.push(query.replace(new RegExp(word, 'gi'), syn));
        }
      }
    }

    // Add partial queries for broader search
    if (words.length > 2) {
      expansions.push(words.slice(0, 2).join(' '));
      expansions.push(words.slice(-2).join(' '));
    }

    return [...new Set(expansions)].slice(0, 5);
  }

  // Get usage statistics
  getUsageStats(): {
    totalQueries: number;
    totalFileViews: number;
    topFiles: Array<{ path: string; count: number }>;
    recentActivity: number;
  } {
    const queryCountStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM usage_events WHERE event_type = 'query'
    `);
    const totalQueries = (queryCountStmt.get() as { count: number }).count;

    const viewCountStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM usage_events WHERE event_type = 'file_view'
    `);
    const totalFileViews = (viewCountStmt.get() as { count: number }).count;

    const topFilesStmt = this.db.prepare(`
      SELECT f.path, fa.access_count as count
      FROM file_access fa
      JOIN files f ON fa.file_id = f.id
      ORDER BY fa.access_count DESC
      LIMIT 10
    `);
    const topFiles = topFilesStmt.all() as Array<{ path: string; count: number }>;

    const recentStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM usage_events
      WHERE timestamp > unixepoch() - 3600
    `);
    const recentActivity = (recentStmt.get() as { count: number }).count;

    return { totalQueries, totalFileViews, topFiles, recentActivity };
  }

  // Clean up old usage data
  cleanup(daysToKeep: number = 30): number {
    const stmt = this.db.prepare(`
      DELETE FROM usage_events
      WHERE timestamp < unixepoch() - ? * 86400
    `);
    const result = stmt.run(daysToKeep);
    return result.changes;
  }

  /**
   * Check if importance update should be skipped
   * Returns true if we've already updated within the last 5 minutes
   */
  shouldSkipImportanceUpdate(): boolean {
    const now = Date.now();
    return now - this.lastImportanceUpdate < this.IMPORTANCE_UPDATE_INTERVAL_MS;
  }

  /**
   * Get time since last importance update in milliseconds
   */
  getTimeSinceLastImportanceUpdate(): number {
    return Date.now() - this.lastImportanceUpdate;
  }

  /**
   * Get the last importance update timestamp
   */
  getLastImportanceUpdateTime(): number {
    return this.lastImportanceUpdate;
  }

  /**
   * Update importance scores for all files based on usage patterns
   * Called by background intelligence loop
   * Gated to run at most once per 5 minutes
   */
  updateImportanceScores(): void {
    // Gate: skip if we've already updated recently
    if (this.shouldSkipImportanceUpdate()) {
      return;
    }

    try {
      // Get all files with access stats
      const stmt = this.db.prepare(`
        SELECT f.id, f.path, fa.access_count, fa.last_accessed, fa.relevance_score
        FROM files f
        LEFT JOIN file_access fa ON fa.file_id = f.id
      `);

      const files = stmt.all() as Array<{
        id: number;
        path: string;
        access_count: number | null;
        last_accessed: number | null;
        relevance_score: number | null;
      }>;

      // Calculate and update importance scores
      const updateStmt = this.db.prepare(`
        INSERT INTO file_access (file_id, access_count, last_accessed, relevance_score)
        VALUES (?, COALESCE(?, 0), COALESCE(?, unixepoch()), ?)
        ON CONFLICT(file_id) DO UPDATE SET
          relevance_score = excluded.relevance_score
      `);

      for (const file of files) {
        const importance = this.calculateImportance(
          file.access_count || 0,
          file.last_accessed || Math.floor(Date.now() / 1000),
          file.path
        );

        updateStmt.run(
          file.id,
          file.access_count,
          file.last_accessed,
          importance
        );
      }

      // Update the timestamp to prevent running again within the interval
      this.lastImportanceUpdate = Date.now();
    } catch (error) {
      console.error('Error updating importance scores:', error);
    }
  }

  /**
   * Calculate importance score for a file based on multiple factors
   */
  calculateImportance(accessCount: number, lastAccessed: number, filePath: string): number {
    // Factor 1: Access frequency (log scale to avoid extreme boosts)
    const frequencyScore = Math.log10(1 + accessCount) * 0.4;

    // Factor 2: Recency (how recently was it accessed)
    const hoursSinceAccess = (Date.now() / 1000 - lastAccessed) / 3600;
    const recencyScore = Math.exp(-hoursSinceAccess / 168) * 0.3; // Decay over 1 week

    // Factor 3: File importance heuristics
    let fileImportance = 0.3; // Default

    // Boost important file types
    if (filePath.includes('index.') || filePath.includes('main.')) {
      fileImportance = 0.5;
    } else if (filePath.includes('.config.') || filePath.includes('config/')) {
      fileImportance = 0.45;
    } else if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      fileImportance = 0.25; // Tests slightly less important for context
    } else if (filePath.includes('/types/') || filePath.includes('.d.ts')) {
      fileImportance = 0.4; // Type definitions are often helpful
    }

    // Combine factors (max 1.0)
    return Math.min(1.0, frequencyScore + recencyScore + fileImportance);
  }

  /**
   * Get importance score for a specific file
   */
  getFileImportance(filePath: string): number {
    const stmt = this.db.prepare(`
      SELECT fa.relevance_score
      FROM files f
      JOIN file_access fa ON fa.file_id = f.id
      WHERE f.path = ?
    `);

    const result = stmt.get(filePath) as { relevance_score: number } | undefined;
    return result?.relevance_score || 0.5;
  }

  private hashQuery(query: string): string {
    // Normalize query for matching
    const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
    return createHash('md5').update(normalized).digest('hex').slice(0, 16);
  }
}
