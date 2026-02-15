#!/usr/bin/env node
/**
 * Real MemoryLayer Benchmark Runner
 * 
 * Main entry point for running REAL benchmarks with:
 * - Real MemoryLayer MCP server
 * - Real OpenCode CLI with kimi K2.5
 * - Real test projects (downloaded automatically)
 * - Real AI queries and responses
 * 
 * NO SIMULATION - Everything is real!
 */

import { downloadAllProjects, downloadProjectBySize, ProjectDownloader } from './project-downloader.js';
import { RealBenchmarkHarness, runRealBenchmark } from './real-test-harness.js';
import { allQueries } from './test-scenarios.js';
import { checkOpenCode, getOpenCodeSetupInstructions } from './opencode-client.js';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Parse arguments
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    size: args.find((_, i) => args[i - 1] === '--size' || args[i - 1] === '-s') || 'all',
    iterations: parseInt(args.find((_, i) => args[i - 1] === '--iterations' || args[i - 1] === '-i') || '5'),
    output: args.find((_, i) => args[i - 1] === '--output' || args[i - 1] === '-o') || './benchmark-results',
    quick: args.includes('--quick') || args.includes('-q'),
    downloadOnly: args.includes('--download-only'),
    help: args.includes('--help') || args.includes('-h')
  };
}

function showHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           REAL MemoryLayer Benchmark Runner                      ║
╠══════════════════════════════════════════════════════════════════╣
║  Uses REAL MemoryLayer + REAL OpenCode + REAL Projects           ║
╚══════════════════════════════════════════════════════════════════╝

USAGE:
  npx ts-node tests/benchmark/real-benchmark.ts [options]

OPTIONS:
  -s, --size <size>          Project size: small, medium, large, or all (default: all)
  -i, --iterations <n>       Number of iterations (default: 5)
  -o, --output <dir>         Output directory (default: ./benchmark-results)
  -q, --quick                Quick mode (1 iteration, subset of queries)
      --download-only        Only download projects, don't run benchmarks
  -h, --help                 Show this help

PREREQUISITES:
  ✓ OpenCode CLI installed
  ✓ MemoryLayer built (npm run build)
  ✓ Git installed

EXAMPLES:
  # Download all test projects
  npx ts-node tests/benchmark/real-benchmark.ts --download-only

  # Run on small project only (quick test)
  npx ts-node tests/benchmark/real-benchmark.ts --size small --quick

  # Run full benchmark on medium project
  npx ts-node tests/benchmark/real-benchmark.ts --size medium --iterations 10

  # Run on all projects (comprehensive)
  npx ts-node tests/benchmark/real-benchmark.ts --size all --iterations 5

TEST PROJECTS:
  small    ~15K LOC  (Express.js framework)
  medium   ~100K LOC (React library)
  large    ~1M LOC   (VS Code editor)

OUTPUT:
  Results saved to: ./benchmark-results/
  - <project>-real-raw-*.json       (Raw query results)
  - <project>-real-summary-*.json   (Aggregated statistics)
  - <project>-real-report-*.md      (Human-readable report)

NOTE:
  This runs REAL benchmarks using:
  - Real MemoryLayer MCP server
  - Real OpenCode CLI with kimi K2.5
  - Real API calls to AI model
  
  Each query makes actual API calls, so:
  - Small project:  ~30 minutes
  - Medium project: ~2 hours
  - Large project:  ~6 hours
  - All projects:   ~8 hours
  
  Use --quick for faster validation (~5 minutes).
`);
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log('\n🚀 REAL MemoryLayer Benchmark\n');
  console.log('This will run ACTUAL benchmarks with:\n');
  console.log('  ✓ Real MemoryLayer MCP server');
  console.log('  ✓ Real OpenCode CLI');
  console.log('  ✓ Real kimi K2.5 model');
  console.log('  ✓ Real API calls\n');

  // Validate prerequisites
  console.log('🔍 Checking prerequisites...\n');
  
  const openCodeCheck = checkOpenCode();
  if (!openCodeCheck.installed) {
    console.error('❌ OpenCode not installed!\n');
    console.log(getOpenCodeSetupInstructions());
    process.exit(1);
  }
  console.log(`✓ OpenCode: ${openCodeCheck.version}`);

  // Check MemoryLayer build
  const distPath = resolve(process.cwd(), 'dist/index.js');
  if (!existsSync(distPath)) {
    console.error('❌ MemoryLayer not built!\n');
    console.log('Run: npm run build\n');
    process.exit(1);
  }
  console.log('✓ MemoryLayer built');

  // Download projects
  console.log('\n📦 Setting up test projects...\n');
  const downloader = new ProjectDownloader('./test-projects');
  
  if (args.downloadOnly) {
    console.log('Downloading projects only...\n');
    await downloadAllProjects('./test-projects');
    console.log('\n✅ Projects downloaded successfully!');
    process.exit(0);
  }

  // Download if needed
  let projectsToTest: Array<{ name: string; path: string; size: string }> = [];
  
  if (args.size === 'all' || args.size === 'small') {
    if (!downloader.isDownloaded('express-starter')) {
      console.log('Downloading small project (Express.js)...');
      await downloadProjectBySize('small', './test-projects');
    }
    projectsToTest.push({ name: 'express-starter', path: './test-projects/express-starter', size: 'small' });
  }
  
  if (args.size === 'all' || args.size === 'medium') {
    if (!downloader.isDownloaded('react-demo')) {
      console.log('Downloading medium project (React)...');
      await downloadProjectBySize('medium', './test-projects');
    }
    projectsToTest.push({ name: 'react-demo', path: './test-projects/react-demo', size: 'medium' });
  }
  
  if (args.size === 'all' || args.size === 'large') {
    if (!downloader.isDownloaded('vscode')) {
      console.log('Downloading large project (VS Code)...');
      await downloadProjectBySize('large', './test-projects');
    }
    projectsToTest.push({ name: 'vscode', path: './test-projects/vscode', size: 'large' });
  }

  if (projectsToTest.length === 0) {
    console.error(`❌ Unknown size: ${args.size}`);
    console.log('Use: small, medium, large, or all');
    process.exit(1);
  }

  console.log(`\n✓ Projects ready: ${projectsToTest.length} project(s)\n`);

  // Run benchmarks
  console.log('='.repeat(70));
  console.log('STARTING BENCHMARKS');
  console.log('='.repeat(70) + '\n');

  const allResults: Array<{ project: string; result: any }> = [];

  for (const project of projectsToTest) {
    console.log(`\n📊 Testing: ${project.name} (${project.size})\n`);
    
    // Analyze project
    const projectStats = downloader.loadConfig()?.projects?.find(
      (p: any) => p.name === project.name
    ) || { name: project.name, totalLines: 10000, totalFiles: 100 };

    try {
      const result = await runRealBenchmark(
        resolve(project.path),
        {
          path: project.path,
          name: project.name,
          totalLines: projectStats.totalLines || 10000,
          totalFiles: projectStats.totalFiles || 100,
          languageBreakdown: {},
          indexed: false
        },
        {
          iterations: args.quick ? 1 : args.iterations,
          queries: args.quick ? allQueries.slice(0, 10) : allQueries.slice(0, 30),
          outputDir: args.output,
          model: 'kimi-k2.5'
        }
      );

      allResults.push({ project: project.name, result });
      
    } catch (error) {
      console.error(`\n❌ Benchmark failed for ${project.name}:`, error);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('BENCHMARK COMPLETE');
  console.log('='.repeat(70) + '\n');

  console.log('Results Summary:\n');
  for (const { project, result } of allResults) {
    console.log(`${project}:`);
    console.log(`  Speedup: ${result.metrics.latency.speedup.toFixed(1)}x`);
    console.log(`  Token reduction: ${(result.metrics.tokens.reduction * 100).toFixed(1)}%`);
    console.log(`  Success rate: ${(result.metrics.quality.treatmentSuccess * 100).toFixed(1)}%`);
    console.log();
  }

  console.log(`📁 Full results saved to: ${args.output}\n`);
  console.log('✅ All benchmarks complete!\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
