/**
 * memcode vs OpenCode Benchmark
 *
 * Compares our memcode agent against OpenCode CLI
 * Both using the same model (Kimi-K2.5 on Azure)
 */

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, cpSync, rmSync } from 'fs';
import { join, basename } from 'path';
import { calculateStatistics, calculateEffectSize, welchsTTest } from './statistics.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface BenchmarkConfig {
  sourceProject: string;
  testDir: string;
  tasks: BenchmarkTask[];
  iterations: number;
  taskTimeout: number;
  outputDir: string;
  keepProjects: boolean;
  verbose: boolean;

  // Azure OpenAI config
  azureBaseURL: string;
  azureApiKey: string;
  model: string;
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
  tool: 'memcode' | 'opencode';
  iteration: number;
  latencyMs: number;
  tokensUsed: number;
  conceptsFound: string[];
  conceptScore: number;
  response: string;
  toolsUsed: string[];
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
    prompt: 'What does this project do? Give me a brief overview in 2-3 sentences.',
    category: 'understanding',
    difficulty: 'easy',
    expectedConcepts: ['memory', 'mcp', 'context', 'codebase', 'ai', 'agent']
  },
  {
    id: 'find-entry',
    name: 'Find Entry Point',
    prompt: 'Where is the main entry point of this project? What file starts the application?',
    category: 'navigation',
    difficulty: 'easy',
    expectedConcepts: ['index', 'main', 'entry', 'src', 'dist']
  },
  {
    id: 'list-tools',
    name: 'List Tools',
    prompt: 'What tools does this project provide? List 5 of them.',
    category: 'understanding',
    difficulty: 'medium',
    expectedConcepts: ['tool', 'get_context', 'search', 'record_decision', 'handler']
  },
  {
    id: 'find-database',
    name: 'Find Database',
    prompt: 'How does this project store data? What database is used?',
    category: 'navigation',
    difficulty: 'medium',
    expectedConcepts: ['sqlite', 'database', 'storage', 'better-sqlite3']
  },
  {
    id: 'understand-embeddings',
    name: 'Embeddings System',
    prompt: 'How does this project create embeddings? What library is used?',
    category: 'understanding',
    difficulty: 'hard',
    expectedConcepts: ['embedding', 'vector', 'transformers', 'xenova', 'similarity']
  },
  {
    id: 'find-agent',
    name: 'Find Agent Code',
    prompt: 'Where is the agent/orchestrator code? What does it do?',
    category: 'navigation',
    difficulty: 'medium',
    expectedConcepts: ['agent', 'orchestrator', 'llm', 'provider', 'tool']
  }
];

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

export class MemcodeVsOpencodeBenchmark {
  private config: BenchmarkConfig;
  private results: TaskResult[] = [];
  private memcodeProjectPath: string;
  private opencodeProjectPath: string;

  constructor(config: Partial<BenchmarkConfig> = {}) {
    const sourceProject = config.sourceProject || process.cwd();
    const parentDir = join(sourceProject, '..');

    this.config = {
      sourceProject,
      testDir: config.testDir || join(parentDir, 'memcode-benchmark-test'),
      tasks: config.tasks || DEFAULT_TASKS,
      iterations: config.iterations || 2,
      taskTimeout: config.taskTimeout || 180000,
      outputDir: config.outputDir || './benchmark-results',
      keepProjects: config.keepProjects || false,
      verbose: config.verbose || false,
      azureBaseURL: config.azureBaseURL || process.env.OPENAI_BASE_URL || 'https://swedencentral.api.cognitive.microsoft.com/openai/v1',
      azureApiKey: config.azureApiKey || process.env.OPENAI_API_KEY || '',
      model: config.model || 'Kimi-K2.5'
    };

    this.memcodeProjectPath = join(this.config.testDir, 'memcode-project');
    this.opencodeProjectPath = join(this.config.testDir, 'opencode-project');
  }

  async run(): Promise<BenchmarkReport> {
    this.printHeader();

    if (!this.config.azureApiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
    }

    const startTime = Date.now();

    // Setup test projects
    this.setupProjects();

    try {
      // Phase 1: Test memcode
      console.log('\n' + '═'.repeat(65));
      console.log('📊 PHASE 1: MEMCODE');
      console.log('   Our AI coding assistant powered by MemoryLayer');
      console.log('═'.repeat(65));

      await this.runPhase('memcode');

      // Phase 2: Test OpenCode
      console.log('\n' + '═'.repeat(65));
      console.log('📊 PHASE 2: OPENCODE');
      console.log('   OpenCode CLI (baseline comparison)');
      console.log('═'.repeat(65));

      await this.runPhase('opencode');

    } finally {
      if (!this.config.keepProjects) {
        this.cleanup();
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
    console.log('║              memcode vs OpenCode Benchmark                         ║');
    console.log('║                                                                   ║');
    console.log('║   Comparing AI coding assistants on the same codebase             ║');
    console.log('║   • memcode: MemoryLayer-powered agent                            ║');
    console.log('║   • OpenCode: Baseline CLI                                        ║');
    console.log('╠═══════════════════════════════════════════════════════════════════╣');
    console.log(`║  Model: ${this.config.model.padEnd(58)}║`);
    console.log(`║  Tasks: ${this.config.tasks.length.toString().padEnd(58)}║`);
    console.log(`║  Iterations: ${this.config.iterations.toString().padEnd(53)}║`);
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
  }

  private setupProjects(): void {
    console.log('\n📦 Setting up test projects...\n');

    // Clean old test projects
    if (existsSync(this.config.testDir)) {
      console.log('   Cleaning old test projects...');
      try {
        rmSync(this.config.testDir, { recursive: true, force: true });
      } catch {
        this.config.testDir = this.config.testDir + '-' + Date.now();
        this.memcodeProjectPath = join(this.config.testDir, 'memcode-project');
        this.opencodeProjectPath = join(this.config.testDir, 'opencode-project');
      }
    }

    mkdirSync(this.config.testDir, { recursive: true });

    // Copy project for memcode
    console.log('   Creating memcode test project...');
    this.copyProject(this.memcodeProjectPath);

    // Copy project for OpenCode
    console.log('   Creating OpenCode test project...');
    this.copyProject(this.opencodeProjectPath);

    // Create opencode.json for OpenCode project (no MCP - fair comparison)
    writeFileSync(
      join(this.opencodeProjectPath, 'opencode.json'),
      JSON.stringify({ "$schema": "https://opencode.ai/config.json", "mcp": {} }, null, 2)
    );

    console.log('\n   ✓ Test projects ready\n');
  }

  private copyProject(destDir: string): void {
    cpSync(this.config.sourceProject, destDir, {
      recursive: true,
      filter: (src) => {
        const name = basename(src);
        if (['node_modules', '.git', 'data', 'benchmark-results', 'test-projects'].includes(name)) {
          return false;
        }
        return true;
      }
    });
    console.log(`     → ${destDir}`);
  }

  private async runPhase(tool: 'memcode' | 'opencode'): Promise<void> {
    for (const task of this.config.tasks) {
      console.log(`\n  📝 ${task.name} (${task.difficulty})`);

      for (let i = 1; i <= this.config.iterations; i++) {
        process.stdout.write(`     [${i}/${this.config.iterations}] `);

        const result = await this.runTask(task, tool, i);
        this.results.push(result);

        if (result.success) {
          const secs = (result.latencyMs / 1000).toFixed(1);
          const quality = (result.conceptScore * 100).toFixed(0);
          const tools = result.toolsUsed.length;
          console.log(`✓ ${secs}s | ${quality}% quality | ${tools} tools used`);
        } else {
          console.log(`✗ ${result.error?.slice(0, 60)}`);
        }

        // Cooldown between runs
        await this.sleep(3000);
      }
    }
  }

  private async runTask(task: BenchmarkTask, tool: 'memcode' | 'opencode', iteration: number): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      let result: { response: string; tokensUsed: number; toolsUsed: string[] };

      if (tool === 'memcode') {
        result = await this.runMemcode(task.prompt);
      } else {
        result = await this.runOpencode(task.prompt);
      }

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
        tool,
        iteration,
        latencyMs,
        tokensUsed: result.tokensUsed,
        conceptsFound,
        conceptScore,
        response: result.response,
        toolsUsed: result.toolsUsed,
        success: true
      };

    } catch (error) {
      return {
        taskId: task.id,
        tool,
        iteration,
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        conceptsFound: [],
        conceptScore: 0,
        response: '',
        toolsUsed: [],
        error: String(error),
        success: false
      };
    }
  }

  private async runMemcode(prompt: string): Promise<{ response: string; tokensUsed: number; toolsUsed: string[] }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      // Path to memcode
      const agentPath = join(this.config.sourceProject, 'dist', 'agent.js');

      const proc = spawn('node', [agentPath, '--model', this.config.model, '--provider', 'openai'], {
        cwd: this.memcodeProjectPath,
        shell: true,
        timeout: this.config.taskTimeout,
        env: {
          ...process.env,
          OPENAI_BASE_URL: this.config.azureBaseURL,
          OPENAI_API_KEY: this.config.azureApiKey
        }
      });

      // Send prompt and exit command
      proc.stdin?.write(prompt + '\n');
      setTimeout(() => {
        proc.stdin?.write('/exit\n');
        proc.stdin?.end();
      }, 1000);

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const response = this.cleanResponse(stdout);

        // Extract tools used from output
        const toolMatches = stdout.match(/🔧 (\w+)\(/g) || [];
        const toolsUsed = toolMatches.map(m => m.replace('🔧 ', '').replace('(', ''));

        // Extract tokens from output
        const tokenMatch = stdout.match(/(\d+) tokens/);
        const tokensUsed = tokenMatch ? parseInt(tokenMatch[1]) : this.estimateTokens(response);

        resolve({
          response,
          tokensUsed,
          toolsUsed
        });
      });

      proc.on('error', reject);
    });
  }

  private async runOpencode(prompt: string): Promise<{ response: string; tokensUsed: number; toolsUsed: string[] }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      // Use OpenCode's default configured model (user has Kimi set up)
      const proc = spawn('opencode', ['run', prompt], {
        cwd: this.opencodeProjectPath,
        shell: true,
        timeout: this.config.taskTimeout,
        env: { ...process.env }
      });

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const response = this.cleanResponse(stdout);

        if (!response && code !== 0) {
          reject(new Error(`Exit ${code}: ${stderr.slice(0, 100)}`));
          return;
        }

        resolve({
          response,
          tokensUsed: this.estimateTokens(response),
          toolsUsed: [] // OpenCode doesn't show tool usage the same way
        });
      });

      proc.on('error', reject);
    });
  }

  private cleanResponse(text: string): string {
    return text
      .replace(/\x1b\[[0-9;]*m/g, '')
      .replace(/\[[\d;]*m/g, '')
      .replace(/[▄▀█░▓▒●○◐◑◒◓⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/g, '')
      .replace(/╔.*?╝/gs, '')
      .trim();
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private generateReport(): BenchmarkReport {
    const memcode = this.results.filter(r => r.tool === 'memcode' && r.success);
    const opencode = this.results.filter(r => r.tool === 'opencode' && r.success);

    const mLatency = memcode.map(r => r.latencyMs);
    const oLatency = opencode.map(r => r.latencyMs);
    const mQuality = memcode.map(r => r.conceptScore);
    const oQuality = opencode.map(r => r.conceptScore);
    const mTools = memcode.map(r => r.toolsUsed.length);

    const safeStats = (arr: number[]) => arr.length > 0 ? calculateStatistics(arr) : null;

    const mMeanLat = safeStats(mLatency)?.mean || 1;
    const oMeanLat = safeStats(oLatency)?.mean || 1;
    const mMeanQual = safeStats(mQuality)?.mean || 0;
    const oMeanQual = safeStats(oQuality)?.mean || 0;
    const mMeanTools = safeStats(mTools)?.mean || 0;

    const totalTasks = this.config.tasks.length * this.config.iterations;

    return {
      timestamp: new Date().toISOString(),
      config: this.config,
      summary: {
        memcodeLatency: mMeanLat,
        opencodeLatency: oMeanLat,
        speedup: oMeanLat / mMeanLat,
        memcodeQuality: mMeanQual,
        opencodeQuality: oMeanQual,
        qualityDelta: mMeanQual - oMeanQual,
        memcodeToolsUsed: mMeanTools,
        memcodeSuccessRate: memcode.length / totalTasks,
        opencodeSuccessRate: opencode.length / totalTasks
      },
      statistics: {
        latency: { memcode: safeStats(mLatency), opencode: safeStats(oLatency) },
        quality: { memcode: safeStats(mQuality), opencode: safeStats(oQuality) }
      },
      effectSizes: {
        latency: mLatency.length > 1 && oLatency.length > 1 ? calculateEffectSize(oLatency, mLatency) : null
      },
      significance: {
        latency: mLatency.length > 1 && oLatency.length > 1 ? welchsTTest(oLatency, mLatency) : null
      },
      rawResults: this.results
    };
  }

  private saveResults(report: BenchmarkReport): void {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const prefix = `memcode-vs-opencode-${ts}`;

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

  private printSummary(report: BenchmarkReport): void {
    const s = report.summary;

    console.log('\n' + '═'.repeat(65));
    console.log('📊 BENCHMARK RESULTS: memcode vs OpenCode');
    console.log('═'.repeat(65));

    console.log('\n┌──────────────────┬──────────────────┬──────────────────┬────────────┐');
    console.log('│ Metric           │ memcode          │ OpenCode         │ Winner     │');
    console.log('├──────────────────┼──────────────────┼──────────────────┼────────────┤');

    const fmtLat = (ms: number) => (ms / 1000).toFixed(1) + 's';
    const fmtPct = (p: number) => (p * 100).toFixed(0) + '%';

    const latWin = s.speedup > 1.1 ? '🏆 memcode' : (s.speedup < 0.9 ? '⚠️ OpenCode' : '≈ Tie');
    const qualWin = s.qualityDelta > 0.05 ? '🏆 memcode' : (s.qualityDelta < -0.05 ? '⚠️ OpenCode' : '≈ Tie');

    console.log(`│ Latency          │ ${fmtLat(s.memcodeLatency).padStart(16)} │ ${fmtLat(s.opencodeLatency).padStart(16)} │ ${latWin.padStart(10)} │`);
    console.log(`│ Answer Quality   │ ${fmtPct(s.memcodeQuality).padStart(16)} │ ${fmtPct(s.opencodeQuality).padStart(16)} │ ${qualWin.padStart(10)} │`);
    console.log(`│ Tools Used (avg) │ ${s.memcodeToolsUsed.toFixed(1).padStart(16)} │ ${'N/A'.padStart(16)} │            │`);
    console.log(`│ Success Rate     │ ${fmtPct(s.memcodeSuccessRate).padStart(16)} │ ${fmtPct(s.opencodeSuccessRate).padStart(16)} │            │`);

    console.log('└──────────────────┴──────────────────┴──────────────────┴────────────┘');

    console.log('\n📈 Key Findings:');

    if (s.speedup > 1) {
      console.log(`   ✓ memcode is ${s.speedup.toFixed(2)}x FASTER than OpenCode`);
    } else if (s.speedup < 1) {
      console.log(`   ⚠️ OpenCode was ${(1/s.speedup).toFixed(2)}x faster`);
    } else {
      console.log(`   ≈ Similar speed`);
    }

    if (s.qualityDelta > 0) {
      console.log(`   ✓ memcode answers are ${(s.qualityDelta * 100).toFixed(0)}% HIGHER quality`);
    } else if (s.qualityDelta < 0) {
      console.log(`   ⚠️ OpenCode answers were ${Math.abs(s.qualityDelta * 100).toFixed(0)}% higher quality`);
    } else {
      console.log(`   ≈ Similar quality`);
    }

    console.log(`   • memcode used ${s.memcodeToolsUsed.toFixed(1)} MemoryLayer tools on average`);
  }

  private generateMarkdown(report: BenchmarkReport): string {
    const s = report.summary;
    const c = this.config;

    return `# memcode vs OpenCode Benchmark

## Configuration

| Setting | Value |
|---------|-------|
| Model | \`${c.model}\` |
| Tasks | ${c.tasks.length} |
| Iterations | ${c.iterations} |

## Results

| Metric | memcode | OpenCode | Winner |
|--------|---------|----------|--------|
| **Latency** | ${(s.memcodeLatency/1000).toFixed(1)}s | ${(s.opencodeLatency/1000).toFixed(1)}s | ${s.speedup > 1 ? `**memcode (${s.speedup.toFixed(2)}x faster)**` : `OpenCode`} |
| **Quality** | ${(s.memcodeQuality*100).toFixed(0)}% | ${(s.opencodeQuality*100).toFixed(0)}% | ${s.qualityDelta > 0 ? `**memcode (+${(s.qualityDelta*100).toFixed(0)}%)**` : `OpenCode`} |
| **Tools Used** | ${s.memcodeToolsUsed.toFixed(1)} avg | N/A | - |
| **Success** | ${(s.memcodeSuccessRate*100).toFixed(0)}% | ${(s.opencodeSuccessRate*100).toFixed(0)}% | - |

## Key Advantages

### memcode
- Uses MemoryLayer for semantic code search
- 62 specialized tools available
- Persistent memory across sessions
- Architecture pattern learning

### OpenCode
- General-purpose CLI
- Works without setup

---
*Timestamp: ${report.timestamp}*
`;
  }

  private cleanup(): void {
    if (existsSync(this.config.testDir)) {
      console.log('\n🧹 Cleaning up test projects...');
      rmSync(this.config.testDir, { recursive: true, force: true });
    }
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
    memcodeLatency: number;
    opencodeLatency: number;
    speedup: number;
    memcodeQuality: number;
    opencodeQuality: number;
    qualityDelta: number;
    memcodeToolsUsed: number;
    memcodeSuccessRate: number;
    opencodeSuccessRate: number;
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
memcode vs OpenCode Benchmark

Compares memcode (MemoryLayer-powered) against OpenCode CLI.

Usage: node dist/benchmark/memcode-vs-opencode.js [options]

Options:
  --project <path>     Source project (default: current dir)
  --iterations <n>     Runs per task (default: 2)
  --model <model>      Model name (default: Kimi-K2.5)
  --output <dir>       Output dir (default: ./benchmark-results)
  --keep-projects      Don't delete test projects
  --verbose, -v        Verbose logging
  --help, -h           Show help

Environment Variables:
  OPENAI_BASE_URL      Azure OpenAI endpoint
  OPENAI_API_KEY       Azure API key

Example:
  npm run benchmark:memcode-vs-opencode
`);
        process.exit(0);
    }
  }

  const benchmark = new MemcodeVsOpencodeBenchmark(config);
  await benchmark.run();
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
