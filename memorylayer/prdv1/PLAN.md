# MemoryLayer PRD v1 - Living Documentation Implementation Plan

> Implementation plan for the Living Documentation feature

## Current Status Summary

### Fully Implemented
| Feature | Priority | Status |
|---------|----------|--------|
| Active Feature Context | P0 | ✅ Complete |
| Multi-Project Support | P4 | ✅ Complete |
| Decision Recording & ADR Export | - | ✅ Complete |
| Semantic Search & Indexing | - | ✅ Complete |
| AST & Symbol Extraction | - | ✅ Complete |
| File Summarization (10x compression) | - | ✅ Complete |
| Living Documentation | P0 | ✅ Complete |
| Context Rot Prevention | P0 | ✅ Complete |
| Confidence Scoring | P1 | ✅ Complete |
| Change Intelligence | P1 | ✅ Complete |
| Architecture Enforcement | P2 | ✅ Complete |
| Test-Aware Suggestions | P2 | ✅ Complete |

### All Phases Complete! 🎉

---

## Design Decisions

1. **Generation Trigger**: Event-driven (git push, milestones, feature changes)
2. **Diagrams**: ASCII art (works everywhere, no dependencies)
3. **Scope**: All 7 MCP tools
4. **AI Usage**: 90% no-AI (free), 10% AI-powered (optional enhancements)

---

## Files Created

```
src/core/living-docs/
├── index.ts                    # Barrel export
├── doc-engine.ts               # Main LivingDocumentationEngine
├── architecture-generator.ts   # Architecture doc generation
├── component-generator.ts      # Component doc from AST
├── changelog-generator.ts      # Git-based changelogs
├── doc-validator.ts            # Outdated/undocumented detection
└── activity-tracker.ts         # "What happened" queries

src/types/
└── documentation.ts            # New types
```

## Files Modified

| File | Changes |
|------|---------|
| `src/server/tools.ts` | Add 7 new MCP tools |
| `src/core/engine.ts` | Initialize LivingDocs, expose methods |
| `src/types/index.ts` | Export documentation types |
| `src/storage/database.ts` | Add documentation + activity tables |

---

## Type Definitions

### File: `src/types/documentation.ts`

```typescript
// Architecture Documentation Types
export interface ArchitectureDoc {
  name: string;
  description: string;
  diagram: string;                    // ASCII art diagram
  layers: ArchitectureLayer[];
  dataFlow: DataFlowStep[];
  keyComponents: ComponentReference[];
  dependencies: DependencyInfo[];
  generatedAt: Date;
}

export interface ArchitectureLayer {
  name: string;              // e.g., "API Layer", "Business Logic"
  directory: string;         // e.g., "src/server"
  files: string[];
  purpose: string;
}

export interface DataFlowStep {
  from: string;
  to: string;
  description: string;
}

export interface ComponentReference {
  name: string;
  file: string;
  purpose: string;
  exports: string[];
}

export interface DependencyInfo {
  name: string;
  version?: string;
  type: 'runtime' | 'dev';
}

// Component Documentation Types
export interface ComponentDoc {
  file: string;
  name: string;
  purpose: string;
  created?: Date;
  lastModified: Date;

  publicInterface: SymbolDoc[];
  dependencies: DependencyDoc[];
  dependents: DependentDoc[];

  changeHistory: ChangeHistoryEntry[];
  contributors: string[];

  complexity: 'low' | 'medium' | 'high';
  documentationScore: number;  // 0-100%
}

export interface SymbolDoc {
  name: string;
  kind: string;
  signature?: string;
  description?: string;
  lineStart: number;
  lineEnd: number;
  exported: boolean;
}

export interface DependencyDoc {
  file: string;
  symbols: string[];
}

export interface DependentDoc {
  file: string;
  symbols: string[];
}

export interface ChangeHistoryEntry {
  date: Date;
  change: string;
  author: string;
  commit: string;
  linesChanged: { added: number; removed: number };
}

// Changelog Types
export interface DailyChangelog {
  date: Date;
  summary: string;
  features: ChangeEntry[];
  fixes: ChangeEntry[];
  refactors: ChangeEntry[];
  filesModified: FileChangeInfo[];
  decisions: string[];
  metrics: ChangeMetrics;
}

export interface ChangeEntry {
  type: 'feature' | 'fix' | 'refactor' | 'docs' | 'test' | 'chore';
  description: string;
  files: string[];
  commit?: string;
}

export interface FileChangeInfo {
  file: string;
  added: number;
  removed: number;
  type: 'new' | 'modified' | 'deleted';
}

export interface ChangeMetrics {
  commits: number;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
}

export interface ChangelogOptions {
  since?: Date | string;
  until?: Date;
  groupBy?: 'day' | 'week' | 'feature';
  includeDecisions?: boolean;
}

// Activity Query Types
export interface ActivityResult {
  timeRange: { since: Date; until: Date };
  scope: string;
  summary: string;
  changes: ActivityChange[];
  decisions: ActivityDecision[];
  filesAffected: string[];
}

export interface ActivityChange {
  timestamp: Date;
  type: 'commit' | 'file_change' | 'decision';
  description: string;
  details: Record<string, unknown>;
}

export interface ActivityDecision {
  id: string;
  title: string;
  date: Date;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  outdatedDocs: OutdatedDoc[];
  undocumentedCode: UndocumentedItem[];
  suggestions: DocSuggestion[];
  score: number;  // 0-100%
}

export interface OutdatedDoc {
  file: string;
  reason: string;
  lastDocUpdate: Date;
  lastCodeChange: Date;
  severity: 'low' | 'medium' | 'high';
}

export interface UndocumentedItem {
  file: string;
  symbol?: string;
  type: 'file' | 'function' | 'class' | 'interface';
  importance: 'low' | 'medium' | 'high';
}

export interface DocSuggestion {
  file: string;
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
}
```

---

## Class Implementations

### 1. LivingDocumentationEngine (Main Orchestrator)

**File:** `src/core/living-docs/doc-engine.ts`

Coordinates all generators and provides the public API.

### 2. ArchitectureGenerator

**File:** `src/core/living-docs/architecture-generator.ts`

- Detects project layers from directory structure
- Maps directories to architectural layers (API, Business Logic, Data, etc.)
- Generates ASCII diagrams
- Infers data flow between layers

### 3. ComponentGenerator

**File:** `src/core/living-docs/component-generator.ts`

- Generates documentation from AST data
- Extracts public interface (exported symbols)
- Gets change history from git
- Calculates complexity and documentation score

### 4. ChangelogGenerator

**File:** `src/core/living-docs/changelog-generator.ts`

- Parses git log for commits
- Categorizes commits (feature, fix, refactor, etc.)
- Groups by day/week
- Calculates metrics (files changed, lines added/removed)

### 5. DocValidator

**File:** `src/core/living-docs/doc-validator.ts`

- Finds outdated documentation
- Finds undocumented exported symbols
- Generates suggestions
- Calculates documentation score

### 6. ActivityTracker

**File:** `src/core/living-docs/activity-tracker.ts`

- Answers "what happened since X" queries
- Combines git activity with recorded decisions
- Logs activities to database

---

## MCP Tool Definitions

### Added to `src/server/tools.ts`

```typescript
{
  name: 'generate_docs',
  description: 'Generate documentation for a file or the entire architecture',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to document (omit for architecture)' },
      type: { type: 'string', enum: ['component', 'architecture'] }
    }
  }
},
{
  name: 'get_architecture',
  description: 'Get project architecture overview with layers and data flow',
  inputSchema: { type: 'object', properties: {} }
},
{
  name: 'get_component_doc',
  description: 'Get detailed documentation for a component/file',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path']
  }
},
{
  name: 'get_changelog',
  description: 'Get changelog of recent changes',
  inputSchema: {
    type: 'object',
    properties: {
      since: { type: 'string', description: '"yesterday", "this week", or date' },
      group_by: { type: 'string', enum: ['day', 'week'] },
      include_decisions: { type: 'boolean' }
    }
  }
},
{
  name: 'validate_docs',
  description: 'Check for outdated docs and calculate documentation score',
  inputSchema: { type: 'object', properties: {} }
},
{
  name: 'what_happened',
  description: 'Query recent project activity',
  inputSchema: {
    type: 'object',
    properties: {
      since: { type: 'string' },
      scope: { type: 'string' }
    },
    required: ['since']
  }
},
{
  name: 'find_undocumented',
  description: 'Find code that lacks documentation',
  inputSchema: {
    type: 'object',
    properties: {
      importance: { type: 'string', enum: ['low', 'medium', 'high', 'all'] },
      type: { type: 'string', enum: ['file', 'function', 'class', 'all'] }
    }
  }
}
```

---

## Database Schema

### Added to `src/storage/database.ts`

```sql
CREATE TABLE IF NOT EXISTS documentation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  content TEXT NOT NULL,
  generated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(file_id, doc_type)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER DEFAULT (unixepoch()),
  activity_type TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  metadata TEXT,
  commit_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(activity_type);
```

---

## Engine Integration

### Added to `src/core/engine.ts`

```typescript
import { LivingDocumentationEngine } from './living-docs/index.js';

export class MemoryLayerEngine {
  private livingDocs: LivingDocumentationEngine;

  constructor(config: MemoryLayerConfig) {
    // ... existing code ...

    this.livingDocs = new LivingDocumentationEngine(
      config.projectPath,
      config.dataDir,
      this.db,
      this.tier2
    );
  }

  // New methods
  async getArchitecture(): Promise<ArchitectureDoc>;
  async getComponentDoc(path: string): Promise<ComponentDoc>;
  async getChangelog(options?: ChangelogOptions): Promise<DailyChangelog[]>;
  async validateDocs(): Promise<ValidationResult>;
  async whatHappened(since: string, scope?: string): Promise<ActivityResult>;
  async findUndocumented(): Promise<UndocumentedItem[]>;
}
```

---

## Implementation Sequence (Completed)

| Day | Tasks | Status |
|-----|-------|--------|
| 1-2 | Types, database schema, ChangelogGenerator, ActivityTracker | ✅ |
| 3-4 | ComponentGenerator, DocValidator.findUndocumented() | ✅ |
| 5-6 | ArchitectureGenerator with ASCII diagrams | ✅ |
| 7-8 | DocValidator.validate(), tests, integration | ✅ |

---

## Verification (All Passed)

1. `npm run build` - ✅ passes
2. `npx tsc --noEmit` - ✅ no type errors
3. `npm test` - ✅ all 36 tests pass

---

## All Phases

| Phase | Feature | Priority | Effort | Status |
|-------|---------|----------|--------|--------|
| 1 | Living Documentation | P0 | 2 weeks | ✅ Complete |
| 2 | Context Rot Prevention | P0 | 1 week | ✅ Complete |
| 3 | Confidence Scoring | P1 | 1 week | ✅ Complete |
| 4 | Change Intelligence | P1 | 1 week | ✅ Complete |
| 5 | Architecture Enforcement | P2 | 2 weeks | ✅ Complete |
| 6 | Test-Aware Suggestions | P2 | 2 weeks | ✅ Complete |

---

## Phase 8: Confidence Scoring Implementation (Completed)

### Files Created
```
src/core/confidence/
├── index.ts                    # Barrel export
├── confidence-scorer.ts        # Main ConfidenceScorer class
├── source-tracker.ts           # Source tracking (codebase, decisions, patterns)
├── warning-detector.ts         # Security, complexity, deprecation warnings
└── conflict-checker.ts         # Decision conflict detection
```

### New MCP Tools
| Tool | Description |
|------|-------------|
| `get_confidence` | Get confidence score for code with sources and warnings |
| `list_sources` | List all sources (codebase matches, decisions, patterns) |
| `check_conflicts` | Check if code conflicts with past decisions |

### Features Implemented
- Confidence scoring (0-100%) with levels: high, medium, low, guessing
- Source tracking: codebase matches, decision matches, pattern matches
- Warning detection: security issues, deprecated patterns, complexity
- Conflict detection: checks code against recorded architectural decisions
- Weighted scoring: 50% codebase, 30% decisions, 20% patterns

---

## Phase 9: Change Intelligence Implementation (Completed)

### Files Created
```
src/core/change-intelligence/
├── index.ts                    # Barrel export
├── change-intelligence.ts      # Main ChangeIntelligence orchestrator
├── change-tracker.ts           # Git change tracking and querying
├── bug-correlator.ts           # Bug correlation with changes
└── fix-suggester.ts            # Fix suggestions based on history
```

### New MCP Tools
| Tool | Description |
|------|-------------|
| `what_changed` | Query what changed (files, authors, line counts) |
| `why_broke` | Diagnose why something broke |
| `find_similar_bugs` | Find similar bugs from history with fixes |
| `suggest_fix` | Get fix suggestions based on history and patterns |

### Features Implemented
- Change tracking from git history
- Bug diagnosis: correlate errors with recent changes
- Similar bug finder: learn from past bugs and fixes
- Fix suggestions: pattern-based and history-based
- Database tables: change_history, bug_history
- Error pattern recognition (10+ common patterns)
- Common fix patterns (10+ patterns with confidence scores)

---

## Phase 10: Architecture Enforcement Implementation (Completed)

### Files Created
```
src/core/architecture/
├── index.ts                    # Barrel export
├── architecture-enforcement.ts # Main ArchitectureEnforcement orchestrator
├── pattern-library.ts          # Pattern storage with SQLite
├── pattern-learner.ts          # Pattern extraction from codebase
├── pattern-validator.ts        # Code validation against patterns
└── duplicate-detector.ts       # Function duplication detection
```

### New MCP Tools
| Tool | Description |
|------|-------------|
| `validate_pattern` | Validate code against established patterns |
| `suggest_existing` | Find existing functions that match intent |
| `learn_pattern` | Teach a new pattern to the system |
| `list_patterns` | List all learned patterns |
| `get_pattern` | Get details of a specific pattern |
| `add_pattern_example` | Add example or anti-pattern to a pattern |
| `get_architecture_stats` | Get statistics about patterns and functions |

### Features Implemented
- Pattern library with SQLite storage
- Default patterns: Error Handling, API Calls, Component Structure, Null Checking, Async/Await
- Pattern learning from codebase (auto-extraction)
- Code validation with scoring (0-100)
- Violation detection with severity levels (info, warning, critical)
- Anti-pattern detection
- Duplicate function detection
- Existing function suggestions
- Pattern categories: error_handling, api_call, component, state_management, data_fetching, authentication, validation, logging, custom

### Database Tables Added
```sql
CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  examples TEXT,
  anti_patterns TEXT,
  rules TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  usage_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns(category);
CREATE INDEX IF NOT EXISTS idx_patterns_name ON patterns(name);
```

### Validation Rules
- Empty catch blocks (critical)
- Console.log in catch blocks (warning)
- API calls without error handling (critical)
- JSON parsing without status check (warning)
- Untyped component props (warning)
- Deep property access without null checking (warning)
- Using var instead of const/let (info)
- Using any type (info)

### Pattern Learning Features
- Auto-detect pattern category from code
- Extract examples from codebase
- Detect pattern rules from code structure
- Normalize code for duplicate detection
- Track pattern usage count      



---

## Phase 11: Test-Aware Suggestions Implementation (Completed)

### Files Created
```
src/core/test-awareness/
├── index.ts                    # Barrel export
├── test-awareness.ts           # Main TestAwareness orchestrator
├── test-indexer.ts             # Test discovery and database indexing
├── test-parser.ts              # Framework-specific test parsing
├── change-validator.ts         # Change impact analysis and failure prediction
└── test-suggester.ts           # Test update suggestions and coverage
```

### New MCP Tools
| Tool | Description |
|------|-------------|
| `get_related_tests` | Get tests related to a file or function |
| `check_tests` | Check if a code change would break tests |
| `suggest_test_update` | Get suggested test updates for a code change |
| `get_test_coverage` | Get test coverage for a file |

### Features Implemented
- Multi-framework test parsing (Jest, Mocha, Vitest, pytest, unittest, Go)
- Automatic framework detection from package.json and config files
- Test discovery using glob patterns
- Test indexing with file/function coverage mapping
- Change impact analysis with risk levels (low, medium, high)
- Test failure prediction with confidence scores
- Test update suggestions for breaking changes
- Test template generation for uncovered functions
- Coverage reporting per file

### Database Tables Added
```sql
CREATE TABLE IF NOT EXISTS test_index (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  test_name TEXT NOT NULL,
  describes TEXT,
  covers_files TEXT,           -- JSON array
  covers_functions TEXT,       -- JSON array
  assertions TEXT,             -- JSON array
  line_start INTEGER,
  line_end INTEGER,
  last_status TEXT,
  last_run INTEGER,
  indexed_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(file_path, test_name)
);

CREATE TABLE IF NOT EXISTS test_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  framework TEXT NOT NULL,
  test_patterns TEXT,          -- JSON array of glob patterns
  last_indexed INTEGER
);
```

### Type Definitions Added
```typescript
type TestFramework = 'jest' | 'mocha' | 'vitest' | 'pytest' | 'unittest' | 'go' | 'unknown';

interface TestInfo {
  id: string;
  file: string;
  name: string;
  describes: string;
  coversFiles: string[];
  coversFunctions: string[];
  assertions: Assertion[];
  lastRun?: Date;
  lastStatus?: 'pass' | 'fail' | 'skip';
  lineStart: number;
  lineEnd: number;
}

interface Assertion {
  type: 'equality' | 'truthiness' | 'error' | 'mock' | 'snapshot' | 'other';
  subject: string;
  expected?: string;
  code: string;
  line: number;
}

interface TestValidationResult {
  safe: boolean;
  relatedTests: TestInfo[];
  wouldPass: TestInfo[];
  wouldFail: PredictedFailure[];
  uncertain: TestInfo[];
  suggestedTestUpdates: TestUpdate[];
  coveragePercent: number;
}

interface PredictedFailure {
  test: TestInfo;
  assertion?: Assertion;
  reason: string;
  confidence: number;
  suggestedFix?: string;
}

interface TestCoverage {
  file: string;
  totalTests: number;
  coveredFunctions: string[];
  uncoveredFunctions: string[];
  coveragePercent: number;
}
```

### Test File Patterns Supported
```typescript
const TEST_PATTERNS = {
  jest: ['**/*.test.{js,ts,jsx,tsx}', '**/*.spec.{js,ts,jsx,tsx}', '**/__tests__/**/*.{js,ts,jsx,tsx}'],
  mocha: ['**/*.test.{js,ts}', '**/*.spec.{js,ts}', 'test/**/*.{js,ts}'],
  vitest: ['**/*.test.{js,ts,jsx,tsx}', '**/*.spec.{js,ts,jsx,tsx}'],
  pytest: ['**/test_*.py', '**/*_test.py', '**/tests/**/*.py'],
  go: ['**/*_test.go'],
};
```

### Key Design Decisions
- No AI required for core indexing (AST/regex parsing)
- AI only used for optional test generation
- Incremental indexing support
- Framework auto-detection

---

## PRD v1 Complete! 🎉

All 6 phases have been implemented:
1. Living Documentation
2. Context Rot Prevention
3. Confidence Scoring
4. Change Intelligence
5. Architecture Enforcement
6. Test-Aware Suggestions

Total MCP Tools: 25+
Total Database Tables: 15+  


