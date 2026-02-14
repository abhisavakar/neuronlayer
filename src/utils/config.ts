import { homedir } from 'os';
import { join, resolve, basename } from 'path';
import { createHash } from 'crypto';
import type { MemoryLayerConfig } from '../types/index.js';

export function getDefaultConfig(projectPath: string): MemoryLayerConfig {
  const normalizedPath = resolve(projectPath);
  const projectHash = createHash('md5').update(normalizedPath).digest('hex').slice(0, 12);
  const projectName = basename(normalizedPath);

  return {
    projectPath: normalizedPath,
    dataDir: join(homedir(), '.memorylayer', 'projects', `${projectName}-${projectHash}`),
    maxTokens: 6000,
    embeddingModel: 'Xenova/all-MiniLM-L6-v2', // Fallback model, faster and smaller
    watchIgnore: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.min.css',
      '**/*.map',
      '**/package-lock.json',
      '**/yarn.lock',
      '**/pnpm-lock.yaml',
      '**/.env*',
      '**/*.log'
    ]
  };
}

export function parseArgs(args: string[]): { projectPath: string } {
  let projectPath = process.cwd();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    if (arg === '--project' && nextArg) {
      projectPath = nextArg;
      break;
    }
  }

  return { projectPath: resolve(projectPath) };
}
