import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
