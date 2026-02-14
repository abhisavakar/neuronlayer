# Architecture Enforcement

**Feature:** Pattern Library & Enforcement
**Priority:** P2
**Status:** Planned
**Effort:** 2 weeks

---

## Problem Statement

### The Code Quality Crisis

> "AI generates code that doesn't fit our patterns. We end up with 4x code duplication."

**Statistics:**
- 4x more code cloning with AI tools
- AI recreates existing functions instead of using them
- Inconsistent patterns across codebase
- Technical debt grows faster

### The Root Problem

AI doesn't know:
1. Your established patterns
2. Your existing utility functions
3. Your architectural decisions
4. Your coding conventions

**Result: AI suggests code that works but doesn't fit.**

---

## Solution: Pattern Library & Enforcement

### Core Concept

Learn your patterns and enforce them:

```
AI generates code → Pattern check → Validation

❌ "You're recreating auth logic. Use existing auth() from utils."
❌ "This error handling doesn't match your pattern. Should use: ..."
✅ "Code matches your patterns. Good to use."
```

### Architecture

```typescript
interface ProjectPatterns {
  // Learned patterns
  errorHandling: Pattern;
  apiCalls: Pattern;
  stateManagement: Pattern;
  authentication: Pattern;
  dataFetching: Pattern;
  componentStructure: Pattern;

  // Existing functions
  existingFunctions: Map<string, FunctionInfo>;
  existingComponents: Map<string, ComponentInfo>;
  existingHooks: Map<string, HookInfo>;

  // Validation
  validateCode(code: string): ValidationResult;
  suggestExisting(intent: string): FunctionInfo[];
  learnPattern(code: string, label: string): void;
}

interface Pattern {
  name: string;
  description: string;
  examples: CodeExample[];
  antiPatterns: CodeExample[];
  rules: PatternRule[];
}

interface ValidationResult {
  valid: boolean;
  score: number;  // 0-100

  violations: Violation[];
  suggestions: Suggestion[];
  existingAlternatives: FunctionInfo[];
}
```

---

## Pattern Categories

### 1. Error Handling Pattern

```typescript
// Learn your pattern
const errorHandlingPattern: Pattern = {
  name: "Error Handling",
  description: "How errors are handled in this codebase",

  examples: [
    {
      code: `
try {
  const result = await apiCall();
  return result;
} catch (error) {
  logger.error('API failed', { error, context });
  throw new AppError('API_FAILED', error);
}`,
      explanation: "Uses AppError wrapper, logs with context"
    }
  ],

  antiPatterns: [
    {
      code: `
try {
  return await apiCall();
} catch (e) {
  console.log(e);
  return null;
}`,
      problem: "Uses console.log, swallows error, returns null"
    }
  ],

  rules: [
    { rule: "Always use AppError for wrapping" },
    { rule: "Always log with context" },
    { rule: "Never swallow errors silently" },
    { rule: "Never use console.log for errors" }
  ]
};
```

### 2. API Call Pattern

```typescript
const apiCallPattern: Pattern = {
  name: "API Calls",
  description: "How API calls are made",

  examples: [
    {
      code: `
const response = await api.get<UserResponse>('/users', {
  headers: authHeaders(),
  timeout: 5000
});
if (!response.ok) {
  throw new ApiError(response.status, response.data);
}
return response.data;`,
      explanation: "Uses typed api client, auth headers, timeout, error handling"
    }
  ],

  antiPatterns: [
    {
      code: `
const response = await fetch('/api/users');
const data = await response.json();
return data;`,
      problem: "Uses raw fetch, no types, no error handling, no auth"
    }
  ]
};
```

### 3. Component Structure Pattern

```typescript
const componentPattern: Pattern = {
  name: "React Components",
  description: "How components are structured",

  examples: [
    {
      code: `
interface Props {
  userId: string;
  onUpdate: (user: User) => void;
}

export function UserProfile({ userId, onUpdate }: Props) {
  const { user, loading, error } = useUser(userId);

  if (loading) return <Skeleton />;
  if (error) return <Error message={error.message} />;

  return (
    <ProfileCard user={user} onSave={onUpdate} />
  );
}`,
      explanation: "Props interface, loading/error states, composition"
    }
  ]
};
```

---

## Existing Function Detection

### What We Track

```typescript
interface FunctionInfo {
  name: string;
  file: string;
  line: number;
  signature: string;
  description: string;
  usageCount: number;

  // Semantic understanding
  purpose: string;
  parameters: Parameter[];
  returns: string;
  examples: string[];
}

// Example: Detected functions
const existingFunctions = {
  'auth': {
    name: 'auth',
    file: 'src/utils/auth.ts',
    signature: 'auth(): Promise<AuthToken>',
    description: 'Gets current auth token',
    usageCount: 45,
    purpose: 'authentication'
  },
  'formatDate': {
    name: 'formatDate',
    file: 'src/utils/date.ts',
    signature: 'formatDate(date: Date, format?: string): string',
    description: 'Formats date to string',
    usageCount: 23,
    purpose: 'date formatting'
  }
};
```

### Duplicate Detection

```typescript
// When AI generates:
function getUserToken() {
  return localStorage.getItem('token');
}

// We detect:
{
  duplicate: true,
  existingFunction: 'auth()',
  file: 'src/utils/auth.ts',
  similarity: 95,
  suggestion: "Use existing auth() instead of creating new function"
}
```

---

## MCP Tools

### Validation Tools

```typescript
// validate_pattern
{
  name: "validate_pattern",
  description: "Validate code against project patterns",
  inputSchema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "Code to validate"
      },
      type: {
        type: "string",
        enum: ["error_handling", "api_call", "component", "auto"],
        description: "Pattern type to validate against"
      }
    },
    required: ["code"]
  }
}

// Returns
{
  valid: false,
  score: 45,
  violations: [
    {
      rule: "error_handling",
      message: "Using console.log instead of logger",
      line: 5,
      suggestion: "Use logger.error() with context"
    }
  ],
  existingAlternatives: [
    {
      name: "handleApiError",
      file: "src/utils/errors.ts",
      suggestion: "Use handleApiError() instead"
    }
  ]
}
```

### Suggestion Tools

```typescript
// suggest_existing
{
  name: "suggest_existing",
  description: "Find existing functions that match intent",
  inputSchema: {
    type: "object",
    properties: {
      intent: {
        type: "string",
        description: "What you're trying to do"
      }
    },
    required: ["intent"]
  }
}

// suggest_existing("get user authentication token")
{
  suggestions: [
    {
      function: "auth()",
      file: "src/utils/auth.ts",
      relevance: 95,
      usage: "const token = await auth();"
    },
    {
      function: "getAuthHeaders()",
      file: "src/utils/auth.ts",
      relevance: 80,
      usage: "const headers = getAuthHeaders();"
    }
  ]
}
```

### Learning Tools

```typescript
// learn_pattern
{
  name: "learn_pattern",
  description: "Teach a new pattern to the system",
  inputSchema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "Example code"
      },
      name: {
        type: "string",
        description: "Pattern name"
      },
      description: {
        type: "string",
        description: "What this pattern is for"
      }
    },
    required: ["code", "name"]
  }
}

// list_patterns
{
  name: "list_patterns",
  description: "List all learned patterns",
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "Filter by category"
      }
    }
  }
}
```

---

## Pattern Learning

### Automatic Learning

```typescript
// Learn from codebase analysis
async function learnPatterns(): Promise<PatternLibrary> {
  // 1. Analyze all files
  const files = await getAllSourceFiles();

  // 2. Extract patterns by type
  const errorHandling = extractErrorPatterns(files);
  const apiCalls = extractApiPatterns(files);
  const components = extractComponentPatterns(files);

  // 3. Find most common patterns
  const commonErrorPattern = findMostCommon(errorHandling);
  const commonApiPattern = findMostCommon(apiCalls);

  // 4. Create pattern library
  return {
    errorHandling: commonErrorPattern,
    apiCalls: commonApiPattern,
    components: commonComponentPattern,
    // ...
  };
}
```

### Pattern Extraction

```typescript
function extractErrorPatterns(files: SourceFile[]): Pattern[] {
  const tryCatchBlocks = findAllTryCatch(files);

  return tryCatchBlocks.map(block => ({
    code: block.code,
    structure: {
      hasLogger: /logger\.|console\.error/.test(block.code),
      hasRethrow: /throw\s+new/.test(block.code),
      hasContext: /context|details|metadata/.test(block.code),
      errorType: extractErrorType(block.code)
    }
  }));
}
```

---

## Validation Engine

### Validation Flow

```
Code Input
    ↓
Pattern Detection (what type of code is this?)
    ↓
Pattern Matching (does it match known patterns?)
    ↓
Existing Function Check (is there already a function for this?)
    ↓
Violation Detection (what rules are broken?)
    ↓
Suggestion Generation (how to fix it?)
    ↓
Validation Result
```

### Scoring Algorithm

```typescript
function calculatePatternScore(code: string): number {
  let score = 100;

  // Deduct for violations
  const violations = findViolations(code);
  violations.forEach(v => {
    score -= v.severity === 'critical' ? 20 : 10;
  });

  // Deduct for recreating existing code
  const duplicates = findDuplicates(code);
  score -= duplicates.length * 15;

  // Bonus for matching patterns well
  const patternMatch = calculatePatternMatch(code);
  score += patternMatch * 10;

  return Math.max(0, Math.min(100, score));
}
```

---

## Implementation

### Phase 1: Pattern Learning

1. **Codebase Analysis**
   - AST parsing for patterns
   - Frequency analysis
   - Pattern extraction

2. **Function Indexing**
   - Index all functions
   - Extract signatures
   - Track usage

### Phase 2: Validation Engine

1. **Pattern Matching**
   - Match code to patterns
   - Detect violations
   - Score adherence

2. **Duplicate Detection**
   - Semantic similarity
   - Function purpose matching
   - Suggestion generation

### Phase 3: Integration

1. **MCP Tools**
   - Validation endpoint
   - Suggestion endpoint
   - Learning endpoint

2. **Feedback Loop**
   - Learn from corrections
   - Improve patterns
   - Track effectiveness

### Files to Create

| File | Purpose |
|------|---------|
| `src/core/pattern-library.ts` | Pattern storage |
| `src/core/pattern-learner.ts` | Pattern extraction |
| `src/core/pattern-validator.ts` | Validation engine |
| `src/core/function-index.ts` | Function tracking |
| `src/core/duplicate-detector.ts` | Duplicate detection |

---

## User Experience

### Validation Feedback

```
🔍 Pattern Validation

Code: getUserToken()

❌ Violations Found (Score: 45/100)

1. 🔴 CRITICAL: Recreating existing function
   Existing: auth() in src/utils/auth.ts
   Suggestion: Use auth() instead

2. 🟡 WARNING: Not following error handling pattern
   Expected: Try-catch with logger
   Found: No error handling

3. 🟡 WARNING: Not following naming convention
   Expected: getAuthToken() or fetchToken()
   Found: getUserToken()

💡 Suggested Code:
```typescript
// Use existing function instead
import { auth } from '../utils/auth';

const token = await auth();
```
```

### Proactive Suggestions

```
💡 Before you write new code...

Existing functions you might need:
├── auth() - Get authentication token
├── formatDate() - Format dates consistently
├── handleApiError() - Standard API error handling
└── useAsync() - Hook for async operations

Search for more: [suggest_existing "your intent"]
```

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Pattern validation | <100ms |
| Duplicate detection | <50ms |
| Suggestion lookup | <30ms |
| Pattern learning | <5s (initial) |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Code duplication | 4x more | Same as manual |
| Pattern adherence | Variable | >90% |
| Existing function usage | Low | High |
| Code review feedback | Frequent | Rare |

---

## Why This Matters

### The Quality Impact

**Before Architecture Enforcement:**
- AI creates 5 different auth functions
- Error handling inconsistent
- Patterns ignored
- Code review catches issues

**After Architecture Enforcement:**
- AI uses existing auth()
- Error handling consistent
- Patterns followed
- Code review minimal

### Competitive Advantage

| Tool | Learns Patterns? | Enforces Patterns? | Prevents Duplicates? |
|------|-----------------|-------------------|---------------------|
| Copilot | No | No | No |
| Cursor | No | No | No |
| Tabnine | Partial | No | No |
| **MemoryLayer** | **Yes** | **Yes** | **Yes** |

---

*Architecture Enforcement Specification - February 2026*
