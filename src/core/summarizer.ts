import type Database from 'better-sqlite3';
import type { CodeSymbol } from '../types/index.js';
import { estimateTokens } from '../utils/tokens.js';

interface FileSummary {
  fileId: number;
  summary: string;
  tokens: number;
  generatedAt: number;
}

export class FileSummarizer {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // Generate a compressed summary of a file
  generateSummary(
    filePath: string,
    content: string,
    symbols: CodeSymbol[],
    imports: Array<{ importedFrom: string; importedSymbols: string[] }>,
    exports: Array<{ exportedName: string }>
  ): string {
    const lines: string[] = [];

    // File name and type
    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    const extension = fileName.split('.').pop() || '';
    lines.push(`**${fileName}** (${this.getFileType(extension)})`);

    // Purpose (inferred from file name and content)
    const purpose = this.inferPurpose(fileName, content, symbols);
    if (purpose) {
      lines.push(`Purpose: ${purpose}`);
    }

    // Exports summary
    if (exports.length > 0) {
      const exportNames = exports.map(e => e.exportedName).slice(0, 10);
      lines.push(`Exports: ${exportNames.join(', ')}${exports.length > 10 ? ` (+${exports.length - 10} more)` : ''}`);
    }

    // Key symbols
    const functions = symbols.filter(s => s.kind === 'function' && s.exported);
    const classes = symbols.filter(s => s.kind === 'class');
    const interfaces = symbols.filter(s => s.kind === 'interface');

    if (classes.length > 0) {
      lines.push(`Classes: ${classes.map(c => c.name).join(', ')}`);
    }

    if (interfaces.length > 0) {
      lines.push(`Interfaces: ${interfaces.map(i => i.name).slice(0, 5).join(', ')}`);
    }

    if (functions.length > 0) {
      const funcNames = functions.map(f => f.signature || f.name).slice(0, 5);
      lines.push(`Functions: ${funcNames.join(', ')}${functions.length > 5 ? ` (+${functions.length - 5} more)` : ''}`);
    }

    // Dependencies
    if (imports.length > 0) {
      const deps = imports
        .filter(i => !i.importedFrom.startsWith('.'))
        .map(i => i.importedFrom.split('/')[0])
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 5);

      if (deps.length > 0) {
        lines.push(`Uses: ${deps.join(', ')}`);
      }
    }

    // Local imports (internal dependencies)
    const localImports = imports
      .filter(i => i.importedFrom.startsWith('.'))
      .map(i => i.importedFrom.replace(/^\.\//, '').replace(/\.[^.]+$/, ''))
      .slice(0, 5);

    if (localImports.length > 0) {
      lines.push(`Imports from: ${localImports.join(', ')}`);
    }

    // Key patterns detected
    const patterns = this.detectPatterns(content);
    if (patterns.length > 0) {
      lines.push(`Patterns: ${patterns.join(', ')}`);
    }

    return lines.join('\n');
  }

  private getFileType(extension: string): string {
    const types: Record<string, string> = {
      'ts': 'TypeScript',
      'tsx': 'React Component',
      'js': 'JavaScript',
      'jsx': 'React Component',
      'py': 'Python',
      'go': 'Go',
      'rs': 'Rust',
      'java': 'Java',
      'rb': 'Ruby',
      'vue': 'Vue Component',
      'svelte': 'Svelte Component',
    };
    return types[extension] || extension.toUpperCase();
  }

  private inferPurpose(fileName: string, content: string, symbols: CodeSymbol[]): string {
    const lowerName = fileName.toLowerCase();
    const lowerContent = content.toLowerCase();

    // Common file patterns
    if (lowerName.includes('middleware')) return 'Request middleware/interceptor';
    if (lowerName.includes('route') || lowerName.includes('router')) return 'API route definitions';
    if (lowerName.includes('controller')) return 'Request handler/controller';
    if (lowerName.includes('service')) return 'Business logic service';
    if (lowerName.includes('model')) return 'Data model definitions';
    if (lowerName.includes('schema')) return 'Schema/validation definitions';
    if (lowerName.includes('util') || lowerName.includes('helper')) return 'Utility functions';
    if (lowerName.includes('config')) return 'Configuration';
    if (lowerName.includes('constant')) return 'Constants/enums';
    if (lowerName.includes('type') || lowerName.includes('interface')) return 'Type definitions';
    if (lowerName.includes('test') || lowerName.includes('spec')) return 'Tests';
    if (lowerName.includes('hook')) return 'React hooks';
    if (lowerName.includes('context')) return 'React context provider';
    if (lowerName.includes('store')) return 'State management';
    if (lowerName.includes('api')) return 'API client/definitions';
    if (lowerName.includes('auth')) return 'Authentication';
    if (lowerName.includes('db') || lowerName.includes('database')) return 'Database operations';

    // Content-based inference
    if (lowerContent.includes('express') && lowerContent.includes('router')) return 'Express router';
    if (lowerContent.includes('mongoose') || lowerContent.includes('prisma')) return 'Database model';
    if (lowerContent.includes('usestate') || lowerContent.includes('useeffect')) return 'React component';
    if (lowerContent.includes('describe(') && lowerContent.includes('it(')) return 'Test suite';

    // Symbol-based inference
    const hasClasses = symbols.some(s => s.kind === 'class');
    const hasInterfaces = symbols.some(s => s.kind === 'interface');
    const hasFunctions = symbols.some(s => s.kind === 'function');

    if (hasInterfaces && !hasClasses && !hasFunctions) return 'Type definitions';
    if (hasClasses && symbols.filter(s => s.kind === 'class').length === 1) {
      const className = symbols.find(s => s.kind === 'class')?.name;
      return `${className} implementation`;
    }

    return '';
  }

  private detectPatterns(content: string): string[] {
    const patterns: string[] = [];
    const lower = content.toLowerCase();

    // Architectural patterns
    if (lower.includes('singleton') || /private\s+static\s+instance/i.test(content)) {
      patterns.push('Singleton');
    }
    if (lower.includes('factory') || /create\w+\s*\(/i.test(content)) {
      patterns.push('Factory');
    }
    if (lower.includes('observer') || lower.includes('subscriber') || lower.includes('eventemitter')) {
      patterns.push('Observer');
    }
    if (/async\s+\*|yield\s+/i.test(content)) {
      patterns.push('Generator');
    }
    if (lower.includes('decorator') || /@\w+\s*\(/i.test(content)) {
      patterns.push('Decorator');
    }

    // Code patterns
    if (lower.includes('try') && lower.includes('catch')) {
      patterns.push('Error handling');
    }
    if (lower.includes('async') && lower.includes('await')) {
      patterns.push('Async/await');
    }
    if (/\.then\s*\(/i.test(content)) {
      patterns.push('Promise chain');
    }
    if (lower.includes('middleware')) {
      patterns.push('Middleware');
    }

    return patterns.slice(0, 4);
  }

  // Store summary in database
  storeSummary(fileId: number, summary: string): void {
    const tokens = estimateTokens(summary);

    const stmt = this.db.prepare(`
      INSERT INTO file_summaries (file_id, summary, summary_tokens, generated_at)
      VALUES (?, ?, ?, unixepoch())
      ON CONFLICT(file_id) DO UPDATE SET
        summary = excluded.summary,
        summary_tokens = excluded.summary_tokens,
        generated_at = unixepoch()
    `);
    stmt.run(fileId, summary, tokens);
  }

  // Get summary from database
  getSummary(fileId: number): FileSummary | null {
    const stmt = this.db.prepare(`
      SELECT file_id as fileId, summary, summary_tokens as tokens, generated_at as generatedAt
      FROM file_summaries
      WHERE file_id = ?
    `);
    return stmt.get(fileId) as FileSummary | null;
  }

  // Get summaries for multiple files
  getSummaries(fileIds: number[]): Map<number, string> {
    const result = new Map<number, string>();

    if (fileIds.length === 0) return result;

    const placeholders = fileIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      SELECT file_id, summary
      FROM file_summaries
      WHERE file_id IN (${placeholders})
    `);
    const rows = stmt.all(...fileIds) as Array<{ file_id: number; summary: string }>;

    for (const row of rows) {
      result.set(row.file_id, row.summary);
    }

    return result;
  }

  // Check if summary needs regeneration
  needsRegeneration(fileId: number, fileLastModified: number): boolean {
    const summary = this.getSummary(fileId);
    if (!summary) return true;

    // Regenerate if file was modified after summary was generated
    return fileLastModified > summary.generatedAt;
  }

  // Get compression ratio stats
  getCompressionStats(): { totalFiles: number; avgCompression: number; totalTokensSaved: number } {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_files,
        AVG(f.size_bytes / 4.0 / NULLIF(fs.summary_tokens, 0)) as avg_compression,
        SUM(f.size_bytes / 4.0 - fs.summary_tokens) as tokens_saved
      FROM file_summaries fs
      JOIN files f ON fs.file_id = f.id
    `);
    const result = stmt.get() as { total_files: number; avg_compression: number; tokens_saved: number };

    return {
      totalFiles: result.total_files || 0,
      avgCompression: result.avg_compression || 1,
      totalTokensSaved: result.tokens_saved || 0
    };
  }
}
