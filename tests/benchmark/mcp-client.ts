/**
 * Real MemoryLayer MCP Client
 * 
 * Actually starts MemoryLayer server and makes real tool calls
 * for authentic benchmarking.
 */

import { spawn, ChildProcess } from 'child_process';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export interface MCPConfig {
  projectPath: string;
  dataDir?: string;
  timeoutMs?: number;
}

export interface ToolCallResult {
  success: boolean;
  result?: any;
  error?: string;
  latencyMs: number;
  tokensUsed?: number;
}

export interface MemoryLayerContext {
  context: string;
  sources: string[];
  tokenCount: number;
  decisions: any[];
}

export class RealMCPClient {
  private config: MCPConfig;
  private process?: ChildProcess;
  private messageQueue: Array<{
    id: string;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  private messageId = 0;
  private ready = false;
  private readyPromise: Promise<void>;
  private readyResolve?: () => void;

  constructor(config: MCPConfig) {
    this.config = {
      timeoutMs: 30000,
      ...config
    };
    
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
  }

  /**
   * Start MemoryLayer MCP server
   */
  async start(): Promise<void> {
    console.log(`Starting MemoryLayer MCP for: ${this.config.projectPath}`);

    // Ensure data directory exists
    const dataDir = this.config.dataDir || join(this.config.projectPath, '.memorylayer');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // Find MemoryLayer executable
    const memoryLayerPath = this.findMemoryLayer();
    
    // Start MCP server
    this.process = spawn('node', [
      memoryLayerPath,
      '--project', this.config.projectPath,
      '--data-dir', dataDir
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: this.config.projectPath
    });

    // Handle stderr for logging
    this.process.stderr?.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('initialized') || msg.includes('ready')) {
        this.ready = true;
        this.readyResolve?.();
      }
      // Log initialization progress
      if (msg.includes('Indexing') || msg.includes('complete')) {
        process.stdout.write(`  ${msg}`);
      }
    });

    // Handle stdout for JSON-RPC responses
    this.process.stdout?.on('data', (data) => {
      this.handleResponse(data.toString());
    });

    // Handle process exit
    this.process.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`MemoryLayer exited with code ${code}`);
      }
    });

    // Wait for initialization
    await this.waitForReady();
    console.log('✓ MemoryLayer MCP ready\n');
  }

  /**
   * Find MemoryLayer executable
   */
  private findMemoryLayer(): string {
    // Check common locations
    const locations = [
      resolve(process.cwd(), 'dist/index.js'),
      resolve(process.cwd(), 'dist/index.mjs'),
      resolve(__dirname, '../../dist/index.js'),
      resolve(__dirname, '../../dist/index.mjs'),
      '/usr/local/bin/memorylayer',
      '/usr/bin/memorylayer'
    ];

    for (const location of locations) {
      if (existsSync(location)) {
        return location;
      }
    }

    throw new Error('MemoryLayer executable not found. Run "npm run build" first.');
  }

  /**
   * Wait for MemoryLayer to be ready
   */
  private async waitForReady(): Promise<void> {
    // Wait for ready signal or timeout
    await Promise.race([
      this.readyPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MemoryLayer startup timeout')), 60000)
      )
    ]);

    // Give extra time for indexing
    await this.sleep(2000);
  }

  /**
   * Call a MemoryLayer tool
   */
  async callTool(toolName: string, args: any): Promise<ToolCallResult> {
    const startTime = performance.now();
    
    try {
      const result = await this.sendRequest({
        jsonrpc: '2.0',
        id: ++this.messageId,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      });

      const latencyMs = performance.now() - startTime;

      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Tool call failed',
          latencyMs
        };
      }

      return {
        success: true,
        result: result.result,
        latencyMs,
        tokensUsed: this.estimateTokens(result.result)
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
   * Get context using MemoryLayer
   */
  async getContext(query: string, currentFile?: string): Promise<ToolCallResult> {
    return this.callTool('get_context', {
      query,
      current_file: currentFile,
      max_tokens: 6000
    });
  }

  /**
   * Search codebase using MemoryLayer
   */
  async searchCodebase(query: string, limit: number = 10): Promise<ToolCallResult> {
    return this.callTool('search_codebase', {
      query,
      limit
    });
  }

  /**
   * Get file context using MemoryLayer
   */
  async getFileContext(path: string): Promise<ToolCallResult> {
    return this.callTool('get_file_context', { path });
  }

  /**
   * Get project summary using MemoryLayer
   */
  async getProjectSummary(): Promise<ToolCallResult> {
    return this.callTool('get_project_summary', {});
  }

  /**
   * Send JSON-RPC request
   */
  private sendRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = request.id;
      
      // Set timeout
      const timeout = setTimeout(() => {
        this.removeMessage(id);
        reject(new Error(`Request timeout: ${request.method}`));
      }, this.config.timeoutMs);

      // Queue message
      this.messageQueue.push({ id: id.toString(), resolve, reject, timeout });

      // Send to process
      const message = JSON.stringify(request) + '\n';
      this.process?.stdin?.write(message);
    });
  }

  /**
   * Handle JSON-RPC response
   */
  private handleResponse(data: string): void {
    try {
      // Handle multiple JSON objects (newline-delimited)
      const lines = data.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const response = JSON.parse(line);
        
        if (response.id) {
          const pending = this.removeMessage(response.id.toString());
          if (pending) {
            clearTimeout(pending.timeout);
            pending.resolve(response);
          }
        }
      }
    } catch {
      // Ignore parse errors (might be partial data)
    }
  }

  /**
   * Remove message from queue
   */
  private removeMessage(id: string) {
    const index = this.messageQueue.findIndex(m => m.id === id);
    if (index !== -1) {
      const pending = this.messageQueue[index];
      this.messageQueue.splice(index, 1);
      return pending;
    }
    return null;
  }

  /**
   * Estimate tokens from result
   */
  private estimateTokens(result: any): number {
    const text = JSON.stringify(result);
    return Math.ceil(text.length / 4); // Rough estimate: 1 token ≈ 4 chars
  }

  /**
   * Stop MemoryLayer
   */
  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!this.process.killed) {
        this.process.kill('SIGKILL');
      }
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create client
 */
export async function createMCPClient(projectPath: string): Promise<RealMCPClient> {
  const client = new RealMCPClient({ projectPath });
  await client.start();
  return client;
}
