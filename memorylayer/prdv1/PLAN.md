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

### Not Implemented
| Feature | Priority | Effort | Status |
|---------|----------|--------|--------|
| Confidence Scoring | P1 | 1 week | ❌ Not started |
| Change Intelligence | P1 | 1 week | ❌ Not started |
| Architecture Enforcement | P2 | 2 weeks | ❌ Not started |
| Test-Aware Suggestions | P2 | 2 weeks | ❌ Not started |

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

## Future Phases

| Phase | Feature | Priority | Effort |
|-------|---------|----------|--------|
| 3 | Confidence Scoring | P1 | 1 week |
| 4 | Change Intelligence | P1 | 1 week |
| 5 | Architecture Enforcement | P2 | 2 weeks |
| 6 | Test-Aware Suggestions | P2 | 2 weeks |      