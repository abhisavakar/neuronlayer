#!/usr/bin/env node
/**
 * MemoryLayer Benchmark Runner
 * 
 * Main entry point for running automated benchmarks.
 * Usage: npx ts-node tests/benchmark/run-benchmarks.ts [options]
 * 
 * Options:
 *   --project <path>     Project path to benchmark (default: current directory)
 *   --iterations <n>     Number of iterations (default: 50)
 *   --warmup <n>         Number of warmup runs (default: 5)
 *   --output <dir>       Output directory (default: ./benchmark-results)
 *   --quick              Run quick benchmark (10 iterations, 20 queries)
 *   --task <type>        Run only specific task type
 *   --help               Show help
 */

import { TestHarness, runQuickBenchmark, runFullBenchmark } from './test-harness.js';
import { getQueriesForTask, allQueries } from './test-scenarios.js';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Parse command line arguments
function parseArgs(): {
  projectPath: string;
  iterations?: number;
  warmupRuns?: number;
  outputDir: string;
  quick: boolean;
  task?: string;
  help: boolean;
} {
  const args = process.argv.slice(2);
  const options: any = {
    projectPath: process.cwd(),
    outputDir: './benchmark-results',
    quick: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--project':
      case '-p':
        options.projectPath = resolve(args[++i]);
        break;
      case '--iterations':
      case '-i':
        options.iterations = parseInt(args[++i], 10);
        break;
      case '--warmup':
      case '-w':
        options.warmupRuns = parseInt(args[++i], 10);
        break;
      case '--output':
      case '-o':
        options.outputDir = args[++i];
        break;
      case '--quick':
      case '-q':
        options.quick = true;
        break;
      case '--task':
      case '-t':
        options.task = args[++i];
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

// Show help
function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║          MemoryLayer Benchmark Runner                    ║
╚══════════════════════════════════════════════════════════╝

Automated benchmarking for MemoryLayer MCP validation.

USAGE:
  npx ts-node tests/benchmark/run-benchmarks.ts [options]

OPTIONS:
  -p, --project <path>     Project path (default: current directory)
  -i, --iterations <n>     Number of iterations (default: 50)
  -w, --warmup <n>         Number of warmup runs (default: 5)
  -o, --output <dir>       Output directory (default: ./benchmark-results)
  -q, --quick              Quick benchmark (10 iterations, 20 queries)
  -t, --task <type>        Run specific task type only
  -h, --help               Show this help message

TASK TYPES:
  information_retrieval    Search and retrieval tasks
  bug_fix                  Debugging and diagnosis
  feature_add              Development and implementation
  code_understanding       Architecture comprehension
  refactor                 Code restructuring
  code_review              Quality assurance

EXAMPLES:
  # Run full benchmark on current project
  npx ts-node tests/benchmark/run-benchmarks.ts

  # Quick benchmark on specific project
  npx ts-node tests/benchmark/run-benchmarks.ts --quick --project ./my-project

  # Benchmark only bug fixing tasks
  npx ts-node tests/benchmark/run-benchmarks.ts --task bug_fix

  # Custom iterations and output
  npx ts-node tests/benchmark/run-benchmarks.ts --iterations 100 --output ./results

OUTPUT:
  Results are saved to the output directory:
    - raw-results-<timestamp>.json     (All individual results)
    - summary-<timestamp>.json         (Aggregated statistics)
    - report-<timestamp>.md            (Human-readable report)

For more information, see TESTING.md
`);
}

// Validate project path
function validateProject(projectPath: string): boolean {
  if (!existsSync(projectPath)) {
    console.error(`❌ Error: Project path does not exist: ${projectPath}`);
    return false;
  }

  // Check if it's a git repo (has more accurate file counting)
  const isGitRepo = existsSync(resolve(projectPath, '.git'));
  if (!isGitRepo) {
    console.warn('⚠️  Warning: Not a git repository. File counting may be less accurate.');
  }

  return true;
}

// Main function
async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log('\n🚀 MemoryLayer Benchmark Runner\n');

  // Validate project
  if (!validateProject(args.projectPath)) {
    process.exit(1);
  }

  try {
    let summary;

    if (args.quick) {
      // Quick benchmark
      console.log('Running QUICK benchmark (10 iterations, subset of queries)...\n');
      summary = await runQuickBenchmark(args.projectPath);
    } else if (args.task) {
      // Task-specific benchmark
      const queries = getQueriesForTask(args.task as any);
      if (queries.length === 0) {
        console.error(`❌ Error: Unknown task type: ${args.task}`);
        console.log('Valid task types: information_retrieval, bug_fix, feature_add, code_understanding, refactor, code_review');
        process.exit(1);
      }

      console.log(`Running task-specific benchmark: ${args.task} (${queries.length} queries)...\n`);
      
      const harness = new TestHarness({
        projectPath: args.projectPath,
        iterations: args.iterations || 50,
        warmupRuns: args.warmupRuns || 5,
        outputDir: args.outputDir,
        queries
      });

      summary = await harness.runBenchmark();
    } else {
      // Full benchmark
      console.log('Running FULL benchmark (50 iterations, all queries)...\n');
      console.log('This may take 15-30 minutes depending on project size.\n');
      
      summary = await runFullBenchmark(args.projectPath);
    }

    // Print final summary
    console.log('\n' + '='.repeat(60));
    console.log('BENCHMARK COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nResults saved to: ${args.outputDir}`);
    console.log(`Total queries: ${summary.totalQueries}`);
    console.log(`Success rate: ${((summary.successfulQueries / summary.totalQueries) * 100).toFixed(1)}%`);
    console.log(`Speedup: ${summary.metrics.latency.speedup.toFixed(1)}x`);
    console.log(`Token reduction: ${(summary.metrics.tokens.reduction * 100).toFixed(1)}%`);

    // Exit code based on success
    const success = summary.metrics.latency.speedup >= 5 && summary.metrics.tokens.reduction >= 0.9;
    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Run main
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
