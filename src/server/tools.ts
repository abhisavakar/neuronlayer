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

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
