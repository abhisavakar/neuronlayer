# Change Intelligence

**Feature:** "What Changed & Why Did It Break?"
**Priority:** P1
**Status:** Planned
**Effort:** 1 week

---

## Problem Statement

### The Debugging Crisis

> "What changed? Why did it break?"

These are the #1 questions developers ask when debugging.

**Statistics:**
- Debugging takes 45% MORE time with AI code
- 70% of debugging time is spent understanding changes
- Most bugs are caused by recent changes

### The Root Problem

When something breaks, developers must:
1. Read through git log
2. Check multiple file diffs
3. Correlate error with changes
4. Remember if they've seen this before

**This is slow, manual, and error-prone.**

---

## Solution: Change Intelligence

### Core Concept

Instant answers to debugging questions:

```
Error: "TypeError: Cannot read property 'x' of undefined"

User: "Why did it break?"

MemoryLayer:
  📍 Likely cause: auth.ts changed 2 hours ago

  Change: Removed null check on line 45
  Diff: - if (user && user.x) → if (user.x)

  Similar bug: Fixed this same issue on Feb 3
  Fix then: Added null check

  Suggested fix: Add null check back
```

### Architecture

```typescript
interface ChangeIntelligence {
  // Track changes
  recentChanges: Change[];

  // Query changes
  whatChanged(since: Date | string): Change[];
  whatChangedIn(file: string): Change[];
  whatChangedBy(author: string): Change[];

  // Diagnose bugs
  diagnoseBug(error: Error): Diagnosis;
  correlateBugWithChanges(error: Error): Change[];
  findSimilarBugs(error: Error): PastBug[];

  // Suggest fixes
  suggestFix(error: Error): FixSuggestion;
}

interface Change {
  file: string;
  diff: string;
  timestamp: Date;
  author: string;
  commitMessage: string;
  linesChanged: LineChange[];
  type: 'add' | 'modify' | 'delete' | 'rename';
}

interface Diagnosis {
  likelyCause: Change;
  confidence: number;
  relatedChanges: Change[];
  pastSimilarBugs: PastBug[];
  suggestedFix: string;
  reasoning: string;
}

interface PastBug {
  error: string;
  cause: Change;
  fix: Change;
  date: Date;
  similarity: number;
}
```

---

## Core Features

### 1. "What Changed?" Query

Instant answer to what changed recently:

```typescript
// what_changed("yesterday")
{
  period: "Feb 13, 2026",
  changes: [
    {
      file: "src/auth.ts",
      summary: "Modified authentication logic",
      lines: { added: 15, removed: 8 },
      author: "AI",
      time: "14:30"
    },
    {
      file: "src/api/login.ts",
      summary: "Added rate limiting",
      lines: { added: 25, removed: 0 },
      author: "Abhis",
      time: "10:15"
    }
  ],
  totalFiles: 5,
  totalLines: { added: 120, removed: 45 }
}
```

### 2. Bug Correlation

Correlate errors with recent changes:

```typescript
// diagnose_bug("TypeError: x is undefined")
{
  diagnosis: {
    likelyCause: {
      file: "src/auth.ts",
      line: 45,
      change: "Removed null check",
      diff: "- if (user && user.x) → if (user.x)",
      changedAt: "2 hours ago",
      author: "AI"
    },
    confidence: 85,
    reasoning: "Error mentions 'x', line 45 in auth.ts removed check for 'x'"
  },

  relatedChanges: [
    { file: "src/api/login.ts", relevance: 45 }
  ],

  pastSimilarBugs: [
    {
      date: "Feb 3, 2026",
      error: "Cannot read 'name' of undefined",
      fix: "Added null check",
      similarity: 78
    }
  ]
}
```

### 3. Similar Bug Finder

Learn from past bugs:

```typescript
// find_similar_bugs("Connection timeout")
{
  similarBugs: [
    {
      date: "Jan 28, 2026",
      error: "Database connection timeout",
      cause: "Connection pool exhausted",
      fix: "Increased pool size in config",
      similarity: 92,
      files: ["db/config.ts"]
    },
    {
      date: "Jan 15, 2026",
      error: "API timeout error",
      cause: "Slow query without index",
      fix: "Added database index",
      similarity: 75,
      files: ["db/queries.ts"]
    }
  ]
}
```

### 4. Fix Suggestions

Suggest fixes based on history:

```typescript
// suggest_fix("Memory leak in component")
{
  suggestions: [
    {
      confidence: 85,
      fix: "Add cleanup in useEffect return",
      reason: "Fixed similar issue on Jan 20",
      diff: "+ useEffect(() => { ... return () => cleanup(); }, []);",
      pastFix: { date: "Jan 20", file: "components/Timer.tsx" }
    },
    {
      confidence: 60,
      fix: "Clear interval on unmount",
      reason: "Common pattern for this error",
      diff: "+ clearInterval(intervalId);",
      source: "general knowledge"
    }
  ]
}
```

---

## MCP Tools

### Change Query Tools

```typescript
// what_changed
{
  name: "what_changed",
  description: "Query what changed in the codebase",
  inputSchema: {
    type: "object",
    properties: {
      since: {
        type: "string",
        description: "Time period: 'yesterday', 'this week', 'Feb 10', etc."
      },
      file: {
        type: "string",
        description: "Filter to specific file or folder"
      },
      author: {
        type: "string",
        description: "Filter by author"
      }
    },
    required: ["since"]
  }
}
```

### Diagnosis Tools

```typescript
// why_broke
{
  name: "why_broke",
  description: "Diagnose why something broke",
  inputSchema: {
    type: "object",
    properties: {
      error: {
        type: "string",
        description: "The error message or symptom"
      },
      file: {
        type: "string",
        description: "File where error occurs (optional)"
      },
      line: {
        type: "number",
        description: "Line number (optional)"
      }
    },
    required: ["error"]
  }
}

// find_similar_bugs
{
  name: "find_similar_bugs",
  description: "Find similar bugs from history",
  inputSchema: {
    type: "object",
    properties: {
      error: {
        type: "string",
        description: "Error message to search for"
      },
      limit: {
        type: "number",
        description: "Max results (default 5)"
      }
    },
    required: ["error"]
  }
}

// suggest_fix
{
  name: "suggest_fix",
  description: "Get fix suggestions for an error",
  inputSchema: {
    type: "object",
    properties: {
      error: {
        type: "string",
        description: "Error to fix"
      },
      context: {
        type: "string",
        description: "Additional context"
      }
    },
    required: ["error"]
  }
}
```

---

## Change Tracking

### What We Track

```typescript
interface ChangeTracker {
  // File-level changes
  trackFileChange(file: string, diff: string): void;

  // Git integration
  syncWithGit(): void;
  parseCommitMessage(message: string): ChangeContext;

  // Bug tracking
  recordBug(bug: Bug): void;
  recordFix(bugId: string, fix: Fix): void;
  linkBugToChange(bugId: string, changeId: string): void;

  // Storage
  changes: Map<string, Change[]>;  // By file
  bugs: Map<string, Bug>;
  bugFixes: Map<string, Fix[]>;
}

interface Bug {
  id: string;
  error: string;
  stackTrace: string;
  file: string;
  line: number;
  timestamp: Date;
  status: 'open' | 'fixed';
  relatedChanges: string[];
}

interface Fix {
  bugId: string;
  diff: string;
  file: string;
  timestamp: Date;
  author: string;
}
```

### Git Integration

```typescript
// Parse git history
async function syncGitHistory(): Promise<Change[]> {
  const commits = await git.log({ maxCount: 100 });

  return commits.map(commit => ({
    id: commit.hash,
    message: commit.message,
    author: commit.author.name,
    timestamp: commit.date,
    files: commit.files.map(f => ({
      path: f.path,
      changes: f.changes,
      additions: f.additions,
      deletions: f.deletions
    }))
  }));
}

// Parse commit message for context
function parseCommitMessage(message: string): {
  type: 'feat' | 'fix' | 'refactor' | 'docs' | 'other';
  scope?: string;
  description: string;
  bugFix?: boolean;
} {
  // Parse conventional commits
  const match = message.match(/^(feat|fix|refactor|docs)(\(.*\))?:\s*(.*)$/);
  // ...
}
```

---

## Bug Correlation Algorithm

```typescript
function correlateBugWithChanges(error: Error): CorrelationResult {
  // 1. Extract error keywords
  const keywords = extractKeywords(error.message);
  // e.g., "undefined", "property", "x", line numbers

  // 2. Find recent changes mentioning these keywords
  const recentChanges = getChanges({ since: '24 hours' });
  const relevantChanges = recentChanges.filter(change =>
    keywords.some(k =>
      change.diff.includes(k) ||
      change.file.includes(k)
    )
  );

  // 3. Score by relevance
  const scoredChanges = relevantChanges.map(change => ({
    change,
    score: calculateRelevanceScore(change, error)
  })).sort((a, b) => b.score - a.score);

  // 4. Find similar past bugs
  const similarBugs = findSimilarBugs(error.message);

  // 5. Generate diagnosis
  return {
    likelyCause: scoredChanges[0],
    relatedChanges: scoredChanges.slice(1, 5),
    pastSimilarBugs: similarBugs,
    confidence: scoredChanges[0]?.score || 0,
    reasoning: generateReasoning(scoredChanges[0], error)
  };
}
```

---

## Implementation

### Phase 1: Change Tracking

1. **Git Integration**
   - Parse git history
   - Track file changes
   - Store change metadata

2. **Real-time Tracking**
   - Watch for file changes
   - Record diffs
   - Link to git commits

### Phase 2: Bug Intelligence

1. **Bug Database**
   - Store past bugs
   - Link bugs to fixes
   - Track patterns

2. **Correlation Engine**
   - Keyword extraction
   - Change matching
   - Scoring algorithm

### Phase 3: Fix Suggestions

1. **Pattern Matching**
   - Find similar bugs
   - Extract fix patterns
   - Rank by confidence

2. **MCP Tools**
   - Implement all tools
   - Test with real bugs

### Files to Create

| File | Purpose |
|------|---------|
| `src/core/change-tracker.ts` | Track changes |
| `src/core/git-integration.ts` | Git parsing |
| `src/core/bug-correlator.ts` | Bug correlation |
| `src/core/fix-suggester.ts` | Fix suggestions |

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| What changed query | <20ms |
| Bug correlation | <100ms |
| Similar bug search | <50ms |
| Fix suggestion | <150ms |

---

## User Experience

### "What Changed?" Answer

```
📋 Changes: Yesterday (Feb 13)

Files Changed: 5
Lines: +120, -45

Key Changes:
├── src/auth.ts (14:30)
│   Modified authentication logic
│   +15 lines, -8 lines
│   Author: AI
│
├── src/api/login.ts (10:15)
│   Added rate limiting
│   +25 lines
│   Author: Abhis
│
└── 3 more files...

[Show all] [Filter by file] [Filter by author]
```

### "Why Broke?" Answer

```
🔍 Bug Diagnosis

Error: TypeError: Cannot read property 'x' of undefined

📍 Likely Cause (85% confidence)
File: src/auth.ts, Line 45
Changed: 2 hours ago by AI
Change: Removed null check

Diff:
- if (user && user.x) {
+ if (user.x) {      ← Missing null check

💡 Similar Bug Found
Date: Feb 3, 2026
Same Error: Cannot read 'name' of undefined
Fix: Added null check

🔧 Suggested Fix
Add null check back:
+ if (user && user.x) {

[Apply fix] [View full diff] [Show history]
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to find bug cause | 30+ minutes | <5 minutes |
| Debugging time overall | 45% more | 50% less |
| Bug recurrence | Common | Rare |
| "What changed?" answer | Manual git | Instant |

---

## Why This Matters

### The Developer Experience

**Before:**
1. See error
2. Read stack trace
3. Check git log
4. Read multiple diffs
5. Try to remember if seen before
6. Eventually find cause
7. Figure out fix

**After:**
1. See error
2. Ask "why broke?"
3. Get instant answer with suggested fix

**Time saved: 80%+**

### Competitive Advantage

| Tool | Tracks Changes? | Correlates Bugs? | Suggests Fixes? |
|------|-----------------|------------------|-----------------|
| GitHub Copilot | No | No | No |
| Cursor | No | No | No |
| Sentry | Yes | Partial | No |
| **MemoryLayer** | **Yes** | **Yes** | **Yes** |

---

## AI vs No-AI Components

### No-AI (Free, Instant) - 80%

| Component | Method | Cost |
|-----------|--------|------|
| Git change tracking | Git commands | FREE |
| File diff storage | Store diffs | FREE |
| Keyword extraction | Regex/parsing | FREE |
| Change-error correlation | Keyword matching | FREE |
| Past bug lookup | Database search | FREE |
| Change timeline | Database query | FREE |
| File history | Git log parsing | FREE |

### AI-Powered (On-demand) - 20%

| Component | When Used | Cost |
|-----------|-----------|------|
| Root cause analysis | User asks "why broke?" | ~$0.01 |
| Fix suggestions | User asks for fix | ~$0.01 |
| Bug pattern recognition | On similar bug search | ~$0.005 |

### Why AI for Some Parts

**Root Cause:** Need AI to understand error messages and correlate with code changes
- "TypeError on line 45" + "Removed null check" → AI connects the dots

**Fix Suggestions:** Need AI to generate actual code fixes based on past solutions

### Cost Estimate
- Change tracking: FREE
- Per "why broke?" query: ~$0.01
- Monthly (20 queries): ~$0.20

### When AI Runs
- Only when user explicitly asks "why did it break?"
- **NOT** on every error or change

---

*Change Intelligence Specification - February 2026*
