/**
 * Read Tool - Full MemoryLayer Integration
 * 
 * Uses MemoryLayer's get_context for intelligent file reading
 * Not just basic file read - includes semantic context
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from './types.js';

const parameters = z.object({
  filePath: z.string().describe('Path to file to read'),
  withContext: z.boolean().optional().default(true).describe('Include MemoryLayer smart context'),
  maxTokens: z.number().optional().default(4000).describe('Max tokens for context assembly'),
  offset: z.number().optional().describe('Line number to start from (1-indexed)'),
  limit: z.number().optional().describe('Number of lines to read')
});

export const readTool: ToolDefinition<typeof parameters> = {
  name: 'read',
  description: 'Read file with MemoryLayer intelligent context assembly',
  parameters,
  requiresPermission: false,
  
  execute: async (args, context: ToolContext) => {
    const startTime = Date.now();
    const toolCalls: string[] = [];
    
    try {
      // 1. Use MemoryLayer's get_context for smart assembly
      let content = '';
      let relatedFiles: string[] = [];
      
      if (args.withContext && context.memoryLayer) {
        toolCalls.push('get_context');
        
        const contextResult = await context.memoryLayer.getContext(
          `Reading and understanding ${args.filePath}`,
          args.filePath,
          args.maxTokens
        );
        
        content = contextResult.content || '';
        relatedFiles = contextResult.relatedFiles || [];
        
        // Apply offset/limit if specified
        if (args.offset || args.limit) {
          const lines = content.split('\n');
          const start = (args.offset || 1) - 1; // Convert to 0-indexed
          const end = args.limit ? start + args.limit : lines.length;
          content = lines.slice(start, end).join('\n');
        }
      } else {
        // Fallback to basic read (shouldn't happen in practice)
        const fs = await import('fs');
        content = fs.readFileSync(args.filePath, 'utf-8');
        
        if (args.offset || args.limit) {
          const lines = content.split('\n');
          const start = (args.offset || 1) - 1;
          const end = args.limit ? start + args.limit : lines.length;
          content = lines.slice(start, end).join('\n');
        }
      }
      
      // 2. Use MemoryLayer to check for patterns
      let patterns: string[] = [];
      if (context.memoryLayer) {
        toolCalls.push('check_patterns');
        const patternResult = await context.memoryLayer.checkPatternCompliance(
          args.filePath,
          content
        );
        patterns = patternResult.patterns || [];
      }
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        result: {
          content,
          filePath: args.filePath,
          relatedFiles,
          patterns,
          totalLines: content.split('\n').length
        },
        output: `Read ${args.filePath}${relatedFiles.length > 0 ? ` with ${relatedFiles.length} related files` : ''}`,
        toolCalls,
        duration
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read file',
        output: `Error reading ${args.filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolCalls
      };
    }
  }
};

export default readTool;
