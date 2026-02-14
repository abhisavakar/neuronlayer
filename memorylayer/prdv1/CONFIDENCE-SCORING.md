# Confidence Scoring

**Feature:** Trust Indicators for AI Suggestions
**Priority:** P1
**Status:** Planned
**Effort:** 1 week

---

## Problem Statement

### The Trust Crisis

> "I don't know if the AI is confident or just making stuff up."

**Statistics:**
- 66% of developers frustrated with "almost right" solutions
- Only 29% fully trust AI-generated code
- 45% more time spent debugging AI code

### The Root Problem

AI gives suggestions with equal confidence whether it:
- Found exact matching code in your codebase
- Made an educated guess based on patterns
- Is completely hallucinating

**Users can't tell the difference.**

---

## Solution: Confidence Indicators

### Core Concept

Show users how confident the AI is and what it's basing suggestions on:

```
AI Suggestion: "Use the auth() function from utils"

Confidence: 🟢 High (92%)
Sources:
  - ✓ Found auth() in src/utils/auth.ts
  - ✓ Used 15 times in codebase
  - ✓ Matches your pattern for auth

vs.

AI Suggestion: "Use bcrypt for password hashing"

Confidence: 🟡 Medium (65%)
Sources:
  - ⚠ No password hashing in your codebase
  - ⚠ Based on general best practice
  - ⚠ No similar pattern found
```

### Architecture

```typescript
interface CodeSuggestion {
  code: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;  // 0-100
  reasoning: string;

  sources: {
    fromCodebase: CodebaseSource[];   // Similar code found
    fromDecisions: Decision[];         // Past decisions referenced
    fromPatterns: Pattern[];           // Matching patterns
    fromGeneral: boolean;              // General knowledge only
  };

  warnings: Warning[];
}

type ConfidenceLevel = 'high' | 'medium' | 'low' | 'guessing';

interface CodebaseSource {
  file: string;
  line: number;
  similarity: number;
  snippet: string;
}

interface Warning {
  type: WarningType;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

type WarningType =
  | 'no_similar_pattern'
  | 'conflicts_with_decision'
  | 'untested_approach'
  | 'high_complexity'
  | 'potential_security_issue'
  | 'deprecated_approach';
```

---

## Confidence Levels

### High Confidence (80-100%)

```
🟢 High Confidence

Criteria:
- Found exact or very similar code in codebase
- Matches established patterns
- No conflicts with past decisions
- Used successfully before

User Action: Can likely use as-is
```

### Medium Confidence (50-80%)

```
🟡 Medium Confidence

Criteria:
- Found related code but not exact match
- Partially matches patterns
- Based on codebase + general knowledge
- Some uncertainty

User Action: Review before using
```

### Low Confidence (20-50%)

```
🟠 Low Confidence

Criteria:
- No similar code found
- Based mostly on general knowledge
- New pattern for this codebase
- May need adaptation

User Action: Careful review required
```

### Guessing (0-20%)

```
🔴 Guessing

Criteria:
- No codebase reference
- Novel approach for this project
- AI is extrapolating
- May not fit your patterns

User Action: Treat as starting point only
```

---

## Source Tracking

### What We Track

```typescript
interface SourceTracking {
  // Code references
  codebaseMatches: {
    file: string;
    function: string;
    similarity: number;
    lastModified: Date;
    usageCount: number;
  }[];

  // Decision references
  decisionMatches: {
    id: string;
    title: string;
    date: Date;
    relevance: number;
  }[];

  // Pattern matches
  patternMatches: {
    pattern: string;
    confidence: number;
    examples: string[];
  }[];

  // External knowledge
  generalKnowledge: {
    used: boolean;
    topics: string[];
    reliability: 'high' | 'medium' | 'low';
  };
}
```

### Source Attribution Display

```
📊 Suggestion Sources

Codebase (75% weight):
├── src/utils/auth.ts:45 (92% similar)
├── src/api/login.ts:23 (78% similar)
└── 8 other uses of this pattern

Decisions (15% weight):
└── "Use JWT for authentication" (Feb 10)

Patterns (10% weight):
└── Error handling pattern match (85%)

General Knowledge: Not used
```

---

## Warning System

### Warning Types

```typescript
const warnings = {
  no_similar_pattern: {
    message: "No similar pattern found in your codebase",
    severity: "warning",
    suggestion: "Review carefully - this is new for your project"
  },

  conflicts_with_decision: {
    message: "This conflicts with a past decision",
    severity: "critical",
    suggestion: "You decided to use X on Feb 10, this suggests Y"
  },

  untested_approach: {
    message: "This approach has no tests in your codebase",
    severity: "info",
    suggestion: "Consider adding tests before using"
  },

  high_complexity: {
    message: "This is complex code",
    severity: "warning",
    suggestion: "Review each part carefully"
  },

  potential_security_issue: {
    message: "Potential security concern detected",
    severity: "critical",
    suggestion: "Review for: SQL injection, XSS, etc."
  },

  deprecated_approach: {
    message: "This uses deprecated patterns",
    severity: "warning",
    suggestion: "Consider using: modern alternative"
  }
};
```

### Warning Display

```
⚠️ Warnings

🔴 CRITICAL: Conflicts with decision
   You decided "Always use parameterized queries" (Feb 8)
   This suggestion uses string concatenation for SQL.

🟡 WARNING: No similar pattern
   This is a new pattern for your codebase.
   Found 0 similar implementations.

ℹ️ INFO: Untested approach
   No existing tests cover this pattern.
   Consider adding tests.
```

---

## MCP Tools

### Confidence Tools

```typescript
// get_confidence
{
  name: "get_confidence",
  description: "Get confidence score for a code suggestion",
  inputSchema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The code to evaluate"
      },
      context: {
        type: "string",
        description: "What this code is for"
      }
    },
    required: ["code"]
  }
}

// Returns
{
  confidence: "high",
  score: 87,
  reasoning: "Found similar pattern in 5 files",
  sources: {
    codebase: [
      { file: "auth.ts", line: 45, similarity: 92 }
    ],
    decisions: [],
    patterns: ["error-handling"]
  },
  warnings: []
}
```

### Source Tools

```typescript
// list_sources
{
  name: "list_sources",
  description: "List all sources used for current suggestion",
  inputSchema: {
    type: "object",
    properties: {
      includeSnippets: { type: "boolean" }
    }
  }
}

// check_conflicts
{
  name: "check_conflicts",
  description: "Check if code conflicts with past decisions",
  inputSchema: {
    type: "object",
    properties: {
      code: { type: "string" }
    },
    required: ["code"]
  }
}
```

---

## Implementation

### Phase 1: Source Tracking

1. **Code Similarity Engine**
   - Compare suggestions against codebase
   - Calculate similarity scores
   - Track which files/functions matched

2. **Decision Matching**
   - Link suggestions to past decisions
   - Detect conflicts

### Phase 2: Confidence Calculation

1. **Scoring Algorithm**
   - Weight sources appropriately
   - Calculate composite score
   - Determine confidence level

2. **Warning Detection**
   - Pattern matching for issues
   - Decision conflict detection
   - Security scanning

### Phase 3: Integration

1. **MCP Tools**
   - Implement tool endpoints
   - Response formatting

2. **User Interface**
   - Visual confidence indicators
   - Source attribution display
   - Warning system

### Files to Create

| File | Purpose |
|------|---------|
| `src/core/confidence.ts` | Confidence calculation |
| `src/core/source-tracker.ts` | Source tracking |
| `src/core/warning-detector.ts` | Warning detection |
| `src/core/conflict-checker.ts` | Decision conflict checking |

---

## Confidence Calculation Algorithm

```typescript
function calculateConfidence(suggestion: string): ConfidenceResult {
  // 1. Find codebase matches
  const codeMatches = findSimilarCode(suggestion);
  const codeScore = calculateCodeScore(codeMatches);

  // 2. Check decision alignment
  const decisionMatches = findRelatedDecisions(suggestion);
  const conflicts = findDecisionConflicts(suggestion);
  const decisionScore = calculateDecisionScore(decisionMatches, conflicts);

  // 3. Check pattern matches
  const patternMatches = findMatchingPatterns(suggestion);
  const patternScore = calculatePatternScore(patternMatches);

  // 4. Calculate composite score
  const weights = { code: 0.5, decision: 0.3, pattern: 0.2 };
  const compositeScore =
    codeScore * weights.code +
    decisionScore * weights.decision +
    patternScore * weights.pattern;

  // 5. Determine level
  const level =
    compositeScore >= 80 ? 'high' :
    compositeScore >= 50 ? 'medium' :
    compositeScore >= 20 ? 'low' : 'guessing';

  // 6. Generate warnings
  const warnings = detectWarnings(suggestion, {
    codeMatches,
    conflicts,
    patternMatches
  });

  return {
    score: compositeScore,
    level,
    sources: { codeMatches, decisionMatches, patternMatches },
    warnings
  };
}
```

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Confidence calculation | <200ms |
| Source lookup | <100ms |
| Conflict detection | <50ms |
| Warning generation | <50ms |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| User trust in AI | 29% | 60%+ |
| Time reviewing AI code | High | Reduced by half |
| Bugs from AI code | Frequent | Rare |
| "Almost right" frustration | 66% | 30% |

---

## User Impact

### Before Confidence Scoring

```
AI: "Here's the code for authentication"

User thinks:
  "Is this right? Does it match our patterns?
   Should I trust this? Better check everything..."

Result: 20 minutes reviewing, still uncertain
```

### After Confidence Scoring

```
AI: "Here's the code for authentication"
    🟢 High Confidence (92%)
    Based on: auth.ts:45, login.ts:23
    Matches: Your error handling pattern
    Warnings: None

User thinks:
  "High confidence, matches our patterns,
   no warnings - I can trust this."

Result: 2 minute review, confident merge
```

---

## Why This Matters

### Building Trust

Users need to know:
1. Is the AI confident or guessing?
2. What is this based on?
3. Does it fit my codebase?
4. Are there any conflicts?

**Confidence scoring answers all of these.**

### Competitive Advantage

| Tool | Shows Confidence? | Shows Sources? | Detects Conflicts? |
|------|------------------|----------------|-------------------|
| Copilot | No | No | No |
| Cursor | No | No | No |
| Claude | No | No | No |
| **MemoryLayer** | **Yes** | **Yes** | **Yes** |

---

*Confidence Scoring Specification - February 2026*
