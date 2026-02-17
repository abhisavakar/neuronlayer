/**
 * Tool Registry - All Tools with MemoryLayer Integration
 * 
 * This registry connects the UI tools to MemoryLayer's intelligence:
 * - 51 MCP tools for code understanding
 * - 18 agents for orchestration
 * - Persistent memory for learning
 */

import { readTool } from './read.js';
import { searchTool } from './search.js';
import { suggestTool } from './suggest.js';
import { buildTool } from './build.js';
import type { ToolDefinition, ToolContext, ToolName } from './types.js';

// Registry of all available tools
export const tools: Record<ToolName, ToolDefinition<any, any>> = {
  // File operations with MemoryLayer intelligence
  read: readTool,
  
  // Search with MemoryLayer embeddings (NOT basic grep!)
  search: searchTool,
  
  // Find reusable components
  suggest: suggestTool,
  
  // Trigger full 18-agent build pipeline
  build: buildTool,
  
  // Placeholders for tools to be implemented:
  write: null as any,
  edit: null as any,
  delete: null as any,
  context: null as any,
  decisions: null as any,
  patterns: null as any,
  research: null as any,
  plan: null as any,
  test: null as any,
  bash: null as any,
  ask: null as any,
  todo: null as any,
  webfetch: null as any,
  websearch: null as any
};

// Tool categories for UI organization
export const toolCategories = {
  file: ['read', 'write', 'edit', 'delete'] as ToolName[],
  search: ['search', 'suggest', 'context', 'decisions', 'patterns'] as ToolName[],
  agent: ['build', 'research', 'plan', 'test'] as ToolName[],
  system: ['bash', 'ask', 'todo', 'webfetch', 'websearch'] as ToolName[]
};

// Get tool by name
export function getTool(name: ToolName): ToolDefinition<any, any> | undefined {
  return tools[name];
}

// List all tools with metadata
export function listTools(): Array<{
  name: ToolName;
  description: string;
  requiresPermission: boolean;
  category: string;
}> {
  return Object.entries(tools)
    .filter(([_, tool]) => tool !== null)
    .map(([name, tool]) => {
      const category = Object.entries(toolCategories)
        .find(([_, tools]) => tools.includes(name as ToolName))?.[0] || 'other';
      
      return {
        name: name as ToolName,
        description: tool.description,
        requiresPermission: tool.requiresPermission,
        category
      };
    });
}

// Execute tool with full MemoryLayer context
export async function executeTool(
  name: ToolName,
  args: any,
  context: ToolContext
): Promise<{
  success: boolean;
  result?: any;
  error?: string;
  output: string;
  duration: number;
}> {
  const tool = getTool(name);
  
  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${name}`,
      output: `Error: Tool "${name}" not found`,
      duration: 0
    };
  }
  
  const startTime = Date.now();
  
  try {
    const result = await tool.execute(args, context);
    
    return {
      success: result.success,
      result: result.result,
      error: result.error,
      output: result.output,
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
      output: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime
    };
  }
}

export default tools;
