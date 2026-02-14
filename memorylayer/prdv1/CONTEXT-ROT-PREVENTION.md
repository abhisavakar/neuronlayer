# Context Rot Prevention

**Feature:** Smart Context Compaction
**Priority:** P0
**Status:** Planned
**Effort:** 1 week

---

## Problem Statement

### What is Context Rot?

As conversations with AI grow longer, the AI's performance degrades:

| Context Size | Accuracy | Problem |
|--------------|----------|---------|
| Short (< 5 messages) | 70%+ | Normal |
| Medium (10-20 messages) | 60% | Slight drift |
| Long (20+ messages) | 55% | Significant drift |
| Very Long (50+ messages) | < 50% | Context collapse |

### Root Causes

1. **Lost-in-the-Middle Problem**
   - LLMs pay more attention to beginning and end
   - Information in the middle gets "lost"
   - Earlier instructions fade

2. **Positional Encoding Limitations**
   - Context window has theoretical limit
   - Quality degrades before hard limit
   - 200K tokens ≠ 200K usable tokens

3. **Attention Mechanism Degradation**
   - Attention weights spread thin
   - Critical context competes with noise
   - Recent information overwrites old

### The #1 Complaint

> "AI forgets what I told it earlier"
> "I have to keep reminding it of the requirements"
> "The conversation started great, then went off the rails"

---

## Solution: Smart Context Compaction

### Core Concept

Monitor context health and proactively compact when degradation is detected:

```
User chats → Context grows → Health monitored
                              ↓
                    Drift detected → Auto-compact
                              ↓
                    Critical preserved → AI stays sharp
```

### Architecture

```typescript
interface ContextHealth {
  // Metrics
  tokensUsed: number;
  tokensLimit: number;
  utilizationPercent: number;

  // Health Indicators
  relevanceScore: number;        // 0-1, how relevant is old context
  driftScore: number;            // 0-1, how much has AI drifted
  criticalContextRatio: number;  // % of context that's critical

  // Detection
  driftDetected: boolean;
  compactionNeeded: boolean;

  // Actions
  suggestCompaction(): CompactionSuggestion;
  autoCompact(): CompactedContext;
  preserveCritical(): CriticalContext[];
}

interface CompactionSuggestion {
  // What to keep
  critical: ContextChunk[];

  // What to summarize
  summarizable: ContextChunk[];

  // What to remove
  removable: ContextChunk[];

  // Estimated savings
  tokensSaved: number;
  newUtilization: number;
}

interface CriticalContext {
  id: string;
  type: 'decision' | 'requirement' | 'instruction' | 'custom';
  content: string;
  reason: string;
  createdAt: Date;
  neverCompress: boolean;
}
```

---

## Detection Algorithms

### 1. Drift Detection

Detect when AI is ignoring earlier instructions:

```typescript
interface DriftDetection {
  // Compare AI responses against initial requirements
  checkRequirementAdherence(
    initialRequirements: string[],
    recentResponses: string[]
  ): DriftResult;

  // Detect contradictions with earlier statements
  checkContradictions(
    conversationHistory: Message[]
  ): Contradiction[];

  // Monitor topic shifts
  trackTopicDrift(
    expectedTopic: string,
    currentContext: string
  ): number; // 0-1 drift score
}

interface DriftResult {
  driftScore: number;      // 0-1, higher = more drift
  missingRequirements: string[];
  contradictions: string[];
  suggestedReminders: string[];
}
```

### 2. Relevance Scoring

Score each context chunk for current relevance:

```typescript
interface RelevanceScoring {
  // Score based on recency
  recencyScore(chunk: ContextChunk): number;

  // Score based on reference frequency
  referenceScore(chunk: ContextChunk, recentMessages: Message[]): number;

  // Score based on semantic similarity to current topic
  topicRelevance(chunk: ContextChunk, currentTopic: string): number;

  // Combined relevance
  calculateRelevance(chunk: ContextChunk): number;
}
```

### 3. Critical Context Identification

Identify what must never be compressed:

```typescript
const criticalPatterns = [
  // Explicit instructions
  /always|never|must|required/i,

  // Decisions
  /we decided|the decision|chose to/i,

  // Requirements
  /requirement|constraint|rule/i,

  // User preferences
  /i prefer|i want|don't want/i,

  // Technical constraints
  /cannot|must not|impossible/i
];

function identifyCritical(message: Message): boolean {
  return criticalPatterns.some(p => p.test(message.content)) ||
         message.markedCritical ||
         message.type === 'instruction';
}
```

---

## Compaction Strategies

### Strategy 1: Summarization

Summarize verbose context into key points:

```typescript
// Before compaction (500 tokens)
"We had a long discussion about the authentication system.
First we considered JWT tokens, then looked at session-based auth,
and finally decided to use JWT because it's stateless and works
better with our microservices architecture. The implementation
should use the jsonwebtoken library..."

// After compaction (80 tokens)
"DECISION: Use JWT for auth (stateless, microservices-friendly)
IMPLEMENTATION: jsonwebtoken library
CONTEXT: Evaluated JWT vs session-based"
```

### Strategy 2: Selective Removal

Remove low-relevance context:

```typescript
interface RemovalCriteria {
  // Remove if all true
  relevanceScore < 0.3;
  lastReferencedAt > 10 messages ago;
  notMarkedCritical;
  notContainsDecision;
}
```

### Strategy 3: Chunked Compression

Compress conversation into chunks:

```typescript
// Original: 50 messages, 5000 tokens
// Compressed: 5 chunks, 500 tokens

interface CompressedChunk {
  messages: number[];      // Original message IDs
  summary: string;         // Compressed content
  keyPoints: string[];     // Extracted key points
  decisions: string[];     // Any decisions made
  originalTokens: number;
  compressedTokens: number;
}
```

---

## MCP Tools

### Context Health Tools

```typescript
// get_context_health
{
  name: "get_context_health",
  description: "Check current context health and detect drift",
  inputSchema: {
    type: "object",
    properties: {
      includeDetails: { type: "boolean" }
    }
  }
}

// Returns
{
  health: "good" | "warning" | "critical",
  tokensUsed: 45000,
  tokensLimit: 100000,
  utilization: "45%",
  driftScore: 0.2,
  driftDetected: false,
  suggestions: [
    "Context is healthy, no action needed"
  ]
}
```

### Compaction Tools

```typescript
// trigger_compaction
{
  name: "trigger_compaction",
  description: "Manually trigger context compaction",
  inputSchema: {
    type: "object",
    properties: {
      strategy: {
        type: "string",
        enum: ["summarize", "selective", "aggressive"],
        description: "Compaction strategy"
      },
      preserveRecent: {
        type: "number",
        description: "Number of recent messages to preserve"
      }
    }
  }
}
```

### Critical Context Tools

```typescript
// mark_critical
{
  name: "mark_critical",
  description: "Mark context as critical (never compress)",
  inputSchema: {
    type: "object",
    properties: {
      content: { type: "string" },
      reason: { type: "string" },
      type: {
        type: "string",
        enum: ["decision", "requirement", "instruction", "custom"]
      }
    },
    required: ["content"]
  }
}

// get_critical_context
{
  name: "get_critical_context",
  description: "Get all critical context items",
  inputSchema: {
    type: "object",
    properties: {
      type: { type: "string" }
    }
  }
}
```

---

## User Experience

### Health Indicator

```
┌─────────────────────────────────┐
│ Context Health: 🟢 Good         │
│ ████████░░░░░░░░ 45% (45K/100K) │
│ Drift: Low | Critical: 5 items  │
└─────────────────────────────────┘
```

### Compaction Alert

```
⚠️ Context getting large (80% full)
   Drift detected in 3 earlier requirements.

   Suggested actions:
   1. [Compact now] - Summarize old context
   2. [Show drift] - See what's being forgotten
   3. [Ignore] - Continue without compaction
```

### Post-Compaction Summary

```
✅ Context compacted successfully

   Before: 80,000 tokens (80%)
   After:  25,000 tokens (25%)

   Preserved:
   - 5 critical decisions
   - 3 requirements
   - Recent 10 messages

   Summarized:
   - 45 messages → 5 summaries

   AI should now remember:
   - ✓ JWT authentication decision
   - ✓ Database choice (SQLite)
   - ✓ API structure requirements
```

---

## Implementation

### Phase 1: Health Monitoring

1. **Token Tracking**
   - Count tokens in context
   - Track growth rate
   - Set thresholds

2. **Basic Drift Detection**
   - Compare recent vs early messages
   - Detect topic shifts
   - Flag contradictions

### Phase 2: Compaction Engine

1. **Summarization**
   - Build summarization pipeline
   - Test compression ratios
   - Preserve key information

2. **Critical Context**
   - Pattern matching for critical content
   - User marking interface
   - Never-compress storage

### Phase 3: Integration

1. **Automatic Triggers**
   - Background health checks
   - Proactive alerts
   - Auto-compaction options

2. **MCP Tools**
   - Tool implementation
   - User-facing commands
   - Settings/preferences

### Files to Create

| File | Purpose |
|------|---------|
| `src/core/context-health.ts` | Health monitoring |
| `src/core/drift-detector.ts` | Drift detection |
| `src/core/compaction.ts` | Compaction strategies |
| `src/core/critical-context.ts` | Critical context tracking |

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Health check | <10ms |
| Drift detection | <50ms |
| Compaction (full) | <500ms |
| Critical context lookup | <5ms |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Drift complaints | Common | Rare |
| Context restarts | Frequent | Rare |
| Long conversation quality | Degrades | Maintains |
| User frustration | High | Low |

---

## Why This Matters

### The Invisible Problem

Users don't know why their AI "got dumb" - they just restart the conversation.

**With Context Rot Prevention:**
- AI stays sharp through long sessions
- Users trust the AI more
- Conversations can go longer
- Better outcomes for complex tasks

### Competitive Advantage

No competitor has solved this:
- Cursor: No context health
- Copilot: No drift detection
- Claude.ai: Manual context management

**MemoryLayer: Automatic context health management**

---

*Context Rot Prevention Specification - February 2026*
