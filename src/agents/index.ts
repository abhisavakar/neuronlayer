/**
 * Agent Orchestration Layer - Main Entry Point
 * 
 * Exports all agents and types for the orchestration layer
 */

// Types
export * from "./types/index.js";

// Infrastructure
export { PipelineStateManager } from "./pipeline-state.js";

// Agents
export { ModeratorAgent } from "./moderator/index.js";
export { WhyAgent } from "./why/index.js";
export { ResearchAgent } from "./research/index.js";

// Prompts
export { PromptTemplates, generateSystemPrompt } from "./prompts.js";

// Test Framework
export {
  MockMemoryLayerEngine,
  AgentTestAssertions,
  AgentTestRunner,
  PerformanceTracker,
  WhyAgentTestScenarios,
  ResearchAgentTestScenarios
} from "./test-framework.js";
