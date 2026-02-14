# Test-Aware Suggestions

**Feature:** Test-Respecting Code Generation
**Priority:** P2
**Status:** Planned
**Effort:** 2 weeks

---

## Problem Statement

### The Testing Crisis

> "AI refactoring only works 37% of the time. Suggestions break tests."

**Statistics:**
- AI refactoring works only 37% of the time
- Suggestions often break existing tests
- Developers waste time fixing broken tests
- No pre-validation before suggesting

### The Root Problem

AI doesn't know:
1. What tests exist
2. What the tests cover
3. Which tests would break
4. How to update tests

**Result: AI suggests changes that break things.**

---

## Solution: Test-Aware Suggestions

### Core Concept

Understand tests before suggesting changes:

```
AI generates refactor → Check related tests → Validate

✅ "This change passes 5 related tests"
⚠️ "This would break test_login() - here's the fix"
❌ "Cannot safely refactor - 8 tests depend on current implementation"
```

### Architecture

```typescript
interface TestAwareness {
  // Test index
  tests: Map<string, TestInfo>;
  coverage: CoverageMap;

  // Query tests
  getRelatedTests(file: string): TestInfo[];
  getTestsForFunction(fn: string): TestInfo[];
  getCoverage(file: string): CoverageInfo;

  // Validate changes
  validateChange(change: CodeChange): ValidationResult;
  predictTestFailures(change: CodeChange): PredictedFailure[];

  // Suggest test updates
  suggestTestUpdate(change: CodeChange): TestUpdate[];
}

interface TestInfo {
  file: string;
  name: string;
  describes: string;
  coversFiles: string[];
  coversFunctions: string[];
  assertions: Assertion[];
  lastRun: Date;
  lastStatus: 'pass' | 'fail' | 'skip';
}

interface ValidationResult {
  safe: boolean;
  relatedTests: TestInfo[];
  wouldPass: TestInfo[];
  wouldFail: TestInfo[];
  uncertain: TestInfo[];
  suggestedTestUpdates: TestUpdate[];
}
```

---

## Test Indexing

### What We Index

```typescript
interface TestIndex {
  // All tests
  tests: TestInfo[];

  // Coverage mapping
  fileToCoverage: Map<string, TestInfo[]>;  // Which tests cover which files
  functionToCoverage: Map<string, TestInfo[]>;  // Which tests cover which functions

  // Assertion mapping
  assertions: Map<string, Assertion[]>;  // What assertions exist

  // Dependencies
  testDependencies: Map<string, string[]>;  // Test → dependencies
}
```

### Test Parsing

```typescript
// Parse test files
function parseTestFile(file: string): TestInfo[] {
  const ast = parseAST(file);
  const tests: TestInfo[] = [];

  // Find describe/it/test blocks
  const testBlocks = findTestBlocks(ast);

  for (const block of testBlocks) {
    tests.push({
      file,
      name: block.name,
      describes: block.parent?.name || '',
      coversFiles: extractCoveredFiles(block),
      coversFunctions: extractCoveredFunctions(block),
      assertions: extractAssertions(block),
      // ...
    });
  }

  return tests;
}

// Extract what a test covers
function extractCoveredFiles(test: TestBlock): string[] {
  const imports = findImports(test);
  const mocks = findMocks(test);
  const calls = findFunctionCalls(test);

  return [...new Set([
    ...imports.map(i => i.source),
    ...mocks.map(m => m.target),
    ...calls.map(c => c.file)
  ])];
}
```

---

## Change Validation

### Pre-Change Analysis

```typescript
interface ChangeAnalysis {
  // What's being changed
  file: string;
  functions: string[];
  type: 'refactor' | 'add' | 'delete' | 'modify';

  // Impact analysis
  affectedTests: TestInfo[];
  testCoverage: number;  // % of change covered by tests

  // Risk assessment
  risk: 'low' | 'medium' | 'high';
  reasoning: string;
}

// Example analysis
{
  file: "src/auth.ts",
  functions: ["login", "validateToken"],
  type: "refactor",

  affectedTests: [
    { name: "should login successfully", file: "auth.test.ts" },
    { name: "should reject invalid token", file: "auth.test.ts" }
  ],
  testCoverage: 85,

  risk: "medium",
  reasoning: "2 tests cover this code, but login() signature is changing"
}
```

### Failure Prediction

```typescript
function predictTestFailures(change: CodeChange): PredictedFailure[] {
  const failures: PredictedFailure[] = [];
  const affectedTests = getRelatedTests(change.file);

  for (const test of affectedTests) {
    // Check if assertions would still pass
    for (const assertion of test.assertions) {
      const wouldFail = checkAssertionAgainstChange(assertion, change);

      if (wouldFail) {
        failures.push({
          test: test.name,
          assertion: assertion.description,
          reason: wouldFail.reason,
          suggestedFix: generateAssertionFix(assertion, change)
        });
      }
    }

    // Check if mocks need updating
    const mockIssues = checkMocksAgainstChange(test, change);
    failures.push(...mockIssues);
  }

  return failures;
}
```

---

## MCP Tools

### Test Query Tools

```typescript
// get_related_tests
{
  name: "get_related_tests",
  description: "Get tests related to a file or function",
  inputSchema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "File path"
      },
      function: {
        type: "string",
        description: "Function name (optional)"
      }
    },
    required: ["file"]
  }
}

// Returns
{
  tests: [
    {
      name: "should login successfully",
      file: "tests/auth.test.ts",
      covers: ["login()", "validateCredentials()"],
      lastRun: "2 hours ago",
      status: "pass"
    }
  ],
  coverage: 85,
  uncoveredFunctions: ["refreshToken()"]
}
```

### Validation Tools

```typescript
// check_tests
{
  name: "check_tests",
  description: "Check if a code change would break tests",
  inputSchema: {
    type: "object",
    properties: {
      change: {
        type: "string",
        description: "The proposed code change"
      },
      file: {
        type: "string",
        description: "File being changed"
      }
    },
    required: ["change", "file"]
  }
}

// Returns
{
  safe: false,
  wouldFail: [
    {
      test: "should login successfully",
      reason: "Function signature changed",
      assertion: "expect(login(user, pass)).resolves",
      suggestedFix: "Update test to use new signature: login({ user, pass })"
    }
  ],
  wouldPass: [
    { test: "should reject invalid credentials" }
  ],
  suggestedTestUpdates: [
    {
      file: "tests/auth.test.ts",
      line: 15,
      before: "await login(user, pass)",
      after: "await login({ user, pass })"
    }
  ]
}
```

### Test Update Tools

```typescript
// suggest_test_update
{
  name: "suggest_test_update",
  description: "Get suggested test updates for a code change",
  inputSchema: {
    type: "object",
    properties: {
      change: {
        type: "string",
        description: "The code change"
      },
      failingTests: {
        type: "array",
        items: { type: "string" },
        description: "Tests that would fail"
      }
    },
    required: ["change"]
  }
}

// validate_change
{
  name: "validate_change",
  description: "Full validation of a proposed change",
  inputSchema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The new code"
      },
      file: {
        type: "string",
        description: "File being modified"
      },
      runTests: {
        type: "boolean",
        description: "Actually run affected tests"
      }
    },
    required: ["code", "file"]
  }
}
```

---

## Test Frameworks Support

### Supported Frameworks

| Framework | Language | Features |
|-----------|----------|----------|
| Jest | JavaScript/TypeScript | Full support |
| Mocha | JavaScript/TypeScript | Full support |
| Vitest | JavaScript/TypeScript | Full support |
| pytest | Python | Full support |
| unittest | Python | Full support |
| Go testing | Go | Full support |
| JUnit | Java | Planned |
| RSpec | Ruby | Planned |

### Framework Detection

```typescript
function detectTestFramework(): TestFramework {
  // Check package.json
  const pkg = readPackageJson();
  if (pkg.devDependencies?.jest) return 'jest';
  if (pkg.devDependencies?.mocha) return 'mocha';
  if (pkg.devDependencies?.vitest) return 'vitest';

  // Check config files
  if (fileExists('jest.config.js')) return 'jest';
  if (fileExists('vitest.config.ts')) return 'vitest';
  if (fileExists('pytest.ini')) return 'pytest';

  // Check test file patterns
  const testFiles = glob('**/*.test.*');
  // Analyze syntax...
}
```

---

## Assertion Analysis

### Understanding Assertions

```typescript
interface Assertion {
  type: 'equality' | 'truthiness' | 'error' | 'mock' | 'snapshot';
  subject: string;  // What's being tested
  expected: any;    // Expected value
  code: string;     // Actual assertion code
}

// Example parsing
// expect(login(user, pass)).resolves.toEqual({ token: 'abc' })
{
  type: 'equality',
  subject: 'login(user, pass)',
  expected: { token: 'abc' },
  code: "expect(login(user, pass)).resolves.toEqual({ token: 'abc' })"
}
```

### Impact Prediction

```typescript
function predictAssertionImpact(
  assertion: Assertion,
  change: CodeChange
): 'pass' | 'fail' | 'uncertain' {
  // Check if subject is affected
  if (!isSubjectAffected(assertion.subject, change)) {
    return 'pass';  // Change doesn't affect this assertion
  }

  // Check if return type changed
  if (change.affectsReturnType(assertion.subject)) {
    return 'fail';  // Return type changed, assertion will fail
  }

  // Check if signature changed
  if (change.affectsSignature(assertion.subject)) {
    return 'fail';  // Signature changed, call will fail
  }

  // Can't determine
  return 'uncertain';
}
```

---

## Implementation

### Phase 1: Test Indexing

1. **Test Discovery**
   - Find all test files
   - Detect test framework
   - Parse test structure

2. **Coverage Mapping**
   - Map tests to covered files
   - Map tests to covered functions
   - Track assertions

### Phase 2: Validation Engine

1. **Change Analysis**
   - Analyze proposed changes
   - Find affected tests
   - Predict failures

2. **Fix Generation**
   - Generate test updates
   - Suggest new tests
   - Validate fixes

### Phase 3: Integration

1. **MCP Tools**
   - Query endpoints
   - Validation endpoints
   - Update suggestion endpoints

2. **Real-time Validation**
   - Pre-change warnings
   - Post-change verification

### Files to Create

| File | Purpose |
|------|---------|
| `src/core/test-indexer.ts` | Test discovery & indexing |
| `src/core/test-parser.ts` | Test file parsing |
| `src/core/change-validator.ts` | Change validation |
| `src/core/test-suggester.ts` | Test update suggestions |

---

## User Experience

### Pre-Change Warning

```
⚠️ Test Impact Analysis

Proposed Change: Refactor login() signature

📋 Related Tests: 5 tests
├── ✅ test_login_success - Would pass
├── ✅ test_login_failure - Would pass
├── ❌ test_login_with_remember - Would FAIL
├── ❌ test_login_rate_limit - Would FAIL
└── ⚠️ test_session_creation - Uncertain

❌ 2 tests would fail

Reason: login() signature changed from (user, pass) to ({ user, pass })

💡 Suggested Test Updates:

tests/auth.test.ts:15
- await login(user, pass)
+ await login({ user, pass })

tests/auth.test.ts:42
- await login(email, password)
+ await login({ user: email, pass: password })

[Apply updates] [Show all changes] [Cancel refactor]
```

### Coverage Report

```
📊 Test Coverage for src/auth.ts

Overall Coverage: 85%

Functions:
├── login()         ████████░░ 80% (4 tests)
├── logout()        ██████████ 100% (2 tests)
├── validateToken() ████████░░ 75% (3 tests)
└── refreshToken()  ░░░░░░░░░░ 0% (no tests)

⚠️ refreshToken() has no test coverage

💡 Suggested: Add tests for refreshToken()
[Generate test template]
```

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Test indexing (initial) | <10s per 100 tests |
| Related test lookup | <20ms |
| Change validation | <100ms |
| Test update generation | <200ms |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| AI refactor success rate | 37% | 80%+ |
| Tests broken by AI | Frequent | Rare |
| Time fixing tests | High | Minimal |
| Developer confidence | Low | High |

---

## Why This Matters

### The Reliability Impact

**Before Test Awareness:**
1. AI suggests refactor
2. Developer applies change
3. Tests fail
4. Developer spends 30min fixing tests
5. Frustrated developer

**After Test Awareness:**
1. AI suggests refactor
2. AI shows: "2 tests would fail"
3. AI provides: "Here's the test updates"
4. Developer applies both changes
5. Tests pass
6. Happy developer

### Competitive Advantage

| Tool | Knows Tests? | Predicts Failures? | Suggests Updates? |
|------|-------------|-------------------|-------------------|
| Copilot | No | No | No |
| Cursor | No | No | No |
| Tabnine | No | No | No |
| **MemoryLayer** | **Yes** | **Yes** | **Yes** |

---

## AI vs No-AI Components

### No-AI (Free, Instant) - 85%

| Component | Method | Cost |
|-----------|--------|------|
| Test file indexing | AST parsing | FREE |
| Coverage mapping | Static analysis | FREE |
| Assertion extraction | AST parsing | FREE |
| Impact prediction | Dependency analysis | FREE |
| Test discovery | Glob patterns | FREE |
| Framework detection | Config file parsing | FREE |
| Related tests lookup | Database query | FREE |

### AI-Powered (On-demand) - 15%

| Component | When Used | Cost |
|-----------|-----------|------|
| Test update generation | User asks for updates | ~$0.02 |
| New test generation | User asks for new test | ~$0.02 |
| Test explanation | User asks "what does this test?" | ~$0.01 |

### Why AI for Test Generation

**Generating Tests:** Need AI to write actual test code
- "Generate test for new login() signature"
- "Update assertion for changed return type"

This is creative work that requires understanding code intent.

### Cost Estimate
- Test indexing: FREE
- Coverage check: FREE
- Per test generation: ~$0.02
- Monthly (15 generations): ~$0.30

### When AI Runs
- Only when user explicitly requests test updates
- **NOT** on every code change
- **NOT** for simple coverage checks

---

*Test-Aware Suggestions Specification - February 2026*
