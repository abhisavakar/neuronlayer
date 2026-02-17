/**
 * Result Aggregation Utilities
 *
 * Combines results from multiple internal tools into unified gateway responses.
 */

import type {
  MemoryQueryResponse,
  MemoryReviewResponse,
  MemoryStatusResponse,
} from './types.js';

// ============================================================================
// Query Result Aggregation
// ============================================================================

export interface RawContextResult {
  context: string;
  sources: string[];
  tokenCount: number;
  decisions: Array<{
    id: string;
    title: string;
    description: string;
    createdAt: Date;
  }>;
}

export interface RawSearchResult {
  file: string;
  preview: string;
  similarity: number;
  lineStart?: number;
  lineEnd?: number;
}

/**
 * Aggregate context and search results into a unified query response
 */
export function aggregateQueryResults(
  contextResult: RawContextResult | null,
  searchResults: RawSearchResult[] | null,
  sourcesUsed: string[]
): Partial<MemoryQueryResponse> {
  const response: Partial<MemoryQueryResponse> = {
    sources_used: sourcesUsed,
  };

  if (contextResult) {
    response.context = {
      content: contextResult.context,
      sources: contextResult.sources,
      token_count: contextResult.tokenCount,
      decisions: contextResult.decisions.map(d => ({
        id: d.id,
        title: d.title,
        description: d.description,
        created_at: d.createdAt.toISOString(),
      })),
    };
  }

  if (searchResults && searchResults.length > 0) {
    // Deduplicate search results by file
    const seen = new Set<string>();
    const deduped: RawSearchResult[] = [];

    for (const result of searchResults) {
      const key = `${result.file}:${result.lineStart || 0}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(result);
      }
    }

    response.search_results = deduped.map(r => ({
      file: r.file,
      preview: r.preview,
      relevance: r.similarity,
      line_start: r.lineStart,
      line_end: r.lineEnd,
    }));
  }

  return response;
}

/**
 * Merge search results from multiple sources, deduplicating and sorting by relevance
 */
export function mergeSearchResults(
  ...resultSets: (RawSearchResult[] | null)[]
): RawSearchResult[] {
  const merged: Map<string, RawSearchResult> = new Map();

  for (const results of resultSets) {
    if (!results) continue;

    for (const result of results) {
      const key = `${result.file}:${result.lineStart || 0}`;
      const existing = merged.get(key);

      if (!existing || existing.similarity < result.similarity) {
        merged.set(key, result);
      }
    }
  }

  // Sort by relevance descending
  return Array.from(merged.values()).sort((a, b) => b.similarity - a.similarity);
}

// ============================================================================
// Review Result Aggregation
// ============================================================================

export interface PatternValidationResult {
  valid: boolean;
  score: number;
  matchedPattern?: string;
  violations: Array<{
    rule: string;
    message: string;
    severity: string;
    suggestion?: string;
  }>;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: Array<{
    decisionId: string;
    decisionTitle: string;
    conflictDescription: string;
    severity: string;
    decisionDate: Date;
  }>;
}

export interface ConfidenceCheckResult {
  confidence: string;
  score: number;
  reasoning: string;
}

export interface TestCheckResult {
  safe: boolean;
  coveragePercent: number;
  wouldFail: Array<{
    test: { id: string; name: string; file: string };
    reason: string;
    suggestedFix?: string;
  }>;
  suggestedTestUpdates: Array<{
    file: string;
    testName: string;
    before: string;
    after: string;
    reason: string;
  }>;
}

export interface ExistingFunctionResult {
  name: string;
  file: string;
  line: number;
  signature: string;
  similarity: number;
}

/**
 * Calculate a unified risk score from review results
 *
 * Scoring factors:
 * - Pattern validation: 0-30 points (based on violations)
 * - Conflicts: 0-40 points (critical if conflicts exist)
 * - Test impact: 0-20 points (based on failing tests)
 * - Confidence: 0-10 points (low confidence adds risk)
 */
export function calculateRiskScore(
  patternResult: PatternValidationResult | null,
  conflicts: ConflictCheckResult | null,
  testResult: TestCheckResult | null,
  confidence: ConfidenceCheckResult | null
): number {
  let riskScore = 0;

  // Pattern violations (0-30 points)
  if (patternResult) {
    const violationRisk = Math.min(30, patternResult.violations.length * 10);
    // Higher severity violations count more
    const severityBonus = patternResult.violations.filter(
      v => v.severity === 'high' || v.severity === 'error'
    ).length * 5;
    riskScore += Math.min(30, violationRisk + severityBonus);
  }

  // Conflicts (0-40 points) - conflicts with past decisions are serious
  if (conflicts && conflicts.hasConflicts) {
    const conflictRisk = Math.min(40, conflicts.conflicts.length * 20);
    riskScore += conflictRisk;
  }

  // Test impact (0-20 points)
  if (testResult && !testResult.safe) {
    const testRisk = Math.min(20, testResult.wouldFail.length * 10);
    riskScore += testRisk;
  }

  // Low confidence (0-10 points)
  if (confidence) {
    if (confidence.confidence === 'low') {
      riskScore += 10;
    } else if (confidence.confidence === 'medium') {
      riskScore += 5;
    }
  }

  return Math.min(100, riskScore);
}

/**
 * Determine verdict based on risk score
 */
export function getVerdict(riskScore: number): 'approve' | 'warning' | 'reject' {
  if (riskScore >= 70) return 'reject';
  if (riskScore >= 30) return 'warning';
  return 'approve';
}

/**
 * Aggregate review results into a unified response
 */
export function aggregateReviewResults(
  patternResult: PatternValidationResult | null,
  conflicts: ConflictCheckResult | null,
  confidence: ConfidenceCheckResult | null,
  existingAlternatives: ExistingFunctionResult[] | null,
  testResult: TestCheckResult | null,
  sourcesUsed: string[]
): MemoryReviewResponse {
  const riskScore = calculateRiskScore(patternResult, conflicts, testResult, confidence);

  const response: MemoryReviewResponse = {
    verdict: getVerdict(riskScore),
    risk_score: riskScore,
    sources_used: sourcesUsed,
  };

  if (patternResult) {
    response.patterns = {
      valid: patternResult.valid,
      score: patternResult.score,
      matched_pattern: patternResult.matchedPattern,
      violations: patternResult.violations,
    };
  }

  if (conflicts) {
    response.conflicts = {
      has_conflicts: conflicts.hasConflicts,
      conflicts: conflicts.conflicts.map(c => ({
        decision_id: c.decisionId,
        decision_title: c.decisionTitle,
        conflict_description: c.conflictDescription,
        severity: c.severity,
      })),
    };
  }

  if (existingAlternatives && existingAlternatives.length > 0) {
    response.existing_alternatives = existingAlternatives.map(a => ({
      name: a.name,
      file: a.file,
      line: a.line,
      signature: a.signature,
      similarity: a.similarity,
    }));
  }

  if (testResult) {
    response.test_impact = {
      safe: testResult.safe,
      coverage_percent: testResult.coveragePercent,
      would_fail: testResult.wouldFail.map(f => ({
        test_name: f.test.name,
        test_file: f.test.file,
        reason: f.reason,
        suggested_fix: f.suggestedFix,
      })),
      suggested_updates: testResult.suggestedTestUpdates.map(u => ({
        file: u.file,
        test_name: u.testName,
        before: u.before,
        after: u.after,
        reason: u.reason,
      })),
    };
  }

  if (confidence) {
    response.confidence = {
      level: confidence.confidence,
      score: confidence.score,
      reasoning: confidence.reasoning,
    };
  }

  return response;
}

// ============================================================================
// Status Result Aggregation
// ============================================================================

/**
 * Build a status response from multiple gathered results
 */
export function aggregateStatusResults(
  results: Record<string, unknown>,
  sourcesUsed: string[]
): MemoryStatusResponse {
  const response: MemoryStatusResponse = {
    sources_used: sourcesUsed,
  };

  // Copy relevant results into response
  if (results.project) response.project = results.project as MemoryStatusResponse['project'];
  if (results.architecture) response.architecture = results.architecture as MemoryStatusResponse['architecture'];
  if (results.changes) response.changes = results.changes as MemoryStatusResponse['changes'];
  if (results.activity) response.activity = results.activity as MemoryStatusResponse['activity'];
  if (results.changelog) response.changelog = results.changelog as MemoryStatusResponse['changelog'];
  if (results.docs) response.docs = results.docs as MemoryStatusResponse['docs'];
  if (results.health) response.health = results.health as MemoryStatusResponse['health'];
  if (results.patterns) response.patterns = results.patterns as MemoryStatusResponse['patterns'];
  if (results.stats) response.stats = results.stats as MemoryStatusResponse['stats'];
  if (results.critical) response.critical = results.critical as MemoryStatusResponse['critical'];
  if (results.learning) response.learning = results.learning as MemoryStatusResponse['learning'];
  if (results.undocumented) response.undocumented = results.undocumented as MemoryStatusResponse['undocumented'];

  return response;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Truncate a string to a maximum length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Calculate time ago string
 */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toISOString().split('T')[0] || date.toISOString();
}
