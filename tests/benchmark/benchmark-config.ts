/**
 * MemoryLayer Benchmark Configuration
 *
 * Standard benchmarking parameters for academic publication.
 * Based on MLPerf, COIR, and scientific benchmarking best practices.
 *
 * References:
 * - MLPerf Inference Benchmark (https://arxiv.org/pdf/1911.02549)
 * - COIR: Code Information Retrieval (https://aclanthology.org/2025.acl-long.1072.pdf)
 * - Scientific Benchmarking (https://htor.inf.ethz.ch/publications/img/hoefler-scientific-benchmarking.pdf)
 */

import { platform, cpus, totalmem, freemem, release, arch, hostname } from 'os';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ============================================================================
// BENCHMARK CONFIGURATION INTERFACE
// ============================================================================

export interface BenchmarkConfiguration {
  // Experiment Identification
  experiment: {
    id: string;                    // Unique experiment ID
    name: string;                  // Human-readable name
    description: string;           // Experiment description
    version: string;               // Benchmark version
    timestamp: string;             // ISO timestamp
    randomSeed: number;            // For reproducibility
  };

  // Execution Parameters
  execution: {
    warmupRuns: number;            // Ignored initial runs (MLPerf: 5-10)
    measurementRuns: number;       // Actual measurement runs
    iterationsPerQuery: number;    // Runs per query
    minRunTimeMs: number;          // Minimum run time (MLPerf: 100ms)
    maxRunTimeMs: number;          // Maximum run time / timeout
    cooldownMs: number;            // Delay between runs
  };

  // Statistical Parameters
  statistics: {
    confidenceLevel: number;       // 0.95 for 95%, 0.99 for 99% (MLPerf uses 99%)
    marginOfError: number;         // Acceptable margin (MLPerf: 0.5%)
    minimumSampleSize: number;     // Minimum samples for validity
    outlierRemoval: 'none' | 'iqr' | 'zscore';  // Outlier handling
    outlierThreshold: number;      // Z-score or IQR multiplier
  };

  // Information Retrieval Metrics
  retrievalMetrics: {
    kValues: number[];             // K values for @K metrics (e.g., [1, 3, 5, 10])
    relevanceThreshold: number;    // Minimum similarity for "relevant"
    computeNDCG: boolean;          // Normalized Discounted Cumulative Gain
    computeMRR: boolean;           // Mean Reciprocal Rank
    computeMAP: boolean;           // Mean Average Precision
    computeRecall: boolean;        // Recall@K
    computePrecision: boolean;     // Precision@K
  };

  // Quality Metrics
  quality: {
    measureAccuracy: boolean;      // Compare against ground truth
    measureCompleteness: boolean;  // All expected results found
    measureRelevance: boolean;     // Semantic relevance scoring
    groundTruthPath?: string;      // Path to ground truth data
  };

  // Environment Capture
  environment: {
    captureSystemInfo: boolean;    // OS, CPU, RAM
    captureVersions: boolean;      // Node, dependencies
    captureGitInfo: boolean;       // Commit hash, branch
  };

  // Output Configuration
  output: {
    directory: string;             // Output directory
    saveRawResults: boolean;       // Individual query results
    saveAggregated: boolean;       // Summary statistics
    saveReport: boolean;           // Markdown report
    saveCSV: boolean;              // CSV for analysis
    saveLatex: boolean;            // LaTeX tables for papers
  };
}

// ============================================================================
// STATISTICAL METRICS INTERFACE
// ============================================================================

export interface StatisticalMetrics {
  // Central Tendency
  mean: number;
  median: number;
  mode?: number;

  // Dispersion
  min: number;
  max: number;
  range: number;
  variance: number;
  stdDev: number;
  coefficientOfVariation: number;  // CV = stdDev / mean
  iqr: number;                     // Interquartile range

  // Percentiles
  p10: number;
  p25: number;  // Q1
  p50: number;  // Median
  p75: number;  // Q3
  p90: number;
  p95: number;
  p99: number;

  // Confidence Intervals
  ci95: [number, number];          // 95% confidence interval
  ci99: [number, number];          // 99% confidence interval
  marginOfError95: number;
  marginOfError99: number;

  // Sample Info
  n: number;                       // Sample size
  sumOfSquares: number;
  standardError: number;
}

export interface EffectSizeMetrics {
  cohensD: number;                 // Cohen's d
  hedgesG: number;                 // Hedges' g (bias-corrected)
  glasssDelta: number;             // Glass's delta
  interpretation: 'negligible' | 'small' | 'medium' | 'large' | 'very_large' | 'huge';

  // Common Language Effect Size
  probabilityOfSuperiority: number;  // P(treatment > baseline)
}

export interface SignificanceTest {
  testName: string;                // e.g., "Welch's t-test"
  tStatistic: number;
  degreesOfFreedom: number;
  pValue: number;
  isSignificant: boolean;          // p < alpha
  alpha: number;                   // Significance level (0.05)
}

// ============================================================================
// INFORMATION RETRIEVAL METRICS
// ============================================================================

export interface RetrievalMetrics {
  // Precision and Recall
  precisionAtK: Record<number, number>;    // Precision@1, @3, @5, @10
  recallAtK: Record<number, number>;       // Recall@1, @3, @5, @10
  f1AtK: Record<number, number>;           // F1@1, @3, @5, @10

  // Rank-Aware Metrics
  mrr: number;                             // Mean Reciprocal Rank
  mrrAtK: Record<number, number>;          // MRR@K
  map: number;                             // Mean Average Precision
  mapAtK: Record<number, number>;          // MAP@K
  ndcg: number;                            // NDCG (full)
  ndcgAtK: Record<number, number>;         // NDCG@1, @3, @5, @10

  // Additional Metrics
  hitRateAtK: Record<number, number>;      // Hit Rate (at least one relevant)
  averageRank: number;                     // Average rank of first relevant
}

// ============================================================================
// ENVIRONMENT INFO
// ============================================================================

export interface EnvironmentInfo {
  // System
  platform: string;
  osRelease: string;
  architecture: string;
  hostname: string;

  // Hardware
  cpuModel: string;
  cpuCores: number;
  cpuSpeed: number;
  totalMemoryGB: number;
  freeMemoryGB: number;

  // Software
  nodeVersion: string;
  npmVersion?: string;

  // Project
  projectVersion: string;
  dependencies: Record<string, string>;

  // Git
  gitCommit?: string;
  gitBranch?: string;
  gitDirty?: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Quick benchmark configuration for development/testing
 */
export const QUICK_CONFIG: Partial<BenchmarkConfiguration> = {
  execution: {
    warmupRuns: 2,
    measurementRuns: 5,
    iterationsPerQuery: 1,
    minRunTimeMs: 100,
    maxRunTimeMs: 60000,
    cooldownMs: 50
  },
  statistics: {
    confidenceLevel: 0.95,
    marginOfError: 0.05,
    minimumSampleSize: 5,
    outlierRemoval: 'none',
    outlierThreshold: 3
  },
  retrievalMetrics: {
    kValues: [1, 5, 10],
    relevanceThreshold: 0.5,
    computeNDCG: false,
    computeMRR: true,
    computeMAP: false,
    computeRecall: true,
    computePrecision: true
  }
};

/**
 * Standard benchmark configuration for reliable results
 */
export const STANDARD_CONFIG: Partial<BenchmarkConfiguration> = {
  execution: {
    warmupRuns: 5,
    measurementRuns: 30,
    iterationsPerQuery: 3,
    minRunTimeMs: 100,
    maxRunTimeMs: 120000,
    cooldownMs: 100
  },
  statistics: {
    confidenceLevel: 0.95,
    marginOfError: 0.02,
    minimumSampleSize: 30,
    outlierRemoval: 'iqr',
    outlierThreshold: 1.5
  },
  retrievalMetrics: {
    kValues: [1, 3, 5, 10, 20],
    relevanceThreshold: 0.5,
    computeNDCG: true,
    computeMRR: true,
    computeMAP: true,
    computeRecall: true,
    computePrecision: true
  }
};

/**
 * Publication-quality benchmark configuration (MLPerf-style)
 * Use this for academic papers and white papers
 */
export const PUBLICATION_CONFIG: BenchmarkConfiguration = {
  experiment: {
    id: `exp-${Date.now()}`,
    name: 'MemoryLayer Performance Benchmark',
    description: 'Comprehensive evaluation of MemoryLayer vs traditional search',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    randomSeed: 42  // Fixed seed for reproducibility
  },
  execution: {
    warmupRuns: 10,              // MLPerf recommends 5-10
    measurementRuns: 50,         // At least 30 for statistical validity
    iterationsPerQuery: 5,       // Multiple runs per query
    minRunTimeMs: 100,           // MLPerf minimum
    maxRunTimeMs: 300000,        // 5 minutes max
    cooldownMs: 200              // Allow system to stabilize
  },
  statistics: {
    confidenceLevel: 0.99,       // MLPerf uses 99% CI
    marginOfError: 0.005,        // 0.5% margin (MLPerf standard)
    minimumSampleSize: 50,       // For reliable statistics
    outlierRemoval: 'iqr',       // Remove outliers using IQR method
    outlierThreshold: 1.5        // Standard IQR multiplier
  },
  retrievalMetrics: {
    kValues: [1, 3, 5, 10, 20],  // Standard K values
    relevanceThreshold: 0.5,
    computeNDCG: true,           // Most important for ranking
    computeMRR: true,            // Important for first-result quality
    computeMAP: true,            // Overall ranking quality
    computeRecall: true,
    computePrecision: true
  },
  quality: {
    measureAccuracy: true,
    measureCompleteness: true,
    measureRelevance: true
  },
  environment: {
    captureSystemInfo: true,
    captureVersions: true,
    captureGitInfo: true
  },
  output: {
    directory: './benchmark-results',
    saveRawResults: true,
    saveAggregated: true,
    saveReport: true,
    saveCSV: true,
    saveLatex: true
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Capture current environment information
 */
export function captureEnvironment(): EnvironmentInfo {
  const cpu = cpus()[0];

  // Get versions
  let npmVersion: string | undefined;
  try {
    npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
  } catch { /* ignore */ }

  // Get project version
  let projectVersion = '0.0.0';
  let dependencies: Record<string, string> = {};
  try {
    const pkgPath = join(process.cwd(), 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      projectVersion = pkg.version || '0.0.0';
      dependencies = pkg.dependencies || {};
    }
  } catch { /* ignore */ }

  // Get git info
  let gitCommit: string | undefined;
  let gitBranch: string | undefined;
  let gitDirty: boolean | undefined;
  try {
    gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    gitDirty = status.length > 0;
  } catch { /* not a git repo */ }

  return {
    platform: platform(),
    osRelease: release(),
    architecture: arch(),
    hostname: hostname(),
    cpuModel: cpu?.model || 'Unknown',
    cpuCores: cpus().length,
    cpuSpeed: cpu?.speed || 0,
    totalMemoryGB: Math.round(totalmem() / (1024 ** 3) * 10) / 10,
    freeMemoryGB: Math.round(freemem() / (1024 ** 3) * 10) / 10,
    nodeVersion: process.version,
    npmVersion,
    projectVersion,
    dependencies,
    gitCommit,
    gitBranch,
    gitDirty
  };
}

/**
 * Generate unique experiment ID
 */
export function generateExperimentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `exp-${timestamp}-${random}`;
}

/**
 * Create benchmark configuration with overrides
 */
export function createConfig(
  base: 'quick' | 'standard' | 'publication' = 'standard',
  overrides: Partial<BenchmarkConfiguration> = {}
): BenchmarkConfiguration {
  const baseConfig = base === 'quick' ? QUICK_CONFIG :
                     base === 'standard' ? STANDARD_CONFIG :
                     PUBLICATION_CONFIG;

  return {
    ...PUBLICATION_CONFIG,  // Start with full config
    ...baseConfig,          // Apply base preset
    ...overrides,           // Apply user overrides
    experiment: {
      ...PUBLICATION_CONFIG.experiment,
      ...overrides.experiment,
      id: overrides.experiment?.id || generateExperimentId(),
      timestamp: new Date().toISOString()
    }
  } as BenchmarkConfiguration;
}

// ============================================================================
// COHEN'S D INTERPRETATION (Academic Standard)
// ============================================================================

/**
 * Interpret Cohen's d effect size
 * Based on: https://pmc.ncbi.nlm.nih.gov/articles/PMC6736231/
 */
export function interpretCohensD(d: number): EffectSizeMetrics['interpretation'] {
  const absD = Math.abs(d);
  if (absD < 0.2) return 'negligible';
  if (absD < 0.5) return 'small';
  if (absD < 0.8) return 'medium';
  if (absD < 1.2) return 'large';
  if (absD < 2.0) return 'very_large';
  return 'huge';
}

/**
 * Calculate probability of superiority from Cohen's d
 * P(X > Y) where X is treatment and Y is baseline
 */
export function probabilityOfSuperiority(cohensD: number): number {
  // Using normal distribution approximation
  // Φ(d/√2) where Φ is the standard normal CDF
  const z = cohensD / Math.sqrt(2);
  return normalCDF(z);
}

/**
 * Standard normal CDF approximation
 */
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

// ============================================================================
// MINIMUM SAMPLE SIZE CALCULATION (MLPerf methodology)
// ============================================================================

/**
 * Calculate minimum sample size for desired confidence and margin of error
 * Based on MLPerf methodology
 */
export function calculateMinimumSampleSize(
  confidenceLevel: number,
  marginOfError: number,
  estimatedVariance: number = 0.5
): number {
  // Z-score for confidence level
  const zScores: Record<number, number> = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576
  };

  const z = zScores[confidenceLevel] || 1.96;

  // Sample size formula: n = (z² * σ²) / E²
  const n = Math.ceil((z * z * estimatedVariance) / (marginOfError * marginOfError));

  return Math.max(n, 30);  // Minimum 30 for CLT
}

export default PUBLICATION_CONFIG;
