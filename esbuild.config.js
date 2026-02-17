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
    'web-tree-sitter',   // WASM module
    'react-devtools-core', // Ink devtools
    'signal-exit',       // Bundled incorrectly
    'assert',            // Node builtins
    'buffer',
    'util',
    'stream',
    'events',
    'os'
  ]
};

// Build main MCP server
await build({
  ...commonOptions,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
});

// Build memcode agent
await build({
  ...commonOptions,
  entryPoints: ['src/agent/index.ts'],
  outfile: 'dist/agent.js',
  banner: {
    js: '#!/usr/bin/env node'
  }
});

// Build Terminal TUI
await build({
  ...commonOptions,
  entryPoints: ['src/tui-terminal/cli.tsx'],
  outfile: 'dist/tui.js',
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  banner: {
    js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`
  }
});

console.log('Build complete! (memorylayer + memcode + tui)');
