#!/usr/bin/env node
/**
 * Working Benchmark - MemoryLayer Performance Testing
 *
 * Measures real performance comparison between:
 * - Baseline: Traditional grep/file search
 * - Treatment: MemoryLayer semantic search
 *
 * Usage:
 *   npm run benchmark              # Run default benchmark (10 queries)
 *   npm run benchmark:quick        # Quick test (5 queries)
 *   npm run benchmark:full         # Full benchmark (all 70 queries)
 *   npm run benchmark -- --help    # Show help
 */

import { RealMCPClient, createMCPClient } from './mcp-client.js';
import { ProjectDownloader, downloadProjectBySize } from './project-downloader.js';
import { allQueries, TestQuery } from './test-scenarios.js';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { platform } from 'os';

const isWindows = platform() === 'win32';

// CLI Arguments
interface CLIArgs {
  quick: boolean;
  full: boolean;
  iterations: number;
  queries: number;
  project: string;
  size: 'small' | 'medium' | 'large';
  output: string;
  help: boolean;
  verbose: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const options: CLIArgs = {
    quick: false,
    full: false,
    iterations: 1,
    queries: 10,
    project: '',
    size: 'small',
    output: './benchmark-results',
    help: false,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--quick':
      case '-q':
        options.quick = true;
        options.queries = 5;
        break;
      case '--full':
      case '-f':
        options.full = true;
        options.queries = 70;
        break;
      case '--iterations':
      case '-i':
        options.iterations = parseInt(args[++i], 10) || 1;
        break;
      case '--queries':
      case '-n':
        options.queries = parseInt(args[++i], 10) || 10;
        break;
      case '--project':
      case '-p':
        options.project = args[++i];
        break;
      case '--size':
      case '-s':
        options.size = args[++i] as any;
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║         MemoryLayer Benchmark Runner                     ║
╚══════════════════════════════════════════════════════════╝

USAGE:
  npm run benchmark [options]
  node dist/benchmark/working-benchmark.js [options]

OPTIONS:
  -q, --quick              Quick benchmark (5 queries)
  -f, --full               Full benchmark (70 queries)
  -i, --iterations <n>     Number of iterations (default: 1)
  -n, --queries <n>        Number of queries to run (default: 10)
  -p, --project <path>     Project path to benchmark
  -s, --size <size>        Test project size: small|medium|large
  -o, --output <dir>       Output directory (default: ./benchmark-results)
  -v, --verbose            Show detailed output
  -h, --help               Show this help message

EXAMPLES:
  npm run benchmark                    # Run 10 queries on MemoryLayer codebase
  npm run benchmark -- --quick         # Quick test with 5 queries
  npm run benchmark -- --full          # Full 70 query benchmark
  npm run benchmark -- -p ./my-project # Benchmark specific project
  npm run benchmark -- -i 3 -n 20      # 3 iterations, 20 queries each

OUTPUT:
  Results are saved to ./benchmark-results/ including:
    - working-benchmark-<timestamp>.json (raw data)
    - benchmark-report-<timestamp>.md (summary report)
`);
}

interface BenchmarkResult {
  queryId: string;
  query: string;
  category: string;
  difficulty: string;
  baseline: {
    latencyMs: number;
    filesFound: number;
    tokensUsed: number;
    success: boolean;
    error?: string;
  };
  treatment: {
    latencyMs: number;
    filesFound: number;
    tokensUsed: number;
    success: boolean;
    error?: string;
  };
  speedup: number;
  tokenReduction: number;
}

interface BenchmarkConfig {
  projectPath: string;
  queries: TestQuery[];
  iterations: number;
  outputDir: string;
  verbose: boolean;
}

class WorkingBenchmark {
  private config: BenchmarkConfig;
  private mcpClient?: RealMCPClient;
  private results: BenchmarkResult[] = [];
  private startTime: Date = new Date();

  constructor(config: BenchmarkConfig) {
    this.config = config;
  }

  async run(): Promise<BenchmarkResult[]> {
    console.log('\n' + '═'.repeat(60));
    console.log('  🚀 MemoryLayer Performance Benchmark');
    console.log('═'.repeat(60));
    console.log(`\n📁 Project: ${this.config.projectPath}`);
    console.log(`📊 Queries: ${this.config.queries.length}`);
    console.log(`🔄 Iterations: ${this.config.iterations}`);
    console.log(`💾 Output: ${this.config.outputDir}\n`);

    // Ensure output directory exists
    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
    }

    // Start MemoryLayer
    console.log('🔌 Starting MemoryLayer MCP server...');
    try {
      this.mcpClient = await createMCPClient(this.config.projectPath);
      console.log('✅ MemoryLayer ready\n');
    } catch (error) {
      console.error('❌ Failed to start MemoryLayer:', error);
      console.log('\n💡 Make sure you have built the project: npm run build\n');
      throw error;
    }

    try {
      // Run iterations
      for (let iter = 0; iter < this.config.iterations; iter++) {
        if (this.config.iterations > 1) {
          console.log(`\n📊 Iteration ${iter + 1}/${this.config.iterations}`);
          console.log('─'.repeat(40));
        }

        // Run queries
        for (let i = 0; i < this.config.queries.length; i++) {
          const query = this.config.queries[i];
          const queryNum = i + 1;
          const totalQueries = this.config.queries.length;

          if (this.config.verbose) {
            console.log(`\n[${queryNum}/${totalQueries}] ${query.category}: ${query.query.slice(0, 50)}...`);
          } else {
            process.stdout.write(`\r  Progress: ${queryNum}/${totalQueries} queries...`);
          }

          // WITHOUT MemoryLayer
          const baseline = await this.runBaseline(query);

          // Small delay between tests
          await this.sleep(50);

          // WITH MemoryLayer
          const treatment = await this.runTreatment(query);

          // Calculate improvements
          const speedup = baseline.latencyMs / Math.max(treatment.latencyMs, 1);
          const tokenReduction = baseline.tokensUsed > 0
            ? (baseline.tokensUsed - treatment.tokensUsed) / baseline.tokensUsed
            : 0;

          this.results.push({
            queryId: query.id,
            query: query.query,
            category: query.category,
            difficulty: query.difficulty,
            baseline,
            treatment,
            speedup,
            tokenReduction
          });

          if (this.config.verbose) {
            console.log(`    Baseline: ${baseline.latencyMs.toFixed(0)}ms, ${baseline.filesFound} files, ${baseline.tokensUsed} tokens`);
            console.log(`    MemoryLayer: ${treatment.latencyMs.toFixed(0)}ms, ${treatment.filesFound} files, ${treatment.tokensUsed} tokens`);
            console.log(`    Speedup: ${speedup.toFixed(1)}x, Token reduction: ${(tokenReduction * 100).toFixed(1)}%`);
          }
        }

        console.log(''); // New line after progress
      }

      // Summary
      this.printSummary();
      this.saveResults();
      this.generateReport();

      return this.results;

    } finally {
      console.log('\n🔌 Stopping MemoryLayer...');
      await this.mcpClient?.stop();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async runBaseline(query: TestQuery): Promise<BenchmarkResult['baseline']> {
    const start = performance.now();

    try {
      // Search with grep/PowerShell
      const terms = this.extractSearchTerms(query.query);
      const files = await this.grepSearch(terms);

      // Read files to simulate context gathering (what grep-based approach would do)
      let totalContent = '';
      let filesRead = 0;

      for (const file of files.slice(0, 5)) {
        const content = await this.readFile(file);
        if (content.length > 0) {
          totalContent += content;
          filesRead++;
        }
      }

      const latencyMs = performance.now() - start;

      // If files found but not read, estimate tokens based on typical file size
      let tokensUsed = Math.ceil(totalContent.length / 4);
      if (files.length > 0 && tokensUsed === 0) {
        // Estimate ~150 lines * 40 chars = 6000 chars per file = 1500 tokens
        tokensUsed = files.length * 1500;
      }

      return {
        latencyMs,
        filesFound: files.length,
        tokensUsed,
        success: files.length > 0
      };
    } catch (error) {
      return {
        latencyMs: performance.now() - start,
        filesFound: 0,
        tokensUsed: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async runTreatment(query: TestQuery): Promise<BenchmarkResult['treatment']> {
    const start = performance.now();

    try {
      // Use MemoryLayer semantic search
      const result = await this.mcpClient!.getContext(query.query);

      const latencyMs = performance.now() - start;

      if (result.success && result.result) {
        // Parse the MCP response - it may be nested or have different formats
        const response = result.result;

        // Try to extract context string
        let context = '';
        if (typeof response === 'string') {
          context = response;
        } else if (response.content) {
          context = typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);
        } else if (response.context) {
          context = response.context;
        } else {
          context = JSON.stringify(response);
        }

        // Extract sources/files
        let filesFound = 0;
        if (response.sources) {
          filesFound = Array.isArray(response.sources) ? response.sources.length : 0;
        } else if (response.files) {
          filesFound = Array.isArray(response.files) ? response.files.length : 0;
        } else if (response.content && Array.isArray(response.content)) {
          filesFound = response.content.length;
        }

        // Extract or estimate tokens
        let tokensUsed = response.token_count || response.tokenCount || response.tokens || 0;
        if (!tokensUsed && context) {
          tokensUsed = Math.ceil(context.length / 4);
        }

        // Default to reasonable estimate if we got a response
        if (filesFound === 0 && context.length > 100) {
          filesFound = Math.min(5, Math.ceil(context.length / 2000)); // Estimate files from context size
        }
        if (tokensUsed === 0 && context.length > 0) {
          tokensUsed = Math.ceil(context.length / 4);
        }

        return {
          latencyMs,
          filesFound,
          tokensUsed,
          success: true
        };
      }

      return {
        latencyMs,
        filesFound: 0,
        tokensUsed: 0,
        success: false,
        error: result.error || 'No result returned'
      };
    } catch (error) {
      return {
        latencyMs: performance.now() - start,
        filesFound: 0,
        tokensUsed: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private extractSearchTerms(query: string): string[] {
    const stopWords = ['the', 'a', 'an', 'is', 'are', 'find', 'show', 'where'];
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.includes(w))
      .slice(0, 3);
  }

  private async grepSearch(terms: string[]): Promise<string[]> {
    const files: string[] = [];

    for (const term of terms) {
      try {
        let result: string;

        if (isWindows) {
          // PowerShell returns absolute paths
          result = execSync(
            `powershell -Command "Get-ChildItem -Path '${this.config.projectPath}' -Recurse -Include '*.ts','*.js','*.tsx','*.jsx' -ErrorAction SilentlyContinue | Select-String -Pattern '${term}' -SimpleMatch -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path -Unique | Select-Object -First 20"`,
            {
              cwd: this.config.projectPath,
              encoding: 'utf-8',
              timeout: 30000,
              shell: 'powershell.exe'
            }
          );
        } else {
          result = execSync(
            `grep -r -l "${term}" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" . 2>/dev/null | head -20`,
            { cwd: this.config.projectPath, encoding: 'utf-8', timeout: 30000 }
          );
        }

        files.push(...result.split('\n').filter(f => f.trim()));
      } catch {
        // No matches or timeout - continue
      }
    }

    return [...new Set(files)].slice(0, 10);
  }

  private async readFile(filePath: string): Promise<string> {
    try {
      // Handle both absolute and relative paths
      let fullPath = filePath;
      if (!filePath.includes(':') && !filePath.startsWith('/')) {
        fullPath = join(this.config.projectPath, filePath);
      }

      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, 'utf-8');
        return content.slice(0, 5000);
      }
    } catch {
      // Ignore read errors
    }
    return '';
  }

  private printSummary(): void {
    const successful = this.results.filter(r => r.baseline.success && r.treatment.success);
    const failed = this.results.length - successful.length;

    if (successful.length === 0) {
      console.log('\n❌ No successful queries to analyze');
      return;
    }

    // Calculate metrics
    const baselineMean = successful.reduce((a, r) => a + r.baseline.latencyMs, 0) / successful.length;
    const treatmentMean = successful.reduce((a, r) => a + r.treatment.latencyMs, 0) / successful.length;
    const speedup = baselineMean / treatmentMean;

    const baselineTokens = successful.reduce((a, r) => a + r.baseline.tokensUsed, 0) / successful.length;
    const treatmentTokens = successful.reduce((a, r) => a + r.treatment.tokensUsed, 0) / successful.length;
    const tokenReduction = baselineTokens > 0 ? (baselineTokens - treatmentTokens) / baselineTokens : 0;

    const baselineFiles = successful.reduce((a, r) => a + r.baseline.filesFound, 0) / successful.length;
    const treatmentFiles = successful.reduce((a, r) => a + r.treatment.filesFound, 0) / successful.length;

    // Calculate by category
    const categories = [...new Set(successful.map(r => r.category))];
    const byCategory: Record<string, { speedup: number; count: number }> = {};
    for (const cat of categories) {
      const catResults = successful.filter(r => r.category === cat);
      const catSpeedup = catResults.reduce((a, r) => a + r.speedup, 0) / catResults.length;
      byCategory[cat] = { speedup: catSpeedup, count: catResults.length };
    }

    console.log('\n' + '═'.repeat(60));
    console.log('  📊 BENCHMARK RESULTS');
    console.log('═'.repeat(60));

    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│  SUMMARY                                                │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log(`│  Total Queries:     ${this.results.length.toString().padEnd(37)}│`);
    console.log(`│  Successful:        ${successful.length.toString().padEnd(37)}│`);
    console.log(`│  Failed:            ${failed.toString().padEnd(37)}│`);
    console.log('└─────────────────────────────────────────────────────────┘');

    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│  PERFORMANCE                                            │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log(`│  Baseline (grep):   ${baselineMean.toFixed(0).padStart(6)}ms avg                         │`);
    console.log(`│  MemoryLayer:       ${treatmentMean.toFixed(0).padStart(6)}ms avg                         │`);
    console.log(`│  ⚡ SPEEDUP:         ${speedup.toFixed(1).padStart(6)}x faster                       │`);
    console.log('└─────────────────────────────────────────────────────────┘');

    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│  TOKEN EFFICIENCY                                       │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log(`│  Baseline:          ${baselineTokens.toFixed(0).padStart(6)} tokens/query                 │`);
    console.log(`│  MemoryLayer:       ${treatmentTokens.toFixed(0).padStart(6)} tokens/query                 │`);
    console.log(`│  💰 REDUCTION:       ${(tokenReduction * 100).toFixed(1).padStart(5)}%                             │`);
    console.log('└─────────────────────────────────────────────────────────┘');

    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│  FILES RETRIEVED                                        │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log(`│  Baseline:          ${baselineFiles.toFixed(1).padStart(6)} files avg                     │`);
    console.log(`│  MemoryLayer:       ${treatmentFiles.toFixed(1).padStart(6)} files avg                     │`);
    console.log('└─────────────────────────────────────────────────────────┘');

    if (categories.length > 1) {
      console.log('\n┌─────────────────────────────────────────────────────────┐');
      console.log('│  BY CATEGORY                                            │');
      console.log('├─────────────────────────────────────────────────────────┤');
      for (const [cat, data] of Object.entries(byCategory)) {
        const catName = cat.replace('_', ' ').padEnd(20);
        console.log(`│  ${catName} ${data.speedup.toFixed(1)}x (${data.count} queries)`.padEnd(58) + '│');
      }
      console.log('└─────────────────────────────────────────────────────────┘');
    }

    // Validation status - 100x claim is primarily about speed
    const isValidated = speedup >= 100;
    const isPartiallyValidated = speedup >= 10;
    console.log('\n' + '═'.repeat(60));
    if (isValidated) {
      console.log('  ✅ 100x IMPROVEMENT CLAIM: VALIDATED');
      console.log(`     Speed: ${speedup.toFixed(0)}x faster (target: 100x)`);
      console.log(`     Tokens: ${(tokenReduction * 100).toFixed(0)}% reduction`);
    } else if (isPartiallyValidated) {
      console.log('  ⚠️  100x IMPROVEMENT CLAIM: PARTIALLY VALIDATED');
      console.log(`     Speed: ${speedup.toFixed(0)}x faster (target: 100x)`);
    } else {
      console.log('  ❌ 100x IMPROVEMENT CLAIM: NOT VALIDATED');
      console.log(`     Speed: ${speedup.toFixed(1)}x (need 100x)`);
    }
    console.log('═'.repeat(60) + '\n');
  }

  private saveResults(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = join(this.config.outputDir, `working-benchmark-${timestamp}.json`);

    const summary = {
      timestamp: this.startTime.toISOString(),
      project: this.config.projectPath,
      totalQueries: this.results.length,
      successful: this.results.filter(r => r.baseline.success && r.treatment.success).length,
      results: this.results
    };

    writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    console.log(`📁 Raw results saved to: ${outputPath}`);
  }

  private generateReport(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(this.config.outputDir, `benchmark-report-${timestamp}.md`);

    const successful = this.results.filter(r => r.baseline.success && r.treatment.success);
    const baselineMean = successful.reduce((a, r) => a + r.baseline.latencyMs, 0) / successful.length;
    const treatmentMean = successful.reduce((a, r) => a + r.treatment.latencyMs, 0) / successful.length;
    const speedup = baselineMean / treatmentMean;

    const baselineTokens = successful.reduce((a, r) => a + r.baseline.tokensUsed, 0) / successful.length;
    const treatmentTokens = successful.reduce((a, r) => a + r.treatment.tokensUsed, 0) / successful.length;
    const tokenReduction = baselineTokens > 0 ? (baselineTokens - treatmentTokens) / baselineTokens : 0;

    const report = `# MemoryLayer Benchmark Report

**Generated:** ${new Date().toISOString()}
**Project:** ${this.config.projectPath}
**Total Queries:** ${this.results.length}
**Successful:** ${successful.length}

## Executive Summary

| Metric | Baseline (grep) | MemoryLayer | Improvement |
|--------|-----------------|-------------|-------------|
| **Search Latency** | ${baselineMean.toFixed(0)}ms | ${treatmentMean.toFixed(0)}ms | **${speedup.toFixed(1)}x faster** |
| **Token Usage** | ${baselineTokens.toFixed(0)} | ${treatmentTokens.toFixed(0)} | **${(tokenReduction * 100).toFixed(1)}% reduction** |
| **Success Rate** | ${(successful.filter(r => r.baseline.success).length / successful.length * 100).toFixed(1)}% | ${(successful.filter(r => r.treatment.success).length / successful.length * 100).toFixed(1)}% | - |

## Results by Category

| Category | Queries | Avg Speedup |
|----------|---------|-------------|
${[...new Set(successful.map(r => r.category))].map(cat => {
  const catResults = successful.filter(r => r.category === cat);
  const catSpeedup = catResults.reduce((a, r) => a + r.speedup, 0) / catResults.length;
  return `| ${cat} | ${catResults.length} | ${catSpeedup.toFixed(1)}x |`;
}).join('\n')}

## Validation Status

${speedup >= 100 ? '✅ **100x IMPROVEMENT CLAIM: VALIDATED**' : speedup >= 10 ? '⚠️ **100x IMPROVEMENT CLAIM: PARTIALLY VALIDATED**' : '❌ **100x IMPROVEMENT CLAIM: NOT VALIDATED**'}

- Speed improvement: **${speedup.toFixed(1)}x** (target: 100x) ${speedup >= 100 ? '✅' : ''}
- Token reduction: ${(tokenReduction * 100).toFixed(1)}%
- Success rate: ${(successful.length / this.results.length * 100).toFixed(0)}%

## Detailed Results

<details>
<summary>Click to expand individual query results</summary>

| Query ID | Category | Baseline (ms) | MemoryLayer (ms) | Speedup |
|----------|----------|---------------|------------------|---------|
${this.results.slice(0, 20).map(r =>
  `| ${r.queryId} | ${r.category} | ${r.baseline.latencyMs.toFixed(0)} | ${r.treatment.latencyMs.toFixed(0)} | ${r.speedup.toFixed(1)}x |`
).join('\n')}

</details>

---
*Generated by MemoryLayer Benchmark Suite*
`;

    writeFileSync(reportPath, report);
    console.log(`📄 Report saved to: ${reportPath}`);
  }
}

// Main entry point
async function main(): Promise<void> {
  const args = parseArgs();

  // Show help
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Determine project path
  let projectPath: string;

  if (args.project) {
    // Use specified project
    projectPath = resolve(args.project);
    if (!existsSync(projectPath)) {
      console.error(`❌ Project path does not exist: ${projectPath}`);
      process.exit(1);
    }
  } else {
    // Use current directory (MemoryLayer itself) or download test project
    const currentDir = process.cwd();
    const hasSourceCode = existsSync(join(currentDir, 'src')) || existsSync(join(currentDir, 'package.json'));

    if (hasSourceCode) {
      projectPath = currentDir;
      console.log(`📁 Using current directory: ${projectPath}`);
    } else {
      // Download test project
      console.log(`📦 No source code found, downloading test project (${args.size})...`);
      const downloader = new ProjectDownloader('./test-projects');

      const projectName = args.size === 'small' ? 'express-starter' :
                          args.size === 'medium' ? 'react-demo' : 'vscode';

      if (!downloader.isDownloaded(projectName)) {
        await downloadProjectBySize(args.size, './test-projects');
      }

      projectPath = resolve('./test-projects', projectName);
    }
  }

  // Select queries
  let queries = allQueries;
  if (args.quick) {
    queries = allQueries.slice(0, 5);
  } else if (args.full) {
    queries = allQueries;
  } else {
    queries = allQueries.slice(0, args.queries);
  }

  console.log(`\n📊 Selected ${queries.length} queries for benchmarking\n`);

  // Run benchmark
  const benchmark = new WorkingBenchmark({
    projectPath,
    queries,
    iterations: args.iterations,
    outputDir: args.output,
    verbose: args.verbose
  });

  try {
    await benchmark.run();
    console.log('\n✅ Benchmark completed successfully!\n');
    process.exit(0);
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
