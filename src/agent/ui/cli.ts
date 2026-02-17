// CLI interface for memcode agent - Clean UI inspired by Claude Code + OpenCode

import * as readline from 'readline';

// ═══════════════════════════════════════════════════════════════════════════
// ANSI COLORS
// ═══════════════════════════════════════════════════════════════════════════

export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',

  // Colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bright
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',

  // Background
  bgGray: '\x1b[48;5;236m',
  bgBlue: '\x1b[44m',
};

// ═══════════════════════════════════════════════════════════════════════════
// READLINE
// ═══════════════════════════════════════════════════════════════════════════

export function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });
}

export async function* readlineGenerator(rl: readline.Interface): AsyncGenerator<string, void, unknown> {
  while (true) {
    const line = await new Promise<string | null>((resolve) => {
      // Nice input box
      process.stdout.write(`\n${c.dim}╭─────────────────────────────────────────────────────────────╮${c.reset}\n`);
      process.stdout.write(`${c.dim}│${c.reset} ${c.brightCyan}▶${c.reset} `);

      rl.once('line', (answer) => {
        // Close the box
        process.stdout.write(`${c.dim}╰─────────────────────────────────────────────────────────────╯${c.reset}\n`);
        resolve(answer);
      });
      rl.once('close', () => resolve(null));
    });

    if (line === null) break;
    yield line;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

export function write(text: string): void {
  process.stdout.write(text);
}

export function writeLine(text: string): void {
  console.log(text);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL FORMATTING
// ═══════════════════════════════════════════════════════════════════════════

export function formatToolCall(name: string, args: Record<string, unknown>): string {
  const argsStr = Object.entries(args)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => {
      const val = typeof v === 'string' ? v : JSON.stringify(v);
      return `${c.gray}${k}=${c.reset}${c.yellow}"${val.slice(0, 40)}${val.length > 40 ? '...' : ''}"${c.reset}`;
    })
    .join(' ');

  return `${c.dim}┌─${c.reset} ${c.brightBlue}${name}${c.reset} ${argsStr}`;
}

export function formatToolResult(name: string, result: unknown, isError: boolean): string {
  const icon = isError ? `${c.red}✗${c.reset}` : `${c.green}✓${c.reset}`;
  const preview = typeof result === 'string'
    ? result.slice(0, 80)
    : JSON.stringify(result).slice(0, 80);

  return `${c.dim}└─${c.reset} ${icon} ${c.gray}${preview.replace(/\n/g, ' ')}${preview.length >= 80 ? '...' : ''}${c.reset}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKDOWN
// ═══════════════════════════════════════════════════════════════════════════

export function formatMarkdown(text: string): string {
  let result = text;

  // Code blocks first (protect from other replacements)
  result = result.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const header = lang ? `${c.dim}─── ${lang} ───${c.reset}\n` : '';
    return `\n${header}${c.bgGray}${code.trimEnd()}${c.reset}\n`;
  });

  // Inline code (protect from other replacements)
  result = result.replace(/`([^`]+)`/g, `${c.bgGray}${c.yellow}$1${c.reset}`);

  // Headers (process before other line-based rules)
  result = result.replace(/^### (.+)$/gm, `\n${c.cyan}$1${c.reset}`);
  result = result.replace(/^## (.+)$/gm, `\n${c.bold}${c.brightCyan}$1${c.reset}`);
  result = result.replace(/^# (.+)$/gm, `\n${c.bold}${c.brightYellow}$1${c.reset}\n`);

  // Bold (must be before italic) - handle **text** including spaces
  result = result.replace(/\*\*(.+?)\*\*/g, `${c.bold}$1${c.reset}`);

  // Italic - handle *text* but not bullet points
  result = result.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, `${c.italic}$1${c.reset}`);

  // Bullet points (- at start of line)
  result = result.replace(/^- (.+)$/gm, `  ${c.cyan}•${c.reset} $1`);

  // Numbered lists
  result = result.replace(/^(\d+)\. (.+)$/gm, `  ${c.cyan}$1.${c.reset} $2`);

  // Blockquotes
  result = result.replace(/^> (.+)$/gm, `${c.dim}│${c.reset} ${c.italic}$1${c.reset}`);

  // Horizontal rule
  result = result.replace(/^---$/gm, `${c.dim}────────────────────────────────────────${c.reset}`);

  // Links [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `${c.brightBlue}$1${c.reset}`);

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// SPINNER
// ═══════════════════════════════════════════════════════════════════════════

export class Spinner {
  private frames = ['◐', '◓', '◑', '◒'];
  private interval: NodeJS.Timeout | null = null;
  private frameIndex = 0;
  private message: string;

  constructor(message: string = 'Thinking') {
    this.message = message;
  }

  start(): void {
    if (this.interval) return;
    process.stdout.write('\x1b[?25l'); // Hide cursor

    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stdout.write(`\r${c.cyan}${frame}${c.reset} ${c.dim}${this.message}...${c.reset}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 100);
  }

  update(message: string): void {
    this.message = message;
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    process.stdout.write('\r\x1b[K'); // Clear line
    process.stdout.write('\x1b[?25h'); // Show cursor

    if (finalMessage) {
      process.stdout.write(finalMessage + '\n');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BANNER & STATUS
// ═══════════════════════════════════════════════════════════════════════════

export function printBanner(): void {
  console.log(`
${c.cyan}┌─────────────────────────────────────────────────────────┐${c.reset}
${c.cyan}│${c.reset}  ${c.bold}${c.brightCyan}memcode${c.reset} ${c.dim}— AI coding assistant powered by MemoryLayer${c.reset}  ${c.cyan}│${c.reset}
${c.cyan}└─────────────────────────────────────────────────────────┘${c.reset}
`);
}

export function printStatus(project: string, model: string, tools: number): void {
  const projectName = project.split(/[/\\]/).pop() || project;
  console.log(`${c.dim}┌──────────────────────────────────────────────────────────────┐${c.reset}`);
  console.log(`${c.dim}│${c.reset} ${c.cyan}⬡${c.reset} ${c.bold}${projectName}${c.reset}  ${c.dim}│${c.reset}  ${c.magenta}◈${c.reset} ${model}  ${c.dim}│${c.reset}  ${c.yellow}⚡${c.reset} ${tools} tools`);
  console.log(`${c.dim}└──────────────────────────────────────────────────────────────┘${c.reset}`);
  console.log(`\n${c.dim}Type your message or ${c.reset}/help${c.dim} for commands${c.reset}`);
}

export function printCost(tokens: number, tools: number, cost: number): void {
  console.log(`\n${c.dim}────────────────────────────────────────${c.reset}`);
  console.log(`${c.gray}${tokens.toLocaleString()} tokens${c.reset} ${c.dim}│${c.reset} ${c.gray}${tools} tools${c.reset} ${c.dim}│${c.reset} ${c.green}$${cost.toFixed(4)}${c.reset}`);
}

export function printError(message: string): void {
  console.log(`\n${c.red}✗ Error:${c.reset} ${message}`);
}

export function printSuccess(message: string): void {
  console.log(`${c.green}✓${c.reset} ${message}`);
}

export function printInfo(message: string): void {
  console.log(`${c.blue}ℹ${c.reset} ${message}`);
}

export function printWarning(message: string): void {
  console.log(`${c.yellow}⚠${c.reset} ${message}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELP
// ═══════════════════════════════════════════════════════════════════════════

export function printHelp(): void {
  console.log(`
${c.bold}${c.brightCyan}memcode${c.reset} ${c.dim}— Commands${c.reset}

  ${c.cyan}/help${c.reset}      Show this help
  ${c.cyan}/model${c.reset}     Show or change model
  ${c.cyan}/context${c.reset}   Show current context
  ${c.cyan}/cost${c.reset}      Show session costs
  ${c.cyan}/clear${c.reset}     Clear conversation
  ${c.cyan}/exit${c.reset}      Exit memcode

${c.dim}────────────────────────────────────────${c.reset}

${c.bold}Tips${c.reset}
  ${c.dim}•${c.reset} Ask about your codebase naturally
  ${c.dim}•${c.reset} memcode uses MemoryLayer for context
  ${c.dim}•${c.reset} 62 tools available for code intelligence
`);
}

// Legacy exports for compatibility
export const colors = c;
export function colorize(text: string, color: keyof typeof c): string {
  return `${c[color]}${text}${c.reset}`;
}
