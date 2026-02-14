import { existsSync } from 'fs';
import { join } from 'path';
import type Database from 'better-sqlite3';
import type { Tier2Storage } from '../../storage/tier2.js';
import type { CodeSymbol } from '../../types/index.js';
import type {
  ValidationResult,
  OutdatedDoc,
  UndocumentedItem,
  DocSuggestion
} from '../../types/documentation.js';

export class DocValidator {
  private projectPath: string;
  private tier2: Tier2Storage;
  private db: Database.Database;

  constructor(projectPath: string, tier2: Tier2Storage, db: Database.Database) {
    this.projectPath = projectPath;
    this.tier2 = tier2;
    this.db = db;
  }

  async validate(): Promise<ValidationResult> {
    const outdated = await this.findOutdated();
    const undocumented = await this.findUndocumented();
    const suggestions = this.generateSuggestions(outdated, undocumented);
    const score = this.calculateScore(outdated, undocumented);

    return {
      isValid: score >= 70,
      outdatedDocs: outdated,
      undocumentedCode: undocumented,
      suggestions,
      score
    };
  }

  async findOutdated(): Promise<OutdatedDoc[]> {
    const outdated: OutdatedDoc[] = [];

    try {
      // Get all documentation records
      const stmt = this.db.prepare(`
        SELECT d.file_id, d.generated_at, f.path, f.last_modified
        FROM documentation d
        JOIN files f ON d.file_id = f.id
      `);

      const rows = stmt.all() as Array<{
        file_id: number;
        generated_at: number;
        path: string;
        last_modified: number;
      }>;

      for (const row of rows) {
        // Check if code changed after docs were generated
        if (row.last_modified > row.generated_at) {
          const daysSinceUpdate = Math.floor(
            (Date.now() / 1000 - row.generated_at) / (24 * 60 * 60)
          );

          outdated.push({
            file: row.path,
            reason: 'Code modified after documentation was generated',
            lastDocUpdate: new Date(row.generated_at * 1000),
            lastCodeChange: new Date(row.last_modified * 1000),
            severity: daysSinceUpdate > 30 ? 'high' : daysSinceUpdate > 7 ? 'medium' : 'low'
          });
        }
      }
    } catch {
      // Documentation table might not exist yet
    }

    return outdated;
  }

  async findUndocumented(options?: {
    importance?: 'low' | 'medium' | 'high' | 'all';
    type?: 'file' | 'function' | 'class' | 'interface' | 'all';
  }): Promise<UndocumentedItem[]> {
    const items: UndocumentedItem[] = [];
    const files = this.tier2.getAllFiles();

    for (const file of files) {
      const symbols = this.tier2.getSymbolsByFile(file.id);

      // Check for undocumented exported symbols
      const exportedSymbols = symbols.filter(s => s.exported);

      for (const symbol of exportedSymbols) {
        if (!symbol.docstring || symbol.docstring.trim().length === 0) {
          const importance = this.calculateImportance(file.path, symbol);

          // Apply filters
          if (options?.importance && options.importance !== 'all' && importance !== options.importance) {
            continue;
          }

          const symbolType = this.mapSymbolKindToType(symbol.kind);
          if (options?.type && options.type !== 'all' && symbolType !== options.type) {
            continue;
          }

          items.push({
            file: file.path,
            symbol: symbol.name,
            type: symbolType,
            importance
          });
        }
      }

      // Check for files without any documentation
      if (exportedSymbols.length === 0 && symbols.length > 0) {
        // File has symbols but none exported - might be internal
        continue;
      }

      // Check if the file has any JSDoc/docstring at file level
      const hasFileDoc = symbols.some(s => s.docstring && s.lineStart <= 5);
      if (!hasFileDoc && exportedSymbols.length > 0) {
        const importance = this.calculateFileImportance(file.path);

        if (options?.importance && options.importance !== 'all' && importance !== options.importance) {
          continue;
        }
        if (options?.type && options.type !== 'all' && options.type !== 'file') {
          continue;
        }

        // Only add if the file isn't already represented by undocumented symbols
        const hasSymbolEntry = items.some(i => i.file === file.path);
        if (!hasSymbolEntry) {
          items.push({
            file: file.path,
            type: 'file',
            importance
          });
        }
      }
    }

    // Sort by importance
    const importanceOrder = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);

    return items;
  }

  private calculateImportance(filePath: string, symbol: CodeSymbol): 'low' | 'medium' | 'high' {
    // Check how many files depend on this file
    const dependents = this.tier2.getFileDependents(filePath);

    // High importance: many dependents, or it's a class/interface
    if (dependents.length >= 3 || symbol.kind === 'class' || symbol.kind === 'interface') {
      return 'high';
    }

    // Medium importance: some dependents, or it's a function
    if (dependents.length >= 1 || symbol.kind === 'function') {
      return 'medium';
    }

    return 'low';
  }

  private calculateFileImportance(filePath: string): 'low' | 'medium' | 'high' {
    const dependents = this.tier2.getFileDependents(filePath);

    // Check if it's an index/entry file
    if (filePath.includes('index.') || filePath.includes('/src/')) {
      return 'high';
    }

    if (dependents.length >= 5) return 'high';
    if (dependents.length >= 2) return 'medium';
    return 'low';
  }

  private mapSymbolKindToType(kind: string): 'file' | 'function' | 'class' | 'interface' {
    switch (kind) {
      case 'class':
        return 'class';
      case 'interface':
      case 'type':
        return 'interface';
      case 'function':
      case 'method':
        return 'function';
      default:
        return 'function';
    }
  }

  private generateSuggestions(
    outdated: OutdatedDoc[],
    undocumented: UndocumentedItem[]
  ): DocSuggestion[] {
    const suggestions: DocSuggestion[] = [];

    // Suggestions for outdated docs
    for (const doc of outdated) {
      suggestions.push({
        file: doc.file,
        suggestion: `Update documentation - code changed ${this.formatTimeDiff(doc.lastCodeChange, doc.lastDocUpdate)} after docs`,
        priority: doc.severity
      });
    }

    // Suggestions for undocumented code
    const highPriorityUndoc = undocumented.filter(u => u.importance === 'high');
    for (const item of highPriorityUndoc) {
      suggestions.push({
        file: item.file,
        suggestion: item.symbol
          ? `Add documentation for exported ${item.type} '${item.symbol}'`
          : `Add file-level documentation`,
        priority: 'high'
      });
    }

    // Group medium priority suggestions
    const mediumPriorityCount = undocumented.filter(u => u.importance === 'medium').length;
    if (mediumPriorityCount > 0) {
      const files = [...new Set(undocumented.filter(u => u.importance === 'medium').map(u => u.file))];
      if (files.length <= 3) {
        for (const file of files) {
          suggestions.push({
            file,
            suggestion: 'Add documentation for exported symbols',
            priority: 'medium'
          });
        }
      } else {
        suggestions.push({
          file: files[0]!,
          suggestion: `${mediumPriorityCount} symbols across ${files.length} files need documentation`,
          priority: 'medium'
        });
      }
    }

    return suggestions;
  }

  private formatTimeDiff(later: Date, earlier: Date): string {
    const diffMs = later.getTime() - earlier.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return '1 day';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`;
    return `${Math.floor(diffDays / 30)} months`;
  }

  private calculateScore(outdated: OutdatedDoc[], undocumented: UndocumentedItem[]): number {
    const totalFiles = this.tier2.getFileCount();
    if (totalFiles === 0) return 100;

    // Calculate based on:
    // - % of files with outdated docs (30% weight)
    // - % of high-importance items undocumented (50% weight)
    // - % of medium-importance items undocumented (20% weight)

    const outdatedPenalty = (outdated.length / totalFiles) * 30;

    const highUndoc = undocumented.filter(u => u.importance === 'high').length;
    const mediumUndoc = undocumented.filter(u => u.importance === 'medium').length;

    // Assume each file has ~3 documentable items on average
    const estimatedTotalItems = totalFiles * 3;
    const highPenalty = estimatedTotalItems > 0 ? (highUndoc / estimatedTotalItems) * 50 : 0;
    const mediumPenalty = estimatedTotalItems > 0 ? (mediumUndoc / estimatedTotalItems) * 20 : 0;

    const totalPenalty = Math.min(100, outdatedPenalty + highPenalty + mediumPenalty);
    return Math.round(100 - totalPenalty);
  }
}
