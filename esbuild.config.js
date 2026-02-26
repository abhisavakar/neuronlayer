import { build } from 'esbuild';

const commonOptions = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  sourcemap: true,
  external: [
    'better-sqlite3',    // Native module
    '@xenova/transformers', // Large, keep external
    'chokidar',          // Uses CommonJS require
    'glob',              // Keep external
    'web-tree-sitter'    // WASM module
  ]
};

// Build main MCP server
await build({
  ...commonOptions,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  banner: { js: '#!/usr/bin/env node' },
});

console.log('Build complete!');
