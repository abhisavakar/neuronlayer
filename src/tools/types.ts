/**
 * Tool System - Full MemoryLayer Integration
 * 
 * All tools leverage MemoryLayer's 51 MCP tools and 18-agent orchestration
 * This is the USER INTERFACE layer - tools trigger MemoryLayer intelligence
 */

import type { z } from 'zod';

export interface ToolContext {
  // MemoryLayer Engine (51 MCP tools)
  memoryLayer: any;
  
  // Agent Orchestrator (18 agents)
  orchestrator: any;
  
  // Current session/pipeline state
  sessionId?: string;
  pipelineId?: string;
  
  // Permission system
  requestPermission: (req: any) => Promise<boolean>;
}

export interface ToolDefinition<Params extends z.ZodType, Result = any> {
  name: string;
  description: string;
  parameters: Params;
  requiresPermission: boolean;
  permissionType?: string;
  
  // Execute with full MemoryLayer context
  execute: (
    args: z.infer<Params>, 
    context: ToolContext
  ) => Promise<ToolResult<Result>>;
}

export interface ToolResult<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  output: string;  // Human-readable output
  toolCalls?: string[];  // Which MemoryLayer tools were used
  agentCalls?: string[]; // Which agents were invoked
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  status: 'pending' | 'running' | 'success' | 'error';
  output?: string;
  error?: string;
  duration?: number;
  timestamp: Date;
  
  // Track what MemoryLayer did
  memoryLayerCalls?: string[];
  agentsInvoked?: string[];
}

// Tool Categories:

// 1. FILE TOOLS - Use MemoryLayer's semantic understanding
export type FileTool = 
  | 'read'      // Read with context assembly
  | 'write'     // Write with pattern validation
  | 'edit'      // Edit with change tracking
  | 'delete';   // Delete with impact analysis

// 2. SEARCH TOOLS - Use MemoryLayer's embeddings
export type SearchTool = 
  | 'search'    // Semantic search (embeddings)
  | 'suggest'   // Find reusable components
  | 'context'   // Smart context assembly
  | 'decisions' // Query architectural decisions
  | 'patterns'; // Find established patterns

// 3. AGENT TOOLS - Trigger 18-agent orchestration
export type AgentTool = 
  | 'build'     // Trigger full build pipeline
  | 'research'  // Trigger research phase
  | 'plan'      // Trigger planning phase
  | 'test';     // Trigger test execution

// 4. SYSTEM TOOLS - Basic operations
export type SystemTool = 
  | 'bash'      // Run shell commands
  | 'ask'       // Ask user for input
  | 'todo'      // Manage todos
  | 'webfetch'  // Fetch URLs
  | 'websearch';// Search web

export type ToolName = FileTool | SearchTool | AgentTool | SystemTool;
