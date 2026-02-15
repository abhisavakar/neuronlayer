/**
 * OpenCode CLI Integration
 * 
 * Integrates with OpenCode CLI to run kimi K2.5 model
 * for real AI-assisted testing.
 */

import { spawn, execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface OpenCodeConfig {
  model?: string;
  timeoutMs?: number;
  workingDir?: string;
}

export interface OpenCodeResult {
  success: boolean;
  response?: string;
  error?: string;
  latencyMs: number;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
}

export interface QueryWithContext {
  query: string;
  context?: string;
  sources?: string[];
}

export class OpenCodeClient {
  private config: OpenCodeConfig;
  private sessionDir: string;

  constructor(config: OpenCodeConfig = {}) {
    this.config = {
      model: 'kimi-k2.5',
      timeoutMs: 120000,
      ...config
    };
    
    // Create temporary session directory
    this.sessionDir = join(tmpdir(), `opencode-benchmark-${Date.now()}`);
    mkdirSync(this.sessionDir, { recursive: true });
  }

  /**
   * Check if OpenCode is installed
   */
  isInstalled(): boolean {
    try {
      execSync('opencode --version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Query WITHOUT MemoryLayer (baseline)
   * Uses standard file search and sends everything to AI
   */
  async queryWithoutMCP(query: string, projectPath: string): Promise<OpenCodeResult> {
    const startTime = performance.now();
    
    try {
      // Search for relevant files using grep
      const searchTerms = this.extractSearchTerms(query);
      const files = await this.grepSearch(searchTerms, projectPath);
      
      // Read file contents
      let context = '';
      let totalTokens = 0;
      
      for (const file of files.slice(0, 5)) {
        const content = await this.readFile(file, projectPath);
        context += `\n\n// File: ${file}\n${content}`;
        totalTokens += Math.ceil(content.length / 4);
      }

      // Build prompt
      const prompt = this.buildPrompt(query, context);
      
      // Call OpenCode
      const result = await this.callOpenCode(prompt);
      
      const latencyMs = performance.now() - startTime;
      
      return {
        success: true,
        response: result,
        latencyMs,
        tokensUsed: {
          input: totalTokens,
          output: Math.ceil(result.length / 4),
          total: totalTokens + Math.ceil(result.length / 4)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: performance.now() - startTime
      };
    }
  }

  /**
   * Query WITH MemoryLayer (treatment)
   * Uses MemoryLayer context and sends to AI
   */
  async queryWithMCP(
    query: string, 
    contextResult: any,
    projectPath: string
  ): Promise<OpenCodeResult> {
    const startTime = performance.now();
    
    try {
      // Use MemoryLayer-provided context
      let context = '';
      let totalTokens = 0;
      
      if (contextResult?.content) {
        context = contextResult.content;
        totalTokens = contextResult.tokenCount || Math.ceil(context.length / 4);
      } else if (contextResult?.result?.context) {
        context = contextResult.result.context;
        totalTokens = contextResult.result.token_count || Math.ceil(context.length / 4);
      }

      // Build prompt with MemoryLayer context
      const prompt = this.buildPrompt(query, context);
      
      // Call OpenCode
      const result = await this.callOpenCode(prompt);
      
      const latencyMs = performance.now() - startTime;
      
      return {
        success: true,
        response: result,
        latencyMs,
        tokensUsed: {
          input: totalTokens,
          output: Math.ceil(result.length / 4),
          total: totalTokens + Math.ceil(result.length / 4)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: performance.now() - startTime
      };
    }
  }

  /**
   * Extract search terms from query
   */
  private extractSearchTerms(query: string): string[] {
    const stopWords = [
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'shall',
      'find', 'show', 'me', 'what', 'where', 'how', 'when', 'why',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
      'we', 'they', 'them', 'their', 'there', 'then', 'than'
    ];

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 3);
  }

  /**
   * Search files using grep
   */
  private async grepSearch(terms: string[], projectPath: string): Promise<string[]> {
    const files: string[] = [];
    
    for (const term of terms) {
      try {
        const result = execSync(
          `grep -r -l "${term}" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" . 2>/dev/null | head -20`,
          {
            cwd: projectPath,
            encoding: 'utf-8',
            timeout: 30000
          }
        );
        
        const found = result.split('\n').filter(f => f.trim());
        files.push(...found);
      } catch {
        // Grep returns exit code 1 when no matches
      }
    }
    
    return [...new Set(files)].slice(0, 10);
  }

  /**
   * Read file content
   */
  private async readFile(filePath: string, projectPath: string): Promise<string> {
    try {
      const fullPath = join(projectPath, filePath);
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, 'utf-8');
        // Limit to first 5000 chars to avoid huge context
        return content.slice(0, 5000);
      }
    } catch {
      // Ignore read errors
    }
    return '';
  }

  /**
   * Build prompt for AI
   */
  private buildPrompt(query: string, context: string): string {
    return `You are a helpful coding assistant. Answer the following question based on the provided codebase context.

Question: ${query}

Codebase Context:
${context || '(No context available)'}

Please provide a clear, concise answer. If the context doesn't contain the answer, say so.`;
  }

  /**
   * Call OpenCode CLI
   */
  private async callOpenCode(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Write prompt to temp file
      const promptFile = join(this.sessionDir, `prompt-${Date.now()}.txt`);
      writeFileSync(promptFile, prompt);

      // Spawn OpenCode process
      const proc = spawn('opencode', [
        'run',
        '--model', this.config.model!,
        '--no-context', // Don't use OpenCode's own context
        prompt
      ], {
        cwd: this.sessionDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Timeout handling
      const timeout = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error('OpenCode timeout'));
      }, this.config.timeoutMs);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`OpenCode exited with code ${code}: ${errorOutput}`));
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Send prompt
      proc.stdin?.write(prompt);
      proc.stdin?.end();
    });
  }

  /**
   * Alternative: Direct API call if OpenCode CLI is not available
   * This would require API key configuration
   */
  async queryViaAPI(query: string, context: string): Promise<OpenCodeResult> {
    // This is a placeholder for direct API integration
    // You would need to implement based on OpenCode's API
    throw new Error('API mode not yet implemented. Please use CLI mode.');
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    try {
      // Clean up temp files
      if (existsSync(this.sessionDir)) {
        rmSync(this.sessionDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Check OpenCode availability and version
 */
export function checkOpenCode(): { installed: boolean; version?: string; error?: string } {
  try {
    const output = execSync('opencode --version', { encoding: 'utf-8' });
    return {
      installed: true,
      version: output.trim()
    };
  } catch (error) {
    return {
      installed: false,
      error: error instanceof Error ? error.message : 'OpenCode not found'
    };
  }
}

/**
 * Get setup instructions
 */
export function getOpenCodeSetupInstructions(): string {
  return `
OpenCode CLI is required but not found.

Installation:
  npm install -g @opencode/cli

Or download from:
  https://opencode.ai

After installation, configure your API keys:
  opencode config set api.key YOUR_API_KEY

Verify installation:
  opencode --version
`;
}
