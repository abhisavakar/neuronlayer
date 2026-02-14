import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/index.js',
  format: 'esm',
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node'
  },
  external: [
    'better-sqlite3',    // Native module
    '@xenova/transformers', // Large, keep external
    'chokidar',          // Uses CommonJS require
    'glob',              // Keep external
    'web-tree-sitter'    // WASM module
  ]
});

console.log('Build complete!');
