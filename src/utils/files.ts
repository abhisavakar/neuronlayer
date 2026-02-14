import { createHash } from 'crypto';
import { extname } from 'path';

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.cs': 'csharp',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',
  '.php': 'php',
  '.swift': 'swift',
  '.m': 'objectivec',
  '.mm': 'objectivec',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.astro': 'astro',
  '.md': 'markdown',
  '.mdx': 'mdx',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.xml': 'xml',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.sql': 'sql',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'zsh',
  '.fish': 'fish',
  '.ps1': 'powershell',
  '.dockerfile': 'dockerfile',
  '.prisma': 'prisma',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.proto': 'protobuf',
  '.tf': 'terraform',
  '.lua': 'lua',
  '.r': 'r',
  '.R': 'r',
  '.jl': 'julia',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.erl': 'erlang',
  '.hrl': 'erlang',
  '.clj': 'clojure',
  '.cljs': 'clojure',
  '.cljc': 'clojure',
  '.hs': 'haskell',
  '.ml': 'ocaml',
  '.mli': 'ocaml',
  '.fs': 'fsharp',
  '.fsi': 'fsharp',
  '.fsx': 'fsharp',
  '.dart': 'dart',
  '.nim': 'nim',
  '.zig': 'zig',
  '.v': 'v',
  '.odin': 'odin',
};

const CODE_EXTENSIONS = new Set(Object.keys(LANGUAGE_MAP));

export function detectLanguage(filePath: string): string {
  const ext = extname(filePath).toLowerCase();

  // Handle special filenames
  const filename = filePath.split(/[/\\]/).pop()?.toLowerCase() || '';
  if (filename === 'dockerfile') return 'dockerfile';
  if (filename === 'makefile') return 'makefile';
  if (filename === 'cmakelists.txt') return 'cmake';

  return LANGUAGE_MAP[ext] || 'plaintext';
}

export function isCodeFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  const filename = filePath.split(/[/\\]/).pop()?.toLowerCase() || '';

  return CODE_EXTENSIONS.has(ext) ||
    filename === 'dockerfile' ||
    filename === 'makefile';
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function getPreview(content: string, maxLength: number = 1000): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.slice(0, maxLength) + '\n... [truncated]';
}

export function countLines(content: string): number {
  if (!content) return 0;
  return content.split('\n').length;
}
