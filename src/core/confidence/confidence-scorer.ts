import type { Tier2Storage } from '../../storage/tier2.js';
import type { EmbeddingGenerator } from '../../indexing/embeddings.js';
import type {
  ConfidenceResult,
  ConfidenceLevel,
  ConfidenceSources,
  ConfidenceWarning,
  CodebaseMatch,
  DecisionMatch,
  PatternMatch
} from '../../types/documentation.js';
import { SourceTracker } from './source-tracker.js';
import { WarningDetector } from './warning-detector.js';
import { ConflictChecker } from './conflict-checker.js';

// Weights for confidence calculation
const WEIGHTS = {
  codebase: 0.5,    // 50% weight from codebase matches
  decision: 0.3,    // 30% weight from decision alignment
  pattern: 0.2      // 20% weight from pattern matching
};

// Thresholds for confidence levels
const THRESHOLDS = {
  high: 80,
  medium: 50,
  low: 20
};

export class ConfidenceScorer {
  private sourceTracker: SourceTracker;
  private warningDetector: WarningDetector;
  private conflictChecker: ConflictChecker;

  constructor(
    tier2: Tier2Storage,
    embeddingGenerator: EmbeddingGenerator
  ) {
    this.sourceTracker = new SourceTracker(tier2, embeddingGenerator);
    this.warningDetector = new WarningDetector(tier2);
    this.conflictChecker = new ConflictChecker(tier2, embeddingGenerator);
  }

  async getConfidence(code: string, context?: string): Promise<ConfidenceResult> {
    // 1. Track sources
    const sources = await this.sourceTracker.trackSources(code, context);

    // 2. Calculate scores for each component
    const codeScore = this.calculateCodeScore(sources.codebase);
    const decisionScore = this.calculateDecisionScore(sources.decisions);
    const patternScore = this.calculatePatternScore(sources.patterns);

    // 3. Calculate composite score
    const compositeScore = this.calculateCompositeScore(codeScore, decisionScore, patternScore);

    // 4. Determine confidence level
    const confidence = this.determineLevel(compositeScore);

    // 5. Detect warnings
    const warnings = await this.warningDetector.detectWarnings(code, sources);

    // 6. Check for decision conflicts
    const conflicts = await this.conflictChecker.checkConflicts(code);
    if (conflicts.hasConflicts) {
      for (const conflict of conflicts.conflicts) {
        warnings.push({
          type: 'conflicts_with_decision',
          message: `Conflicts with decision: "${conflict.decisionTitle}"`,
          severity: conflict.severity === 'high' ? 'critical' : 'warning',
          suggestion: conflict.conflictDescription,
          relatedDecision: conflict.decisionId
        });
      }
    }

    // 7. Generate reasoning
    const reasoning = this.generateReasoning(confidence, sources, warnings);

    return {
      confidence,
      score: Math.round(compositeScore),
      reasoning,
      sources,
      warnings
    };
  }

  private calculateCodeScore(matches: CodebaseMatch[]): number {
    if (matches.length === 0) return 0;

    // Weight by similarity and usage count
    let totalWeight = 0;
    let weightedSum = 0;

    for (const match of matches) {
      const weight = 1 + Math.log10(1 + (match.usageCount || 1));
      weightedSum += match.similarity * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private calculateDecisionScore(matches: DecisionMatch[]): number {
    if (matches.length === 0) return 50; // Neutral if no decisions

    // Average relevance of matched decisions
    const totalRelevance = matches.reduce((sum, m) => sum + m.relevance, 0);
    return totalRelevance / matches.length;
  }

  private calculatePatternScore(matches: PatternMatch[]): number {
    if (matches.length === 0) return 30; // Low baseline if no patterns

    // Average confidence of matched patterns
    const totalConfidence = matches.reduce((sum, m) => sum + m.confidence, 0);
    return totalConfidence / matches.length;
  }

  private calculateCompositeScore(codeScore: number, decisionScore: number, patternScore: number): number {
    return (
      codeScore * WEIGHTS.codebase +
      decisionScore * WEIGHTS.decision +
      patternScore * WEIGHTS.pattern
    );
  }

  private determineLevel(score: number): ConfidenceLevel {
    if (score >= THRESHOLDS.high) return 'high';
    if (score >= THRESHOLDS.medium) return 'medium';
    if (score >= THRESHOLDS.low) return 'low';
    return 'guessing';
  }

  private generateReasoning(
    level: ConfidenceLevel,
    sources: ConfidenceSources,
    warnings: ConfidenceWarning[]
  ): string {
    const parts: string[] = [];

    // Confidence level explanation
    switch (level) {
      case 'high':
        parts.push('High confidence');
        break;
      case 'medium':
        parts.push('Medium confidence');
        break;
      case 'low':
        parts.push('Low confidence');
        break;
      case 'guessing':
        parts.push('Best guess');
        break;
    }

    // Source attribution
    if (sources.codebase.length > 0) {
      const topMatch = sources.codebase[0];
      parts.push(`found similar code in ${topMatch.file}${topMatch.function ? `:${topMatch.function}` : ''} (${topMatch.similarity}% match)`);
    }

    if (sources.decisions.length > 0) {
      parts.push(`aligns with ${sources.decisions.length} recorded decision(s)`);
    }

    if (sources.patterns.length > 0) {
      parts.push(`matches ${sources.patterns.length} established pattern(s)`);
    }

    if (sources.usedGeneralKnowledge) {
      parts.push('based partly on general knowledge');
    }

    // Warnings
    const criticalWarnings = warnings.filter(w => w.severity === 'critical');
    if (criticalWarnings.length > 0) {
      parts.push(`${criticalWarnings.length} critical warning(s)`);
    }

    return parts.join(', ');
  }

  async listSources(code: string, context?: string, includeSnippets: boolean = false): Promise<ConfidenceSources> {
    const sources = await this.sourceTracker.trackSources(code, context);

    if (!includeSnippets) {
      // Remove snippets for cleaner output
      for (const match of sources.codebase) {
        delete match.snippet;
      }
    }

    return sources;
  }

  async checkConflicts(code: string) {
    return this.conflictChecker.checkConflicts(code);
  }

  // Get confidence level indicator emoji
  static getIndicator(level: ConfidenceLevel): string {
    switch (level) {
      case 'high': return '\u{1F7E2}'; // Green circle
      case 'medium': return '\u{1F7E1}'; // Yellow circle
      case 'low': return '\u{1F7E0}'; // Orange circle
      case 'guessing': return '\u{1F534}'; // Red circle
    }
  }

  // Format confidence result for display
  static formatResult(result: ConfidenceResult): string {
    const indicator = ConfidenceScorer.getIndicator(result.confidence);
    const lines: string[] = [];

    lines.push(`${indicator} ${result.confidence.toUpperCase()} Confidence (${result.score}%)`);
    lines.push(result.reasoning);

    if (result.sources.codebase.length > 0) {
      lines.push('');
      lines.push('Codebase Sources:');
      for (const match of result.sources.codebase.slice(0, 3)) {
        lines.push(`  - ${match.file}${match.line ? `:${match.line}` : ''} (${match.similarity}% similar)`);
      }
    }

    if (result.sources.decisions.length > 0) {
      lines.push('');
      lines.push('Related Decisions:');
      for (const decision of result.sources.decisions.slice(0, 3)) {
        lines.push(`  - "${decision.title}" (${decision.relevance}% relevant)`);
      }
    }

    if (result.warnings.length > 0) {
      lines.push('');
      lines.push('Warnings:');
      for (const warning of result.warnings) {
        const icon = warning.severity === 'critical' ? '\u{1F534}' :
                     warning.severity === 'warning' ? '\u{1F7E1}' : '\u{2139}\u{FE0F}';
        lines.push(`  ${icon} ${warning.message}`);
        if (warning.suggestion) {
          lines.push(`     \u{2192} ${warning.suggestion}`);
        }
      }
    }

    return lines.join('\n');
  }
}
