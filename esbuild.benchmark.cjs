const esbuild = require('esbuild');
const { existsSync, mkdirSync } = require('fs');
const path = require('path');

async function buildBenchmarks() {
  console.log('Building benchmark files...');

  // Ensure output directory exists
  const outDir = path.join(__dirname, 'dist', 'benchmark');
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  await esbuild.build({
    entryPoints: [
      'tests/benchmark/working-benchmark.ts',
      'tests/benchmark/publication-benchmark.ts',
      'tests/benchmark/benchmark-config.ts',
      'tests/benchmark/statistics.ts',
      'tests/benchmark/real-benchmark.ts',
      'tests/benchmark/run-benchmarks.ts',
      'tests/benchmark/test-harness.ts',
      'tests/benchmark/analyze-results.ts',
      'tests/benchmark/mcp-client.ts',
      'tests/benchmark/opencode-client.ts',
      'tests/benchmark/test-scenarios.ts',
      'tests/benchmark/project-downloader.ts',
      'tests/benchmark/real-test-harness.ts'
    ],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outdir: 'dist/benchmark',
    format: 'esm',
    splitting: false,
    sourcemap: true,
    external: [
      '@modelcontextprotocol/sdk',
      'better-sqlite3',
      '@xenova/transformers',
      'chokidar',
      'glob',
      'web-tree-sitter'
    ]
  });

  console.log('✓ Benchmark files built successfully');
}

buildBenchmarks().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
