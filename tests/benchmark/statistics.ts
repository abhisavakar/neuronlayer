/**
 * Statistical Analysis Module for MemoryLayer Benchmarks
 *
 * Implements publication-quality statistical calculations including:
 * - Descriptive statistics (mean, median, percentiles, etc.)
 * - Confidence intervals (95% and 99%)
 * - Effect size calculations (Cohen's d, Hedges' g)
 * - Significance testing (Welch's t-test)
 * - Information retrieval metrics (NDCG, MRR, MAP, Precision, Recall)
 *
 * References:
 * - Cohen's d: https://pmc.ncbi.nlm.nih.gov/articles/PMC3840331/
 * - NDCG: https://en.wikipedia.org/wiki/Discounted_cumulative_gain
 * - MLPerf: https://arxiv.org/pdf/1911.02549
 */

import type {
  StatisticalMetrics,
  EffectSizeMetrics,
  SignificanceTest,
  RetrievalMetrics
} from './benchmark-config.js';
import { interpretCohensD, probabilityOfSuperiority } from './benchmark-config.js';

// ============================================================================
// DESCRIPTIVE STATISTICS
// ============================================================================

/**
 * Calculate comprehensive statistical metrics for a dataset
 */
export function calculateStatistics(values: number[]): StatisticalMetrics {
  if (values.length === 0) {
    throw new Error('Cannot calculate statistics for empty array');
  }

  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);

  // Central tendency
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = percentile(sorted, 0.5);

  // Dispersion
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;

  const sumOfSquares = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const variance = n > 1 ? sumOfSquares / (n - 1) : 0;  // Sample variance
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = mean !== 0 ? stdDev / mean : 0;

  const p25 = percentile(sorted, 0.25);
  const p75 = percentile(sorted, 0.75);
  const iqr = p75 - p25;

  // Standard error
  const standardError = stdDev / Math.sqrt(n);

  // Confidence intervals
  const t95 = getTValue(n - 1, 0.05);
  const t99 = getTValue(n - 1, 0.01);

  const marginOfError95 = t95 * standardError;
  const marginOfError99 = t99 * standardError;

  return {
    mean,
    median,
    min,
    max,
    range,
    variance,
    stdDev,
    coefficientOfVariation,
    iqr,

    p10: percentile(sorted, 0.10),
    p25,
    p50: median,
    p75,
    p90: percentile(sorted, 0.90),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),

    ci95: [mean - marginOfError95, mean + marginOfError95],
    ci99: [mean - marginOfError99, mean + marginOfError99],
    marginOfError95,
    marginOfError99,

    n,
    sumOfSquares,
    standardError
  };
}

/**
 * Calculate percentile from sorted array
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (upper >= sorted.length) return sorted[sorted.length - 1];

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Get t-value for confidence interval
 * Approximation for t-distribution critical values
 */
function getTValue(df: number, alpha: number): number {
  // Common t-values (two-tailed)
  const tTable: Record<number, Record<number, number>> = {
    0.05: { 1: 12.71, 5: 2.571, 10: 2.228, 20: 2.086, 30: 2.042, 50: 2.009, 100: 1.984, Infinity: 1.96 },
    0.01: { 1: 63.66, 5: 4.032, 10: 3.169, 20: 2.845, 30: 2.750, 50: 2.678, 100: 2.626, Infinity: 2.576 }
  };

  const alphaTable = tTable[alpha] || tTable[0.05];

  if (df <= 1) return alphaTable[1];
  if (df <= 5) return alphaTable[5];
  if (df <= 10) return alphaTable[10];
  if (df <= 20) return alphaTable[20];
  if (df <= 30) return alphaTable[30];
  if (df <= 50) return alphaTable[50];
  if (df <= 100) return alphaTable[100];
  return alphaTable[Infinity];
}

// ============================================================================
// EFFECT SIZE CALCULATIONS
// ============================================================================

/**
 * Calculate effect size metrics comparing treatment vs baseline
 */
export function calculateEffectSize(
  baseline: number[],
  treatment: number[]
): EffectSizeMetrics {
  const baselineStats = calculateStatistics(baseline);
  const treatmentStats = calculateStatistics(treatment);

  // Cohen's d = (M1 - M2) / SD_pooled
  const pooledSD = Math.sqrt(
    ((baselineStats.n - 1) * baselineStats.variance +
     (treatmentStats.n - 1) * treatmentStats.variance) /
    (baselineStats.n + treatmentStats.n - 2)
  );

  const cohensD = pooledSD !== 0
    ? (baselineStats.mean - treatmentStats.mean) / pooledSD
    : 0;

  // Hedges' g (bias-corrected Cohen's d)
  // Correction factor: 1 - 3/(4(n1+n2) - 9)
  const n = baselineStats.n + treatmentStats.n;
  const correctionFactor = 1 - (3 / (4 * n - 9));
  const hedgesG = cohensD * correctionFactor;

  // Glass's delta (uses control group SD only)
  const glasssDelta = baselineStats.stdDev !== 0
    ? (baselineStats.mean - treatmentStats.mean) / baselineStats.stdDev
    : 0;

  return {
    cohensD,
    hedgesG,
    glasssDelta,
    interpretation: interpretCohensD(cohensD),
    probabilityOfSuperiority: probabilityOfSuperiority(cohensD)
  };
}

// ============================================================================
// SIGNIFICANCE TESTING
// ============================================================================

/**
 * Perform Welch's t-test (does not assume equal variances)
 */
export function welchsTTest(
  baseline: number[],
  treatment: number[],
  alpha: number = 0.05
): SignificanceTest {
  const baselineStats = calculateStatistics(baseline);
  const treatmentStats = calculateStatistics(treatment);

  // Welch's t-statistic
  const se = Math.sqrt(
    baselineStats.variance / baselineStats.n +
    treatmentStats.variance / treatmentStats.n
  );

  const tStatistic = se !== 0
    ? (baselineStats.mean - treatmentStats.mean) / se
    : 0;

  // Welch-Satterthwaite degrees of freedom
  const v1 = baselineStats.variance / baselineStats.n;
  const v2 = treatmentStats.variance / treatmentStats.n;
  const numerator = Math.pow(v1 + v2, 2);
  const denominator =
    Math.pow(v1, 2) / (baselineStats.n - 1) +
    Math.pow(v2, 2) / (treatmentStats.n - 1);

  const df = denominator !== 0 ? numerator / denominator : 1;

  // Approximate p-value using t-distribution
  const pValue = approximatePValue(Math.abs(tStatistic), df);

  return {
    testName: "Welch's t-test",
    tStatistic,
    degreesOfFreedom: df,
    pValue,
    isSignificant: pValue < alpha,
    alpha
  };
}

/**
 * Approximate two-tailed p-value from t-distribution
 */
function approximatePValue(t: number, df: number): number {
  // Using approximation: p ≈ 2 * (1 - Φ(t * √(df/(df+t²))))
  // where Φ is the standard normal CDF

  const x = df / (df + t * t);
  const beta = incompleteBeta(df / 2, 0.5, x);

  return beta;
}

/**
 * Incomplete beta function approximation (for p-value calculation)
 */
function incompleteBeta(a: number, b: number, x: number): number {
  // Simple approximation for our use case
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use continued fraction approximation
  const bt = Math.exp(
    a * Math.log(x) +
    b * Math.log(1 - x) -
    Math.log(a) -
    logBeta(a, b)
  );

  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(a, b, x) / a;
  } else {
    return 1 - bt * betaCF(b, a, 1 - x) / b;
  }
}

function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

function logGamma(x: number): number {
  // Stirling approximation
  if (x <= 0) return 0;
  return (x - 0.5) * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI);
}

function betaCF(a: number, b: number, x: number): number {
  const maxIterations = 100;
  const epsilon = 1e-10;

  let c = 1;
  let d = 1 / (1 - (a + b) * x / (a + 1));
  let result = d;

  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m;

    // Even term
    let an = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 / (1 + an * d);
    c = 1 + an / c;
    result *= d * c;

    // Odd term
    an = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 / (1 + an * d);
    c = 1 + an / c;
    const delta = d * c;
    result *= delta;

    if (Math.abs(delta - 1) < epsilon) break;
  }

  return result;
}

// ============================================================================
// INFORMATION RETRIEVAL METRICS
// ============================================================================

/**
 * Calculate all retrieval metrics
 *
 * @param retrievedItems - Items returned by the system (ordered by rank)
 * @param relevantItems - Ground truth relevant items
 * @param relevanceScores - Optional graded relevance scores (for NDCG)
 * @param kValues - K values for @K metrics
 */
export function calculateRetrievalMetrics(
  retrievedItems: string[],
  relevantItems: string[],
  relevanceScores?: Record<string, number>,
  kValues: number[] = [1, 3, 5, 10]
): RetrievalMetrics {
  const relevantSet = new Set(relevantItems);

  // Precision@K and Recall@K
  const precisionAtK: Record<number, number> = {};
  const recallAtK: Record<number, number> = {};
  const f1AtK: Record<number, number> = {};
  const hitRateAtK: Record<number, number> = {};
  const mrrAtK: Record<number, number> = {};
  const mapAtK: Record<number, number> = {};
  const ndcgAtK: Record<number, number> = {};

  for (const k of kValues) {
    const topK = retrievedItems.slice(0, k);
    const relevantInTopK = topK.filter(item => relevantSet.has(item)).length;

    // Precision@K = |relevant ∩ retrieved@K| / K
    precisionAtK[k] = relevantInTopK / k;

    // Recall@K = |relevant ∩ retrieved@K| / |relevant|
    recallAtK[k] = relevantItems.length > 0
      ? relevantInTopK / relevantItems.length
      : 0;

    // F1@K
    const p = precisionAtK[k];
    const r = recallAtK[k];
    f1AtK[k] = (p + r) > 0 ? 2 * p * r / (p + r) : 0;

    // Hit Rate@K (at least one relevant in top K)
    hitRateAtK[k] = relevantInTopK > 0 ? 1 : 0;

    // MRR@K
    mrrAtK[k] = calculateMRR(topK, relevantSet);

    // MAP@K
    mapAtK[k] = calculateAP(topK, relevantSet);

    // NDCG@K
    ndcgAtK[k] = calculateNDCG(topK, relevanceScores || {}, k);
  }

  // Overall metrics
  const mrr = calculateMRR(retrievedItems, relevantSet);
  const map = calculateAP(retrievedItems, relevantSet);
  const ndcg = calculateNDCG(retrievedItems, relevanceScores || {}, retrievedItems.length);

  // Average rank of first relevant item
  let averageRank = 0;
  for (let i = 0; i < retrievedItems.length; i++) {
    if (relevantSet.has(retrievedItems[i])) {
      averageRank = i + 1;
      break;
    }
  }

  return {
    precisionAtK,
    recallAtK,
    f1AtK,
    mrr,
    mrrAtK,
    map,
    mapAtK,
    ndcg,
    ndcgAtK,
    hitRateAtK,
    averageRank
  };
}

/**
 * Calculate Mean Reciprocal Rank
 */
function calculateMRR(retrieved: string[], relevant: Set<string>): number {
  for (let i = 0; i < retrieved.length; i++) {
    if (relevant.has(retrieved[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

/**
 * Calculate Average Precision
 */
function calculateAP(retrieved: string[], relevant: Set<string>): number {
  let relevantCount = 0;
  let sumPrecision = 0;

  for (let i = 0; i < retrieved.length; i++) {
    if (relevant.has(retrieved[i])) {
      relevantCount++;
      sumPrecision += relevantCount / (i + 1);
    }
  }

  return relevant.size > 0 ? sumPrecision / relevant.size : 0;
}

/**
 * Calculate Normalized Discounted Cumulative Gain
 */
function calculateNDCG(
  retrieved: string[],
  relevanceScores: Record<string, number>,
  k: number
): number {
  const dcg = calculateDCG(retrieved.slice(0, k), relevanceScores);

  // Ideal DCG: sort by relevance descending
  const idealOrder = Object.entries(relevanceScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([item]) => item);

  const idcg = calculateDCG(idealOrder, relevanceScores);

  return idcg > 0 ? dcg / idcg : 0;
}

/**
 * Calculate Discounted Cumulative Gain
 */
function calculateDCG(
  items: string[],
  relevanceScores: Record<string, number>
): number {
  let dcg = 0;

  for (let i = 0; i < items.length; i++) {
    const relevance = relevanceScores[items[i]] || 0;
    // DCG = Σ (2^rel - 1) / log2(i + 2)
    dcg += (Math.pow(2, relevance) - 1) / Math.log2(i + 2);
  }

  return dcg;
}

// ============================================================================
// OUTLIER DETECTION
// ============================================================================

/**
 * Remove outliers using IQR method
 */
export function removeOutliersIQR(
  values: number[],
  multiplier: number = 1.5
): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;

  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;

  return values.filter(v => v >= lowerBound && v <= upperBound);
}

/**
 * Remove outliers using Z-score method
 */
export function removeOutliersZScore(
  values: number[],
  threshold: number = 3
): number[] {
  const stats = calculateStatistics(values);

  return values.filter(v => {
    const zScore = Math.abs((v - stats.mean) / stats.stdDev);
    return zScore <= threshold;
  });
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format number for display
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
  }
  return value.toFixed(decimals);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format confidence interval
 */
export function formatCI(ci: [number, number], decimals: number = 2): string {
  return `[${ci[0].toFixed(decimals)}, ${ci[1].toFixed(decimals)}]`;
}

/**
 * Format p-value with significance stars
 */
export function formatPValue(pValue: number): string {
  let stars = '';
  if (pValue < 0.001) stars = '***';
  else if (pValue < 0.01) stars = '**';
  else if (pValue < 0.05) stars = '*';

  if (pValue < 0.001) return `< 0.001${stars}`;
  return `${pValue.toFixed(4)}${stars}`;
}

export default {
  calculateStatistics,
  calculateEffectSize,
  welchsTTest,
  calculateRetrievalMetrics,
  removeOutliersIQR,
  removeOutliersZScore
};
