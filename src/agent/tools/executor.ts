// Tool executor for memcode agent

import type { ToolCall, ToolResult, ToolDefinition } from '../llm/types.js';
import type { MemoryLayerEngine } from '../../core/engine.js';
import { handleToolCall, toolDefinitions } from '../../server/tools.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join, isAbsolute, resolve } from 'path';
import { createFileDiff, formatDiff, formatSearchReplaceDiff, formatUnifiedDiff, type FileDiff } from '../ui/diff.js';

export interface ExecutorConfig {
  projectPath: string;
  allowShell?: boolean;
  allowFileWrite?: boolean;
  timeout?: number;
  showDiffs?: boolean;
  diffContextLines?: number;
  diffMaxLines?: number;
}

export class ToolExecutor {
  private engine: MemoryLayerEngine;
  private config: ExecutorConfig;
  private builtinTools: Map<string, ToolDefinition>;

  constructor(engine: MemoryLayerEngine, config: ExecutorConfig) {
    this.engine = engine;
    this.config = {
      allowShell: true,
      allowFileWrite: true,
      timeout: 30000,
      showDiffs: true,
      diffContextLines: 3,
      diffMaxLines: 50,
      ...config
    };
    this.builtinTools = this.createBuiltinTools();
  }

  private createBuiltinTools(): Map<string, ToolDefinition> {
    const tools = new Map<string, ToolDefinition>();

    // File operations
    tools.set('read_file', {
      name: 'read_file',
      description: 'Read the contents of a file. Returns the full file content.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file (relative to project root or absolute)'
          }
        },
        required: ['path']
      }
    });

    tools.set('write_file', {
      name: 'write_file',
      description: 'Write content to a file. Creates directories if needed. Overwrites existing content.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file (relative to project root or absolute)'
          },
          content: {
            type: 'string',
            description: 'Content to write to the file'
          }
        },
        required: ['path', 'content']
      }
    });

    tools.set('edit_file', {
      name: 'edit_file',
      description: 'Edit a file by replacing a search string with a replacement string. Use for surgical edits.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file'
          },
          search: {
            type: 'string',
            description: 'The exact text to find and replace'
          },
          replace: {
            type: 'string',
            description: 'The text to replace it with'
          }
        },
        required: ['path', 'search', 'replace']
      }
    });

    tools.set('list_files', {
      name: 'list_files',
      description: 'List files in a directory. Returns file names with type indicators.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path (relative to project root or absolute)'
          },
          recursive: {
            type: 'boolean',
            description: 'Whether to list files recursively (default: false)'
          }
        },
        required: ['path']
      }
    });

    tools.set('delete_file', {
      name: 'delete_file',
      description: 'Delete a file. Use with caution.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to delete'
          }
        },
        required: ['path']
      }
    });

    // Shell operations
    tools.set('run_command', {
      name: 'run_command',
      description: 'Run a shell command in the project directory. Returns stdout and stderr.',
      inputSchema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to run'
          },
          cwd: {
            type: 'string',
            description: 'Working directory (optional, defaults to project root)'
          }
        },
        required: ['command']
      }
    });

    tools.set('run_tests', {
      name: 'run_tests',
      description: 'Run tests in the project. Automatically detects test framework.',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Test file pattern or specific test to run (optional)'
          },
          watch: {
            type: 'boolean',
            description: 'Run in watch mode (default: false)'
          }
        }
      }
    });

    // Git operations
    tools.set('git_status', {
      name: 'git_status',
      description: 'Get git status showing staged, unstaged, and untracked files.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    });

    tools.set('git_diff', {
      name: 'git_diff',
      description: 'Get git diff for files. Can show staged or unstaged changes.',
      inputSchema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            description: 'Specific file to diff (optional, defaults to all)'
          },
          staged: {
            type: 'boolean',
            description: 'Show staged changes (default: false, shows unstaged)'
          }
        }
      }
    });

    tools.set('git_commit', {
      name: 'git_commit',
      description: 'Create a git commit with the specified message. Stages all changes first.',
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Commit message'
          },
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific files to commit (optional, defaults to all changed files)'
          }
        },
        required: ['message']
      }
    });

    tools.set('git_log', {
      name: 'git_log',
      description: 'Get recent git commits.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of commits to show (default: 10)'
          },
          file: {
            type: 'string',
            description: 'Show commits for specific file (optional)'
          }
        }
      }
    });

    return tools;
  }

  getAllTools(): ToolDefinition[] {
    // Combine MemoryLayer tools with builtin tools
    return [...toolDefinitions, ...Array.from(this.builtinTools.values())];
  }

  getToolCount(): number {
    return toolDefinitions.length + this.builtinTools.size;
  }

  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const { id, name, arguments: args } = toolCall;

    try {
      let result: unknown;

      // Check if it's a builtin tool
      if (this.builtinTools.has(name)) {
        result = await this.executeBuiltin(name, args);
      } else {
        // Delegate to MemoryLayer engine
        result = await handleToolCall(this.engine, name, args);
      }

      return {
        toolCallId: id,
        name,
        result,
        isError: false
      };
    } catch (error) {
      return {
        toolCallId: id,
        name,
        result: {
          error: error instanceof Error ? error.message : String(error)
        },
        isError: true
      };
    }
  }

  async executeAll(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    // Execute in parallel for better performance
    return Promise.all(toolCalls.map(tc => this.execute(tc)));
  }

  private resolvePath(path: string): string {
    if (isAbsolute(path)) {
      return path;
    }
    return resolve(this.config.projectPath, path);
  }

  private async executeBuiltin(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'read_file': {
        const filePath = this.resolvePath(args.path as string);
        if (!existsSync(filePath)) {
          throw new Error(`File not found: ${args.path}`);
        }
        const content = readFileSync(filePath, 'utf-8');
        return {
          path: args.path,
          content,
          lines: content.split('\n').length
        };
      }

      case 'write_file': {
        if (!this.config.allowFileWrite) {
          throw new Error('File writing is disabled');
        }
        const filePath = this.resolvePath(args.path as string);
        const dir = dirname(filePath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        // Get old content for diff
        const oldContent = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : null;
        const newContent = args.content as string;

        // Generate diff
        let diffInfo: { diff?: FileDiff; diffFormatted?: string } = {};
        if (this.config.showDiffs) {
          const diff = createFileDiff(args.path as string, oldContent, newContent);
          diffInfo = {
            diff,
            diffFormatted: formatDiff(diff, {
              contextLines: this.config.diffContextLines,
              maxLines: this.config.diffMaxLines
            })
          };
        }

        writeFileSync(filePath, newContent);

        // Track the edit in MemoryLayer
        this.engine.trackFileEdited(args.path as string, `File created/updated`, []);

        return {
          path: args.path,
          success: true,
          message: `File written successfully`,
          operation: oldContent === null ? 'created' : 'modified',
          stats: diffInfo.diff?.stats,
          ...diffInfo
        };
      }

      case 'edit_file': {
        if (!this.config.allowFileWrite) {
          throw new Error('File writing is disabled');
        }
        const filePath = this.resolvePath(args.path as string);
        if (!existsSync(filePath)) {
          throw new Error(`File not found: ${args.path}`);
        }

        const content = readFileSync(filePath, 'utf-8');
        const search = args.search as string;
        const replace = args.replace as string;

        if (!content.includes(search)) {
          throw new Error(`Search string not found in file`);
        }

        const newContent = content.replace(search, replace);

        // Generate diff
        let diffInfo: { diff?: FileDiff; diffFormatted?: string; searchReplacePreview?: string } = {};
        if (this.config.showDiffs) {
          const diff = createFileDiff(args.path as string, content, newContent);
          diffInfo = {
            diff,
            diffFormatted: formatDiff(diff, {
              contextLines: this.config.diffContextLines,
              maxLines: this.config.diffMaxLines
            }),
            searchReplacePreview: formatSearchReplaceDiff(args.path as string, content, search, replace)
          };
        }

        writeFileSync(filePath, newContent);

        // Track the edit
        this.engine.trackFileEdited(args.path as string, `Replaced: "${search.slice(0, 50)}..."`, []);

        return {
          path: args.path,
          success: true,
          message: `File edited successfully`,
          stats: diffInfo.diff?.stats,
          ...diffInfo
        };
      }

      case 'list_files': {
        const dirPath = this.resolvePath(args.path as string || '.');
        const recursive = args.recursive as boolean || false;

        // Cross-platform file listing using Node.js
        const { readdirSync, statSync } = await import('fs');

        const listDir = (dir: string, depth: number = 0): string[] => {
          const results: string[] = [];
          try {
            const entries = readdirSync(dir);
            for (const entry of entries) {
              if (entry === 'node_modules' || entry === '.git') continue;
              const fullPath = join(dir, entry);
              try {
                const stat = statSync(fullPath);
                const prefix = stat.isDirectory() ? 'd' : '-';
                results.push(`${prefix} ${entry}`);
                if (recursive && stat.isDirectory() && depth < 5 && results.length < 100) {
                  const subFiles = listDir(fullPath, depth + 1);
                  results.push(...subFiles.map(f => `  ${f}`));
                }
              } catch { /* skip inaccessible */ }
              if (results.length >= 100) break;
            }
          } catch { /* skip inaccessible dirs */ }
          return results;
        };

        return { files: listDir(dirPath) };
      }

      case 'delete_file': {
        if (!this.config.allowFileWrite) {
          throw new Error('File deletion is disabled');
        }
        const filePath = this.resolvePath(args.path as string);
        if (!existsSync(filePath)) {
          throw new Error(`File not found: ${args.path}`);
        }
        unlinkSync(filePath);
        return {
          path: args.path,
          success: true,
          message: 'File deleted'
        };
      }

      case 'run_command': {
        if (!this.config.allowShell) {
          throw new Error('Shell commands are disabled');
        }
        const cwd = args.cwd
          ? this.resolvePath(args.cwd as string)
          : this.config.projectPath;

        try {
          const stdout = execSync(args.command as string, {
            cwd,
            timeout: this.config.timeout,
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024 // 10MB
          });
          return {
            success: true,
            stdout: stdout.slice(0, 50000), // Limit output
            stderr: ''
          };
        } catch (error: unknown) {
          const execError = error as { stdout?: string; stderr?: string; status?: number };
          return {
            success: false,
            stdout: execError.stdout?.slice(0, 50000) || '',
            stderr: execError.stderr?.slice(0, 10000) || String(error),
            exitCode: execError.status
          };
        }
      }

      case 'run_tests': {
        const framework = this.engine.getTestFramework();
        let cmd: string;

        const pattern = args.pattern as string | undefined;
        const watch = args.watch as boolean || false;

        switch (framework) {
          case 'vitest':
            cmd = `npx vitest run${pattern ? ` ${pattern}` : ''}${watch ? ' --watch' : ''}`;
            break;
          case 'jest':
            cmd = `npx jest${pattern ? ` ${pattern}` : ''}${watch ? ' --watch' : ''}`;
            break;
          case 'mocha':
            cmd = `npx mocha${pattern ? ` ${pattern}` : ''}${watch ? ' --watch' : ''}`;
            break;
          default:
            cmd = 'npm test';
        }

        try {
          const stdout = execSync(cmd, {
            cwd: this.config.projectPath,
            timeout: 120000, // 2 minutes for tests
            encoding: 'utf-8'
          });
          return {
            success: true,
            framework,
            output: stdout.slice(0, 50000)
          };
        } catch (error: unknown) {
          const execError = error as { stdout?: string; stderr?: string };
          return {
            success: false,
            framework,
            output: execError.stdout?.slice(0, 50000) || '',
            error: execError.stderr?.slice(0, 10000) || String(error)
          };
        }
      }

      case 'git_status': {
        try {
          const status = execSync('git status --porcelain', {
            cwd: this.config.projectPath,
            encoding: 'utf-8'
          });

          const lines = status.trim().split('\n').filter(l => l);
          const staged: string[] = [];
          const unstaged: string[] = [];
          const untracked: string[] = [];

          for (const line of lines) {
            const index = line[0];
            const worktree = line[1];
            const file = line.slice(3);

            if (index === '?') {
              untracked.push(file);
            } else if (index !== ' ') {
              staged.push(`${index} ${file}`);
            }
            if (worktree !== ' ' && worktree !== '?') {
              unstaged.push(`${worktree} ${file}`);
            }
          }

          // Get branch info
          const branch = execSync('git branch --show-current', {
            cwd: this.config.projectPath,
            encoding: 'utf-8'
          }).trim();

          return {
            branch,
            staged,
            unstaged,
            untracked,
            clean: lines.length === 0
          };
        } catch (error) {
          throw new Error(`Not a git repository or git error: ${error}`);
        }
      }

      case 'git_diff': {
        const file = args.file as string | undefined;
        const staged = args.staged as boolean || false;

        const cmd = `git diff${staged ? ' --staged' : ''}${file ? ` -- ${file}` : ''}`;

        const diff = execSync(cmd, {
          cwd: this.config.projectPath,
          encoding: 'utf-8'
        });

        // Format diff with colors if enabled
        const diffFormatted = this.config.showDiffs
          ? formatUnifiedDiff(diff, { maxLines: this.config.diffMaxLines })
          : undefined;

        return {
          diff: diff.slice(0, 50000),
          diffFormatted,
          staged,
          file: file || 'all'
        };
      }

      case 'git_commit': {
        const message = args.message as string;
        const files = args.files as string[] | undefined;

        // Stage files
        if (files && files.length > 0) {
          execSync(`git add ${files.join(' ')}`, {
            cwd: this.config.projectPath
          });
        } else {
          execSync('git add -A', {
            cwd: this.config.projectPath
          });
        }

        // Commit
        const result = execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
          cwd: this.config.projectPath,
          encoding: 'utf-8'
        });

        // Get the commit hash
        const hash = execSync('git rev-parse HEAD', {
          cwd: this.config.projectPath,
          encoding: 'utf-8'
        }).trim();

        return {
          success: true,
          message,
          hash: hash.slice(0, 7),
          output: result
        };
      }

      case 'git_log': {
        const limit = args.limit as number || 10;
        const file = args.file as string | undefined;

        const cmd = `git log -${limit} --oneline${file ? ` -- ${file}` : ''}`;

        const log = execSync(cmd, {
          cwd: this.config.projectPath,
          encoding: 'utf-8'
        });

        const commits = log.trim().split('\n').map(line => {
          const [hash, ...messageParts] = line.split(' ');
          return { hash, message: messageParts.join(' ') };
        });

        return { commits };
      }

      default:
        throw new Error(`Unknown builtin tool: ${name}`);
    }
  }
}
