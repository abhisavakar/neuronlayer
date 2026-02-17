/**
 * Intent Detection and Query Routing
 *
 * Provides auto-detection of user intent to route to appropriate internal tools.
 */

import type {
  MemoryQueryInput,
  MemoryQueryAction,
  MemoryRecordInput,
  MemoryRecordType,
  MemoryReviewInput,
  MemoryReviewAction,
  MemoryStatusInput,
  MemoryStatusAction,
} from './types.js';

// ============================================================================
// Pattern Detection
// ============================================================================

/**
 * Detects if a string looks like a file path
 */
export function isFilePath(str: string): boolean {
  // Common file path patterns
  const filePatterns = [
    /^\.?\/?[\w-]+(?:\/[\w-]+)*\.\w+$/, // src/foo/bar.ts
    /^[a-zA-Z]:\\/, // Windows absolute path
    /^\//, // Unix absolute path
    /\.(ts|js|tsx|jsx|py|go|rs|java|cpp|c|h|md|json|yaml|yml|toml)$/i, // File extensions
  ];
  return filePatterns.some(pattern => pattern.test(str));
}

/**
 * Detects if a string looks like a symbol name (function, class, etc.)
 */
export function isSymbolName(str: string): boolean {
  // PascalCase or camelCase identifiers without spaces
  const symbolPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  // Should not be a common word
  const commonWords = ['the', 'and', 'for', 'with', 'how', 'what', 'why', 'when', 'where', 'is', 'are', 'was', 'were'];
  return symbolPattern.test(str) && !commonWords.includes(str.toLowerCase()) && str.length > 1;
}

/**
 * Detects if a string contains code
 */
export function containsCode(str: string): boolean {
  // Look for code-like patterns
  const codePatterns = [
    /function\s+\w+\s*\(/,           // function declarations
    /const\s+\w+\s*=/,               // const declarations
    /let\s+\w+\s*=/,                 // let declarations
    /class\s+\w+/,                   // class declarations
    /interface\s+\w+/,               // interface declarations
    /=>/,                            // arrow functions
    /\{\s*\n/,                       // code blocks
    /import\s+.*from/,               // imports
    /export\s+(default\s+)?/,        // exports
    /if\s*\(.+\)\s*\{/,              // if statements
    /for\s*\(.+\)\s*\{/,             // for loops
    /async\s+function/,              // async functions
    /await\s+/,                      // await expressions
    /try\s*\{/,                      // try blocks
    /catch\s*\(/,                    // catch blocks
    /return\s+/,                     // return statements
  ];
  return codePatterns.some(pattern => pattern.test(str));
}

/**
 * Detects if a string looks like an error message
 */
export function isErrorMessage(str: string): boolean {
  const errorPatterns = [
    /error:/i,
    /exception:/i,
    /failed:/i,
    /cannot\s+/i,
    /unable\s+to/i,
    /TypeError/i,
    /ReferenceError/i,
    /SyntaxError/i,
    /undefined\s+is\s+not/i,
    /is\s+not\s+defined/i,
    /not\s+a\s+function/i,
    /cannot\s+read\s+property/i,
  ];
  return errorPatterns.some(pattern => pattern.test(str));
}

// ============================================================================
// Query Router
// ============================================================================

/**
 * Auto-detect the best action for a memory query
 */
export function detectQueryAction(input: MemoryQueryInput): MemoryQueryAction {
  // Explicit action takes priority
  if (input.action) return input.action;

  // Code provided → confidence/sources/existing check
  if (input.code && input.code.length > 20) {
    if (containsCode(input.code)) {
      return 'confidence';
    }
  }

  // File path provided → file context
  if (input.file && isFilePath(input.file)) {
    return 'file';
  }

  // Symbol name provided → symbol lookup
  if (input.symbol && isSymbolName(input.symbol)) {
    return 'symbol';
  }

  // Query looks like a file path → file context
  if (isFilePath(input.query)) {
    return 'file';
  }

  // Query is a single symbol-like word → symbol lookup
  if (isSymbolName(input.query) && !input.query.includes(' ')) {
    return 'symbol';
  }

  // Default: combined context + search
  return 'context';
}

/**
 * Parse the query to extract file paths, symbols, and search terms
 */
export function parseQuery(query: string): {
  files: string[];
  symbols: string[];
  searchTerms: string;
} {
  const words = query.split(/\s+/);
  const files: string[] = [];
  const symbols: string[] = [];
  const searchTerms: string[] = [];

  for (const word of words) {
    if (isFilePath(word)) {
      files.push(word);
    } else if (isSymbolName(word) && word.length > 3) {
      // Longer identifiers are likely symbols
      symbols.push(word);
      searchTerms.push(word); // Also include as search term
    } else {
      searchTerms.push(word);
    }
  }

  return {
    files,
    symbols,
    searchTerms: searchTerms.join(' '),
  };
}

// ============================================================================
// Record Router
// ============================================================================

/**
 * Auto-detect the type of record to create
 */
export function detectRecordType(input: MemoryRecordInput): MemoryRecordType {
  // Explicit type/action takes priority
  if (input.type) return input.type;
  if (input.action) return input.action;

  // Pattern-related inputs
  if (input.pattern_id && input.code) {
    return 'example';
  }
  if (input.pattern_name || (input.code && input.category)) {
    return 'pattern';
  }

  // Feedback input
  if (input.query !== undefined && input.was_useful !== undefined) {
    return 'feedback';
  }

  // Critical content
  if (input.critical_type || input.reason) {
    return 'critical';
  }

  // Feature context (content is a feature name, no title)
  if (!input.title && input.content && input.content.length < 50 && !input.code) {
    return 'feature';
  }

  // Default to decision
  return 'decision';
}

/**
 * Validate record input has required fields for the detected type
 */
export function validateRecordInput(input: MemoryRecordInput): {
  valid: boolean;
  error?: string;
  type: MemoryRecordType;
} {
  const type = detectRecordType(input);

  switch (type) {
    case 'decision':
      if (!input.title) {
        return { valid: false, error: 'Decision requires a title', type };
      }
      if (!input.content) {
        return { valid: false, error: 'Decision requires content/description', type };
      }
      break;

    case 'pattern':
      if (!input.code) {
        return { valid: false, error: 'Pattern requires code example', type };
      }
      if (!input.pattern_name && !input.title) {
        return { valid: false, error: 'Pattern requires a name', type };
      }
      break;

    case 'example':
      if (!input.pattern_id) {
        return { valid: false, error: 'Example requires pattern_id', type };
      }
      if (!input.code) {
        return { valid: false, error: 'Example requires code', type };
      }
      if (!input.explanation && !input.content) {
        return { valid: false, error: 'Example requires explanation', type };
      }
      break;

    case 'feedback':
      if (input.was_useful === undefined) {
        return { valid: false, error: 'Feedback requires was_useful boolean', type };
      }
      break;

    case 'feature':
      if (!input.content) {
        return { valid: false, error: 'Feature requires a name (in content field)', type };
      }
      break;

    case 'critical':
      if (!input.content) {
        return { valid: false, error: 'Critical content requires content', type };
      }
      break;
  }

  return { valid: true, type };
}

// ============================================================================
// Review Router
// ============================================================================

/**
 * Auto-detect the best action for a memory review
 */
export function detectReviewAction(input: MemoryReviewInput): MemoryReviewAction {
  // Explicit action takes priority
  if (input.action) return input.action;

  // Error message provided → bug search
  if (input.error && isErrorMessage(input.error)) {
    return 'bugs';
  }

  // File provided with code → full review including tests
  if (input.file && input.code) {
    return 'full';
  }

  // Just code → pattern validation + conflicts
  if (input.code && !input.file) {
    return 'pattern';
  }

  // Default to full review
  return 'full';
}

/**
 * Determine which checks to run for a review
 */
export function getReviewChecks(input: MemoryReviewInput): {
  runPatterns: boolean;
  runConflicts: boolean;
  runConfidence: boolean;
  runExisting: boolean;
  runTests: boolean;
  runBugs: boolean;
  runCoverage: boolean;
} {
  const action = detectReviewAction(input);

  // Full review runs everything applicable
  if (action === 'full') {
    return {
      runPatterns: input.include_patterns !== false,
      runConflicts: true,
      runConfidence: true,
      runExisting: !!input.intent,
      runTests: !!input.file && input.include_tests !== false,
      runBugs: !!input.error,
      runCoverage: false, // Only on explicit request
    };
  }

  // Specific actions
  return {
    runPatterns: action === 'pattern',
    runConflicts: action === 'conflicts',
    runConfidence: action === 'confidence',
    runExisting: false,
    runTests: action === 'tests',
    runBugs: action === 'bugs',
    runCoverage: action === 'coverage',
  };
}

// ============================================================================
// Status Router
// ============================================================================

/**
 * Auto-detect the best action for a memory status query
 */
export function detectStatusAction(input: MemoryStatusInput): MemoryStatusAction {
  // Explicit action takes priority
  if (input.action) return input.action;

  // Time-based queries
  if (input.since) {
    if (input.author || input.file) {
      return 'changed';
    }
    return 'happened';
  }

  // Category provided → patterns
  if (input.category) {
    return 'patterns';
  }

  // History requested → health
  if (input.include_history) {
    return 'health';
  }

  // Scope-based routing
  switch (input.scope) {
    case 'architecture':
      return 'architecture';
    case 'changes':
      return 'changed';
    case 'docs':
      return 'undocumented';
    case 'health':
      return 'health';
    case 'patterns':
      return 'patterns';
    default:
      return 'summary';
  }
}

/**
 * Determine which status information to gather
 */
export function getStatusGathers(input: MemoryStatusInput): {
  gatherProject: boolean;
  gatherArchitecture: boolean;
  gatherChanges: boolean;
  gatherActivity: boolean;
  gatherDocs: boolean;
  gatherHealth: boolean;
  gatherPatterns: boolean;
  gatherStats: boolean;
  gatherCritical: boolean;
  gatherLearning: boolean;
  gatherUndocumented: boolean;
} {
  const scope = input.scope || 'project';

  // 'all' scope gathers everything
  if (scope === 'all') {
    return {
      gatherProject: true,
      gatherArchitecture: true,
      gatherChanges: !!input.since,
      gatherActivity: !!input.since,
      gatherDocs: true,
      gatherHealth: true,
      gatherPatterns: true,
      gatherStats: true,
      gatherCritical: true,
      gatherLearning: true,
      gatherUndocumented: false, // Can be large, skip for 'all'
    };
  }

  // Scope-specific gathering
  return {
    gatherProject: scope === 'project',
    gatherArchitecture: scope === 'architecture',
    gatherChanges: scope === 'changes',
    gatherActivity: scope === 'changes' && !!input.since,
    gatherDocs: scope === 'docs',
    gatherHealth: scope === 'health',
    gatherPatterns: scope === 'patterns',
    gatherStats: scope === 'architecture',
    gatherCritical: scope === 'health',
    gatherLearning: scope === 'project',
    gatherUndocumented: scope === 'docs',
  };
}
