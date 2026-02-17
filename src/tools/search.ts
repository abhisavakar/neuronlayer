/**
 * Search Tool - MemoryLayer Semantic Search
 * 
 * Uses MemoryLayer's semantic search with embeddings
 * Much smarter than grep - finds conceptually related code
 */

import { z } from 'zod';
import type { ToolDefinition } from './types.js';

const parameters = z.object({
  query: z.string().describe('Search query (natural language or keywords)'),
  limit: z.number().optional().default(10).describe('Max results'),
  includeContent: z.boolean().optional().default(false).describe('Include file content in results'),
  threshold: z.number().optional().default(0.5).describe('Minimum relevance score (0-1)')
});

export const searchTool: ToolDefinition<typeof parameters> = {
  name: 'search',
  description: 'Semantic code search using MemoryLayer embeddings',
  parameters,
  requiresPermission: false,
  useMemoryLayer: true,
  
  execute: async (args, memoryLayer) => {
    try {
      const startTime = Date.now();
      
      if (!memoryLayer) {
        return {
          success: false,
          error: 'MemoryLayer not available',
          output: 'Search requires MemoryLayer'
        };
      }
      
      // Use MemoryLayer's semantic search
      const results = await memoryLayer.searchCodebase(args.query, args.limit);
      
      // Filter by threshold
      const filtered = results.filter((r: any) => 
        (r.similarity_score || 0) >= args.threshold
      );
      
      // Format results
      const formatted = filtered.map((r: any) => ({
        path: r.path,
        relevance: Math.round((r.similarity_score || 0) * 100),
        summary: r.summary || 'No summary available',
        content: args.includeContent ? r.content : undefined
      }));
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        result: formatted,
        output: `Found ${formatted.length} relevant files for "${args.query}"`,
        duration
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
        output: `Error searching for "${args.query}"`
      };
    }
  }
};

export default searchTool;
