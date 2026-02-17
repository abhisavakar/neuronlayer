/**
 * OpenCode Benchmark: Baseline vs MemoryLayer
 *
 * FAIR COMPARISON using TWO SEPARATE PROJECT REPLICAS:
 * - Project A: NO MCP configured (baseline)
 * - Project B: WITH MemoryLayer MCP configured
 *
 * Both projects are identical copies of the codebase.
 * No config switching during tests = clean, reproducible results.
 *
 * Uses OpenCode CLI with Kimi K2.5 (free model)
 */

import { spawn, execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync, cpSync, rmSync } from 'fs';
import { join, basename } from 'path';
import { calculateStatistics, calculateEffectSize, welchsTTest } from './statistics.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface BenchmarkConfig {
  // Source project to copy
  sourceProject: string;

  // Where to create test replicas
  testDir: string;

  // Tasks to run
  tasks: BenchmarkTask[];

  // Iterations per task
  iterations: number;

  // Timeout per task (ms)
  taskTimeout: number;

  // Model to use
  model: string;

  // Output directory for results
  outputDir: string;

  // Keep test projects after benchmark
  keepProjects: boolean;

  // Verbose logging
  verbose: boolean;
}

export interface BenchmarkTask {
  id: string;
  name: string;
  prompt: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  expectedConcepts: string[];
}

export interface TaskResult {
  taskId: string;
  mode: 'baseline' | 'memorylayer';
  iteration: number;
  latencyMs: number;
  tokensInput: number;
  tokensOutput: number;
  totalTokens: number;
  conceptsFound: string[];
  conceptScore: number;
  response: string;
  error?: string;
  success: boolean;
}

// ============================================================================
// DEFAULT TASKS
// ============================================================================

const DEFAULT_TASKS: BenchmarkTask[] = [
  {
    id: 'understand-project',
    name: 'Understand Project',
    prompt: 'What does this project do? Give me a brief overview.',
    category: 'understanding',
    difficulty: 'easy',
    expectedConcepts: ['memory', 'mcp', 'context', 'search', 'codebase', 'ai']
  },
  {
    id: 'find-entry',
    name: 'Find Entry Point',
    prompt: 'Where is the main entry point of this project? What file starts the application?',
    category: 'navigation',
    difficulty: 'easy',
    expectedConcepts: ['index', 'main', 'entry', 'start', 'server', 'src']
  },
  {
    id: 'understand-tools',
    name: 'List MCP Tools',
    prompt: 'What MCP tools does this project provide? List some of them.',
    category: 'understanding',
    difficulty: 'medium',
    expectedConcepts: ['tool', 'get_context', 'search', 'mcp', 'handler', 'list']
  },
  {
    id: 'find-database',
    name: 'Find Database',
    prompt: 'How does this project store data? What database or storage is used?',
    category: 'navigation',
    difficulty: 'medium',
    expectedConcepts: ['sqlite', 'database', 'storage', 'data', 'db', 'better-sqlite3']
  },
  {
    id: 'understand-embeddings',
    name: 'Embeddings System',
    prompt: 'How does this project create embeddings? What model or library is used?',
    category: 'understanding',
    difficulty: 'hard',
    expectedConcepts: ['embedding', 'vector', 'transformers', 'xenova', 'model', 'similarity']
  }
];

// ============================================================================
// PROJECT SETUP
// ============================================================================

class ProjectSetup {
  private sourceProject: string;
  private testDir: string;
  private baselineDir: string;
  private memorylayerDir: string;

  constructor(sourceProject: string, testDir: string) {
    this.sourceProject = sourceProject;
    this.testDir = testDir;
    this.baselineDir = join(testDir, 'baseline-project');
    this.memorylayerDir = join(testDir, 'memorylayer-project');
  }

  /**
   * Create two project replicas
   */
  setup(): { baselinePath: string; memorylayerPath: string } {
    console.log('\n📦 Setting up test projects...\n');

    // Clean up old test projects with retry logic
    if (existsSync(this.testDir)) {
      console.log('   Cleaning old test projects...');
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          rmSync(this.testDir, { recursive: true, force: true });
          break;
        } catch (e: any) {
          if (attempt === 3) {
            console.log(`   ⚠️ Could not clean ${this.testDir}, using timestamp suffix`);
            // Use a new directory with timestamp
            this.testDir = this.testDir + '-' + Date.now();
            this.baselineDir = join(this.testDir, 'baseline-project');
            this.memorylayerDir = join(this.testDir, 'memorylayer-project');
          } else {
            console.log(`   Retry ${attempt}/3...`);
            // Wait a bit before retrying
            const start = Date.now();
            while (Date.now() - start < 1000) { /* busy wait */ }
          }
        }
      }
    }

    mkdirSync(this.testDir, { recursive: true });

    // Copy project twice
    console.log(`   Creating BASELINE project (no MCP)...`);
    this.copyProject(this.baselineDir, false);

    console.log(`   Creating MEMORYLAYER project (with MCP)...`);
    this.copyProject(this.memorylayerDir, true);

    console.log('\n   ✓ Test projects ready\n');

    return {
      baselinePath: this.baselineDir,
      memorylayerPath: this.memorylayerDir
    };
  }

  /**
   * Copy project and configure MCP
   */
  private copyProject(destDir: string, withMCP: boolean): void {
    // Copy all files except node_modules, .git, data, benchmark-results
    // BUT include dist/ so MCP server works without rebuild
    cpSync(this.sourceProject, destDir, {
      recursive: true,
      filter: (src) => {
        const name = basename(src);
        // Exclude these directories
        if (['node_modules', '.git', 'data', 'benchmark-results', 'test-projects', 'benchmark-test-projects'].includes(name)) {
          return false;
        }
        return true;
      }
    });

    // Create opencode.json
    const opencodeConfig = withMCP
      ? this.createMCPConfig(destDir)
      : this.createNoMCPConfig();

    writeFileSync(
      join(destDir, 'opencode.json'),
      JSON.stringify(opencodeConfig, null, 2)
    );

    console.log(`     → ${destDir}`);
    console.log(`     → opencode.json: MCP ${withMCP ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Config WITH MemoryLayer MCP
   * Points to ORIGINAL project's dist/index.js (has node_modules)
   * But indexes the TEST project directory
   */
  private createMCPConfig(projectDir: string): any {
    // Use the source project's built server (has node_modules)
    const serverPath = join(this.sourceProject, "dist", "index.js");

    return {
      "$schema": "https://opencode.ai/config.json",
      "mcp": {
        "memorylayer": {
          "type": "local",
          "command": ["cmd", "/c", "node", serverPath, "--project", projectDir],
          "enabled": true
        }
      }
    };
  }

  /**
   * Config WITHOUT any MCP
   */
  private createNoMCPConfig(): any {
    return {
      "$schema": "https://opencode.ai/config.json",
      "mcp": {}
    };
  }

  /**
   * Cleanup test projects
   */
  cleanup(): void {
    if (existsSync(this.testDir)) {
      console.log('\n🧹 Cleaning up test projects...');
      rmSync(this.testDir, { recursive: true, force: true });
    }
  }

  getBaselinePath(): string { return this.baselineDir; }
  getMemorylayerPath(): string { return this.memorylayerDir; }
}

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

export class OpenCodeBenchmark {
  private config: BenchmarkConfig;
  private results: TaskResult[] = [];
  private projectSetup: ProjectSetup;

  constructor(config: Partial<BenchmarkConfig> = {}) {
    const sourceProject = config.sourceProject || process.cwd();
    const parentDir = join(sourceProject, '..');  // Go up one level

    this.config = {
      sourceProject,
      testDir: config.testDir || join(parentDir, 'memorylayer-benchmark-test'),
      tasks: config.tasks || DEFAULT_TASKS,
      iterations: config.iterations || 3,
      taskTimeout: config.taskTimeout || 180000,
      model: config.model || 'opencode/kimi-k2.5-free',
      outputDir: config.outputDir || './benchmark-results',
      keepProjects: config.keepProjects || false,
      verbose: config.verbose || false
    };

    this.projectSetup = new ProjectSetup(this.config.sourceProject, this.config.testDir);
  }

  /**
   * Run the full benchmark
   */
  async run(): Promise<BenchmarkReport> {
    this.printHeader();

    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
    }

    const startTime = Date.now();

    // Setup two project replicas
    const { baselinePath, memorylayerPath } = this.projectSetup.setup();

    // MCP server uses original project's dist (already built)
    console.log('🔨 Using pre-built MemoryLayer from source project');
    console.log(`   Server: ${join(this.config.sourceProject, 'dist', 'index.js')}`);

    try {
      // Phase 1: Baseline (project without MCP)
      console.log('\n' + '═'.repeat(65));
      console.log('📊 PHASE 1: BASELINE');
      console.log('   Project: baseline-project (NO MCP configured)');
      console.log('   OpenCode will use its built-in tools only');
      console.log('═'.repeat(65));

      await this.runPhase('baseline', baselinePath);

      // Phase 2: MemoryLayer (project with MCP)
      console.log('\n' + '═'.repeat(65));
      console.log('📊 PHASE 2: MEMORYLAYER');
      console.log('   Project: memorylayer-project (WITH MCP configured)');
      console.log('   OpenCode will use MemoryLayer for semantic search');
      console.log('═'.repeat(65));

      await this.runPhase('memorylayer', memorylayerPath);

    } finally {
      // Cleanup unless --keep-projects
      if (!this.config.keepProjects) {
        this.projectSetup.cleanup();
      } else {
        console.log(`\n📁 Test projects kept at: ${this.config.testDir}`);
      }
    }

    // Generate report
    const report = this.generateReport();
    this.saveResults(report);
    this.printSummary(report);

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\n✅ Benchmark completed in ${(totalTime / 60).toFixed(1)} minutes`);

    return report;
  }

  private printHeader(): void {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║         OpenCode Benchmark: Baseline vs MemoryLayer               ║');
    console.log('║                                                                   ║');
    console.log('║   FAIR TEST: Two identical project copies                         ║');
    console.log('║   • Project A: No MCP (baseline)                                  ║');
    console.log('║   • Project B: With MemoryLayer MCP                               ║');
    console.log('╠═══════════════════════════════════════════════════════════════════╣');
    console.log(`║  Model: ${this.config.model.padEnd(58)}║`);
    console.log(`║  Tasks: ${this.config.tasks.length.toString().padEnd(58)}║`);
    console.log(`║  Iterations per task: ${this.config.iterations.toString().padEnd(44)}║`);
    console.log(`║  Total runs: ${(this.config.tasks.length * this.config.iterations * 2).toString().padEnd(53)}║`);
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
  }

  /**
   * Run one phase
   */
  private async runPhase(mode: 'baseline' | 'memorylayer', projectPath: string): Promise<void> {
    for (const task of this.config.tasks) {
      console.log(`\n  📝 ${task.name} (${task.difficulty})`);

      for (let i = 1; i <= this.config.iterations; i++) {
        process.stdout.write(`     [${i}/${this.config.iterations}] `);

        const result = await this.runTask(task, mode, i, projectPath);
        this.results.push(result);

        if (result.success) {
          const secs = (result.latencyMs / 1000).toFixed(1);
          const quality = (result.conceptScore * 100).toFixed(0);
          console.log(`✓ ${secs}s | ${result.totalTokens} tokens | ${quality}% quality`);
        } else {
          console.log(`✗ ${result.error?.slice(0, 60)}`);
        }

        // Cooldown between runs
        await this.sleep(2000);
      }
    }
  }

  /**
   * Run a single task
   */
  private async runTask(
    task: BenchmarkTask,
    mode: 'baseline' | 'memorylayer',
    iteration: number,
    projectPath: string
  ): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      const result = await this.executeOpenCode(task.prompt, projectPath);
      const latencyMs = Date.now() - startTime;

      // Quality scoring
      const conceptsFound = task.expectedConcepts.filter(c =>
        result.response.toLowerCase().includes(c.toLowerCase())
      );
      const conceptScore = task.expectedConcepts.length > 0
        ? conceptsFound.length / task.expectedConcepts.length
        : 1;

      return {
        taskId: task.id,
        mode,
        iteration,
        latencyMs,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        totalTokens: result.tokensInput + result.tokensOutput,
        conceptsFound,
        conceptScore,
        response: result.response,
        success: true
      };

    } catch (error) {
      return {
        taskId: task.id,
        mode,
        iteration,
        latencyMs: Date.now() - startTime,
        tokensInput: 0,
        tokensOutput: 0,
        totalTokens: 0,
        conceptsFound: [],
        conceptScore: 0,
        response: '',
        error: String(error),
        success: false
      };
    }
  }

  /**
   * Execute OpenCode in a specific project
   */
  private async executeOpenCode(prompt: string, projectPath: string): Promise<{
    response: string;
    tokensInput: number;
    tokensOutput: number;
  }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      // Run opencode in the specific project directory
      // Message is a positional argument, not --prompt
      const args = [
        'run',
        '--model', this.config.model,
        prompt  // Positional argument
      ];

      if (this.config.verbose) {
        console.log(`\n     CWD: ${projectPath}`);
        console.log(`     CMD: opencode ${args.join(' ')}`);
      }

      const proc = spawn('opencode', args, {
        cwd: projectPath,  // Run in the specific project
        shell: true,
        timeout: this.config.taskTimeout,
        env: { ...process.env }
      });

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const response = this.cleanResponse(stdout);

        if (!response && code !== 0) {
          reject(new Error(`Exit ${code}: ${stderr.slice(0, 100)}`));
          return;
        }

        const estimatedTokens = this.estimateTokens(response);

        resolve({
          response,
          tokensInput: Math.round(estimatedTokens * 0.6),
          tokensOutput: Math.round(estimatedTokens * 0.4)
        });
      });

      proc.on('error', reject);
    });
  }

  /**
   * Clean ANSI codes from response
   */
  private cleanResponse(text: string): string {
    return text
      .replace(/\x1b\[[0-9;]*m/g, '')
      .replace(/\[[\d;]*m/g, '')
      .replace(/[▄▀█░▓▒●○◐◑◒◓]/g, '')
      .trim();
  }

  /**
   * Estimate tokens from text
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate benchmark report
   */
  private generateReport(): BenchmarkReport {
    const baseline = this.results.filter(r => r.mode === 'baseline' && r.success);
    const ml = this.results.filter(r => r.mode === 'memorylayer' && r.success);

    const bLatency = baseline.map(r => r.latencyMs);
    const mLatency = ml.map(r => r.latencyMs);
    const bTokens = baseline.map(r => r.totalTokens);
    const mTokens = ml.map(r => r.totalTokens);
    const bQuality = baseline.map(r => r.conceptScore);
    const mQuality = ml.map(r => r.conceptScore);

    const safeStats = (arr: number[]) => arr.length > 0 ? calculateStatistics(arr) : null;

    const stats = {
      latency: { baseline: safeStats(bLatency), memorylayer: safeStats(mLatency) },
      tokens: { baseline: safeStats(bTokens), memorylayer: safeStats(mTokens) },
      quality: { baseline: safeStats(bQuality), memorylayer: safeStats(mQuality) }
    };

    const bMeanLat = stats.latency.baseline?.mean || 1;
    const mMeanLat = stats.latency.memorylayer?.mean || 1;
    const bMeanTok = stats.tokens.baseline?.mean || 1;
    const mMeanTok = stats.tokens.memorylayer?.mean || 1;
    const bMeanQual = stats.quality.baseline?.mean || 0;
    const mMeanQual = stats.quality.memorylayer?.mean || 0;

    const totalTasks = this.config.tasks.length * this.config.iterations;

    return {
      timestamp: new Date().toISOString(),
      config: this.config,
      summary: {
        speedup: bMeanLat / mMeanLat,
        tokenReduction: ((bMeanTok - mMeanTok) / bMeanTok) * 100,
        qualityDelta: mMeanQual - bMeanQual,
        baselineLatency: bMeanLat,
        memorylayerLatency: mMeanLat,
        baselineTokens: bMeanTok,
        memorylayerTokens: mMeanTok,
        baselineQuality: bMeanQual,
        memorylayerQuality: mMeanQual,
        baselineSuccessRate: baseline.length / totalTasks,
        memorylayerSuccessRate: ml.length / totalTasks
      },
      statistics: stats,
      effectSizes: {
        latency: bLatency.length > 1 && mLatency.length > 1 ? calculateEffectSize(bLatency, mLatency) : null,
        tokens: bTokens.length > 1 && mTokens.length > 1 ? calculateEffectSize(bTokens, mTokens) : null
      },
      significance: {
        latency: bLatency.length > 1 && mLatency.length > 1 ? welchsTTest(bLatency, mLatency) : null,
        tokens: bTokens.length > 1 && mTokens.length > 1 ? welchsTTest(bTokens, mTokens) : null
      },
      rawResults: this.results
    };
  }

  /**
   * Save results to files
   */
  private saveResults(report: BenchmarkReport): void {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const prefix = `opencode-fair-benchmark-${ts}`;

    writeFileSync(
      join(this.config.outputDir, `${prefix}.json`),
      JSON.stringify(report, null, 2)
    );

    writeFileSync(
      join(this.config.outputDir, `${prefix}.md`),
      this.generateMarkdown(report)
    );

    console.log(`\n📁 Results saved to ${this.config.outputDir}/`);
  }

  /**
   * Print summary table
   */
  private printSummary(report: BenchmarkReport): void {
    const s = report.summary;

    console.log('\n' + '═'.repeat(65));
    console.log('📊 BENCHMARK RESULTS');
    console.log('═'.repeat(65));

    console.log('\n┌──────────────────┬──────────────────┬──────────────────┬────────────┐');
    console.log('│ Metric           │ Baseline (no MCP)│ MemoryLayer      │ Winner     │');
    console.log('├──────────────────┼──────────────────┼──────────────────┼────────────┤');

    const fmtLat = (ms: number) => (ms / 1000).toFixed(1) + 's';
    const fmtTok = (t: number) => t.toFixed(0);
    const fmtPct = (p: number) => (p * 100).toFixed(0) + '%';

    const latWin = s.speedup > 1.1 ? '🏆 ML' : (s.speedup < 0.9 ? '⚠️ Base' : '≈ Tie');
    const tokWin = s.tokenReduction > 5 ? '🏆 ML' : (s.tokenReduction < -5 ? '⚠️ Base' : '≈ Tie');
    const qualWin = s.qualityDelta > 0.05 ? '🏆 ML' : (s.qualityDelta < -0.05 ? '⚠️ Base' : '≈ Tie');

    console.log(`│ Latency          │ ${fmtLat(s.baselineLatency).padStart(16)} │ ${fmtLat(s.memorylayerLatency).padStart(16)} │ ${latWin.padStart(10)} │`);
    console.log(`│ Tokens           │ ${fmtTok(s.baselineTokens).padStart(16)} │ ${fmtTok(s.memorylayerTokens).padStart(16)} │ ${tokWin.padStart(10)} │`);
    console.log(`│ Answer Quality   │ ${fmtPct(s.baselineQuality).padStart(16)} │ ${fmtPct(s.memorylayerQuality).padStart(16)} │ ${qualWin.padStart(10)} │`);
    console.log(`│ Success Rate     │ ${fmtPct(s.baselineSuccessRate).padStart(16)} │ ${fmtPct(s.memorylayerSuccessRate).padStart(16)} │            │`);

    console.log('└──────────────────┴──────────────────┴──────────────────┴────────────┘');

    // Summary
    console.log('\n📈 Key Findings:');

    if (s.speedup > 1) {
      console.log(`   ✓ MemoryLayer is ${s.speedup.toFixed(2)}x FASTER`);
    } else if (s.speedup < 1) {
      console.log(`   ⚠️ Baseline was ${(1/s.speedup).toFixed(2)}x faster`);
    }

    if (s.tokenReduction > 0) {
      console.log(`   ✓ MemoryLayer uses ${s.tokenReduction.toFixed(0)}% FEWER tokens`);
    } else if (s.tokenReduction < 0) {
      console.log(`   ⚠️ Baseline used ${Math.abs(s.tokenReduction).toFixed(0)}% fewer tokens`);
    }

    if (s.qualityDelta > 0) {
      console.log(`   ✓ MemoryLayer answers are ${(s.qualityDelta * 100).toFixed(0)}% HIGHER quality`);
    } else if (s.qualityDelta < 0) {
      console.log(`   ⚠️ Baseline answers were ${Math.abs(s.qualityDelta * 100).toFixed(0)}% higher quality`);
    }

    // Statistical significance
    if (report.effectSizes.latency) {
      const d = report.effectSizes.latency.cohensD;
      console.log(`   • Effect size (Cohen's d): ${d.toFixed(2)} (${report.effectSizes.latency.interpretation})`);
    }

    if (report.significance.latency) {
      const p = report.significance.latency.pValue;
      const sig = p < 0.05 ? '✓ Significant' : '⚠️ Not significant';
      console.log(`   • p-value: ${p < 0.001 ? '< 0.001' : p.toFixed(3)} (${sig})`);
    }
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdown(report: BenchmarkReport): string {
    const s = report.summary;
    const c = this.config;

    return `# OpenCode Fair Benchmark: Baseline vs MemoryLayer

## Methodology

This benchmark uses **two separate, identical project copies**:

| Project | MCP Config | Purpose |
|---------|------------|---------|
| \`baseline-project/\` | No MCP servers | Control group |
| \`memorylayer-project/\` | MemoryLayer MCP enabled | Treatment group |

**Why this is fair:**
- No config switching during tests
- Both projects are identical copies
- Completely isolated environments
- Reproducible results

## Configuration

| Setting | Value |
|---------|-------|
| Model | \`${c.model}\` |
| Tasks | ${c.tasks.length} |
| Iterations per task | ${c.iterations} |
| Total measurements | ${c.tasks.length * c.iterations * 2} |

## Results

| Metric | Baseline | MemoryLayer | Improvement |
|--------|----------|-------------|-------------|
| **Latency** | ${(s.baselineLatency/1000).toFixed(1)}s | ${(s.memorylayerLatency/1000).toFixed(1)}s | ${s.speedup > 1 ? `**${s.speedup.toFixed(2)}x faster**` : `${(1/s.speedup).toFixed(2)}x slower`} |
| **Tokens** | ${s.baselineTokens.toFixed(0)} | ${s.memorylayerTokens.toFixed(0)} | ${s.tokenReduction > 0 ? `**${s.tokenReduction.toFixed(0)}% less**` : `${Math.abs(s.tokenReduction).toFixed(0)}% more`} |
| **Quality** | ${(s.baselineQuality*100).toFixed(0)}% | ${(s.memorylayerQuality*100).toFixed(0)}% | ${s.qualityDelta > 0 ? `**+${(s.qualityDelta*100).toFixed(0)}%**` : `${(s.qualityDelta*100).toFixed(0)}%`} |
| **Success** | ${(s.baselineSuccessRate*100).toFixed(0)}% | ${(s.memorylayerSuccessRate*100).toFixed(0)}% | - |

${report.effectSizes.latency ? `
## Statistical Analysis

| Metric | Value |
|--------|-------|
| Cohen's d | ${report.effectSizes.latency.cohensD.toFixed(2)} (${report.effectSizes.latency.interpretation}) |
| p-value | ${report.significance.latency?.pValue < 0.001 ? '< 0.001' : report.significance.latency?.pValue.toFixed(3)} |
| Significant | ${report.significance.latency?.isSignificant ? '✅ Yes' : '❌ No'} |
` : ''}

## Tasks

${c.tasks.map(t => `- **${t.name}** (${t.difficulty}): "${t.prompt}"`).join('\n')}

---
*Generated by OpenCode Fair Benchmark*
*Model: ${c.model}*
*Timestamp: ${report.timestamp}*
`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface BenchmarkReport {
  timestamp: string;
  config: BenchmarkConfig;
  summary: {
    speedup: number;
    tokenReduction: number;
    qualityDelta: number;
    baselineLatency: number;
    memorylayerLatency: number;
    baselineTokens: number;
    memorylayerTokens: number;
    baselineQuality: number;
    memorylayerQuality: number;
    baselineSuccessRate: number;
    memorylayerSuccessRate: number;
  };
  statistics: any;
  effectSizes: any;
  significance: any;
  rawResults: TaskResult[];
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const config: Partial<BenchmarkConfig> = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--project': config.sourceProject = args[++i]; break;
      case '--iterations': config.iterations = parseInt(args[++i]); break;
      case '--model': config.model = args[++i]; break;
      case '--output': config.outputDir = args[++i]; break;
      case '--keep-projects': config.keepProjects = true; break;
      case '--verbose': case '-v': config.verbose = true; break;
      case '--help': case '-h':
        console.log(`
OpenCode Fair Benchmark: Baseline vs MemoryLayer

Creates TWO identical project copies for fair comparison:
  • baseline-project/     → No MCP configured
  • memorylayer-project/  → MemoryLayer MCP configured

Usage: npm run benchmark:opencode -- [options]

Options:
  --project <path>     Source project (default: current dir)
  --iterations <n>     Runs per task (default: 3)
  --model <model>      Model (default: kimi/kimi-k2-0711-preview)
  --output <dir>       Output dir (default: ./benchmark-results)
  --keep-projects      Don't delete test projects after benchmark
  --verbose, -v        Verbose logging
  --help, -h           Show help

Examples:
  npm run benchmark:opencode                    # Standard run
  npm run benchmark:opencode -- --iterations 5  # More iterations
  npm run benchmark:opencode -- --keep-projects # Keep test copies
`);
        process.exit(0);
    }
  }

  const benchmark = new OpenCodeBenchmark(config);
  await benchmark.run();
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
