import type { MemoryLayerEngine } from '../core/engine.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: 'get_context',
    description: 'Get relevant codebase context for a query. Use this to understand code, find related files, and get architectural decisions.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'What you are trying to understand or do'
        },
        current_file: {
          type: 'string',
          description: 'Path to the file currently being discussed (optional)'
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum tokens to return (default: 6000)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'search_codebase',
    description: 'Search the codebase semantically. Returns files and code snippets matching the query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 10)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'record_decision',
    description: 'Record an architectural or design decision. Use this to save important decisions about the codebase.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Short title for the decision'
        },
        description: {
          type: 'string',
          description: 'Why this decision was made, context, tradeoffs'
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Related files (optional)'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags like "architecture", "database", "security" (optional)'
        }
      },
      required: ['title', 'description']
    }
  },
  {
    name: 'get_file_context',
    description: 'Get the content and metadata of a specific file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the file'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'get_project_summary',
    description: 'Get a summary of the project structure, languages, and recent decisions.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_symbol',
    description: 'Find a function, class, interface, or type by name. Returns the symbol definition and location.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the symbol to find (function, class, interface, or type)'
        },
        kind: {
          type: 'string',
          enum: ['function', 'class', 'interface', 'type', 'method', 'enum'],
          description: 'Type of symbol to find (optional, searches all if not specified)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 10)'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'get_dependencies',
    description: 'Get the dependencies of a file - what it imports and what imports it.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the file'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'get_file_summary',
    description: 'Get a compressed summary of a file (10x smaller than full content). Use this for quick overview without reading full file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the file'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'get_predicted_files',
    description: 'Get files predicted to be relevant based on current context and query. Useful for proactive exploration.',
    inputSchema: {
      type: 'object',
      properties: {
        current_file: {
          type: 'string',
          description: 'Path to the current file being discussed'
        },
        query: {
          type: 'string',
          description: 'What you are trying to understand or do'
        }
      },
      required: ['current_file', 'query']
    }
  },
  {
    name: 'get_learning_stats',
    description: 'Get usage statistics and learning metrics for the project.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'mark_context_useful',
    description: 'Provide feedback on whether the retrieved context was useful. Helps improve future retrieval.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The query that was made'
        },
        was_useful: {
          type: 'boolean',
          description: 'Whether the context was useful'
        }
      },
      required: ['query', 'was_useful']
    }
  },
  // Phase 4: Multi-project tools
  {
    name: 'list_projects',
    description: 'List all registered projects across your system.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
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
    name: 'search_all_projects',
    description: 'Search across all registered projects for code or files.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        limit: {
          type: 'number',
          description: 'Maximum results per project (default: 5)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'record_decision_with_author',
    description: 'Record an architectural decision with author attribution and status.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Short title for the decision'
        },
        description: {
          type: 'string',
          description: 'Why this decision was made, context, tradeoffs'
        },
        author: {
          type: 'string',
          description: 'Author of the decision'
        },
        status: {
          type: 'string',
          enum: ['proposed', 'accepted', 'deprecated', 'superseded'],
          description: 'Status of the decision (default: accepted)'
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Related files (optional)'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags (optional)'
        }
      },
      required: ['title', 'description', 'author']
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
  },
  // Phase 5: Active Feature Context tools
  {
    name: 'get_active_context',
    description: 'Get the current feature context including files being worked on, recent changes, and recent questions. Use this to understand what the user is currently working on.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'set_feature_context',
    description: 'Start tracking a new feature. Tell MemoryLayer what you are working on for better context.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the feature (e.g., "payment integration", "auth refactor")'
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Initial files to track (optional)'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'list_recent_contexts',
    description: 'List recently worked on features/contexts that can be switched back to.',
    inputSchema: {
      type: 'object',
      properties: {}
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
  // Phase 6: Living Documentation tools
  {
    name: 'generate_docs',
    description: 'Generate documentation for a file or the entire architecture.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to document (omit for architecture overview)'
        },
        type: {
          type: 'string',
          enum: ['component', 'architecture'],
          description: 'Type of documentation to generate'
        }
      }
    }
  },
  {
    name: 'get_architecture',
    description: 'Get project architecture overview with layers, data flow, and ASCII diagram.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_component_doc',
    description: 'Get detailed documentation for a component/file including public interface, dependencies, and change history.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the file'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'get_changelog',
    description: 'Get changelog of recent changes grouped by day.',
    inputSchema: {
      type: 'object',
      properties: {
        since: {
          type: 'string',
          description: 'Time period: "yesterday", "today", "this week", "this month", or a date'
        },
        group_by: {
          type: 'string',
          enum: ['day', 'week'],
          description: 'How to group changes (default: day)'
        },
        include_decisions: {
          type: 'boolean',
          description: 'Include decisions made during this period (default: false)'
        }
      }
    }
  },
  {
    name: 'validate_docs',
    description: 'Check for outdated documentation and calculate documentation score.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'what_happened',
    description: 'Query recent project activity - commits, file changes, and decisions.',
    inputSchema: {
      type: 'object',
      properties: {
        since: {
          type: 'string',
          description: 'Time period: "yesterday", "today", "this week", "this month", or a date'
        },
        scope: {
          type: 'string',
          description: 'Limit to a specific directory or file path (optional)'
        }
      },
      required: ['since']
    }
  },
  {
    name: 'find_undocumented',
    description: 'Find code that lacks documentation - exported functions, classes, and interfaces without docstrings.',
    inputSchema: {
      type: 'object',
      properties: {
        importance: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'all'],
          description: 'Filter by importance level (default: all)'
        },
        type: {
          type: 'string',
          enum: ['file', 'function', 'class', 'interface', 'all'],
          description: 'Filter by symbol type (default: all)'
        }
      }
    }
  },
  // Phase 7: Context Rot Prevention tools
  {
    name: 'get_context_health',
    description: 'Check current context health, detect drift, and get compaction suggestions.',
    inputSchema: {
      type: 'object',
      properties: {
        include_history: {
          type: 'boolean',
          description: 'Include health history (default: false)'
        }
      }
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
    name: 'mark_critical',
    description: 'Mark content as critical - it will never be compressed or removed.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The critical content to preserve'
        },
        type: {
          type: 'string',
          enum: ['decision', 'requirement', 'instruction', 'custom'],
          description: 'Type of critical content'
        },
        reason: {
          type: 'string',
          description: 'Why this is critical (optional)'
        }
      },
      required: ['content']
    }
  },
  {
    name: 'get_critical_context',
    description: 'Get all marked critical context items.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['decision', 'requirement', 'instruction', 'custom'],
          description: 'Filter by type (optional)'
        }
      }
    }
  },
  // Phase 8: Confidence Scoring tools
  {
    name: 'get_confidence',
    description: 'Get confidence score for a code suggestion. Shows how confident the AI should be based on codebase matches, decision alignment, and pattern matching.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The code to evaluate confidence for'
        },
        context: {
          type: 'string',
          description: 'What this code is for (optional context)'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'list_sources',
    description: 'List all sources used for a code suggestion - codebase matches, related decisions, and matched patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The code to find sources for'
        },
        context: {
          type: 'string',
          description: 'What this code is for (optional)'
        },
        include_snippets: {
          type: 'boolean',
          description: 'Include code snippets from matches (default: false)'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'check_conflicts',
    description: 'Check if code conflicts with past architectural decisions.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The code to check for conflicts'
        }
      },
      required: ['code']
    }
  },
  // Phase 9: Change Intelligence tools
  {
    name: 'what_changed',
    description: 'Query what changed in the codebase. Returns file changes, authors, and line counts.',
    inputSchema: {
      type: 'object',
      properties: {
        since: {
          type: 'string',
          description: 'Time period: "yesterday", "today", "this week", "last week", or a date'
        },
        file: {
          type: 'string',
          description: 'Filter to specific file or folder (optional)'
        },
        author: {
          type: 'string',
          description: 'Filter by author name (optional)'
        }
      },
      required: ['since']
    }
  },
  {
    name: 'why_broke',
    description: 'Diagnose why something broke. Correlates errors with recent changes and finds similar past bugs.',
    inputSchema: {
      type: 'object',
      properties: {
        error: {
          type: 'string',
          description: 'The error message or symptom'
        },
        file: {
          type: 'string',
          description: 'File where error occurs (optional)'
        },
        line: {
          type: 'number',
          description: 'Line number (optional)'
        }
      },
      required: ['error']
    }
  },
  {
    name: 'find_similar_bugs',
    description: 'Find similar bugs from history with their fixes.',
    inputSchema: {
      type: 'object',
      properties: {
        error: {
          type: 'string',
          description: 'Error message to search for'
        },
        limit: {
          type: 'number',
          description: 'Max results (default 5)'
        }
      },
      required: ['error']
    }
  },
  {
    name: 'suggest_fix',
    description: 'Get fix suggestions for an error based on history and patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        error: {
          type: 'string',
          description: 'Error to fix'
        },
        context: {
          type: 'string',
          description: 'Additional context (e.g., "database query", "API call")'
        }
      },
      required: ['error']
    }
  }
];

export async function handleToolCall(
  engine: MemoryLayerEngine,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'get_context': {
      const query = args.query as string;
      const currentFile = args.current_file as string | undefined;
      const maxTokens = args.max_tokens as number | undefined;

      const result = await engine.getContext(query, currentFile, maxTokens);

      return {
        context: result.context,
        sources: result.sources,
        token_count: result.tokenCount,
        decisions: result.decisions.map(d => ({
          id: d.id,
          title: d.title,
          description: d.description,
          created_at: d.createdAt.toISOString()
        }))
      };
    }

    case 'search_codebase': {
      const query = args.query as string;
      const limit = (args.limit as number) || 10;

      const results = await engine.searchCodebase(query, limit);

      return {
        results: results.map(r => ({
          file: r.file,
          preview: r.preview,
          relevance: r.similarity,
          line_start: r.lineStart,
          line_end: r.lineEnd
        }))
      };
    }

    case 'record_decision': {
      const title = args.title as string;
      const description = args.description as string;
      const files = args.files as string[] | undefined;
      const tags = args.tags as string[] | undefined;

      const decision = await engine.recordDecision(title, description, files, tags);

      return {
        id: decision.id,
        title: decision.title,
        description: decision.description,
        files: decision.files,
        tags: decision.tags,
        created_at: decision.createdAt.toISOString(),
        message: 'Decision recorded successfully'
      };
    }

    case 'get_file_context': {
      const path = args.path as string;

      const result = await engine.getFileContext(path);

      if (!result) {
        return {
          error: `File not found: ${path}`
        };
      }

      return {
        path,
        content: result.content,
        language: result.language,
        lines: result.lines
      };
    }

    case 'get_project_summary': {
      const summary = engine.getProjectSummary();

      return {
        name: summary.name,
        description: summary.description,
        languages: summary.languages,
        total_files: summary.totalFiles,
        total_lines: summary.totalLines,
        key_directories: summary.keyDirectories,
        recent_decisions: summary.recentDecisions.map(d => ({
          id: d.id,
          title: d.title,
          description: d.description,
          created_at: d.createdAt.toISOString()
        })),
        dependencies: summary.dependencies,
        architecture_notes: summary.architectureNotes
      };
    }

    case 'get_symbol': {
      const name = args.name as string;
      const kind = args.kind as string | undefined;
      const limit = (args.limit as number) || 10;

      const results = await engine.searchSymbols(name, kind, limit);

      if (results.length === 0) {
        return {
          message: `No symbols found matching "${name}"`,
          results: []
        };
      }

      return {
        results: results.map(s => ({
          name: s.name,
          kind: s.kind,
          file: s.filePath,
          line_start: s.lineStart,
          line_end: s.lineEnd,
          signature: s.signature || null,
          exported: s.exported
        }))
      };
    }

    case 'get_dependencies': {
      const path = args.path as string;

      const result = engine.getFileDependencies(path);

      return {
        file: path,
        imports: result.imports,
        imported_by: result.importedBy,
        symbols: result.symbols
      };
    }

    case 'get_file_summary': {
      const path = args.path as string;

      const summary = engine.getFileSummary(path);

      if (!summary) {
        return {
          error: `File not found or no summary available: ${path}`
        };
      }

      return {
        path,
        summary,
        message: 'Compressed summary (use get_file_context for full content)'
      };
    }

    case 'get_predicted_files': {
      const currentFile = args.current_file as string;
      const query = args.query as string;

      const predicted = engine.getPredictedFiles(currentFile, query);

      // Pre-fetch these files into hot cache
      const preFetched = await engine.preFetchFiles(currentFile, query);

      return {
        predicted_files: predicted,
        pre_fetched: preFetched,
        message: `Predicted ${predicted.length} relevant files, pre-fetched ${preFetched} into cache`
      };
    }

    case 'get_learning_stats': {
      const stats = engine.getLearningStats();

      return {
        usage: {
          total_queries: stats.usageStats.totalQueries,
          total_file_views: stats.usageStats.totalFileViews,
          recent_activity: stats.usageStats.recentActivity,
          top_files: stats.usageStats.topFiles
        },
        compression: {
          files_with_summaries: stats.compressionStats.totalFiles,
          avg_compression_ratio: stats.compressionStats.avgCompression.toFixed(1) + 'x',
          tokens_saved: stats.compressionStats.totalTokensSaved
        },
        cache: {
          hot_cache_size: stats.hotCacheStats.size,
          cached_files: stats.hotCacheStats.files
        }
      };
    }

    case 'mark_context_useful': {
      const query = args.query as string;
      const wasUseful = args.was_useful as boolean;

      engine.markContextUsefulness(query, wasUseful);

      return {
        message: `Feedback recorded: context was ${wasUseful ? 'useful' : 'not useful'}`,
        query
      };
    }

    // Phase 4: Multi-project tools
    case 'list_projects': {
      const projects = engine.listProjects();
      const activeProject = engine.getActiveProject();

      return {
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          path: p.path,
          is_active: activeProject?.id === p.id,
          total_files: p.totalFiles,
          total_decisions: p.totalDecisions,
          languages: p.languages,
          last_accessed: new Date(p.lastAccessed).toISOString()
        })),
        active_project: activeProject?.name || null
      };
    }

    case 'switch_project': {
      const projectId = args.project_id as string;
      const success = engine.switchProject(projectId);

      if (!success) {
        return {
          error: `Project not found: ${projectId}`,
          message: 'Use list_projects to see available projects'
        };
      }

      const project = engine.getProject(projectId);
      return {
        message: `Switched to project: ${project?.name}`,
        project: project ? {
          id: project.id,
          name: project.name,
          path: project.path
        } : null
      };
    }

    case 'search_all_projects': {
      const query = args.query as string;
      const limit = (args.limit as number) || 5;

      const results = await engine.searchAllProjects(query, limit);

      return {
        results: results.map(r => ({
          project: r.project,
          project_id: r.projectId,
          matches: r.results.map(m => ({
            file: m.file,
            preview: m.preview,
            relevance: m.similarity
          }))
        })),
        total_projects_searched: results.length
      };
    }

    case 'record_decision_with_author': {
      const title = args.title as string;
      const description = args.description as string;
      const author = args.author as string;
      const status = (args.status as 'proposed' | 'accepted' | 'deprecated' | 'superseded') || 'accepted';
      const files = args.files as string[] | undefined;
      const tags = args.tags as string[] | undefined;

      const decision = await engine.recordDecisionWithAuthor(
        title,
        description,
        author,
        files,
        tags,
        status
      );

      return {
        id: decision.id,
        title: decision.title,
        description: decision.description,
        author: decision.author,
        status: decision.status,
        files: decision.files,
        tags: decision.tags,
        created_at: decision.createdAt.toISOString(),
        message: 'Decision recorded with author attribution'
      };
    }

    case 'update_decision_status': {
      const decisionId = args.decision_id as string;
      const status = args.status as 'proposed' | 'accepted' | 'deprecated' | 'superseded';
      const supersededBy = args.superseded_by as string | undefined;

      const success = engine.updateDecisionStatus(decisionId, status, supersededBy);

      if (!success) {
        return {
          error: `Decision not found: ${decisionId}`
        };
      }

      return {
        message: `Decision ${decisionId} status updated to: ${status}`,
        decision_id: decisionId,
        new_status: status,
        superseded_by: supersededBy || null
      };
    }

    case 'export_decisions_to_adr': {
      const outputDir = args.output_dir as string | undefined;
      const format = args.format as 'madr' | 'nygard' | 'simple' | undefined;
      const includeIndex = args.include_index as boolean | undefined;

      const exportedFiles = engine.exportAllDecisionsToADR({
        outputDir,
        format,
        includeIndex
      });

      return {
        message: `Exported ${exportedFiles.length} ADR files`,
        files: exportedFiles,
        format: format || 'madr'
      };
    }

    case 'discover_projects': {
      const discovered = engine.discoverProjects();

      return {
        message: `Discovered ${discovered.length} potential projects`,
        projects: discovered.map(p => ({
          path: p,
          name: p.split(/[/\\]/).pop()
        }))
      };
    }

    // Phase 5: Active Feature Context tools
    case 'get_active_context': {
      const hotContext = engine.getHotContext();
      const summary = engine.getActiveContextSummary();

      return {
        summary: hotContext.summary || 'No active context',
        current_feature: summary ? {
          name: summary.name,
          files_count: summary.files,
          changes_count: summary.changes,
          duration_minutes: summary.duration
        } : null,
        active_files: hotContext.files.map(f => ({
          path: f.path,
          touch_count: f.touchCount,
          has_content: f.content !== null
        })),
        recent_changes: hotContext.changes.slice(0, 5).map(c => ({
          file: c.file,
          diff: c.diff,
          when: c.timestamp.toISOString()
        })),
        recent_queries: hotContext.queries.map(q => ({
          query: q.query,
          files_used: q.filesUsed,
          when: q.timestamp.toISOString()
        }))
      };
    }

    case 'set_feature_context': {
      const name = args.name as string;
      const files = args.files as string[] | undefined;

      const context = engine.startFeatureContext(name);

      // Track initial files if provided
      if (files && files.length > 0) {
        for (const file of files) {
          engine.trackFileOpened(file);
        }
      }

      return {
        success: true,
        message: `Now tracking: ${name}`,
        context_id: context.id,
        name: context.name
      };
    }

    case 'list_recent_contexts': {
      const current = engine.getActiveContextSummary();
      const recent = engine.getRecentFeatureContexts();

      return {
        current: current ? {
          name: current.name,
          files: current.files,
          changes: current.changes,
          duration_minutes: current.duration
        } : null,
        recent: recent.map(c => ({
          id: c.id,
          name: c.name,
          files_count: c.files.length,
          changes_count: c.changes.length,
          status: c.status,
          last_active: c.lastActiveAt.toISOString()
        }))
      };
    }

    case 'switch_feature_context': {
      const contextId = args.context_id as string;
      const success = engine.switchFeatureContext(contextId);

      if (!success) {
        return {
          success: false,
          error: `Context not found: ${contextId}`,
          message: 'Use list_recent_contexts to see available contexts'
        };
      }

      const summary = engine.getActiveContextSummary();
      return {
        success: true,
        message: `Switched to: ${summary?.name || 'Unknown'}`,
        current: summary ? {
          name: summary.name,
          files: summary.files,
          changes: summary.changes
        } : null
      };
    }

    // Phase 6: Living Documentation tools
    case 'generate_docs': {
      const path = args.path as string | undefined;
      const type = (args.type as string) || (path ? 'component' : 'architecture');

      if (type === 'architecture' || !path) {
        const arch = await engine.getArchitecture();
        return {
          type: 'architecture',
          name: arch.name,
          description: arch.description,
          diagram: arch.diagram,
          layers: arch.layers.map(l => ({
            name: l.name,
            directory: l.directory,
            files_count: l.files.length,
            purpose: l.purpose
          })),
          data_flow: arch.dataFlow,
          dependencies_count: arch.dependencies.length,
          generated_at: arch.generatedAt.toISOString()
        };
      } else {
        const doc = await engine.getComponentDoc(path);
        return {
          type: 'component',
          file: doc.file,
          name: doc.name,
          purpose: doc.purpose,
          public_interface: doc.publicInterface.map(s => ({
            name: s.name,
            kind: s.kind,
            signature: s.signature,
            line: s.lineStart
          })),
          dependencies_count: doc.dependencies.length,
          dependents_count: doc.dependents.length,
          complexity: doc.complexity,
          documentation_score: doc.documentationScore
        };
      }
    }

    case 'get_architecture': {
      const arch = await engine.getArchitecture();

      return {
        name: arch.name,
        description: arch.description,
        diagram: arch.diagram,
        layers: arch.layers.map(l => ({
          name: l.name,
          directory: l.directory,
          files: l.files,
          purpose: l.purpose
        })),
        data_flow: arch.dataFlow,
        key_components: arch.keyComponents.map(c => ({
          name: c.name,
          file: c.file,
          purpose: c.purpose,
          exports: c.exports
        })),
        dependencies: arch.dependencies.map(d => ({
          name: d.name,
          version: d.version,
          type: d.type
        })),
        generated_at: arch.generatedAt.toISOString()
      };
    }

    case 'get_component_doc': {
      const path = args.path as string;

      try {
        const doc = await engine.getComponentDoc(path);

        return {
          file: doc.file,
          name: doc.name,
          purpose: doc.purpose,
          last_modified: doc.lastModified.toISOString(),
          public_interface: doc.publicInterface.map(s => ({
            name: s.name,
            kind: s.kind,
            signature: s.signature,
            description: s.description,
            line_start: s.lineStart,
            line_end: s.lineEnd,
            exported: s.exported
          })),
          dependencies: doc.dependencies,
          dependents: doc.dependents,
          change_history: doc.changeHistory.slice(0, 10).map(h => ({
            date: h.date.toISOString(),
            change: h.change,
            author: h.author,
            commit: h.commit,
            lines_added: h.linesChanged.added,
            lines_removed: h.linesChanged.removed
          })),
          contributors: doc.contributors,
          complexity: doc.complexity,
          documentation_score: doc.documentationScore
        };
      } catch (error) {
        return {
          error: `Failed to generate component doc: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }

    case 'get_changelog': {
      const since = args.since as string | undefined;
      const groupBy = args.group_by as 'day' | 'week' | undefined;
      const includeDecisions = args.include_decisions as boolean | undefined;

      const changelogs = await engine.getChangelog({
        since,
        groupBy,
        includeDecisions
      });

      return {
        period: since || 'this week',
        days: changelogs.map(day => ({
          date: day.date.toISOString().split('T')[0],
          summary: day.summary,
          features: day.features.map(f => ({
            description: f.description,
            files: f.files,
            commit: f.commit
          })),
          fixes: day.fixes.map(f => ({
            description: f.description,
            files: f.files,
            commit: f.commit
          })),
          refactors: day.refactors.map(r => ({
            description: r.description,
            files: r.files,
            commit: r.commit
          })),
          decisions: day.decisions,
          metrics: {
            commits: day.metrics.commits,
            files_changed: day.metrics.filesChanged,
            lines_added: day.metrics.linesAdded,
            lines_removed: day.metrics.linesRemoved
          }
        })),
        total_days: changelogs.length
      };
    }

    case 'validate_docs': {
      const result = await engine.validateDocs();

      return {
        is_valid: result.isValid,
        score: result.score,
        outdated_docs: result.outdatedDocs.map(d => ({
          file: d.file,
          reason: d.reason,
          severity: d.severity,
          last_doc_update: d.lastDocUpdate.toISOString(),
          last_code_change: d.lastCodeChange.toISOString()
        })),
        undocumented_count: result.undocumentedCode.length,
        suggestions: result.suggestions.slice(0, 10).map(s => ({
          file: s.file,
          suggestion: s.suggestion,
          priority: s.priority
        })),
        message: result.isValid
          ? `Documentation score: ${result.score}% - Looking good!`
          : `Documentation score: ${result.score}% - ${result.suggestions.length} suggestions available`
      };
    }

    case 'what_happened': {
      const since = args.since as string;
      const scope = args.scope as string | undefined;

      const result = await engine.whatHappened(since, scope);

      return {
        time_range: {
          since: result.timeRange.since.toISOString(),
          until: result.timeRange.until.toISOString()
        },
        scope: result.scope,
        summary: result.summary,
        changes: result.changes.slice(0, 20).map(c => ({
          timestamp: c.timestamp.toISOString(),
          type: c.type,
          description: c.description,
          details: c.details
        })),
        decisions: result.decisions.map(d => ({
          id: d.id,
          title: d.title,
          date: d.date.toISOString()
        })),
        files_affected: result.filesAffected.slice(0, 20),
        total_changes: result.changes.length,
        total_files: result.filesAffected.length
      };
    }

    case 'find_undocumented': {
      const importance = args.importance as 'low' | 'medium' | 'high' | 'all' | undefined;
      const type = args.type as 'file' | 'function' | 'class' | 'interface' | 'all' | undefined;

      const items = await engine.findUndocumented({ importance, type });

      // Group by file for better readability
      const byFile = new Map<string, typeof items>();
      for (const item of items) {
        if (!byFile.has(item.file)) {
          byFile.set(item.file, []);
        }
        byFile.get(item.file)!.push(item);
      }

      return {
        total: items.length,
        by_importance: {
          high: items.filter(i => i.importance === 'high').length,
          medium: items.filter(i => i.importance === 'medium').length,
          low: items.filter(i => i.importance === 'low').length
        },
        items: items.slice(0, 30).map(i => ({
          file: i.file,
          symbol: i.symbol,
          type: i.type,
          importance: i.importance
        })),
        files_affected: byFile.size,
        message: items.length === 0
          ? 'All exported code is documented!'
          : `Found ${items.length} undocumented items across ${byFile.size} files`
      };
    }

    // Phase 7: Context Rot Prevention tools
    case 'get_context_health': {
      const includeHistory = args.include_history as boolean | undefined;

      const health = engine.getContextHealth();
      const drift = engine.detectDrift();

      const result: Record<string, unknown> = {
        health: health.health,
        tokens_used: health.tokensUsed,
        tokens_limit: health.tokensLimit,
        utilization: `${health.utilizationPercent}%`,
        drift_score: health.driftScore,
        drift_detected: health.driftDetected,
        relevance_score: health.relevanceScore,
        critical_context_count: health.criticalContextCount,
        compaction_needed: health.compactionNeeded,
        suggestions: health.suggestions,
        drift_details: {
          missing_requirements: drift.missingRequirements,
          contradictions: drift.contradictions.length,
          topic_shift: drift.topicShift,
          suggested_reminders: drift.suggestedReminders
        }
      };

      if (includeHistory) {
        // Note: getHealthHistory would need to be exposed from engine
        result.message = 'Health history tracking available';
      }

      return result;
    }

    case 'trigger_compaction': {
      const strategy = (args.strategy as 'summarize' | 'selective' | 'aggressive') || 'summarize';
      const preserveRecent = args.preserve_recent as number | undefined;
      const targetUtilization = args.target_utilization as number | undefined;

      const result = engine.triggerCompaction({
        strategy,
        preserveRecent,
        targetUtilization,
        preserveCritical: true
      });

      return {
        success: result.success,
        strategy: result.strategy,
        tokens_before: result.tokensBefore,
        tokens_after: result.tokensAfter,
        tokens_saved: result.tokensSaved,
        reduction: `${Math.round((result.tokensSaved / result.tokensBefore) * 100)}%`,
        preserved_critical: result.preservedCritical,
        summarized_chunks: result.summarizedChunks,
        removed_chunks: result.removedChunks,
        summaries: result.summaries,
        message: result.success
          ? `Compaction successful: saved ${result.tokensSaved} tokens (${Math.round((result.tokensSaved / result.tokensBefore) * 100)}% reduction)`
          : 'Compaction failed'
      };
    }

    case 'mark_critical': {
      const content = args.content as string;
      const type = args.type as 'decision' | 'requirement' | 'instruction' | 'custom' | undefined;
      const reason = args.reason as string | undefined;

      const critical = engine.markCritical(content, { type, reason });

      return {
        id: critical.id,
        type: critical.type,
        content: critical.content,
        reason: critical.reason,
        created_at: critical.createdAt.toISOString(),
        never_compress: critical.neverCompress,
        message: `Marked as critical ${critical.type}: "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`
      };
    }

    case 'get_critical_context': {
      const type = args.type as 'decision' | 'requirement' | 'instruction' | 'custom' | undefined;

      const items = engine.getCriticalContext(type);

      // Group by type
      const byType: Record<string, number> = {
        decision: 0,
        requirement: 0,
        instruction: 0,
        custom: 0
      };

      for (const item of items) {
        byType[item.type] = (byType[item.type] || 0) + 1;
      }

      return {
        total: items.length,
        by_type: byType,
        items: items.map(item => ({
          id: item.id,
          type: item.type,
          content: item.content,
          reason: item.reason,
          created_at: item.createdAt.toISOString()
        })),
        summary: engine.getContextSummaryForAI(),
        message: items.length === 0
          ? 'No critical context marked. Consider marking important decisions and requirements.'
          : `${items.length} critical items will be preserved during compaction`
      };
    }

    // Phase 8: Confidence Scoring tools
    case 'get_confidence': {
      const code = args.code as string;
      const context = args.context as string | undefined;

      const result = await engine.getConfidence(code, context);

      return {
        confidence: result.confidence,
        score: result.score,
        reasoning: result.reasoning,
        indicator: engine.getConfidenceIndicator(result.confidence),
        sources: {
          codebase: result.sources.codebase.map(m => ({
            file: m.file,
            line: m.line,
            function: m.function,
            similarity: m.similarity,
            usage_count: m.usageCount
          })),
          decisions: result.sources.decisions.map(d => ({
            id: d.id,
            title: d.title,
            relevance: d.relevance,
            date: d.date.toISOString()
          })),
          patterns: result.sources.patterns.map(p => ({
            pattern: p.pattern,
            confidence: p.confidence,
            examples: p.examples
          })),
          used_general_knowledge: result.sources.usedGeneralKnowledge
        },
        warnings: result.warnings.map(w => ({
          type: w.type,
          message: w.message,
          severity: w.severity,
          suggestion: w.suggestion,
          related_decision: w.relatedDecision
        })),
        formatted: engine.formatConfidenceResult(result),
        message: `${result.confidence.toUpperCase()} confidence (${result.score}%): ${result.reasoning}`
      };
    }

    case 'list_sources': {
      const code = args.code as string;
      const context = args.context as string | undefined;
      const includeSnippets = args.include_snippets as boolean | undefined;

      const sources = await engine.listConfidenceSources(code, context, includeSnippets);

      // Calculate weights
      const hasCodebase = sources.codebase.length > 0;
      const hasDecisions = sources.decisions.length > 0;

      let codebaseWeight = 50;
      let decisionWeight = 30;
      let patternWeight = 20;

      if (!hasCodebase) {
        codebaseWeight = 0;
        decisionWeight += 25;
        patternWeight += 25;
      }

      if (!hasDecisions) {
        decisionWeight = 0;
        codebaseWeight += 15;
        patternWeight += 15;
      }

      return {
        codebase: {
          weight: `${codebaseWeight}%`,
          matches: sources.codebase.map(m => ({
            file: m.file,
            line: m.line,
            function: m.function,
            similarity: m.similarity,
            snippet: m.snippet,
            usage_count: m.usageCount
          }))
        },
        decisions: {
          weight: `${decisionWeight}%`,
          matches: sources.decisions.map(d => ({
            id: d.id,
            title: d.title,
            relevance: d.relevance,
            date: d.date.toISOString()
          }))
        },
        patterns: {
          weight: `${patternWeight}%`,
          matches: sources.patterns.map(p => ({
            pattern: p.pattern,
            confidence: p.confidence,
            examples: p.examples
          }))
        },
        used_general_knowledge: sources.usedGeneralKnowledge,
        message: sources.usedGeneralKnowledge
          ? 'Sources: Based primarily on general knowledge (no strong codebase matches)'
          : `Sources: Found ${sources.codebase.length} codebase matches, ${sources.decisions.length} related decisions, ${sources.patterns.length} patterns`
      };
    }

    case 'check_conflicts': {
      const code = args.code as string;

      const result = await engine.checkCodeConflicts(code);

      return {
        has_conflicts: result.hasConflicts,
        conflicts: result.conflicts.map(c => ({
          decision_id: c.decisionId,
          decision_title: c.decisionTitle,
          decision_date: c.decisionDate.toISOString(),
          conflict_description: c.conflictDescription,
          severity: c.severity
        })),
        message: result.hasConflicts
          ? `Found ${result.conflicts.length} conflict(s) with past decisions`
          : 'No conflicts with past decisions'
      };
    }

    // Phase 9: Change Intelligence tools
    case 'what_changed': {
      const since = args.since as string;
      const file = args.file as string | undefined;
      const author = args.author as string | undefined;

      const result = engine.whatChanged({ since, file, author });

      return {
        period: result.period,
        since: result.since.toISOString(),
        until: result.until.toISOString(),
        total_files: result.totalFiles,
        total_lines_added: result.totalLinesAdded,
        total_lines_removed: result.totalLinesRemoved,
        by_author: result.byAuthor,
        by_type: result.byType,
        changes: result.changes.slice(0, 20).map(c => ({
          file: c.file,
          type: c.type,
          lines_added: c.linesAdded,
          lines_removed: c.linesRemoved,
          author: c.author,
          timestamp: c.timestamp.toISOString(),
          commit_message: c.commitMessage,
          commit_hash: c.commitHash.slice(0, 7)
        })),
        formatted: engine.formatChanges(result),
        message: result.changes.length === 0
          ? `No changes found since ${since}`
          : `Found ${result.changes.length} changes across ${result.totalFiles} files`
      };
    }

    case 'why_broke': {
      const error = args.error as string;
      const file = args.file as string | undefined;
      const line = args.line as number | undefined;

      const diagnosis = engine.whyBroke(error, { file, line });

      return {
        likely_cause: diagnosis.likelyCause ? {
          file: diagnosis.likelyCause.file,
          author: diagnosis.likelyCause.author,
          timestamp: diagnosis.likelyCause.timestamp.toISOString(),
          commit_message: diagnosis.likelyCause.commitMessage,
          commit_hash: diagnosis.likelyCause.commitHash.slice(0, 7),
          diff: diagnosis.likelyCause.diff.slice(0, 500)
        } : null,
        confidence: diagnosis.confidence,
        related_changes: diagnosis.relatedChanges.map(c => ({
          file: c.file,
          timestamp: c.timestamp.toISOString(),
          commit_message: c.commitMessage
        })),
        past_similar_bugs: diagnosis.pastSimilarBugs.map(b => ({
          error: b.error.slice(0, 100),
          similarity: b.similarity,
          date: b.date.toISOString(),
          fix: b.fix,
          file: b.file
        })),
        suggested_fix: diagnosis.suggestedFix,
        reasoning: diagnosis.reasoning,
        formatted: engine.formatDiagnosis(diagnosis),
        message: diagnosis.likelyCause
          ? `Found likely cause in ${diagnosis.likelyCause.file} (${diagnosis.confidence}% confidence)`
          : 'Could not identify specific cause'
      };
    }

    case 'find_similar_bugs': {
      const error = args.error as string;
      const limit = args.limit as number | undefined;

      const bugs = engine.findSimilarBugs(error, limit);

      return {
        total: bugs.length,
        bugs: bugs.map(b => ({
          id: b.id,
          error: b.error.slice(0, 100),
          similarity: b.similarity,
          date: b.date.toISOString(),
          cause: b.cause,
          fix: b.fix,
          file: b.file,
          fix_diff: b.fixDiff?.slice(0, 200)
        })),
        message: bugs.length === 0
          ? 'No similar bugs found in history'
          : `Found ${bugs.length} similar bug(s) in history`
      };
    }

    case 'suggest_fix': {
      const error = args.error as string;
      const context = args.context as string | undefined;

      const suggestions = engine.suggestFix(error, context);

      return {
        total: suggestions.length,
        suggestions: suggestions.map(s => ({
          confidence: s.confidence,
          fix: s.fix,
          reason: s.reason,
          diff: s.diff,
          source: s.source,
          past_fix: s.pastFix ? {
            date: s.pastFix.date.toISOString(),
            file: s.pastFix.file
          } : null
        })),
        formatted: engine.formatFixSuggestions(suggestions),
        message: suggestions.length === 0
          ? 'No fix suggestions available'
          : `Found ${suggestions.length} fix suggestion(s)`
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
