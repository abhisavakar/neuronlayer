// CLI interface for memcode agent

import * as readline from 'readline';

export interface CLIOptions {
  prompt?: string;
}

export function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });
}

export async function* readlineGenerator(rl: readline.Interface): AsyncGenerator<string, void, unknown> {
  const prompt = '> ';

  while (true) {
    const line = await new Promise<string | null>((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });

      // Handle Ctrl+C and Ctrl+D
      rl.once('close', () => resolve(null));
    });

    if (line === null) {
      // EOF or closed
      break;
    }

    yield line;
  }
}

export function write(text: string): void {
  process.stdout.write(text);
}

export function writeLine(text: string): void {
  console.log(text);
}

export function formatToolCall(name: string, args: Record<string, unknown>): string {
  const argsStr = Object.entries(args)
    .map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 50)}`)
    .join(', ');
  return `🔧 ${name}(${argsStr})`;
}

export function formatToolResult(name: string, result: unknown, isError: boolean): string {
  const status = isError ? '❌' : '✅';
  const preview = typeof result === 'string'
    ? result.slice(0, 100)
    : JSON.stringify(result).slice(0, 100);
  return `${status} ${name}: ${preview}${preview.length >= 100 ? '...' : ''}`;
}

export function formatMarkdown(text: string): string {
  // Basic markdown formatting for terminal
  return text
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '\x1b[1m$1\x1b[0m')
    // Italic
    .replace(/\*([^*]+)\*/g, '\x1b[3m$1\x1b[0m')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
      return '\x1b[48;5;236m\n' + code + '\x1b[0m';
    })
    // Inline code
    .replace(/`([^`]+)`/g, '\x1b[48;5;236m$1\x1b[0m')
    // Headers
    .replace(/^### (.+)$/gm, '\x1b[1;36m$1\x1b[0m')
    .replace(/^## (.+)$/gm, '\x1b[1;35m$1\x1b[0m')
    .replace(/^# (.+)$/gm, '\x1b[1;33m$1\x1b[0m')
    // Bullet points
    .replace(/^- /gm, '• ')
    .replace(/^\* /gm, '• ');
}

export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private interval: NodeJS.Timeout | null = null;
  private frameIndex = 0;
  private message: string;

  constructor(message: string = 'Thinking...') {
    this.message = message;
  }

  start(): void {
    if (this.interval) return;

    process.stdout.write('\x1b[?25l'); // Hide cursor

    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stdout.write(`\r${frame} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
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

// Terminal colors
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright foreground
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

export function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

export function printBanner(): void {
  const banner = `
${colors.cyan}╔══════════════════════════════════════════════════════════╗
║                                                              ║
║   ${colors.brightCyan}███╗   ███╗███████╗███╗   ███╗ ██████╗ ██████╗ ███████╗${colors.cyan}   ║
║   ${colors.brightCyan}████╗ ████║██╔════╝████╗ ████║██╔════╝██╔═══██╗██╔══██║${colors.cyan}   ║
║   ${colors.brightCyan}██╔████╔██║█████╗  ██╔████╔██║██║     ██║   ██║██║  ██║${colors.cyan}   ║
║   ${colors.brightCyan}██║╚██╔╝██║██╔══╝  ██║╚██╔╝██║██║     ██║   ██║██║  ██║${colors.cyan}   ║
║   ${colors.brightCyan}██║ ╚═╝ ██║███████╗██║ ╚═╝ ██║╚██████╗╚██████╔╝██████╔╝${colors.cyan}   ║
║   ${colors.brightCyan}╚═╝     ╚═╝╚══════╝╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ${colors.cyan}   ║
║                                                              ║
║   ${colors.white}AI Coding Assistant powered by MemoryLayer${colors.cyan}               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
`;
  console.log(banner);
}
