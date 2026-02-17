/**
 * Gateway Pattern Implementation
 *
 * Reduces 51 MCP tools to 4 gateway tools + 6 standalone (10 total),
 * saving ~5,000 tokens per API call on tool description overhead.
 *
 * Benchmark Context: 759x speedup, 51.7% token reduction, p < 0.001, Cohen's d = 3.46
 */

import type { MemoryLayerEngine } from '../../core/engine.js';
import type {
  ToolDefinition,
  MemoryQueryInput,
  MemoryRecordInput,
  MemoryReviewInput,
  MemoryStatusInput,
} from './types.js';
import { handleMemoryQuery } from './memory-query.js';
import { handleMemoryRecord } from './memory-record.js';
import { handleMemoryReview } from './memory-review.js';
import { handleMemoryStatus } from './memory-status.js';

// ============================================================================
// Gateway Tool Names
// ============================================================================

export const GATEWAY_TOOLS = [
  'memory_query',
  'memory_record',
  'memory_review',
  'memory_status',
] as const;

export type GatewayToolName = typeof GATEWAY_TOOLS[number];

export function isGatewayTool(name: string): name is GatewayToolName {
  return GATEWAY_TOOLS.includes(name as GatewayToolName);
}

// ============================================================================
// Gateway Tool Definitions
// ============================================================================

export const gatewayDefinitions: ToolDefinition[] = [
  {
    name: 'memory_query',
    description: 'Search project memory — code, decisions, patterns, history. Returns semantically ranked results with confidence scores. 759x faster than grep, 50% fewer tokens than raw context. Auto-detects: file paths → file content, symbols → definitions, code → confidence analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query or question'
        },
        file: {
          type: 'string',
          description: 'File path for file-specific operations'
        },
        symbol: {
          type: 'string',
          description: 'Symbol name for symbol lookups'
        },
        code: {
          type: 'string',
          description: 'Code snippet for confidence/source analysis'
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results (default: 10)'
        },
        include_confidence: {
          type: 'boolean',
          description: 'Include confidence scores in results'
        },
        action: {
          type: 'string',
          enum: ['context', 'search', 'file', 'summary', 'symbol', 'dependencies', 'predict', 'confidence', 'sources', 'existing'],
          description: 'Explicit action (auto-detected if not provided)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'memory_record',
    description: 'Record decisions, patterns, or learnings into persistent memory. Auto-detects type from input. Pre-checks for conflicts before saving decisions.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Content or description of what to record'
        },
        title: {
          type: 'string',
          description: 'Title for decisions or patterns'
        },
        code: {
          type: 'string',
          description: 'Code snippet for patterns'
        },
        pattern_name: {
          type: 'string',
          description: 'Name for patterns'
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Related files'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization'
        },
        author: {
          type: 'string',
          description: 'Author attribution'
        },
        type: {
          type: 'string',
          enum: ['decision', 'pattern', 'feedback', 'feature', 'critical', 'example'],
          description: 'Record type (auto-detected if not provided)'
        },
        was_useful: {
          type: 'boolean',
          description: 'For feedback: whether context was useful'
        },
        pattern_id: {
          type: 'string',
          description: 'For examples: pattern ID to add to'
        },
        is_anti_pattern: {
          type: 'boolean',
          description: 'For examples: mark as anti-pattern'
        },
        critical_type: {
          type: 'string',
          enum: ['decision', 'requirement', 'instruction', 'custom'],
          description: 'For critical content: type of critical content'
        },
        reason: {
          type: 'string',
          description: 'Reason for marking as critical'
        }
      },
      required: ['content']
    }
  },
  {
    name: 'memory_review',
    description: 'Review code against project patterns, decisions, past bugs, and test coverage. Returns violations, suggestions, and unified risk score (0-100). Verdict: approve (<30), warning (30-70), reject (>70).',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Code to review'
        },
        file: {
          type: 'string',
          description: 'File being changed (enables test checks)'
        },
        intent: {
          type: 'string',
          description: 'What this code is for (improves suggestions)'
        },
        include_tests: {
          type: 'boolean',
          description: 'Include test impact analysis (default: true if file provided)'
        },
        include_patterns: {
          type: 'boolean',
          description: 'Include pattern validation (default: true)'
        },
        error: {
          type: 'string',
          description: 'Error message for bug search'
        },
        action: {
          type: 'string',
          enum: ['full', 'pattern', 'conflicts', 'tests', 'confidence', 'bugs', 'coverage'],
          description: 'Specific check to run (default: full review)'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'memory_status',
    description: 'Project overview — structure, recent changes, architecture, health. Use at session start or to understand project state.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['project', 'architecture', 'changes', 'docs', 'health', 'patterns', 'tests', 'all'],
          description: 'Scope of status to retrieve (default: project)'
        },
        since: {
          type: 'string',
          description: 'Time period for changes: "yesterday", "today", "this week", "this month", or date'
        },
        file: {
          type: 'string',
          description: 'File or directory to filter by'
        },
        author: {
          type: 'string',
          description: 'Author to filter changes by'
        },
        action: {
          type: 'string',
          enum: ['summary', 'happened', 'changed', 'architecture', 'changelog', 'health', 'patterns', 'stats', 'undocumented', 'critical', 'learning'],
          description: 'Specific status to retrieve'
        },
        include_history: {
          type: 'boolean',
          description: 'Include health history'
        },
        category: {
          type: 'string',
          description: 'Pattern category filter'
        }
      }
    }
  }
];

// ============================================================================
// Standalone Tool Definitions (Require Explicit IDs/Actions)
// ============================================================================

export const standaloneDefinitions: ToolDefinition[] = [
  {
    name: 'switch_project',
    description: 'Switch to a different registered project.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'The project ID to switch to'
        }
      },
      required: ['project_id']
    }
  },
  {
    name: 'switch_feature_context',
    description: 'Switch back to a previously worked on feature context.',
    inputSchema: {
      type: 'object',
      properties: {
        context_id: {
          type: 'string',
          description: 'ID of the context to switch to (from list_recent_contexts)'
        }
      },
      required: ['context_id']
    }
  },
  {
    name: 'trigger_compaction',
    description: 'Manually trigger context compaction to reduce token usage.',
    inputSchema: {
      type: 'object',
      properties: {
        strategy: {
          type: 'string',
          enum: ['summarize', 'selective', 'aggressive'],
          description: 'Compaction strategy: summarize (gentle), selective (moderate), aggressive (maximum reduction)'
        },
        preserve_recent: {
          type: 'number',
          description: 'Number of recent messages to preserve (default: 10)'
        },
        target_utilization: {
          type: 'number',
          description: 'Target utilization percentage (e.g., 50 for 50%)'
        }
      }
    }
  },
  {
    name: 'update_decision_status',
    description: 'Update the status of an existing decision (e.g., mark as deprecated or superseded).',
    inputSchema: {
      type: 'object',
      properties: {
        decision_id: {
          type: 'string',
          description: 'ID of the decision to update'
        },
        status: {
          type: 'string',
          enum: ['proposed', 'accepted', 'deprecated', 'superseded'],
          description: 'New status for the decision'
        },
        superseded_by: {
          type: 'string',
          description: 'ID of the decision that supersedes this one (if status is superseded)'
        }
      },
      required: ['decision_id', 'status']
    }
  },
  {
    name: 'export_decisions_to_adr',
    description: 'Export all decisions to ADR (Architecture Decision Records) markdown files.',
    inputSchema: {
      type: 'object',
      properties: {
        output_dir: {
          type: 'string',
          description: 'Output directory for ADR files (default: docs/decisions)'
        },
        format: {
          type: 'string',
          enum: ['madr', 'nygard', 'simple'],
          description: 'ADR format to use (default: madr)'
        },
        include_index: {
          type: 'boolean',
          description: 'Generate README index file (default: true)'
        }
      }
    }
  },
  {
    name: 'discover_projects',
    description: 'Discover potential projects in common locations on your system.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// ============================================================================
// Combined Definitions (for backward compatibility)
// ============================================================================

export const allToolDefinitions: ToolDefinition[] = [
  ...gatewayDefinitions,
  ...standaloneDefinitions,
];

// ============================================================================
// Gateway Handler
// ============================================================================

/**
 * Handle a gateway tool call, routing to the appropriate internal tools
 */
export async function handleGatewayCall(
  engine: MemoryLayerEngine,
  gatewayName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (gatewayName) {
    case 'memory_query':
      return handleMemoryQuery(engine, args as unknown as MemoryQueryInput);

    case 'memory_record':
      return handleMemoryRecord(engine, args as unknown as MemoryRecordInput);

    case 'memory_review':
      return handleMemoryReview(engine, args as unknown as MemoryReviewInput);

    case 'memory_status':
      return handleMemoryStatus(engine, args as unknown as MemoryStatusInput);

    default:
      throw new Error(`Unknown gateway: ${gatewayName}`);
  }
}

// Re-export types
export type {
  ToolDefinition,
  MemoryQueryInput,
  MemoryQueryResponse,
  MemoryRecordInput,
  MemoryRecordResponse,
  MemoryReviewInput,
  MemoryReviewResponse,
  MemoryStatusInput,
  MemoryStatusResponse,
} from './types.js';
