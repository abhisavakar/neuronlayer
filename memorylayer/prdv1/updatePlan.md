# MemoryLayer Phase 12: Super Intelligent Brain

> Making MemoryLayer feel "telepathic" - knows what you need before you ask

## Overview

Phase 12 extends the **4+6 Gateway Pattern** (4 gateways + 6 standalone = 10 tools) to **5+6 Pattern** (5 gateways + 6 standalone = 11 tools) by adding the `memory_ghost` gateway for proactive intelligence.

**New Capabilities:**
- **Ghost Mode**: Silently tracks work, surfaces relevant decisions automatically
- **Conflict Radar**: Warns when code conflicts with past architectural decisions
- **Deja Vu Detection**: "You solved a similar problem 2 weeks ago in auth.ts"
- **Context Resurrection**: "Welcome back! Last time you were working on X, stuck on Y"
- **Background Intelligence**: Continuously learns without user intervention

---

## The 5 Gateway Tools (Updated from 4)

### 1. `memory_query` - "What do I need to know?"
**Routes to:** get_context, search_codebase, get_file_context, get_file_summary, get_symbol, get_dependencies, get_predicted_files, get_confidence, list_sources, suggest_existing

**Phase 12 Enhancements:**
- Now includes **deja vu matches** in responses
- Adds **predicted files** for proactive context
- Records queries for future deja vu detection
- Notifies ghost mode of file access

### 2. `memory_record` - "Remember this"
**Routes to:** record_decision, record_decision_with_author, learn_pattern, mark_context_useful, set_feature_context, mark_critical, add_pattern_example

**Phase 12 Enhancements:**
- **Smart Decision Detection**: Auto-detects when content looks like a decision
- Pattern matching for decision language ("we'll use", "decided to", "instead of")
- Extracts suggested titles from decision content
- Provides helpful hints when recording

### 3. `memory_review` - "Check this code"
**Routes to:** validate_pattern, check_conflicts, suggest_existing, check_tests, get_confidence, find_similar_bugs, suggest_test_update, get_related_tests, get_test_coverage

**Phase 12 Enhancements:**
- Integrates **Ghost Mode conflict detection** in all reviews
- Merges ghost conflicts into response
- Adjusts risk score based on detected conflicts

### 4. `memory_status` - "What's the state?"
**Routes to:** get_project_summary, what_happened, what_changed, get_architecture, get_changelog, validate_docs, get_context_health, list_patterns, get_architecture_stats, find_undocumented, get_critical_context, get_learning_stats

**Phase 12 Enhancements:**
- `action=learning` now includes **context resurrection** data
- Returns resurrectable contexts list
- Includes deja vu statistics

### 5. `memory_ghost` - "Proactive Intelligence" (NEW)
**The Super Intelligent Brain gateway**

**Modes:**
| Mode | Description | Use Case |
|------|-------------|----------|
| `full` | Complete ghost data (insight + deja vu + resurrection) | Session start, general awareness |
| `conflicts` | Check code for decision conflicts | Before writing code |
| `dejavu` | Find "You solved this before" moments | When approaching similar problems |
| `resurrect` | Get session continuity data | Returning to work |

---

## 6 Standalone Tools (Unchanged)

1. `switch_project` - Changes global project context
2. `switch_feature_context` - Changes feature tracking
3. `trigger_compaction` - Destructive operation
4. `update_decision_status` - Requires decision ID
5. `export_decisions_to_adr` - File system write
6. `discover_projects` - System-wide discovery

---

## Files Created

```
src/core/
├── ghost-mode.ts           # Ghost Mode - Silent Intelligence Layer
├── deja-vu.ts              # Deja Vu Detection - Similar Problem Recognition

src/server/gateways/
└── memory-ghost.ts         # New memory_ghost gateway
```

### `src/core/ghost-mode.ts`

**Purpose:** Silently tracks file access and pre-fetches related decisions. Detects conflicts between code and past architectural decisions.

```typescript
export class GhostMode {
  // Called when any file is read - silently track and pre-fetch decisions
  async onFileAccess(filePath: string): Promise<void>;

  // Called before code is written - returns potential conflicts
  checkConflicts(code: string, targetFile?: string): ConflictWarning[];

  // Get current ghost insight - what the system knows about current work
  getInsight(): GhostInsight;

  // Get ghost insight with conflict check for specific code
  getInsightForCode(code: string, targetFile?: string): GhostInsight;
}
```

**Key Features:**
- Technology pattern matching (JWT vs sessions, SQL vs NoSQL, REST vs GraphQL, etc.)
- Decision indicator detection ("must", "never", "prefer", "avoid")
- Conflict severity levels (low, medium, high)
- LRU cache for active files (max 20, 1-hour TTL)

### `src/core/deja-vu.ts`

**Purpose:** Detects when a query or code pattern is similar to something solved before. Surfaces past solutions to prevent reinventing the wheel.

```typescript
export class DejaVuDetector {
  // Find similar past problems, solutions, and fixes
  async findSimilar(query: string, limit?: number): Promise<DejaVuMatch[]>;

  // Search for similar past queries with high usefulness
  async searchPastQueries(query: string): Promise<DejaVuMatch[]>;

  // Search for past solutions to similar problems
  async searchPastSolutions(query: string): Promise<DejaVuMatch[]>;

  // Search for past bug fixes with similar error patterns
  async searchPastFixes(query: string): Promise<DejaVuMatch[]>;

  // Record query for future deja vu detection
  recordQuery(query: string, files: string[], wasUseful?: boolean): void;
}
```

**Key Features:**
- Similarity threshold: 0.7 (70%)
- Maximum age: 90 days
- Minimum usefulness score: 0.3
- Human-readable messages ("You worked on this 2 weeks ago in auth.ts")

### `src/server/gateways/memory-ghost.ts`

**Purpose:** Gateway for all proactive intelligence features.

```typescript
export interface MemoryGhostInput {
  mode?: 'full' | 'conflicts' | 'dejavu' | 'resurrect';
  code?: string;           // Code to check
  file?: string;           // Current file
  query?: string;          // Query for deja vu
  feature_name?: string;   // For resurrection
  max_results?: number;    // For deja vu
}

export interface MemoryGhostResponse {
  mode: MemoryGhostMode;
  sources_used: string[];
  ghost?: { active_files, recent_decisions, suggestions };
  conflicts?: { has_conflicts, warnings };
  deja_vu?: { has_matches, matches };
  resurrection?: { active_files, last_queries, possible_blocker, suggested_actions, summary };
  resurrectable_contexts?: Array<{ id, name, last_active, summary }>;
  stats?: { deja_vu: { total_queries, useful_queries, avg_usefulness } };
}
```

---

## Files Modified

### `src/core/feature-context.ts`

**Added Context Resurrection:**

```typescript
export interface ResurrectedContext {
  activeFiles: string[];           // What files were you working on?
  lastQueries: string[];           // What were you trying to do?
  sessionDecisions: string[];      // What decisions were made?
  lastEditedFile: string | null;   // Where did you leave off?
  lastEditTime: Date | null;
  possibleBlocker: string | null;  // What was the blocker (if any)?
  suggestedActions: string[];      // Suggested next steps
  summary: string;                 // Context summary for AI
  timeSinceLastActive: string;     // Time since last activity
}

export class FeatureContextManager {
  // Resurrect context from last session
  resurrectContext(options?: ContextResurrectionOptions): ResurrectedContext;

  // Detect what might have been blocking progress
  private detectBlocker(context: ActiveFeatureContext): string | null;

  // Suggest next steps based on context state
  private suggestNextSteps(context: ActiveFeatureContext): string[];

  // Get all contexts that can be resurrected
  getResurrectableContexts(): Array<{ id, name, lastActive, summary }>;
}
```

**Blocker Detection:**
- Error/problem queries in last 3 queries
- Multiple edits to same file (5+ times = possible struggle)

### `src/core/engine.ts`

**Added Background Intelligence Loop:**

```typescript
export class MemoryLayerEngine {
  private ghostMode: GhostMode;
  private dejaVu: DejaVuDetector;
  private backgroundInterval: NodeJS.Timeout | null = null;
  private readonly BACKGROUND_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  // Background Intelligence Loop
  private startBackgroundIntelligence(): void {
    this.backgroundInterval = setInterval(() => {
      // Sync recent git changes
      this.changeIntelligence.syncFromGit(20);
      // Update importance scores
      this.learningEngine.updateImportanceScores();
    }, this.BACKGROUND_REFRESH_INTERVAL_MS);
  }

  // Record AI feedback - learn from what suggestions were used
  recordAIFeedback(suggestion: string, wasUsed: boolean, correction?: string): void;

  // Ghost Mode methods
  getGhostInsight(): GhostInsight;
  getGhostInsightForCode(code: string, targetFile?: string): GhostInsight;
  checkGhostConflicts(code: string, targetFile?: string): ConflictWarning[];
  async notifyFileAccess(filePath: string): Promise<void>;

  // Deja Vu methods
  async findDejaVu(query: string, limit?: number): Promise<DejaVuMatch[]>;
  recordQueryForDejaVu(query: string, files: string[], wasUseful?: boolean): void;

  // Context Resurrection
  resurrectContext(options?: ContextResurrectionOptions): ResurrectedContext;
  getResurrectableContexts(): Array<{ id, name, lastActive, summary }>;

  // Combined ghost data
  async getFullGhostData(mode, options): Promise<{
    ghost?: GhostInsight;
    dejaVu?: DejaVuMatch[];
    resurrection?: ResurrectedContext;
    conflicts?: ConflictWarning[];
  }>;
}
```

### `src/core/learning.ts`

**Added Importance Weighting:**

```typescript
export class LearningEngine {
  // Update importance scores for all files (called by background loop)
  updateImportanceScores(): void;

  // Calculate importance based on multiple factors
  calculateImportance(accessCount: number, lastAccessed: number, filePath: string): number;

  // Get importance score for a specific file
  getFileImportance(filePath: string): number;
}
```

**Importance Scoring Factors:**
- **Frequency (40%)**: Log scale of access count
- **Recency (30%)**: Exponential decay over 1 week
- **File Type (30%)**:
  - index/main files: 0.5
  - config files: 0.45
  - type definitions: 0.4
  - test files: 0.25
  - default: 0.3

### `src/server/gateways/memory-record.ts`

**Added Smart Decision Detection:**

```typescript
// Patterns that indicate decision-like content
const DECISION_PATTERNS = [
  /we('ll| will) use/i,
  /decided to/i,
  /going with/i,
  /instead of/i,
  /because.*better/i,
  /chose|choosing/i,
  /prefer|preferring/i,
  /let's use/i,
  /we should use/i,
  /the approach is/i,
  /our strategy is/i,
  /we're using/i,
  /will implement.*using/i,
  /architecture.*decision/i,
  /technical.*decision/i,
];

function looksLikeDecision(content: string): boolean;
function extractDecisionTitle(content: string): string | null;
```

### `src/server/gateways/memory-query.ts`

**Added Proactive Intelligence:**

```typescript
// Enhanced handleContextQuery:
// 1. Notify ghost mode of file access
// 2. Run deja vu search in parallel with context/search
// 3. Add predicted files to response
// 4. Record query for future deja vu detection
```

### `src/server/gateways/memory-review.ts`

**Added Ghost Conflict Integration:**

```typescript
// Full review now includes:
// 1. Pattern validation
// 2. Conflict check (existing)
// 3. Ghost mode conflict check (NEW)
// 4. Confidence scoring
// 5. Test checking
// 6. Bug history search

// Ghost conflicts are merged into response
// Risk score adjusted based on conflict severity
```

### `src/server/gateways/memory-status.ts`

**Enhanced Learning Stats with Resurrection:**

```typescript
// action=learning now returns:
{
  learning: { total_queries, total_file_views, top_files, cache_size },
  resurrection: { summary, active_files, last_queries, possible_blocker, suggested_actions },
  resurrectable_contexts: [{ id, name, last_active, summary }],
  deja_vu_stats: { total_queries, useful_queries, avg_usefulness }
}
```

### `src/server/gateways/index.ts`

**Updated Gateway Registration:**

```typescript
export const GATEWAY_TOOLS = [
  'memory_query',
  'memory_record',
  'memory_review',
  'memory_status',
  'memory_ghost',  // NEW
] as const;
```

---

## Type Definitions

### Ghost Mode Types

```typescript
export interface ConflictWarning {
  decision: Decision;
  warning: string;
  severity: 'low' | 'medium' | 'high';
  matchedTerms: string[];
}

export interface GhostInsight {
  activeFiles: string[];
  recentDecisions: Decision[];
  potentialConflicts: ConflictWarning[];
  suggestions: string[];
}
```

### Deja Vu Types

```typescript
export interface DejaVuMatch {
  type: 'query' | 'solution' | 'fix' | 'pattern';
  similarity: number;
  when: Date;
  file: string;
  snippet: string;
  message: string;  // Human-readable
  context?: string;
}
```

### Context Resurrection Types

```typescript
export interface ResurrectedContext {
  activeFiles: string[];
  lastQueries: string[];
  sessionDecisions: string[];
  lastEditedFile: string | null;
  lastEditTime: Date | null;
  possibleBlocker: string | null;
  suggestedActions: string[];
  summary: string;
  timeSinceLastActive: string;
}

export interface ContextResurrectionOptions {
  featureName?: string;
  includeFileContents?: boolean;
  maxFiles?: number;
}
```

---

## Technology Patterns Detected

Ghost Mode recognizes these technology categories for conflict detection:

| Category | Technologies |
|----------|-------------|
| Auth | JWT, Session/Cookie, OAuth |
| Database | SQL/Postgres, MongoDB/NoSQL, Redis |
| State | Redux/Zustand/MobX, Context API |
| Testing | Jest/Vitest/Mocha, Testing Library |
| API | REST, GraphQL, gRPC |
| Styling | Tailwind, CSS-in-JS, SASS/LESS |

---

## Usage Examples

### Ghost Mode - Conflict Detection

```typescript
// Before writing code
const result = await engine.getFullGhostData('conflicts', {
  code: `const response = await fetch('/api/users');
         const data = response.json();`,
  file: 'src/services/user.ts'
});

// Response:
{
  conflicts: {
    has_conflicts: true,
    warnings: [{
      decision_title: "Use GraphQL for all API calls",
      warning: "This code may conflict with decision: 'Use GraphQL for all API calls'",
      severity: "medium",
      matched_terms: ["fetch", "api"]
    }]
  }
}
```

### Deja Vu Detection

```typescript
// When searching for a solution
const matches = await engine.findDejaVu("How to handle authentication errors?");

// Response:
[{
  type: "query",
  similarity: 0.85,
  when: "2025-02-03T10:30:00Z",
  file: "src/auth/error-handler.ts",
  message: "You asked a similar question in error-handler.ts 2 weeks ago",
  context: "Also involved: auth-middleware.ts, login.tsx"
}]
```

### Context Resurrection

```typescript
// At session start
const resurrection = engine.resurrectContext();

// Response:
{
  summary: "Feature: 'User Authentication' (45 min session) | Status: paused",
  activeFiles: ["src/auth/login.ts", "src/api/user.ts"],
  lastQueries: ["how to handle JWT expiration", "refresh token flow"],
  possibleBlocker: "how to handle JWT expiration",
  suggestedActions: [
    "Resume investigating: 'how to handle JWT expiration...'",
    "Continue working on login.ts"
  ],
  timeSinceLastActive: "2 days ago"
}
```

---

## Token Savings (Updated)

| Metric | Before (51 tools) | After 4+6 (10 tools) | After 5+6 (11 tools) |
|--------|-------------------|----------------------|----------------------|
| Tool descriptions | ~5,500 tokens | ~600 tokens | ~700 tokens |
| Avg calls per task | 5-10 | 1-2 | 1-2 |
| Total per task | 2,500-5,000 | 600-1,200 | 600-1,200 |
| **Savings** | - | **~80% reduction** | **~80% reduction** |

The new `memory_ghost` tool adds ~100 tokens to descriptions but **reduces calls** by proactively surfacing information.

---

## Verification

### Build Verification
```bash
npm run build  # Passes
```

### Test with Claude Desktop

1. **Ghost Mode - Conflicts:**
   - Record decision "Use JWT for auth"
   - Write code using sessions
   - Verify warning: "Conflicts with decision: Use JWT for auth"

2. **Deja Vu Test:**
   - Query "how to handle auth errors"
   - Query similar thing next week
   - Verify: "You worked on this 1 week ago in auth.ts"

3. **Context Resurrection Test:**
   - Work on feature, make queries
   - Close session
   - Restart, call `memory_status action=learning`
   - Verify returns last session context

---

## Summary

Phase 12 transforms MemoryLayer from a **passive memory system** to a **proactive intelligent assistant** that:

1. **Anticipates needs** - Pre-fetches relevant decisions when files are accessed
2. **Prevents mistakes** - Warns about conflicts with past architectural decisions
3. **Avoids reinvention** - Surfaces similar past problems and solutions
4. **Maintains continuity** - Restores mental state from previous sessions
5. **Continuously learns** - Background loop updates scores and syncs changes

Total Tools: **5 Gateways + 6 Standalone = 11 Tools**
(Previously: 4 Gateways + 6 Standalone = 10 Tools)

---

## All Phases Complete

| Phase | Feature | Priority | Status |
|-------|---------|----------|--------|
| 1 | Living Documentation | P0 | Done |
| 2 | Context Rot Prevention | P0 | Done |
| 3 | Confidence Scoring | P1 | Done |
| 4 | Change Intelligence | P1 | Done |
| 5 | Architecture Enforcement | P2 | Done |
| 6 | Test-Aware Suggestions | P2 | Done |
| 7 | Gateway Pattern (4+6) | P0 | Done |
| **12** | **Super Intelligent Brain (5+6)** | **P0** | **Done** |
