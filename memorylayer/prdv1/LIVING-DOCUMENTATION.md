# Living Documentation

**Feature:** Auto-Documentation Engine
**Priority:** P0 (Killer Feature)
**Status:** Planned
**Effort:** 2 weeks

---

## Problem Statement

### The Documentation Crisis

> "After few days, neither AI nor I know what we did. The documentation is shitty."

**Current Reality:**
- README.md becomes outdated within 2 weeks
- No architecture documentation exists
- "Why did we do this?" - Nobody knows
- "What changed?" requires reading git diffs
- New developer onboarding takes 2 weeks
- AI doesn't understand the project

### Statistics

| Problem | Impact |
|---------|--------|
| Developers spend 30% of time understanding code | Lost productivity |
| Documentation outdated within days | Trust issues |
| No decision history | Repeated mistakes |
| AI context limited | Poor suggestions |

---

## Solution: Auto-Documentation Engine

### Core Concept

Documentation that writes itself by watching what you do:

```
Developer writes code → Doc engine detects changes
Developer makes decision → Decision is logged
Developer asks "what happened?" → Instant answer
```

### Architecture

```typescript
interface LivingDocumentation {
  // Event Watchers
  onFileChange(file: string, diff: string): void;
  onDecisionMade(decision: Decision): void;
  onFeatureComplete(feature: string): void;
  onGitCommit(commit: Commit): void;

  // Document Generators
  generateArchitectureDocs(): ArchitectureDoc;
  generateComponentDoc(file: string): ComponentDoc;
  generateAPIDoc(module: string): APIDoc;
  generateChangeLog(): ChangeLog;
  generateREADME(): README;

  // Query Interface
  whatHappened(since: Date): Change[];
  whyDecision(topic: string): Decision[];
  howComponent(name: string): ComponentDoc;

  // Validation
  validateDocs(): ValidationResult;
  findOutdatedDocs(): string[];
  findUndocumented(): string[];
}
```

---

## Documentation Structure

### Auto-Generated Folder Structure

```
docs/
├── architecture/
│   ├── overview.md           # High-level system architecture
│   ├── data-flow.md          # How data moves through system
│   └── components/
│       ├── component-a.md    # Each major component
│       └── component-b.md
│
├── api/
│   ├── endpoints.md          # REST/GraphQL endpoints
│   ├── types.md              # Type definitions
│   └── examples.md           # Usage examples
│
├── decisions/
│   ├── YYYY-MM-DD-title.md   # Each decision logged
│   └── index.md              # Decision index
│
├── changelog/
│   ├── YYYY-MM-DD.md         # Daily changes
│   └── features/
│       └── feature-name.md   # Per-feature history
│
└── guides/
    ├── getting-started.md    # Auto-generated quickstart
    ├── development.md        # Dev setup from package.json
    └── deployment.md         # From CI/CD configs
```

---

## Auto-Detection Capabilities

### What We Automatically Detect

| Category | Detection Method | Output |
|----------|-----------------|--------|
| **Architecture** | File structure, imports | Overview diagram |
| **Components** | AST parsing | Component docs |
| **Functions** | Function signatures | API reference |
| **Decisions** | Commit messages, comments | Decision log |
| **Changes** | Git diffs | Changelog |
| **Dependencies** | Import analysis | Dependency graph |
| **Patterns** | Code analysis | Pattern library |
| **Tests** | Test file analysis | Test coverage |

### Detection Examples

**File Structure → Architecture**
```
src/
├── core/          → "Business Logic Layer"
├── server/        → "API Layer"
├── storage/       → "Data Layer"
└── utils/         → "Utilities"
```

**Commit Message → Decision**
```
commit: "Use SQLite instead of PostgreSQL for local-first"
↓
Decision Log Entry:
- Date: Feb 14, 2026
- Topic: Database Choice
- Decision: SQLite
- Rationale: Local-first, no server needed
- Alternatives: PostgreSQL, MongoDB
```

**Code Comments → Documentation**
```typescript
// DECISION: Using transformers.js for local embeddings
// REASON: No API costs, privacy, offline support
↓
Decision Log Entry (auto-extracted)
```

---

## Document Templates

### 1. Architecture Overview (Auto-Generated)

```markdown
# Project Architecture

## Overview
[Auto-generated from file structure and imports]

## System Diagram
```
┌─────────────────────────────────────────────┐
│                 MCP Server                   │
├─────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ Context │  │ Search  │  │ Memory  │     │
│  └────┬────┘  └────┬────┘  └────┬────┘     │
│       └───────────┬┼───────────┘           │
│              ┌────┴────┐                    │
│              │ Storage │                    │
│              └─────────┘                    │
└─────────────────────────────────────────────┘
```

## Key Components
| Component | Location | Purpose |
|-----------|----------|---------|
| ContextManager | src/core/context.ts | Manages context |
| SearchEngine | src/core/search.ts | Semantic search |
| MCPServer | src/server/index.ts | Tool endpoints |

## Data Flow
1. User query received
2. Context assembled
3. Search performed
4. Results ranked
5. Response returned

## Recent Changes
- Feb 14: Added confidence scoring
- Feb 13: Refactored search engine
```

### 2. Component Documentation (Auto-Generated)

```markdown
# SearchEngine

**File:** `src/core/search.ts`
**Created:** Feb 10, 2026
**Last Modified:** Feb 14, 2026

## Purpose
Semantic search across codebase using local embeddings.

## Public Interface
```typescript
class SearchEngine {
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  async embed(text: string): Promise<number[]>;
  async index(files: string[]): Promise<void>;
}
```

## Functions

| Function | Purpose | Params | Returns |
|----------|---------|--------|---------|
| search() | Main search | query, options | SearchResult[] |
| embed() | Create embedding | text | number[] |
| index() | Index files | files | void |

## Dependencies
- `transformers.js` - Local embeddings
- `sqlite` - Vector storage
- `../storage/index.ts` - Storage layer

## Used By
- `src/server/tools.ts` - MCP tool handlers
- `src/core/context.ts` - Context assembly

## Example
```typescript
const engine = new SearchEngine();
const results = await engine.search("authentication logic");
// Returns: [{file: "auth.ts", score: 0.92, snippet: "..."}]
```

## Change History
| Date | Change | Author |
|------|--------|--------|
| Feb 14 | Added ranking options | AI |
| Feb 12 | Fixed embedding cache | Abhis |
| Feb 10 | Initial implementation | AI |
```

### 3. Decision Log Entry (Auto-Generated from Commits)

```markdown
# Decision: Use Local Embeddings

**Date:** February 10, 2026
**Author:** Abhis + AI
**Status:** Implemented

## Context
Need embeddings for semantic search functionality.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| OpenAI API | Fast, accurate | API costs, privacy |
| Local transformers.js | Free, private | Slower, ~300ms |
| Ollama | Free, private | Requires separate install |

## Decision
**Use local transformers.js**

## Rationale
1. No API costs - free forever
2. Privacy - code never leaves machine
3. Works offline
4. Good enough accuracy for code search

## Consequences
- First-time indexing slower (~300ms per file)
- Model download on first run (~200MB)
- CPU usage during indexing

## References
- Commit: abc123
- Files: src/core/embeddings.ts
```

### 4. Daily Changelog (Auto-Generated)

```markdown
# February 14, 2026

## Summary
Added confidence scoring feature and fixed search ranking.

## Changes

### New Features
- [NEW] Confidence scoring system (`src/core/confidence.ts`)
  - Tracks sources for each suggestion
  - Detects pattern matches
  - Warns on conflicts

### Bug Fixes
- [FIX] Search ranking inconsistent (`src/core/search.ts:45`)
  - Problem: Results not sorted correctly
  - Solution: Fixed comparator function

### Refactoring
- [REFACTOR] Split context manager (`src/core/context.ts`)
  - Before: Single 500-line file
  - After: 3 focused modules

## Files Modified

| File | +Lines | -Lines | Type |
|------|--------|--------|------|
| confidence.ts | +150 | 0 | New |
| search.ts | +5 | -3 | Fix |
| context.ts | +20 | -40 | Refactor |

## Decisions Made
- Confidence levels: high/medium/low/guessing
- Preserve all sources for transparency

## Metrics
- Commits: 5
- Files changed: 3
- Lines added: 175
- Lines removed: 43

## Next Steps
- [ ] Add confidence to MCP tools
- [ ] Write unit tests
- [ ] Update documentation
```

---

## MCP Tools

### New Tools for Living Documentation

| Tool | Purpose | Example |
|------|---------|---------|
| `generate_docs` | Generate docs for file/folder | "Document src/core/" |
| `get_architecture` | Get architecture overview | "Show me the architecture" |
| `get_component_doc` | Get component documentation | "How does SearchEngine work?" |
| `get_changelog` | Get recent changes | "What changed this week?" |
| `validate_docs` | Check for outdated docs | "Are docs up to date?" |
| `record_decision` | Log a decision | "We chose X because Y" |
| `what_happened` | Query recent activity | "What did we do yesterday?" |
| `find_undocumented` | Find code without docs | "What needs documentation?" |

### Tool Specifications

```typescript
// generate_docs
{
  name: "generate_docs",
  description: "Generate documentation for a file or folder",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to document" },
      type: {
        type: "string",
        enum: ["component", "api", "architecture"],
        description: "Documentation type"
      },
      depth: { type: "number", description: "Recursion depth" }
    },
    required: ["path"]
  }
}

// what_happened
{
  name: "what_happened",
  description: "Query recent changes and decisions",
  inputSchema: {
    type: "object",
    properties: {
      since: {
        type: "string",
        description: "Time range: 'yesterday', 'this week', 'Feb 10'"
      },
      scope: {
        type: "string",
        description: "Filter: file path, feature name, or 'all'"
      }
    },
    required: ["since"]
  }
}

// record_decision
{
  name: "record_decision",
  description: "Log an architectural or technical decision",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Decision title" },
      context: { type: "string", description: "Why was this needed?" },
      decision: { type: "string", description: "What was decided" },
      rationale: { type: "string", description: "Why this choice" },
      alternatives: {
        type: "array",
        items: { type: "string" },
        description: "Other options considered"
      }
    },
    required: ["title", "decision", "rationale"]
  }
}
```

---

## Implementation

### Phase 1: Foundation (Week 1)

1. **File Watcher Integration**
   - Hook into existing file watcher
   - Track file changes with diffs
   - Store change history

2. **Git Integration**
   - Parse commit messages
   - Extract decisions from commits
   - Track author information

3. **Basic Doc Generation**
   - Component documentation
   - Function documentation
   - Simple architecture overview

### Phase 2: Intelligence (Week 2)

1. **Decision Extraction**
   - Parse comments for DECISION/REASON tags
   - Extract from commit messages
   - Learn from code patterns

2. **Changelog Generation**
   - Daily changelog automation
   - Feature-based grouping
   - Smart categorization

3. **Doc Validation**
   - Detect outdated docs
   - Find undocumented code
   - Suggest updates

### Files to Create

| File | Purpose |
|------|---------|
| `src/core/living-docs.ts` | Main documentation engine |
| `src/core/doc-generator.ts` | Document generators |
| `src/core/decision-tracker.ts` | Decision logging |
| `src/core/changelog-generator.ts` | Changelog automation |
| `src/core/doc-validator.ts` | Documentation validation |

### Files to Modify

| File | Changes |
|------|---------|
| `src/server/tools.ts` | Add new MCP tools |
| `src/core/file-watcher.ts` | Hook doc generation |
| `src/storage/index.ts` | Store documentation |

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Doc generation (single file) | <500ms |
| Architecture overview | <2s |
| Changelog generation | <1s |
| "What happened?" query | <100ms |
| Doc validation | <5s |

---

## Industry Standard Potential

### Documentation Format Standard

```yaml
# .memorylayer/doc-config.yaml
version: "1.0"
output: "./docs"
structure:
  architecture: true
  components: true
  decisions: true
  changelog: true
formats:
  - markdown
  - json  # Machine-readable
auto_generate:
  on_commit: true
  on_file_change: true
  schedule: "daily"
```

### Why This Becomes a Standard

1. **Consistency** - Same format across all projects
2. **Machine-Readable** - AI can parse and understand
3. **Auto-Updated** - Always current
4. **Comprehensive** - Architecture + Decisions + Changes
5. **Portable** - Works with any tool

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Documentation freshness | Outdated in days | Always current |
| Developer onboarding time | 2 weeks | 2 hours |
| "What happened?" response | Read git log | Instant answer |
| Decision recall | "I don't remember" | Full history |
| AI project understanding | Limited | Complete |

---

## Why This Is THE Killer Feature

### Lock-In Effect

Once users have auto-generated documentation:
1. They depend on it for daily work
2. They can't switch to tools without it
3. Their AI assistants need it
4. Their team needs it

### Competitive Moat

| Competitor | Has This? |
|------------|-----------|
| OpenClaw | No |
| Mem0 | No |
| Claude Context | No |
| GitHub Copilot | No |
| Cursor | No |
| **MemoryLayer** | **Yes** |

### Marketing Impact

> "Your codebase documents itself."
> "What did we do yesterday? - Answered in seconds."
> "Never write documentation again."

---

## Next Steps

1. [ ] Implement file watcher hooks
2. [ ] Build doc generators
3. [ ] Create decision tracker
4. [ ] Add MCP tools
5. [ ] Test with real projects
6. [ ] Refine based on feedback

---

## AI vs No-AI Components

### No-AI (Free, Instant) - 90%

| Component | Method | Cost |
|-----------|--------|------|
| File structure detection | File system parsing | FREE |
| Function/class extraction | AST parsing | FREE |
| Import/dependency mapping | AST parsing | FREE |
| Git history tracking | Git commands | FREE |
| Change detection | File diff | FREE |
| Daily changelog generation | Template + git data | FREE |
| Decision logging | SQLite storage | FREE |
| Component doc structure | Template-based | FREE |

### AI-Powered (Smart, On-demand) - 10%

| Component | When Used | Cost |
|-----------|-----------|------|
| Code explanations | On significant changes (>5 lines) | ~$0.01/file |
| Architecture overview | On user request | ~$0.02 |
| "Why" documentation | On user request | ~$0.01 |
| Design decision inference | On user request | ~$0.01 |

### Hybrid Approach

```
Template generates (FREE):          AI enhances (COSTS):
├── File: src/auth.ts               ├── Purpose: "Handles JWT auth..."
├── Functions: login(), logout()    ├── How: "Validates, issues tokens..."
├── Dependencies: jwt, bcrypt       └── Why: "Uses bcrypt for security..."
├── Lines: 150
└── Modified: Feb 14
```

### Cost Estimate
- Per file (with AI): ~$0.01
- Per file (no AI): FREE
- Monthly (10 files/day): ~$2.00

### When AI Runs
- On significant code changes (>5 lines of logic)
- On user request ("explain this file")
- **NOT** on every save

---

*Living Documentation Specification - February 2026*
