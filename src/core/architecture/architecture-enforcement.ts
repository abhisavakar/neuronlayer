import type Database from 'better-sqlite3';
import type { Tier2Storage } from '../../storage/tier2.js';
import type { EmbeddingGenerator } from '../../indexing/embeddings.js';
import type {
  Pattern,
  PatternCategory,
  PatternValidationResult,
  ExistingFunction,
  CodeExample,
  PatternRule
} from '../../types/documentation.js';
import { PatternLibrary } from './pattern-library.js';
import { PatternLearner } from './pattern-learner.js';
import { PatternValidator } from './pattern-validator.js';
import { DuplicateDetector } from './duplicate-detector.js';

export class ArchitectureEnforcement {
  private patternLibrary: PatternLibrary;
  private patternLearner: PatternLearner;
  private patternValidator: PatternValidator;
  private duplicateDetector: DuplicateDetector;
  private initialized = false;

  constructor(
    db: Database.Database,
    tier2: Tier2Storage,
    embeddingGenerator: EmbeddingGenerator
  ) {
    this.patternLibrary = new PatternLibrary(db);
    this.duplicateDetector = new DuplicateDetector(tier2, embeddingGenerator);
    this.patternLearner = new PatternLearner(tier2, this.patternLibrary);
    this.patternValidator = new PatternValidator(this.patternLibrary, this.duplicateDetector, tier2);
  }

  // Initialize by learning patterns from codebase
  initialize(): { patternsLearned: number; examplesAdded: number } {
    if (this.initialized) return { patternsLearned: 0, examplesAdded: 0 };

    const result = this.patternLearner.learnFromCodebase();
    this.initialized = true;

    return {
      patternsLearned: result.patternsLearned,
      examplesAdded: result.examplesAdded
    };
  }

  // Validate code against patterns
  validatePattern(code: string, type?: PatternCategory | 'auto'): PatternValidationResult {
    return this.patternValidator.validate(code, type);
  }

  // Suggest existing functions for an intent
  suggestExisting(intent: string, limit?: number): ExistingFunction[] {
    return this.duplicateDetector.suggestExisting(intent, limit);
  }

  // Learn a new pattern
  learnPattern(
    code: string,
    name: string,
    description?: string,
    category?: PatternCategory
  ): { success: boolean; patternId?: string; message: string } {
    return this.patternLearner.learnPattern(code, name, description, category);
  }

  // List all patterns
  listPatterns(category?: PatternCategory): Pattern[] {
    if (category) {
      return this.patternLibrary.getPatternsByCategory(category);
    }
    return this.patternLibrary.getAllPatterns();
  }

  // Get a specific pattern
  getPattern(id: string): Pattern | null {
    return this.patternLibrary.getPattern(id);
  }

  // Add example to existing pattern
  addExample(patternId: string, code: string, explanation: string, isAntiPattern: boolean = false): boolean {
    const example: CodeExample = { code, explanation };
    return this.patternLibrary.addExample(patternId, example, isAntiPattern);
  }

  // Add rule to existing pattern
  addRule(patternId: string, rule: string, severity: 'info' | 'warning' | 'critical'): boolean {
    const patternRule: PatternRule = { rule, severity };
    return this.patternLibrary.addRule(patternId, patternRule);
  }

  // Search patterns
  searchPatterns(query: string): Pattern[] {
    return this.patternLibrary.searchPatterns(query);
  }

  // Delete a pattern
  deletePattern(id: string): boolean {
    return this.patternLibrary.deletePattern(id);
  }

  // Refresh duplicate detector index
  refreshIndex(): void {
    this.duplicateDetector.refresh();
  }

  // Get statistics
  getStats(): {
    patterns: {
      total: number;
      byCategory: Record<string, number>;
      topPatterns: Array<{ name: string; usageCount: number }>;
    };
    functions: {
      total: number;
      exported: number;
      byPurpose: Record<string, number>;
    };
  } {
    return {
      patterns: this.patternLearner.getStats(),
      functions: this.duplicateDetector.getStats()
    };
  }

  // Format validation result for display
  static formatValidationResult(result: PatternValidationResult): string {
    const lines: string[] = [];

    const scoreIcon = result.score >= 80 ? '\u{1F7E2}' :
                      result.score >= 50 ? '\u{1F7E1}' : '\u{1F534}';

    lines.push(`\u{1F50D} Pattern Validation\n`);
    lines.push(`${scoreIcon} Score: ${result.score}/100`);

    if (result.matchedPattern) {
      lines.push(`Matched Pattern: ${result.matchedPattern}`);
    }

    if (result.violations.length > 0) {
      lines.push('\n\u274C Violations:');
      for (const v of result.violations) {
        const icon = v.severity === 'critical' ? '\u{1F534}' :
                     v.severity === 'warning' ? '\u{1F7E1}' : '\u{2139}\u{FE0F}';
        lines.push(`  ${icon} ${v.message}`);
        if (v.suggestion) {
          lines.push(`     \u2192 ${v.suggestion}`);
        }
      }
    }

    if (result.existingAlternatives.length > 0) {
      lines.push('\n\u{1F4A1} Existing Alternatives:');
      for (const alt of result.existingAlternatives) {
        lines.push(`  - ${alt.name}() in ${alt.file} (${alt.similarity}% similar)`);
      }
    }

    if (result.suggestions.length > 0) {
      lines.push('\n\u{1F4DD} Suggestions:');
      for (const s of result.suggestions) {
        const icon = s.priority === 'high' ? '\u{1F534}' :
                     s.priority === 'medium' ? '\u{1F7E1}' : '\u{1F7E2}';
        lines.push(`  ${icon} ${s.description}`);
        if (s.code) {
          lines.push(`     ${s.code}`);
        }
      }
    }

    return lines.join('\n');
  }

  // Format pattern list for display
  static formatPatternList(patterns: Pattern[]): string {
    if (patterns.length === 0) {
      return 'No patterns found.';
    }

    const lines: string[] = [];
    lines.push(`\u{1F4DA} Patterns (${patterns.length})\n`);

    const byCategory: Record<string, Pattern[]> = {};
    for (const p of patterns) {
      if (!byCategory[p.category]) {
        byCategory[p.category] = [];
      }
      byCategory[p.category].push(p);
    }

    for (const [category, categoryPatterns] of Object.entries(byCategory)) {
      lines.push(`\n${category.toUpperCase()}:`);
      for (const p of categoryPatterns) {
        lines.push(`  \u251C\u2500 ${p.name} (${p.usageCount} uses)`);
        if (p.description) {
          lines.push(`  \u2502  ${p.description.slice(0, 50)}...`);
        }
        lines.push(`  \u2502  Rules: ${p.rules.length}, Examples: ${p.examples.length}`);
      }
    }

    return lines.join('\n');
  }

  // Format existing function suggestions for display
  static formatSuggestions(suggestions: ExistingFunction[]): string {
    if (suggestions.length === 0) {
      return 'No existing functions found for this intent.';
    }

    const lines: string[] = [];
    lines.push(`\u{1F4A1} Existing Functions\n`);

    for (const s of suggestions) {
      lines.push(`\u251C\u2500 ${s.name}()`);
      lines.push(`\u2502  File: ${s.file}:${s.line}`);
      lines.push(`\u2502  Signature: ${s.signature}`);
      lines.push(`\u2502  Used: ${s.usageCount} times, Relevance: ${s.similarity}%`);
      if (s.description) {
        lines.push(`\u2502  ${s.description}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
