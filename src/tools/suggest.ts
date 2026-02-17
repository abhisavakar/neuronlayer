/**
 * Suggest Tool - MemoryLayer Reusable Components
 * 
 * Uses suggest_existing to find reusable code components
 */

import { z } from 'zod';
import type { ToolDefinition } from './types.js';

const parameters = z.object({
  intent: z.string().describe('What you want to do (e.g., "user authentication")'),
  limit: z.number().optional().default(5).describe('Max suggestions')
});

export const suggestTool: ToolDefinition<typeof parameters> = {
  name: 'suggest',
  description: 'Find reusable code components using MemoryLayer',
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
          output: 'Suggestions require MemoryLayer'
        };
      }
      
      const suggestions = await memoryLayer.suggestExisting(args.intent);
      
      const formatted = suggestions.slice(0, args.limit).map((s: any) => ({
        name: s.name,
        path: s.path,
        description: s.description,
        reusability: s.similarity_score > 0.8 ? 'high' : 'medium',
        similarity: Math.round((s.similarity_score || 0) * 100)
      }));
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        result: formatted,
        output: `Found ${formatted.length} reusable components for "${args.intent}"`,
        duration
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Suggestion failed',
        output: `Error finding reusable code for "${args.intent}"`
      };
    }
  }
};

export default suggestTool;
