# MemoryLayer Phase 13: Pre-Commit Quality Gate

> Solving the "almost right solutions" problem - catch hallucinations, security issues, and integration problems BEFORE they land

## Overview

Phase 13 extends the **5+6 Gateway Pattern** to **6+6 Pattern** (6 gateways + 6 standalone = 12 tools) by adding the `memory_verify` gateway for pre-commit quality verification.

**Problem Solved:**

| Problem | Stat | How We Solve It |
|---------|------|-----------------|
| Hallucination detection | AI invents libraries | Import verification - checks if imports exist |
| Security vulnerabilities | 1.7x more in AI code | OWASP Top 10 security scan |
| Pre-commit quality gate | Needed by users | Unified `memory_verify` tool |
| Dependency validation | Wrong packages suggested | Package.json + node_modules check |

**New Capabilities:**
- **Import Verification**: Catches hallucinated libraries that don't exist
- **Security Scanning**: OWASP Top 10 vulnerability detection
- **Dependency Checking**: Validates packages are installed
- **Pattern Compliance**: Ensures code follows project conventions
- **Test Impact**: Warns about tests that would break
- **Proactive Context**: Enhanced resurrection messaging

---

## The 6 Gateway Tools (Updated from 5)

### 1. `memory_query` - "What do I need to know?"
**Enhanced in Phase 13:**
- **Better déjà vu surfacing**: Human-readable "time ago" formatting
- **Prominent hints**: "You worked on something similar 2 days ago"

### 2. `memory_record` - "Remember this"
*Unchanged from Phase 12*

### 3. `memory_review` - "Check this code"
*Unchanged from Phase 12*

### 4. `memory_status` - "What's the state?"
**Enhanced in Phase 13:**
- **Proactive resurrection**: Project summary now includes "Welcome back!" data
- Returns `welcome_back` field with last session context
- Shows possible blockers and suggested actions

### 5. `memory_ghost` - "Proactive Intelligence"
*Unchanged from Phase 12*

### 6. `memory_verify` - "Pre-Commit Quality Gate" (NEW)

**Description:** Pre-commit quality gate for AI-generated code. Catches hallucinations, security issues, and integration problems BEFORE they land.

**Checks:**
| Check | What It Does | Risk Addressed |
|-------|--------------|----------------|
| `imports` | Verifies imports exist, API usage correct | Hallucination |
| `security` | OWASP Top 10 pattern scan | 1.7x vulnerability |
| `dependencies` | Package.json + node_modules check | Wrong packages |
| `patterns` | Project pattern compliance | Code duplication |
| `tests` | Test impact analysis | Breakage |
| `all` | Run everything (default) | Comprehensive |

**Input:**
```typescript
interface MemoryVerifyInput {
  code: string;           // Required: code to verify
  file?: string;          // Target file (enables import resolution)
  checks?: VerifyCheck[]; // Which checks to run (default: all)
  intent?: string;        // What code is for (improves suggestions)
}
```

**Output:**
```typescript
interface MemoryVerifyResponse {
  verdict: 'pass' | 'warning' | 'fail';
  score: number;          // 0-100, higher is better
  summary: string;        // Human-readable summary
  imports?: ImportVerification;
  security?: SecurityScanResult;
  dependencies?: DependencyCheckResult;
  patterns?: PatternValidation;
  test_impact?: TestImpact;
  conflicts?: ConflictWarnings;
  suggestions: string[];  // Actionable fixes
}
```

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

### `src/core/code-verifier.ts`

**Purpose:** Core verification logic for imports, security, and dependencies.

```typescript
export class CodeVerifier {
  // Full verification
  async verify(code: string, file?: string, checks?: VerificationCheck[]): Promise<VerificationResult>;

  // Import verification - do imports exist?
  verifyImports(code: string, file?: string): ImportVerification;

  // Security scan - OWASP Top 10 patterns
  scanSecurity(code: string, language?: string): SecurityScanResult;

  // Dependency check - are packages installed?
  checkDependencies(code: string): DependencyCheckResult;
}
```

**Security Patterns (OWASP Top 10):**

| Type | Severity | CWE |
|------|----------|-----|
| SQL Injection | Critical | CWE-89 |
| XSS | High | CWE-79 |
| Command Injection | Critical | CWE-78 |
| Path Traversal | High | CWE-22 |
| Hardcoded Secrets | Critical | CWE-798 |
| Insecure Random | Medium | CWE-330 |
| Weak Crypto | Medium-High | CWE-327/328 |
| Prototype Pollution | High | CWE-1321 |
| Regex DoS | Medium | CWE-1333 |
| Unsafe Eval | High | CWE-95 |
| SSRF | High | CWE-918 |
| Open Redirect | Medium | CWE-601 |

### `src/server/gateways/memory-verify.ts`

**Purpose:** Gateway handler for `memory_verify` tool.

Orchestrates all verification checks and aggregates results into a unified response with verdict and suggestions.

---

## Files Modified

### `src/core/engine.ts`

**Added Code Verification Methods:**

```typescript
export class MemoryLayerEngine {
  private codeVerifier: CodeVerifier;

  // Full verification
  async verifyCode(code: string, file?: string, checks?: VerificationCheck[]): Promise<VerificationResult>;

  // Quick security scan
  quickSecurityScan(code: string, language?: string): SecurityScanResult;

  // Import verification only
  verifyImports(code: string, file?: string): ImportVerification;

  // Dependency check only
  checkCodeDependencies(code: string): DependencyCheckResult;
}
```

### `src/server/gateways/memory-status.ts`

**Enhanced Project Summary with Resurrection:**

```typescript
// Project summary now includes welcome_back field
const response = {
  project: { ... },
  learning: { ... },
  // NEW: Proactive context resurrection
  welcome_back: {
    summary: "Last session summary...",
    active_files: ["src/auth/login.ts", ...],
    last_queries: ["how to handle JWT", ...],
    possible_blocker: "JWT expiration handling",
    suggested_actions: ["Continue working on login.ts"],
    time_since_last_active: "2 hours ago"
  }
};
```

### `src/server/gateways/memory-query.ts`

**Enhanced Déjà Vu Surfacing:**

```typescript
// Déjà vu matches now include human-readable time
deja_vu: {
  has_matches: true,
  hint: "You worked on something similar 2 days ago",
  matches: [{
    type: "query",
    message: "...",
    similarity: 0.85,
    when: "2025-02-15T10:00:00Z",
    time_ago: "2 days ago"  // NEW: Human-readable
  }]
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
  'memory_ghost',
  'memory_verify',  // NEW
] as const;
```

### `src/server/gateways/types.ts`

**Added Verify Types:**

```typescript
export type MemoryVerifyCheck = 'imports' | 'security' | 'dependencies' | 'patterns' | 'tests' | 'all';

export interface MemoryVerifyInput { ... }
export interface MemoryVerifyResponse { ... }
```

---

## Type Definitions

### Verification Result Types

```typescript
export interface VerificationResult {
  verdict: 'pass' | 'warning' | 'fail';
  score: number;
  imports?: ImportVerification;
  security?: SecurityScanResult;
  dependencies?: DependencyCheckResult;
  patterns?: PatternValidationResult;
  conflicts?: ConflictResult;
  summary: string;
  suggestions: string[];
}

export interface ImportVerification {
  valid: boolean;
  issues: ImportIssue[];
  warnings: ImportWarning[];
}

export interface ImportIssue {
  import: string;
  type: 'missing_package' | 'missing_file' | 'invalid_export' | 'deprecated' | 'hallucinated';
  message: string;
  suggestion?: string;
}

export interface SecurityScanResult {
  safe: boolean;
  issues: SecurityIssue[];
  score: number;
}

export interface SecurityIssue {
  type: SecurityIssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  line?: number;
  code?: string;
  message: string;
  cwe?: string;
  suggestion?: string;
}

export interface DependencyCheckResult {
  valid: boolean;
  issues: DependencyIssue[];
}

export interface DependencyIssue {
  package: string;
  type: 'not_installed' | 'version_mismatch' | 'deprecated' | 'vulnerable' | 'unlisted';
  message: string;
  suggestion?: string;
}
```

---

## Usage Examples

### Full Pre-Commit Verification

```typescript
// Before committing AI-generated code
const result = await memory_verify({
  code: `
    import { nonExistentLib } from 'fake-package';
    const query = \`SELECT * FROM users WHERE id = \${userId}\`;
  `,
  file: 'src/db/users.ts',
  checks: ['all']
});

// Response:
{
  verdict: 'fail',
  score: 25,
  summary: '❌ [FAIL] Score: 25/100 | Imports: 1 issue | Security: 1 critical',
  imports: {
    valid: false,
    issues: [{
      import: 'fake-package',
      type: 'missing_package',
      message: 'Package "fake-package" is not installed',
      suggestion: 'Install with: npm install fake-package'
    }]
  },
  security: {
    safe: false,
    score: 70,
    issues: [{
      type: 'sql_injection',
      severity: 'critical',
      line: 3,
      message: 'Potential SQL injection: string interpolation in SQL query',
      cwe: 'CWE-89',
      suggestion: 'Use parameterized queries instead of string interpolation'
    }]
  },
  suggestions: [
    'Install with: npm install fake-package',
    'Use parameterized queries instead of string interpolation'
  ]
}
```

### Security-Only Scan

```typescript
const result = await memory_verify({
  code: `
    eval(userInput);
    document.innerHTML = data;
    const password = 'hardcoded123';
  `,
  checks: ['security']
});

// Response:
{
  verdict: 'fail',
  score: 20,
  security: {
    safe: false,
    score: 20,
    issues: [
      { type: 'unsafe_eval', severity: 'high', cwe: 'CWE-95' },
      { type: 'xss', severity: 'high', cwe: 'CWE-79' },
      { type: 'hardcoded_secret', severity: 'critical', cwe: 'CWE-798' }
    ]
  }
}
```

### Import Verification

```typescript
const result = await memory_verify({
  code: `
    import { something } from './nonexistent';
    import axios from 'axios';  // not in package.json
  `,
  file: 'src/api/client.ts',
  checks: ['imports', 'dependencies']
});

// Response:
{
  verdict: 'warning',
  score: 70,
  imports: {
    valid: false,
    issues: [{
      import: './nonexistent',
      type: 'missing_file',
      message: 'Cannot resolve import "./nonexistent" - file not found'
    }]
  },
  dependencies: {
    valid: false,
    issues: [{
      package: 'axios',
      type: 'not_installed',
      message: 'Package "axios" is not installed',
      suggestion: 'Install with: npm install axios'
    }]
  }
}
```

---

## Verdict Logic

| Condition | Verdict |
|-----------|---------|
| Critical security issue | `fail` |
| 2+ high severity security issues | `fail` |
| High severity decision conflict | `fail` |
| 2+ hallucinated imports | `fail` |
| Score >= 70 | `pass` |
| Score 40-69 | `warning` |
| Score < 40 | `fail` |

---

## Token Savings (Updated)

| Metric | Before (51 tools) | After 5+6 (11 tools) | After 6+6 (12 tools) |
|--------|-------------------|----------------------|----------------------|
| Tool descriptions | ~5,500 tokens | ~700 tokens | ~800 tokens |
| Avg calls per task | 5-10 | 1-2 | 1-2 |
| Total per task | 2,500-5,000 | 600-1,200 | 600-1,200 |
| **Savings** | - | **~80% reduction** | **~80% reduction** |

The new `memory_verify` tool adds ~100 tokens but **prevents costly debugging cycles** from hallucinated imports and security issues.

---

## Verification

### Build Verification
```bash
npm run build   # ✓ Passes
npm run test:run  # ✓ 36 tests pass
```

### Test Scenarios

1. **Hallucination Detection:**
   - Write code importing `fake-nonexistent-package`
   - Run `memory_verify`
   - Verify: Issue flagged with install suggestion

2. **Security Scanning:**
   - Write code with SQL injection pattern
   - Run `memory_verify checks=['security']`
   - Verify: Critical issue with CWE reference

3. **Dependency Check:**
   - Import package not in package.json
   - Run `memory_verify checks=['dependencies']`
   - Verify: Package flagged as not installed

4. **Proactive Resurrection:**
   - Work on files, close session
   - Reopen, call `memory_status`
   - Verify: `welcome_back` field with session context

---

## Summary

Phase 13 adds a **pre-commit quality gate** that solves top vibe coder problems:

1. **Catches hallucinations** - Verifies imports actually exist
2. **Scans for security** - OWASP Top 10 pattern matching
3. **Validates dependencies** - Ensures packages are installed
4. **Checks patterns** - Enforces project conventions
5. **Predicts test impact** - Warns about breakage
6. **Surfaces context** - Enhanced resurrection messaging

Total Tools: **6 Gateways + 6 Standalone = 12 Tools**
(Previously: 5 Gateways + 6 Standalone = 11 Tools)

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
| 12 | Super Intelligent Brain (5+6) | P0 | Done |
| **13** | **Pre-Commit Quality Gate (6+6)** | **P0** | **Done** |

---

## Previous Plan: Super Intelligent Brain (Phase 12)

### Features Implemented:
- **Ghost Mode**: Silent tracking, proactive decision surfacing
- **Conflict Radar**: Warns about architectural conflicts
- **Déjà Vu Detection**: "You solved this before" moments
- **Context Resurrection**: "Welcome back! Last time you were working on X"
- **Background Intelligence**: Continuous learning loop

### Files Created:
- `src/core/ghost-mode.ts` - Ghost Mode implementation
- `src/core/deja-vu.ts` - Déjà Vu Detector
- `src/server/gateways/memory-ghost.ts` - Gateway handler

### Files Modified:
- `src/core/engine.ts` - Added ghost mode integration
- `src/core/feature-context.ts` - Added resurrection logic
- `src/core/learning.ts` - Added importance weighting
- All gateway files - Enhanced with proactive features


claude --resume 95917755-1eda-4f70-a49a-77923462e101