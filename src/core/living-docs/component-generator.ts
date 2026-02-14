import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { basename, extname, join } from 'path';
import type { Tier2Storage } from '../../storage/tier2.js';
import type { CodeSymbol } from '../../types/index.js';
import type {
  ComponentDoc,
  SymbolDoc,
  DependencyDoc,
  DependentDoc,
  ChangeHistoryEntry
} from '../../types/documentation.js';

export class ComponentGenerator {
  private projectPath: string;
  private tier2: Tier2Storage;
  private isGitRepo: boolean;

  constructor(projectPath: string, tier2: Tier2Storage) {
    this.projectPath = projectPath;
    this.tier2 = tier2;
    this.isGitRepo = existsSync(join(projectPath, '.git'));
  }

  async generate(filePath: string): Promise<ComponentDoc> {
    const file = this.tier2.getFile(filePath);
    if (!file) {
      throw new Error(`File not found: ${filePath}`);
    }

    const symbols = this.tier2.getSymbolsByFile(file.id);
    const imports = this.tier2.getImportsByFile(file.id);
    const dependents = this.tier2.getFileDependents(filePath);
    const history = this.getChangeHistory(filePath);

    return {
      file: filePath,
      name: basename(filePath, extname(filePath)),
      purpose: this.inferPurpose(filePath, symbols),
      lastModified: new Date(file.lastModified * 1000),
      publicInterface: this.extractPublicInterface(symbols),
      dependencies: this.formatDependencies(imports),
      dependents: this.formatDependents(dependents),
      changeHistory: history,
      contributors: this.extractContributors(history),
      complexity: this.calculateComplexity(symbols),
      documentationScore: this.calculateDocScore(symbols)
    };
  }

  private inferPurpose(filePath: string, symbols: CodeSymbol[]): string {
    const name = basename(filePath, extname(filePath));
    const parts: string[] = [];

    // Infer from filename
    if (name.toLowerCase().includes('test')) {
      return `Test file for ${name.replace(/\.test|\.spec|Test|Spec/gi, '')}`;
    }
    if (name.toLowerCase().includes('util') || name.toLowerCase().includes('helper')) {
      return 'Utility functions and helpers';
    }
    if (name === 'index') {
      return 'Module entry point / barrel export';
    }

    // Infer from exported symbols
    const exported = symbols.filter(s => s.exported);
    const classes = exported.filter(s => s.kind === 'class');
    const interfaces = exported.filter(s => s.kind === 'interface');
    const functions = exported.filter(s => s.kind === 'function');

    if (classes.length === 1) {
      return `Defines the ${classes[0]!.name} class`;
    }
    if (interfaces.length > 0 && functions.length === 0) {
      return `Type definitions: ${interfaces.map(i => i.name).slice(0, 3).join(', ')}`;
    }
    if (functions.length > 0) {
      parts.push(`Functions: ${functions.map(f => f.name).slice(0, 3).join(', ')}`);
    }

    // Infer from directory
    const pathParts = filePath.split(/[/\\]/);
    const parentDir = pathParts[pathParts.length - 2];
    if (parentDir) {
      const dirPurposes: Record<string, string> = {
        'server': 'Server-side code',
        'api': 'API layer',
        'core': 'Core business logic',
        'storage': 'Data storage',
        'utils': 'Utilities',
        'types': 'Type definitions',
        'components': 'UI components',
        'hooks': 'React hooks',
        'services': 'Service layer'
      };
      if (dirPurposes[parentDir]) {
        parts.unshift(dirPurposes[parentDir]);
      }
    }

    return parts.length > 0 ? parts.join('. ') : `Module: ${name}`;
  }

  private extractPublicInterface(symbols: CodeSymbol[]): SymbolDoc[] {
    return symbols
      .filter(s => s.exported)
      .map(s => ({
        name: s.name,
        kind: s.kind,
        signature: s.signature,
        description: s.docstring,
        lineStart: s.lineStart,
        lineEnd: s.lineEnd,
        exported: true
      }));
  }

  private formatDependencies(imports: Array<{
    importedFrom: string;
    importedSymbols: string[];
  }>): DependencyDoc[] {
    return imports.map(i => ({
      file: i.importedFrom,
      symbols: i.importedSymbols
    }));
  }

  private formatDependents(dependents: Array<{
    file: string;
    imports: string[];
  }>): DependentDoc[] {
    return dependents.map(d => ({
      file: d.file,
      symbols: d.imports
    }));
  }

  private getChangeHistory(filePath: string): ChangeHistoryEntry[] {
    const history: ChangeHistoryEntry[] = [];

    if (!this.isGitRepo) {
      return history;
    }

    try {
      const output = execSync(
        `git log --oneline -20 --format="%H|%s|%an|%ad" --date=short -- "${filePath}"`,
        { cwd: this.projectPath, encoding: 'utf-8', maxBuffer: 1024 * 1024 }
      );

      const lines = output.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        const [hash, subject, author, dateStr] = line.split('|');
        if (!hash || !subject) continue;

        const { added, removed } = this.getCommitLineChanges(hash, filePath);

        history.push({
          date: new Date(dateStr || Date.now()),
          change: subject,
          author: author || 'Unknown',
          commit: hash.slice(0, 8),
          linesChanged: { added, removed }
        });
      }
    } catch {
      // Git command failed
    }

    return history;
  }

  private getCommitLineChanges(hash: string, filePath: string): { added: number; removed: number } {
    try {
      const output = execSync(
        `git show --numstat --format="" "${hash}" -- "${filePath}"`,
        { cwd: this.projectPath, encoding: 'utf-8', maxBuffer: 1024 * 1024 }
      );

      const match = output.trim().match(/^(\d+)\s+(\d+)/);
      if (match) {
        return {
          added: parseInt(match[1]!, 10),
          removed: parseInt(match[2]!, 10)
        };
      }
    } catch {
      // Git command failed
    }

    return { added: 0, removed: 0 };
  }

  private extractContributors(history: ChangeHistoryEntry[]): string[] {
    const contributors = new Set<string>();
    for (const entry of history) {
      contributors.add(entry.author);
    }
    return Array.from(contributors);
  }

  private calculateComplexity(symbols: CodeSymbol[]): 'low' | 'medium' | 'high' {
    const totalSymbols = symbols.length;
    const exportedSymbols = symbols.filter(s => s.exported).length;
    const avgLineSpan = symbols.length > 0
      ? symbols.reduce((sum, s) => sum + (s.lineEnd - s.lineStart), 0) / symbols.length
      : 0;

    // Simple heuristic based on symbol count and size
    if (totalSymbols > 20 || avgLineSpan > 50) {
      return 'high';
    }
    if (totalSymbols > 8 || avgLineSpan > 25) {
      return 'medium';
    }
    return 'low';
  }

  private calculateDocScore(symbols: CodeSymbol[]): number {
    const exported = symbols.filter(s => s.exported);
    if (exported.length === 0) {
      return 100; // No public API, considered fully documented
    }

    const documented = exported.filter(s => s.docstring && s.docstring.length > 0);
    return Math.round((documented.length / exported.length) * 100);
  }
}
