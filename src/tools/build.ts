/**
 * Build Tool - Triggers Full 18-Agent Orchestration
 * 
 * This is the MAIN tool - it triggers the entire agent pipeline:
 * Why → Research → Plan → Architect → Security → Build → Test → Review
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from './types.js';

const parameters = z.object({
  feature: z.string().describe('What to build (e.g., "Add user authentication")'),
  mode: z.enum(['full', 'quick']).optional().default('full')
    .describe('full: all 18 agents, quick: skip some phases'),
  model: z.string().optional().default('claude-3.5-sonnet')
    .describe('Which LLM model to use')
});

export const buildTool: ToolDefinition<typeof parameters> = {
  name: 'build',
  description: 'Build a feature using the full 18-agent orchestration pipeline',
  parameters,
  requiresPermission: true,
  permissionType: 'build',
  
  execute: async (args, context: ToolContext) => {
    const toolCalls: string[] = [];
    const agentCalls: string[] = [];
    
    try {
      // 1. Request permission first (this is a big operation)
      const permitted = await context.requestPermission({
        type: 'build',
        pattern: args.feature,
        description: `Build feature: ${args.feature}`,
        metadata: { mode: args.mode, model: args.model }
      });
      
      if (!permitted) {
        return {
          success: false,
          error: 'Permission denied',
          output: 'User rejected the build operation',
          toolCalls,
          agentCalls
        };
      }
      
      // 2. Start the orchestration
      if (!context.orchestrator) {
        return {
          success: false,
          error: 'Orchestrator not available',
          output: 'Agent orchestration system not initialized',
          toolCalls,
          agentCalls
        };
      }
      
      agentCalls.push('orchestrator.start');
      
      // 3. Trigger the full pipeline
      const pipeline = await context.orchestrator.processUserRequest(
        args.feature,
        { mode: args.mode, model: args.model }
      );
      
      // 4. Return the pipeline ID so user can track progress
      return {
        success: true,
        result: {
          pipelineId: pipeline.state.feature_id,
          status: pipeline.state.status,
          phases: [
            'impulse',      // Why Agent
            'research',     // Research Agent  
            'planning',     // Planner Agent
            'mental_model', // Architect + Security + Estimator
            'building',     // Decomposer + Tester + Builder
            'reviewing',    // Review Agent
            'reflecting'    // Retrospective Agent
          ]
        },
        output: `Started building "${args.feature}"\nPipeline ID: ${pipeline.state.feature_id}\n\nThis will run through all 18 agents. Use /status ${pipeline.state.feature_id} to track progress.`,
        toolCalls,
        agentCalls: [
          'WhyAgent',
          'ResearchAgent', 
          'PlannerAgent',
          'ArchitectAgent',
          'SecurityAgent',
          'EstimatorAgent',
          'DecomposerAgent',
          'TesterAgent',
          'BuilderAgent',
          'ReviewAgent',
          'RetrospectiveAgent'
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Build failed',
        output: `Error starting build: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolCalls,
        agentCalls
      };
    }
  }
};

export default buildTool;
