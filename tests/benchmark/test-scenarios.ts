/**
 * Test Scenarios and Queries for MemoryLayer Benchmark
 * 
 * This file contains all test queries organized by category and task type.
 * Each query is designed to test specific aspects of MemoryLayer's capabilities.
 */

export type TaskType = 'bug_fix' | 'feature_add' | 'refactor' | 'code_review' | 'information_retrieval' | 'code_understanding';

export interface TestQuery {
  id: string;
  category: TaskType;
  description: string;
  query: string;
  expectedFiles?: string[]; // Files that should be found
  expectedConcepts?: string[]; // Concepts that should be understood
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface TestScenario {
  name: string;
  description: string;
  queries: TestQuery[];
}

// ============================================================================
// INFORMATION RETRIEVAL QUERIES (20 queries)
// ============================================================================

export const informationRetrievalQueries: TestQuery[] = [
  // Type Definitions (4 queries)
  {
    id: 'ir-001',
    category: 'information_retrieval',
    description: 'Find interface/type definition',
    query: 'Find the Decision type definition',
    expectedFiles: ['src/types/index.ts'],
    expectedConcepts: ['interface', 'type definition', 'Decision'],
    difficulty: 'easy'
  },
  {
    id: 'ir-002',
    category: 'information_retrieval',
    description: 'Find class definition',
    query: 'Where is the MemoryLayerEngine class defined?',
    expectedFiles: ['src/core/engine.ts'],
    expectedConcepts: ['class', 'MemoryLayerEngine', 'main engine'],
    difficulty: 'easy'
  },
  {
    id: 'ir-003',
    category: 'information_retrieval',
    description: 'Find enum definition',
    query: 'Show me the SymbolKind enum',
    expectedFiles: ['src/types/index.ts'],
    expectedConcepts: ['enum', 'SymbolKind', 'symbol types'],
    difficulty: 'medium'
  },
  {
    id: 'ir-004',
    category: 'information_retrieval',
    description: 'Find generic type',
    query: 'Find the SearchResult type with all its fields',
    expectedFiles: ['src/types/index.ts'],
    expectedConcepts: ['type', 'SearchResult', 'generic'],
    difficulty: 'medium'
  },

  // Function Location (4 queries)
  {
    id: 'ir-005',
    category: 'information_retrieval',
    description: 'Find function implementation',
    query: 'Where is the searchCodebase function implemented?',
    expectedFiles: ['src/core/engine.ts', 'src/server/tools.ts'],
    expectedConcepts: ['function', 'searchCodebase', 'implementation'],
    difficulty: 'easy'
  },
  {
    id: 'ir-006',
    category: 'information_retrieval',
    description: 'Find async function',
    query: 'Find the getContext function that returns AssembledContext',
    expectedFiles: ['src/core/engine.ts', 'src/core/context.ts'],
    expectedConcepts: ['async', 'getContext', 'AssembledContext'],
    difficulty: 'easy'
  },
  {
    id: 'ir-007',
    category: 'information_retrieval',
    description: 'Find method in class',
    query: 'Show me the recordDecision method in DecisionTracker',
    expectedFiles: ['src/core/decisions.ts'],
    expectedConcepts: ['method', 'recordDecision', 'DecisionTracker'],
    difficulty: 'medium'
  },
  {
    id: 'ir-008',
    category: 'information_retrieval',
    description: 'Find exported function',
    query: 'Find all exported functions in the tools module',
    expectedFiles: ['src/server/tools.ts'],
    expectedConcepts: ['export', 'functions', 'tools'],
    difficulty: 'medium'
  },

  // Dependencies (4 queries)
  {
    id: 'ir-009',
    category: 'information_retrieval',
    description: 'Find file imports',
    query: 'What files import the engine module?',
    expectedFiles: ['src/server/mcp.ts', 'src/server/tools.ts', 'src/index.ts'],
    expectedConcepts: ['import', 'dependencies', 'engine'],
    difficulty: 'medium'
  },
  {
    id: 'ir-010',
    category: 'information_retrieval',
    description: 'Find module dependencies',
    query: 'Show me all imports in the context.ts file',
    expectedFiles: ['src/core/context.ts'],
    expectedConcepts: ['imports', 'dependencies', 'context'],
    difficulty: 'easy'
  },
  {
    id: 'ir-011',
    category: 'information_retrieval',
    description: 'Find what uses a specific module',
    query: 'Which files use the Tier2Storage class?',
    expectedFiles: ['src/core/engine.ts', 'src/core/context.ts', 'src/core/decisions.ts'],
    expectedConcepts: ['usage', 'Tier2Storage', 'dependencies'],
    difficulty: 'medium'
  },
  {
    id: 'ir-012',
    category: 'information_retrieval',
    description: 'Find circular dependencies',
    query: 'Are there any circular dependencies between storage modules?',
    expectedFiles: ['src/storage/tier1.ts', 'src/storage/tier2.ts', 'src/storage/tier3.ts'],
    expectedConcepts: ['dependencies', 'circular', 'storage'],
    difficulty: 'hard'
  },

  // Configuration (2 queries)
  {
    id: 'ir-013',
    category: 'information_retrieval',
    description: 'Find config options',
    query: 'What configuration options are available in MemoryLayerConfig?',
    expectedFiles: ['src/types/index.ts', 'src/utils/config.ts'],
    expectedConcepts: ['config', 'options', 'MemoryLayerConfig'],
    difficulty: 'medium'
  },
  {
    id: 'ir-014',
    category: 'information_retrieval',
    description: 'Find default values',
    query: 'What are the default values for maxTokens and embeddingModel?',
    expectedFiles: ['src/utils/config.ts', 'src/core/engine.ts'],
    expectedConcepts: ['defaults', 'maxTokens', 'embeddingModel'],
    difficulty: 'medium'
  },

  // Architecture (3 queries)
  {
    id: 'ir-015',
    category: 'information_retrieval',
    description: 'Explain architecture',
    query: 'Explain the three-tier storage architecture',
    expectedFiles: ['src/storage/tier1.ts', 'src/storage/tier2.ts', 'src/storage/tier3.ts'],
    expectedConcepts: ['architecture', 'three-tier', 'storage'],
    difficulty: 'medium'
  },
  {
    id: 'ir-016',
    category: 'information_retrieval',
    description: 'Find data flow',
    query: 'How does data flow from the MCP server to the database?',
    expectedFiles: ['src/server/mcp.ts', 'src/core/engine.ts', 'src/storage/database.ts'],
    expectedConcepts: ['data flow', 'MCP', 'database'],
    difficulty: 'hard'
  },
  {
    id: 'ir-017',
    category: 'information_retrieval',
    description: 'Find component relationships',
    query: 'What is the relationship between ContextAssembler and Tier2Storage?',
    expectedFiles: ['src/core/context.ts', 'src/storage/tier2.ts'],
    expectedConcepts: ['relationship', 'ContextAssembler', 'Tier2Storage'],
    difficulty: 'hard'
  },

  // Patterns (3 queries)
  {
    id: 'ir-018',
    category: 'information_retrieval',
    description: 'Find error handling',
    query: 'Show error handling patterns in this codebase',
    expectedFiles: ['src/core/engine.ts', 'src/server/tools.ts'],
    expectedConcepts: ['error handling', 'try-catch', 'patterns'],
    difficulty: 'medium'
  },
  {
    id: 'ir-019',
    category: 'information_retrieval',
    description: 'Find logging patterns',
    query: 'How is logging implemented throughout the codebase?',
    expectedFiles: ['src/core/engine.ts', 'src/index.ts'],
    expectedConcepts: ['logging', 'console.error', 'debugging'],
    difficulty: 'medium'
  },
  {
    id: 'ir-020',
    category: 'information_retrieval',
    description: 'Find validation patterns',
    query: 'Find input validation patterns',
    expectedFiles: ['src/server/tools.ts', 'src/utils/files.ts'],
    expectedConcepts: ['validation', 'input checking', 'patterns'],
    difficulty: 'medium'
  }
];

// ============================================================================
// BUG DIAGNOSIS QUERIES (10 queries)
// ============================================================================

export const bugDiagnosisQueries: TestQuery[] = [
  {
    id: 'bug-001',
    category: 'bug_fix',
    description: 'Null reference error',
    query: 'I am getting "cannot read property of undefined" when calling getFileContext. What could be wrong?',
    expectedFiles: ['src/core/engine.ts', 'src/utils/files.ts'],
    expectedConcepts: ['null check', 'undefined', 'error handling'],
    difficulty: 'medium'
  },
  {
    id: 'bug-002',
    category: 'bug_fix',
    description: 'Trace flow',
    query: 'Trace the login flow from API to database',
    expectedFiles: ['src/server/mcp.ts', 'src/core/engine.ts'],
    expectedConcepts: ['flow tracing', 'authentication', 'data flow'],
    difficulty: 'hard'
  },
  {
    id: 'bug-003',
    category: 'bug_fix',
    description: 'State management',
    query: 'Where is the project state managed and how could it get corrupted?',
    expectedFiles: ['src/core/engine.ts', 'src/storage/tier1.ts'],
    expectedConcepts: ['state', 'corruption', 'Tier1Storage'],
    difficulty: 'hard'
  },
  {
    id: 'bug-004',
    category: 'bug_fix',
    description: 'Async issues',
    query: 'Find potential race conditions in the indexing process',
    expectedFiles: ['src/indexing/indexer.ts', 'src/indexing/watcher.ts'],
    expectedConcepts: ['race condition', 'async', 'indexing'],
    difficulty: 'hard'
  },
  {
    id: 'bug-005',
    category: 'bug_fix',
    description: 'Null handling',
    query: 'Show all places where null checks are missing on file paths',
    expectedFiles: ['src/core/engine.ts', 'src/utils/files.ts'],
    expectedConcepts: ['null checks', 'file paths', 'safety'],
    difficulty: 'medium'
  },
  {
    id: 'bug-006',
    category: 'bug_fix',
    description: 'Type errors',
    query: 'Find type mismatches in the Decision interface usage',
    expectedFiles: ['src/types/index.ts', 'src/core/decisions.ts'],
    expectedConcepts: ['types', 'interfaces', 'type checking'],
    difficulty: 'medium'
  },
  {
    id: 'bug-007',
    category: 'bug_fix',
    description: 'API errors',
    query: 'Why might the MCP server return an error for tool calls?',
    expectedFiles: ['src/server/mcp.ts', 'src/server/tools.ts'],
    expectedConcepts: ['errors', 'MCP', 'tool calls'],
    difficulty: 'medium'
  },
  {
    id: 'bug-008',
    category: 'bug_fix',
    description: 'Performance issue',
    query: 'Find slow operations in the search functionality',
    expectedFiles: ['src/core/context.ts', 'src/storage/tier2.ts'],
    expectedConcepts: ['performance', 'slow', 'optimization'],
    difficulty: 'hard'
  },
  {
    id: 'bug-009',
    category: 'bug_fix',
    description: 'Memory leak',
    query: 'Show potential memory leaks in the embedding generator',
    expectedFiles: ['src/indexing/embeddings.ts'],
    expectedConcepts: ['memory leak', 'embeddings', 'resources'],
    difficulty: 'hard'
  },
  {
    id: 'bug-010',
    category: 'bug_fix',
    description: 'Security vulnerability',
    query: 'Find SQL injection vulnerabilities in database queries',
    expectedFiles: ['src/storage/database.ts', 'src/storage/tier2.ts'],
    expectedConcepts: ['security', 'SQL injection', 'database'],
    difficulty: 'hard'
  }
];

// ============================================================================
// FEATURE IMPLEMENTATION QUERIES (10 queries)
// ============================================================================

export const featureImplementationQueries: TestQuery[] = [
  {
    id: 'feat-001',
    category: 'feature_add',
    description: 'Find similar code',
    query: 'Find existing validation code that I can reuse for email validation',
    expectedFiles: ['src/utils/files.ts', 'src/utils/config.ts'],
    expectedConcepts: ['validation', 'reuse', 'patterns'],
    difficulty: 'easy'
  },
  {
    id: 'feat-002',
    category: 'feature_add',
    description: 'Pattern matching',
    query: 'Show how other endpoints handle authentication in this codebase',
    expectedFiles: ['src/server/mcp.ts', 'src/core/engine.ts'],
    expectedConcepts: ['authentication', 'patterns', 'endpoints'],
    difficulty: 'medium'
  },
  {
    id: 'feat-003',
    category: 'feature_add',
    description: 'Database integration',
    query: 'How do I add a new table to the database schema?',
    expectedFiles: ['src/storage/database.ts', 'src/storage/tier2.ts'],
    expectedConcepts: ['database', 'schema', 'tables'],
    difficulty: 'medium'
  },
  {
    id: 'feat-004',
    category: 'feature_add',
    description: 'Testing examples',
    query: 'Show test examples for the engine methods',
    expectedFiles: ['tests/unit/feature-context.test.ts', 'tests/unit/files.test.ts'],
    expectedConcepts: ['testing', 'examples', 'vitest'],
    difficulty: 'easy'
  },
  {
    id: 'feat-005',
    category: 'feature_add',
    description: 'Documentation patterns',
    query: 'What documentation patterns should I follow for new modules?',
    expectedFiles: ['src/core/engine.ts', 'src/index.ts'],
    expectedConcepts: ['documentation', 'JSDoc', 'patterns'],
    difficulty: 'medium'
  },
  {
    id: 'feat-006',
    category: 'feature_add',
    description: 'Dependencies needed',
    query: 'What do I need to import to create a new tool handler?',
    expectedFiles: ['src/server/tools.ts', 'src/types/index.ts'],
    expectedConcepts: ['imports', 'tools', 'dependencies'],
    difficulty: 'easy'
  },
  {
    id: 'feat-007',
    category: 'feature_add',
    description: 'Error handling patterns',
    query: 'How should I handle errors in a new async function?',
    expectedFiles: ['src/core/engine.ts', 'src/server/tools.ts'],
    expectedConcepts: ['error handling', 'async', 'try-catch'],
    difficulty: 'medium'
  },
  {
    id: 'feat-008',
    category: 'feature_add',
    description: 'Input validation',
    query: 'Show input validation examples for tool arguments',
    expectedFiles: ['src/server/tools.ts', 'src/utils/files.ts'],
    expectedConcepts: ['validation', 'input', 'arguments'],
    difficulty: 'medium'
  },
  {
    id: 'feat-009',
    category: 'feature_add',
    description: 'Logging patterns',
    query: 'How is logging implemented so I can add debug logs?',
    expectedFiles: ['src/core/engine.ts', 'src/index.ts'],
    expectedConcepts: ['logging', 'debug', 'console'],
    difficulty: 'easy'
  },
  {
    id: 'feat-010',
    category: 'feature_add',
    description: 'Event handling',
    query: 'Show event handling patterns using EventEmitter',
    expectedFiles: ['src/indexing/indexer.ts'],
    expectedConcepts: ['events', 'EventEmitter', 'patterns'],
    difficulty: 'medium'
  }
];

// ============================================================================
// CODE UNDERSTANDING QUERIES (10 queries)
// ============================================================================

export const codeUnderstandingQueries: TestQuery[] = [
  {
    id: 'understand-001',
    category: 'code_understanding',
    description: 'Project overview',
    query: 'Explain the overall project structure and main components',
    expectedFiles: ['src/index.ts', 'src/core/engine.ts', 'src/server/mcp.ts'],
    expectedConcepts: ['structure', 'architecture', 'components'],
    difficulty: 'easy'
  },
  {
    id: 'understand-002',
    category: 'code_understanding',
    description: 'Data flow',
    query: 'How does data flow from the MCP client request to the database and back?',
    expectedFiles: ['src/server/mcp.ts', 'src/core/engine.ts', 'src/storage/tier2.ts'],
    expectedConcepts: ['data flow', 'request', 'response'],
    difficulty: 'hard'
  },
  {
    id: 'understand-003',
    category: 'code_understanding',
    description: 'Business logic',
    query: 'Explain how context assembly works and why it is important',
    expectedFiles: ['src/core/context.ts', 'src/core/engine.ts'],
    expectedConcepts: ['context assembly', 'logic', 'tokens'],
    difficulty: 'hard'
  },
  {
    id: 'understand-004',
    category: 'code_understanding',
    description: 'Design patterns',
    query: 'What design patterns are used in the storage layer?',
    expectedFiles: ['src/storage/tier1.ts', 'src/storage/tier2.ts', 'src/storage/tier3.ts'],
    expectedConcepts: ['patterns', 'design', 'storage'],
    difficulty: 'medium'
  },
  {
    id: 'understand-005',
    category: 'code_understanding',
    description: 'Architectural decisions',
    query: 'Why was SQLite chosen over other databases?',
    expectedFiles: ['src/storage/database.ts', 'memorylayer/prd/ARCHITECTURE.md'],
    expectedConcepts: ['SQLite', 'decisions', 'database'],
    difficulty: 'medium'
  },
  {
    id: 'understand-006',
    category: 'code_understanding',
    description: 'Tradeoffs',
    query: 'What are the pros and cons of the three-tier storage approach?',
    expectedFiles: ['src/storage/tier1.ts', 'src/storage/tier2.ts', 'src/storage/tier3.ts'],
    expectedConcepts: ['tradeoffs', 'three-tier', 'performance'],
    difficulty: 'hard'
  },
  {
    id: 'understand-007',
    category: 'code_understanding',
    description: 'History',
    query: 'How has the decision tracking system evolved?',
    expectedFiles: ['src/core/decisions.ts', 'src/core/decision-extractor.ts'],
    expectedConcepts: ['history', 'decisions', 'evolution'],
    difficulty: 'hard'
  },
  {
    id: 'understand-008',
    category: 'code_understanding',
    description: 'Relationships',
    query: 'How do the Indexer and Watcher classes work together?',
    expectedFiles: ['src/indexing/indexer.ts', 'src/indexing/watcher.ts'],
    expectedConcepts: ['relationships', 'Indexer', 'Watcher'],
    difficulty: 'medium'
  },
  {
    id: 'understand-009',
    category: 'code_understanding',
    description: 'Entry points',
    query: 'Where does the application start and how is it initialized?',
    expectedFiles: ['src/index.ts', 'src/core/engine.ts'],
    expectedConcepts: ['entry point', 'initialization', 'startup'],
    difficulty: 'easy'
  },
  {
    id: 'understand-010',
    category: 'code_understanding',
    description: 'Lifecycle',
    query: 'Explain the complete lifecycle of a query from start to finish',
    expectedFiles: ['src/server/mcp.ts', 'src/core/engine.ts', 'src/core/context.ts'],
    expectedConcepts: ['lifecycle', 'query', 'processing'],
    difficulty: 'hard'
  }
];

// ============================================================================
// REFACTORING QUERIES (10 queries)
// ============================================================================

export const refactoringQueries: TestQuery[] = [
  {
    id: 'refactor-001',
    category: 'refactor',
    description: 'Extract module',
    query: 'What files should I look at if I want to extract the decision tracking into its own module?',
    expectedFiles: ['src/core/decisions.ts', 'src/core/decision-extractor.ts'],
    expectedConcepts: ['extraction', 'module', 'decisions'],
    difficulty: 'medium'
  },
  {
    id: 'refactor-002',
    category: 'refactor',
    description: 'Convert async',
    query: 'Show all callback-based code that could be converted to async/await',
    expectedFiles: ['src/indexing/indexer.ts', 'src/indexing/watcher.ts'],
    expectedConcepts: ['callbacks', 'async', 'refactoring'],
    difficulty: 'hard'
  },
  {
    id: 'refactor-003',
    category: 'refactor',
    description: 'Move utilities',
    query: 'What utility functions are scattered across files that should be moved to utils?',
    expectedFiles: ['src/utils/files.ts', 'src/utils/config.ts', 'src/utils/tokens.ts'],
    expectedConcepts: ['utilities', 'organization', 'cleanup'],
    difficulty: 'medium'
  },
  {
    id: 'refactor-004',
    category: 'refactor',
    description: 'Rename symbols',
    query: 'If I rename handleToolCall to processToolRequest, what files need updating?',
    expectedFiles: ['src/server/tools.ts', 'src/server/mcp.ts'],
    expectedConcepts: ['renaming', 'symbols', 'dependencies'],
    difficulty: 'easy'
  },
  {
    id: 'refactor-005',
    category: 'refactor',
    description: 'Consolidate types',
    query: 'Find duplicate type definitions that should be consolidated',
    expectedFiles: ['src/types/index.ts', 'src/types/documentation.ts'],
    expectedConcepts: ['types', 'consolidation', 'DRY'],
    difficulty: 'medium'
  },
  {
    id: 'refactor-006',
    category: 'refactor',
    description: 'Split large file',
    query: 'The tools.ts file is very large. What are the logical groupings to split it?',
    expectedFiles: ['src/server/tools.ts'],
    expectedConcepts: ['splitting', 'organization', 'modules'],
    difficulty: 'medium'
  },
  {
    id: 'refactor-007',
    category: 'refactor',
    description: 'Interface segregation',
    query: 'Which interfaces violate the Interface Segregation Principle?',
    expectedFiles: ['src/types/index.ts'],
    expectedConcepts: ['interfaces', 'ISP', 'SOLID'],
    difficulty: 'hard'
  },
  {
    id: 'refactor-008',
    category: 'refactor',
    description: 'Dependency injection',
    query: 'Show where dependency injection could improve testability',
    expectedFiles: ['src/core/engine.ts', 'src/server/mcp.ts'],
    expectedConcepts: ['DI', 'testing', 'refactoring'],
    difficulty: 'hard'
  },
  {
    id: 'refactor-009',
    category: 'refactor',
    description: 'Error handling consistency',
    query: 'Find inconsistent error handling patterns that need standardization',
    expectedFiles: ['src/core/engine.ts', 'src/server/tools.ts'],
    expectedConcepts: ['errors', 'consistency', 'standardization'],
    difficulty: 'medium'
  },
  {
    id: 'refactor-010',
    category: 'refactor',
    description: 'Remove dead code',
    query: 'Identify potentially unused exports and functions',
    expectedFiles: ['src/utils/files.ts', 'src/utils/config.ts'],
    expectedConcepts: ['dead code', 'cleanup', 'exports'],
    difficulty: 'medium'
  }
];

// ============================================================================
// CODE REVIEW QUERIES (10 queries)
// ============================================================================

export const codeReviewQueries: TestQuery[] = [
  {
    id: 'review-001',
    category: 'code_review',
    description: 'Security review',
    query: 'Review the file reading code for security issues',
    expectedFiles: ['src/core/engine.ts', 'src/utils/files.ts'],
    expectedConcepts: ['security', 'path traversal', 'validation'],
    difficulty: 'hard'
  },
  {
    id: 'review-002',
    category: 'code_review',
    description: 'Pattern adherence',
    query: 'Check if the new error handling follows existing patterns',
    expectedFiles: ['src/core/engine.ts', 'src/server/tools.ts'],
    expectedConcepts: ['patterns', 'consistency', 'errors'],
    difficulty: 'medium'
  },
  {
    id: 'review-003',
    category: 'code_review',
    description: 'Bug detection',
    query: 'Look for potential bugs in the context assembly logic',
    expectedFiles: ['src/core/context.ts'],
    expectedConcepts: ['bugs', 'logic', 'assembly'],
    difficulty: 'hard'
  },
  {
    id: 'review-004',
    category: 'code_review',
    description: 'Performance review',
    query: 'Review the embedding generation for performance bottlenecks',
    expectedFiles: ['src/indexing/embeddings.ts'],
    expectedConcepts: ['performance', 'bottlenecks', 'optimization'],
    difficulty: 'hard'
  },
  {
    id: 'review-005',
    category: 'code_review',
    description: 'Type safety',
    query: 'Check for any TypeScript type safety issues in recent changes',
    expectedFiles: ['src/types/index.ts', 'src/core/engine.ts'],
    expectedConcepts: ['types', 'safety', 'TypeScript'],
    difficulty: 'medium'
  },
  {
    id: 'review-006',
    category: 'code_review',
    description: 'Test coverage',
    query: 'What parts of the codebase lack test coverage?',
    expectedFiles: ['tests/unit/tokens.test.ts', 'tests/unit/files.test.ts'],
    expectedConcepts: ['testing', 'coverage', 'gaps'],
    difficulty: 'medium'
  },
  {
    id: 'review-007',
    category: 'code_review',
    description: 'Documentation completeness',
    query: 'Which exported functions are missing documentation?',
    expectedFiles: ['src/core/engine.ts', 'src/server/tools.ts'],
    expectedConcepts: ['documentation', 'completeness', 'JSDoc'],
    difficulty: 'easy'
  },
  {
    id: 'review-008',
    category: 'code_review',
    description: 'API design',
    query: 'Review the tool definitions for consistency and clarity',
    expectedFiles: ['src/server/tools.ts'],
    expectedConcepts: ['API', 'design', 'consistency'],
    difficulty: 'medium'
  },
  {
    id: 'review-009',
    category: 'code_review',
    description: 'Resource management',
    query: 'Check for proper resource cleanup in database connections',
    expectedFiles: ['src/storage/database.ts', 'src/core/engine.ts'],
    expectedConcepts: ['resources', 'cleanup', 'connections'],
    difficulty: 'medium'
  },
  {
    id: 'review-010',
    category: 'code_review',
    description: 'Edge cases',
    query: 'What edge cases are not handled in the file watching logic?',
    expectedFiles: ['src/indexing/watcher.ts'],
    expectedConcepts: ['edge cases', 'handling', 'robustness'],
    difficulty: 'hard'
  }
];

// ============================================================================
// ALL QUERIES COMBINED
// ============================================================================

export const allQueries: TestQuery[] = [
  ...informationRetrievalQueries,
  ...bugDiagnosisQueries,
  ...featureImplementationQueries,
  ...codeUnderstandingQueries,
  ...refactoringQueries,
  ...codeReviewQueries
];

// ============================================================================
// QUERIES BY TASK TYPE
// ============================================================================

export const queriesByTask: Record<TaskType, TestQuery[]> = {
  information_retrieval: informationRetrievalQueries,
  bug_fix: bugDiagnosisQueries,
  feature_add: featureImplementationQueries,
  code_understanding: codeUnderstandingQueries,
  refactor: refactoringQueries,
  code_review: codeReviewQueries
};

// ============================================================================
// QUERIES BY DIFFICULTY
// ============================================================================

export const queriesByDifficulty = {
  easy: allQueries.filter(q => q.difficulty === 'easy'),
  medium: allQueries.filter(q => q.difficulty === 'medium'),
  hard: allQueries.filter(q => q.difficulty === 'hard')
};

// ============================================================================
// TEST SCENARIOS
// ============================================================================

export const testScenarios: TestScenario[] = [
  {
    name: 'Basic Information Retrieval',
    description: 'Tests ability to find types, functions, and files',
    queries: informationRetrievalQueries
  },
  {
    name: 'Bug Diagnosis',
    description: 'Tests debugging and error analysis capabilities',
    queries: bugDiagnosisQueries
  },
  {
    name: 'Feature Implementation',
    description: 'Tests development velocity and code reuse',
    queries: featureImplementationQueries
  },
  {
    name: 'Code Understanding',
    description: 'Tests architectural comprehension',
    queries: codeUnderstandingQueries
  },
  {
    name: 'Refactoring',
    description: 'Tests code restructure assistance',
    queries: refactoringQueries
  },
  {
    name: 'Code Review',
    description: 'Tests quality assurance assistance',
    queries: codeReviewQueries
  }
];

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that a result contains expected files
 */
export function validateExpectedFiles(result: { files?: string[] }, expectedFiles: string[]): boolean {
  if (!result.files || result.files.length === 0) return false;
  
  // Check if at least one expected file is in the result
  return expectedFiles.some(expected => 
    result.files!.some(file => file.includes(expected))
  );
}

/**
 * Get queries for a specific task
 */
export function getQueriesForTask(task: TaskType): TestQuery[] {
  return queriesByTask[task] || [];
}

/**
 * Get random subset of queries
 */
export function getRandomQueries(count: number, difficulty?: 'easy' | 'medium' | 'hard'): TestQuery[] {
  const pool = difficulty ? queriesByDifficulty[difficulty] : allQueries;
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Get balanced query set across all categories
 */
export function getBalancedQuerySet(totalQueries: number): TestQuery[] {
  const perCategory = Math.floor(totalQueries / 6);
  const remainder = totalQueries % 6;
  
  const queries: TestQuery[] = [];
  
  Object.values(queriesByTask).forEach((taskQueries, index) => {
    const count = perCategory + (index < remainder ? 1 : 0);
    queries.push(...taskQueries.slice(0, count));
  });
  
  return queries;
}

// Export total count for validation
export const totalQueryCount = allQueries.length;
export const queriesPerTask = Object.fromEntries(
  Object.entries(queriesByTask).map(([task, queries]) => [task, queries.length])
);
