/**
 * Memory Review Gateway
 *
 * Routes to: validate_pattern, check_conflicts, suggest_existing, check_tests,
 * get_confidence, find_similar_bugs, suggest_test_update, get_related_tests,
 * get_test_coverage
 */

import type { MemoryLayerEngine } from '../../core/engine.js';
import type { MemoryReviewInput, MemoryReviewResponse } from './types.js';
import { detectReviewAction, getReviewChecks, isErrorMessage } from './router.js';
import {
  aggregateReviewResults,
  calculateRiskScore,
  getVerdict,
  type PatternValidationResult,
  type ConflictCheckResult,
  type ConfidenceCheckResult,
  type TestCheckResult,
  type ExistingFunctionResult,
} from './aggregator.js';

/**
 * Handle a memory_review gateway call
 */
export async function handleMemoryReview(
  engine: MemoryLayerEngine,
  input: MemoryReviewInput
): Promise<MemoryReviewResponse> {
  const action = detectReviewAction(input);
  const sourcesUsed: string[] = [];

  // Handle specific actions
  if (action !== 'full') {
    switch (action) {
      case 'pattern':
        return handlePatternOnly(engine, input, sourcesUsed);

      case 'conflicts':
        return handleConflictsOnly(engine, input, sourcesUsed);

      case 'tests':
        return handleTestsOnly(engine, input, sourcesUsed);

      case 'confidence':
        return handleConfidenceOnly(engine, input, sourcesUsed);

      case 'bugs':
        return handleBugsOnly(engine, input, sourcesUsed);

      case 'coverage':
        return handleCoverageOnly(engine, input, sourcesUsed);
    }
  }

  // Full review - run applicable checks in parallel
  return handleFullReview(engine, input, sourcesUsed);
}

/**
 * Full comprehensive review
 */
async function handleFullReview(
  engine: MemoryLayerEngine,
  input: MemoryReviewInput,
  sourcesUsed: string[]
): Promise<MemoryReviewResponse> {
  const checks = getReviewChecks(input);

  // Build parallel operations
  const operations: Promise<unknown>[] = [];
  const operationKeys: string[] = [];

  if (checks.runPatterns) {
    sourcesUsed.push('validate_pattern');
    operations.push(Promise.resolve(engine.validatePattern(input.code)));
    operationKeys.push('pattern');
  }

  if (checks.runConflicts) {
    sourcesUsed.push('check_conflicts');
    operations.push(engine.checkCodeConflicts(input.code));
    operationKeys.push('conflicts');
  }

  if (checks.runConfidence) {
    sourcesUsed.push('get_confidence');
    operations.push(engine.getConfidence(input.code, input.intent));
    operationKeys.push('confidence');
  }

  if (checks.runExisting && input.intent) {
    sourcesUsed.push('suggest_existing');
    operations.push(Promise.resolve(engine.suggestExisting(input.intent, 5)));
    operationKeys.push('existing');
  }

  if (checks.runTests && input.file) {
    sourcesUsed.push('check_tests');
    operations.push(Promise.resolve(engine.checkTests(input.code, input.file)));
    operationKeys.push('tests');
  }

  if (checks.runBugs && input.error) {
    sourcesUsed.push('find_similar_bugs');
    operations.push(Promise.resolve(engine.findSimilarBugs(input.error, 5)));
    operationKeys.push('bugs');
  }

  // Run all checks in parallel
  const results = await Promise.all(operations);

  // Map results to their keys
  const resultMap: Record<string, unknown> = {};
  operationKeys.forEach((key, index) => {
    resultMap[key] = results[index];
  });

  // Extract typed results
  const patternResult = resultMap.pattern as PatternValidationResult | undefined;
  const conflictsResult = resultMap.conflicts as ConflictCheckResult | undefined;
  const confidenceResult = resultMap.confidence as ConfidenceCheckResult | undefined;
  const existingResult = resultMap.existing as ExistingFunctionResult[] | undefined;
  const testsResult = resultMap.tests as TestCheckResult | undefined;
  const bugsResult = resultMap.bugs as Array<{
    error: string;
    similarity: number;
    fix: string;
    file?: string;
  }> | undefined;

  // Calculate risk score and aggregate
  const response = aggregateReviewResults(
    patternResult || null,
    conflictsResult ? {
      hasConflicts: conflictsResult.hasConflicts,
      conflicts: conflictsResult.conflicts,
    } : null,
    confidenceResult || null,
    existingResult || null,
    testsResult || null,
    sourcesUsed
  );

  // Add similar bugs if found
  if (bugsResult && bugsResult.length > 0) {
    response.similar_bugs = bugsResult.map(b => ({
      error: b.error.slice(0, 100),
      similarity: b.similarity,
      fix: b.fix,
      file: b.file,
    }));
  }

  return response;
}

/**
 * Pattern validation only
 */
async function handlePatternOnly(
  engine: MemoryLayerEngine,
  input: MemoryReviewInput,
  sourcesUsed: string[]
): Promise<MemoryReviewResponse> {
  sourcesUsed.push('validate_pattern');

  const result = engine.validatePattern(input.code);

  const riskScore = calculateRiskScore(result, null, null, null);

  return {
    verdict: getVerdict(riskScore),
    risk_score: riskScore,
    sources_used: sourcesUsed,
    patterns: {
      valid: result.valid,
      score: result.score,
      matched_pattern: result.matchedPattern,
      violations: result.violations,
    },
  };
}

/**
 * Conflict check only
 */
async function handleConflictsOnly(
  engine: MemoryLayerEngine,
  input: MemoryReviewInput,
  sourcesUsed: string[]
): Promise<MemoryReviewResponse> {
  sourcesUsed.push('check_conflicts');

  const result = await engine.checkCodeConflicts(input.code);

  const riskScore = calculateRiskScore(null, {
    hasConflicts: result.hasConflicts,
    conflicts: result.conflicts,
  }, null, null);

  return {
    verdict: getVerdict(riskScore),
    risk_score: riskScore,
    sources_used: sourcesUsed,
    conflicts: {
      has_conflicts: result.hasConflicts,
      conflicts: result.conflicts.map(c => ({
        decision_id: c.decisionId,
        decision_title: c.decisionTitle,
        conflict_description: c.conflictDescription,
        severity: c.severity,
      })),
    },
  };
}

/**
 * Test check only
 */
async function handleTestsOnly(
  engine: MemoryLayerEngine,
  input: MemoryReviewInput,
  sourcesUsed: string[]
): Promise<MemoryReviewResponse> {
  if (!input.file) {
    return {
      verdict: 'warning',
      risk_score: 50,
      sources_used: sourcesUsed,
    };
  }

  sourcesUsed.push('check_tests');

  const result = engine.checkTests(input.code, input.file);

  const riskScore = calculateRiskScore(null, null, result, null);

  return {
    verdict: getVerdict(riskScore),
    risk_score: riskScore,
    sources_used: sourcesUsed,
    test_impact: {
      safe: result.safe,
      coverage_percent: result.coveragePercent,
      would_fail: result.wouldFail.map(f => ({
        test_name: f.test.name,
        test_file: f.test.file,
        reason: f.reason,
        suggested_fix: f.suggestedFix,
      })),
      suggested_updates: result.suggestedTestUpdates.map(u => ({
        file: u.file,
        test_name: u.testName,
        before: u.before,
        after: u.after,
        reason: u.reason,
      })),
    },
  };
}

/**
 * Confidence check only
 */
async function handleConfidenceOnly(
  engine: MemoryLayerEngine,
  input: MemoryReviewInput,
  sourcesUsed: string[]
): Promise<MemoryReviewResponse> {
  sourcesUsed.push('get_confidence');

  const result = await engine.getConfidence(input.code, input.intent);

  const riskScore = calculateRiskScore(null, null, null, result);

  return {
    verdict: getVerdict(riskScore),
    risk_score: riskScore,
    sources_used: sourcesUsed,
    confidence: {
      level: result.confidence,
      score: result.score,
      reasoning: result.reasoning,
    },
  };
}

/**
 * Bug search only
 */
async function handleBugsOnly(
  engine: MemoryLayerEngine,
  input: MemoryReviewInput,
  sourcesUsed: string[]
): Promise<MemoryReviewResponse> {
  if (!input.error) {
    return {
      verdict: 'approve',
      risk_score: 0,
      sources_used: sourcesUsed,
    };
  }

  sourcesUsed.push('find_similar_bugs');

  const bugs = engine.findSimilarBugs(input.error, 5);

  return {
    verdict: bugs.length > 0 ? 'warning' : 'approve',
    risk_score: bugs.length > 0 ? 30 : 0,
    sources_used: sourcesUsed,
    similar_bugs: bugs.map(b => ({
      error: b.error.slice(0, 100),
      similarity: b.similarity,
      fix: b.fix,
      file: b.file,
    })),
  };
}

/**
 * Coverage check only
 */
async function handleCoverageOnly(
  engine: MemoryLayerEngine,
  input: MemoryReviewInput,
  sourcesUsed: string[]
): Promise<MemoryReviewResponse> {
  if (!input.file) {
    return {
      verdict: 'warning',
      risk_score: 50,
      sources_used: sourcesUsed,
    };
  }

  sourcesUsed.push('get_test_coverage');

  const coverage = engine.getTestCoverage(input.file);

  // Risk based on coverage percentage
  const riskScore = Math.max(0, 100 - coverage.coveragePercent);

  return {
    verdict: getVerdict(riskScore),
    risk_score: riskScore,
    sources_used: sourcesUsed,
    coverage: {
      file: coverage.file,
      total_tests: coverage.totalTests,
      coverage_percent: coverage.coveragePercent,
      uncovered_functions: coverage.uncoveredFunctions,
    },
  };
}
