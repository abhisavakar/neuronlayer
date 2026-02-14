# Active Feature Context - Technical Specification

**Version:** 1.0
**Status:** Planned
**Priority:** P0 - Killer Feature
**Effort:** 2 days

---

## Executive Summary

**What:** Keep the current feature you're working on "hot" in memory for instant AI access.

**Why:** #1 complaint with AI coding tools is "AI forgets context." This solves it.

**Result:** 10x faster AI responses when working on a feature.

---

## The Problem

```
Current AI Experience:

User: "Fix the login bug"
AI: "Let me search the codebase..." (2-3 seconds)
AI: "Reading auth.ts..." (1-2 seconds)
AI: "What login system are you using?"
User: *frustrated*

User: "I told you 5 minutes ago!"
AI: "I don't have that context."
```

---

## The Solution

```
With Active Feature Context:

User: "Fix the login bug"
AI: [Already has auth.ts, login.tsx, recent changes cached]
AI: "I see you changed line 45 in auth.ts. The bug is..."
Response time: <50ms
```

---

## How It Works

### Simple Flow

```
1. User opens files      → Added to hot cache
2. User edits files      → Changes recorded
3. User asks question    → Hot context injected FIRST
4. AI responds           → Instant (no searching)
5. User switches topic   → Old context saved, new one starts
6. User returns          → Old context restored instantly
```

### Visual Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER ACTIVITY                         │
│                                                          │
│  Opens file ─────┐                                       │
│  Edits file ─────┼───► ACTIVITY DETECTOR                 │
│  Asks question ──┘            │                          │
│                               ▼                          │
│                    ┌──────────────────┐                  │
│                    │ FEATURE CONTEXT  │                  │
│                    │    MANAGER       │                  │
│                    └────────┬─────────┘                  │
│                             │                            │
│            ┌────────────────┼────────────────┐           │
│            ▼                ▼                ▼           │
│     ┌──────────┐     ┌──────────┐     ┌──────────┐      │
│     │  FILES   │     │ CHANGES  │     │ QUERIES  │      │
│     │  CACHE   │     │  CACHE   │     │  CACHE   │      │
│     └──────────┘     └──────────┘     └──────────┘      │
│                             │                            │
│                             ▼                            │
│                    ┌──────────────────┐                  │
│                    │   HOT CONTEXT    │                  │
│                    │   (Ready for AI) │                  │
│                    └──────────────────┘                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Data Structures

### ActiveFeatureContext

```typescript
interface ActiveFeatureContext {
  id: string;                          // unique id
  name: string;                        // "payment feature"

  // Files being worked on
  files: {
    path: string;
    lastTouched: Date;
    touchCount: number;                // how many times accessed
    recentLines: number[];             // lines user was working on
  }[];

  // Recent changes made
  changes: {
    file: string;
    timestamp: Date;
    diff: string;                      // short diff summary
    linesChanged: number[];
  }[];

  // Recent questions/queries
  queries: {
    query: string;
    timestamp: Date;
    filesUsed: string[];               // what files answered this
  }[];

  // Metadata
  startedAt: Date;
  lastActiveAt: Date;
  status: 'active' | 'paused' | 'completed';
}
```

### FeatureContextManager

```typescript
interface FeatureContextManager {
  current: ActiveFeatureContext | null;
  recent: ActiveFeatureContext[];      // last 5 features
  maxFiles: number;                    // default 20
  maxChanges: number;                  // default 50
  maxQueries: number;                  // default 20
  ttlMinutes: number;                  // auto-pause after 30 min inactive
}
```

### HotContext (Output)

```typescript
interface HotContext {
  files: {
    path: string;
    content: string | null;
    touchCount: number;
  }[];
  changes: Change[];
  queries: Query[];
  summary: string;
}
```

---

## Core Implementation

### FeatureContextManager Class

```typescript
// src/core/feature-context.ts

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

export class FeatureContextManager extends EventEmitter {
  private current: ActiveFeatureContext | null = null;
  private recent: ActiveFeatureContext[] = [];
  private fileContents: Map<string, string> = new Map();

  constructor(
    private maxFiles = 20,
    private maxChanges = 50,
    private ttlMinutes = 30
  ) {
    super();
    this.startInactivityTimer();
  }

  // ========== FILE TRACKING ==========

  onFileOpened(filePath: string): void {
    this.ensureContext();
    this.touchFile(filePath);
    this.preloadFile(filePath);
  }

  onFileEdited(filePath: string, changes: string, lines: number[]): void {
    this.ensureContext();
    this.touchFile(filePath);
    this.recordChange(filePath, changes, lines);
  }

  private touchFile(filePath: string): void {
    if (!this.current) return;

    const existing = this.current.files.find(f => f.path === filePath);

    if (existing) {
      existing.lastTouched = new Date();
      existing.touchCount++;
    } else {
      this.current.files.push({
        path: filePath,
        lastTouched: new Date(),
        touchCount: 1,
        recentLines: []
      });

      // Trim if over limit
      if (this.current.files.length > this.maxFiles) {
        this.current.files = this.current.files
          .sort((a, b) => b.touchCount - a.touchCount)
          .slice(0, this.maxFiles);
      }
    }

    this.current.lastActiveAt = new Date();
  }

  // ========== CHANGE TRACKING ==========

  private recordChange(filePath: string, diff: string, lines: number[]): void {
    if (!this.current) return;

    this.current.changes.unshift({
      file: filePath,
      timestamp: new Date(),
      diff: diff.slice(0, 200),
      linesChanged: lines
    });

    if (this.current.changes.length > this.maxChanges) {
      this.current.changes = this.current.changes.slice(0, this.maxChanges);
    }
  }

  // ========== QUERY TRACKING ==========

  onQuery(query: string, filesUsed: string[]): void {
    this.ensureContext();
    if (!this.current) return;

    this.current.queries.unshift({
      query,
      timestamp: new Date(),
      filesUsed
    });

    filesUsed.forEach(f => this.touchFile(f));
    this.current.lastActiveAt = new Date();
  }

  // ========== HOT CACHE ==========

  private async preloadFile(filePath: string): Promise<void> {
    if (this.fileContents.has(filePath)) return;

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.fileContents.set(filePath, content);

      if (this.fileContents.size > this.maxFiles) {
        const oldest = this.current?.files
          .sort((a, b) => a.lastTouched.getTime() - b.lastTouched.getTime())[0];
        if (oldest) this.fileContents.delete(oldest.path);
      }
    } catch (e) {
      // File might not exist
    }
  }

  // ========== CONTEXT RETRIEVAL ==========

  getHotContext(): HotContext {
    if (!this.current) {
      return { files: [], changes: [], queries: [], summary: '' };
    }

    const rankedFiles = this.current.files
      .map(f => ({
        ...f,
        score: f.touchCount * (1 / (Date.now() - f.lastTouched.getTime() + 1))
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      files: rankedFiles.map(f => ({
        path: f.path,
        content: this.fileContents.get(f.path) || null,
        touchCount: f.touchCount
      })),
      changes: this.current.changes.slice(0, 10),
      queries: this.current.queries.slice(0, 5),
      summary: this.generateSummary()
    };
  }

  private generateSummary(): string {
    if (!this.current) return '';

    const topFiles = this.current.files
      .sort((a, b) => b.touchCount - a.touchCount)
      .slice(0, 5)
      .map(f => f.path.split('/').pop())
      .join(', ');

    const recentChanges = this.current.changes.length;
    const duration = Math.round(
      (Date.now() - this.current.startedAt.getTime()) / 60000
    );

    return `Working on: ${topFiles} | ${recentChanges} changes | ${duration} min`;
  }

  // ========== CONTEXT MANAGEMENT ==========

  private ensureContext(): void {
    if (!this.current || this.current.status !== 'active') {
      this.startNewContext();
    }
  }

  startNewContext(name?: string): void {
    if (this.current) {
      this.current.status = 'paused';
      this.recent.unshift(this.current);
      this.recent = this.recent.slice(0, 5);
    }

    this.current = {
      id: crypto.randomUUID(),
      name: name || 'Untitled Feature',
      files: [],
      changes: [],
      queries: [],
      startedAt: new Date(),
      lastActiveAt: new Date(),
      status: 'active'
    };

    this.fileContents.clear();
  }

  switchToRecent(contextId: string): boolean {
    const found = this.recent.find(c => c.id === contextId);
    if (!found) return false;

    if (this.current) {
      this.current.status = 'paused';
      this.recent.unshift(this.current);
    }

    this.recent = this.recent.filter(c => c.id !== contextId);
    this.current = found;
    this.current.status = 'active';
    this.current.lastActiveAt = new Date();

    this.reloadFiles();
    return true;
  }

  private async reloadFiles(): Promise<void> {
    this.fileContents.clear();
    if (!this.current) return;

    await Promise.all(
      this.current.files.slice(0, 10).map(f => this.preloadFile(f.path))
    );
  }

  // ========== AUTO MANAGEMENT ==========

  private startInactivityTimer(): void {
    setInterval(() => {
      if (!this.current) return;

      const inactive = Date.now() - this.current.lastActiveAt.getTime();
      if (inactive > this.ttlMinutes * 60 * 1000) {
        this.current.status = 'paused';
        this.emit('context-paused', this.current);
      }
    }, 60000);
  }

  // ========== PERSISTENCE ==========

  toJSON(): object {
    return {
      current: this.current,
      recent: this.recent
    };
  }

  fromJSON(data: any): void {
    this.current = data.current;
    this.recent = data.recent || [];
    if (this.current) {
      this.reloadFiles();
    }
  }
}
```

---

## MCP Tools

### New Tools to Add

```typescript
// Add to src/server/tools.ts

// Tool 1: Get active context
{
  name: "get_active_context",
  description: "Get the current feature context (files being worked on, recent changes, recent questions)",
  inputSchema: {
    type: "object",
    properties: {}
  },
  handler: async () => {
    const context = featureContextManager.getHotContext();
    return {
      summary: context.summary,
      activeFiles: context.files.map(f => ({
        path: f.path,
        touchCount: f.touchCount
      })),
      recentChanges: context.changes.slice(0, 5).map(c => ({
        file: c.file,
        change: c.diff,
        when: c.timestamp
      })),
      recentQueries: context.queries.map(q => q.query)
    };
  }
}

// Tool 2: Set feature context
{
  name: "set_feature_context",
  description: "Tell MemoryLayer what feature you're working on",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Feature name (e.g., 'payment integration')"
      },
      files: {
        type: "array",
        items: { type: "string" },
        description: "Key files for this feature"
      }
    },
    required: ["name"]
  },
  handler: async ({ name, files }) => {
    featureContextManager.startNewContext(name);
    if (files) {
      files.forEach(f => featureContextManager.onFileOpened(f));
    }
    return { success: true, message: `Now tracking: ${name}` };
  }
}

// Tool 3: List recent contexts
{
  name: "list_recent_contexts",
  description: "List recently worked on features",
  inputSchema: {
    type: "object",
    properties: {}
  },
  handler: async () => {
    const recent = featureContextManager.getRecentContexts();
    return {
      current: featureContextManager.getCurrentSummary(),
      recent: recent.map(c => ({
        id: c.id,
        name: c.name,
        files: c.files.length,
        lastActive: c.lastActiveAt
      }))
    };
  }
}

// Tool 4: Switch context
{
  name: "switch_feature_context",
  description: "Switch back to a previous feature context",
  inputSchema: {
    type: "object",
    properties: {
      contextId: {
        type: "string",
        description: "Context ID from list_recent_contexts"
      }
    },
    required: ["contextId"]
  },
  handler: async ({ contextId }) => {
    const success = featureContextManager.switchToRecent(contextId);
    return {
      success,
      message: success ? "Switched context" : "Context not found"
    };
  }
}
```

---

## Context Injection

### Modify Context Assembler

```typescript
// src/core/context.ts

async assembleContext(query: string): Promise<AssembledContext> {
  const budget = new TokenBudget(6000);

  // ========== STEP 1: HOT CONTEXT (NEW - HIGHEST PRIORITY) ==========
  const hotContext = featureContextManager.getHotContext();

  if (hotContext.files.length > 0) {
    const hotSection = this.formatHotContext(hotContext);
    budget.allocate(hotSection, 'hot-context');
  }

  // ========== STEP 2: Existing Tier 1 ==========
  const working = await this.tier1.load();
  // ... existing code

  // ========== STEP 3: Existing Tier 2 ==========
  // ... existing code

  // ========== STEP 4: Existing Tier 3 ==========
  // ... existing code
}

private formatHotContext(hot: HotContext): string {
  let output = `## Active Feature Context\n\n`;
  output += `**${hot.summary}**\n\n`;

  if (hot.files.length > 0) {
    output += `### Files You're Working On\n`;
    hot.files.forEach(f => {
      output += `- \`${f.path}\` (touched ${f.touchCount}x)\n`;
    });
    output += `\n`;
  }

  if (hot.changes.length > 0) {
    output += `### Recent Changes\n`;
    hot.changes.slice(0, 5).forEach(c => {
      output += `- \`${c.file}\`: ${c.diff}\n`;
    });
    output += `\n`;
  }

  if (hot.queries.length > 0) {
    output += `### Recent Questions\n`;
    hot.queries.slice(0, 3).forEach(q => {
      output += `- "${q.query}"\n`;
    });
  }

  return output;
}
```

---

## File Watcher Integration

```typescript
// src/indexing/watcher.ts

import { featureContextManager } from '../core/feature-context.js';

// Add to existing watcher setup
watcher.on('change', (filePath) => {
  // Existing indexing logic...

  // NEW: Update feature context
  const diff = getShortDiff(filePath);  // implement this
  const lines = getChangedLines(filePath);  // implement this
  featureContextManager.onFileEdited(filePath, diff, lines);
});

watcher.on('add', (filePath) => {
  // Existing logic...

  // NEW: Track if user created new file
  featureContextManager.onFileOpened(filePath);
});
```

---

## Storage

### Tier 1 JSON Structure

```json
{
  "activeFeatureContext": {
    "current": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "payment integration",
      "files": [
        {
          "path": "src/payment.ts",
          "lastTouched": "2026-02-14T10:30:00Z",
          "touchCount": 15,
          "recentLines": [45, 46, 47]
        },
        {
          "path": "src/cart.ts",
          "lastTouched": "2026-02-14T10:28:00Z",
          "touchCount": 8,
          "recentLines": [12, 13]
        }
      ],
      "changes": [
        {
          "file": "src/payment.ts",
          "timestamp": "2026-02-14T10:30:00Z",
          "diff": "Added tax calculation",
          "linesChanged": [45, 46, 47]
        }
      ],
      "queries": [
        {
          "query": "how does stripe integration work",
          "timestamp": "2026-02-14T10:25:00Z",
          "filesUsed": ["src/payment.ts", "src/stripe.ts"]
        }
      ],
      "startedAt": "2026-02-14T10:00:00Z",
      "lastActiveAt": "2026-02-14T10:30:00Z",
      "status": "active"
    },
    "recent": []
  }
}
```

---

## Performance Targets

| Operation | Target | How |
|-----------|--------|-----|
| Get hot context | <5ms | In-memory cache |
| Touch file | <1ms | Simple object update |
| Record change | <1ms | Array push |
| Preload file | <20ms | Async file read |
| Switch context | <50ms | Reload ~10 files |
| Full context assembly | <100ms | Hot context first |

---

## User Experience

### Automatic Flow

```
10:00 - User opens project
        → Empty context created

10:01 - User opens auth.ts
        → Context: { files: [auth.ts] }
        → auth.ts preloaded to cache

10:02 - User edits auth.ts line 45
        → Context: { files: [auth.ts], changes: [line 45] }

10:05 - User asks "how does login work?"
        → AI receives hot context FIRST
        → auth.ts already in memory
        → Response: instant (<100ms)
        → Query recorded

10:10 - User opens user.ts
        → Context: { files: [auth.ts, user.ts] }

10:40 - User inactive for 30 min
        → Context auto-paused
        → Saved to "recent"

11:00 - User returns, opens auth.ts
        → Context auto-restored
        → All files reloaded
        → AI: "Welcome back! You were working on auth..."
```

### Manual Flow

```
User: "I'm starting work on the payment feature"
AI: [Calls set_feature_context]
AI: "Got it! I'll track everything related to payments."

User: [works for 2 hours]

User: "What have I changed today?"
AI: [Calls get_active_context]
AI: "You've modified 5 files, made 23 changes.
     Most active: payment.ts (15 touches).
     Recent changes: added tax calc, fixed total..."
```

---

## File Structure

```
src/
├── core/
│   ├── feature-context.ts    # NEW - Main implementation
│   ├── context.ts            # MODIFY - Add hot context injection
│   └── engine.ts             # MODIFY - Initialize feature manager
├── types/
│   ├── index.ts              # MODIFY - Add new types
│   └── feature-context.ts    # NEW - Type definitions
├── indexing/
│   └── watcher.ts            # MODIFY - Hook file changes
├── storage/
│   └── tier1.ts              # MODIFY - Persist feature context
└── server/
    └── tools.ts              # MODIFY - Add 4 new tools
```

---

## Implementation Plan

### Day 1 (8 hours)

| Task | Hours |
|------|-------|
| Create type definitions | 1 |
| Implement FeatureContextManager | 3 |
| Implement hot context retrieval | 1 |
| Add MCP tools | 2 |
| Basic testing | 1 |

### Day 2 (8 hours)

| Task | Hours |
|------|-------|
| File watcher integration | 2 |
| Context injection in assembler | 2 |
| Persistence (Tier 1) | 1 |
| Integration testing | 2 |
| Documentation | 1 |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Hot context retrieval | <5ms |
| Context-aware responses | 90% faster |
| File cache hit rate | >80% |
| User satisfaction | "It just knows what I'm working on" |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Memory usage too high | Limit to 20 files, 50 changes |
| File cache stale | Re-read on file change events |
| Context too noisy | Rank by touchCount + recency |
| Conflicts with Tier 1 | Hot context = separate section |

---

## Future Enhancements

| Enhancement | Priority | Effort |
|-------------|----------|--------|
| Auto-detect feature from branch name | P2 | 2 hours |
| Link features to git branches | P2 | 4 hours |
| Feature completion detection | P3 | 8 hours |
| Cross-session feature resume | P2 | 4 hours |
| Team feature sharing | P3 | 16 hours |

---

## Summary

**Active Feature Context** keeps your current work hot in memory, so AI never asks "what are you working on?"

- **Speed:** 10x faster responses
- **Memory:** AI remembers your current work
- **Flow:** No context switching
- **Simple:** Just works automatically

**Build time:** 2 days
**Impact:** Killer feature that competitors don't have

---

*Specification v1.0 - February 2026*
