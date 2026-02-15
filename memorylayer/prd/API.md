# MemoryLayer v1.0 - API Reference

**Version:** 1.0
**Protocol:** MCP (Model Context Protocol)
**Last Updated:** February 2026
**Total Tools:** 51

---

## Overview

MemoryLayer exposes its functionality through the MCP protocol, providing:
- **51 Tools** - Functions the AI can call
- **2 Resources** - Read-only data the AI can access

All tools work **100% locally** - no API keys required.

---

## Quick Reference

| Category | Tools | Description |
|----------|-------|-------------|
| **Core** | 5 | Context, search, decisions, file access |
| **Symbol & Dependency** | 3 | Code symbols, imports, exports |
| **Learning** | 3 | Predictions, stats, feedback |
| **Multi-Project** | 6 | Cross-project search, ADR export |
| **Feature Context** | 4 | Track current work session |
| **Living Documentation** | 7 | Auto-generated docs, changelog |
| **Context Rot Prevention** | 4 | Health monitoring, compaction |
| **Confidence Scoring** | 3 | Trust indicators, conflict detection |
| **Change Intelligence** | 4 | Git tracking, bug diagnosis |
| **Architecture Enforcement** | 7 | Pattern validation, duplicate detection |
| **Test Awareness** | 4 | Test coverage, failure prediction |

---

## Core Tools

### `get_context`

Get relevant codebase context for a query. This is the primary tool for understanding code.

**Input:**
```json
{
  "query": "string (required) - What you are trying to understand or do",
  "current_file": "string (optional) - Path to current file",
  "max_tokens": "number (optional) - Maximum tokens (default: 6000)"
}
```

**Output:**
```json
{
  "context": "Assembled context with code snippets",
  "sources": ["src/auth/middleware.ts", "src/api/routes.ts"],
  "token_count": 4523,
  "decisions": [{ "id": "...", "title": "...", "description": "..." }]
}
```

---

### `search_codebase`

Search the codebase semantically. Returns files and code snippets matching the query.

**Input:**
```json
{
  "query": "string (required) - Search query",
  "limit": "number (optional) - Max results (default: 10)"
}
```

**Output:**
```json
{
  "results": [{
    "file": "src/auth/login.ts",
    "preview": "export async function login...",
    "relevance": 0.92,
    "line_start": 15,
    "line_end": 45
  }]
}
```

---

### `record_decision`

Record an architectural or design decision.

**Input:**
```json
{
  "title": "string (required) - Short title",
  "description": "string (required) - Why this decision was made",
  "files": "string[] (optional) - Related files",
  "tags": "string[] (optional) - Tags like 'architecture', 'database'"
}
```

---

### `get_file_context`

Get the content and metadata of a specific file.

**Input:**
```json
{
  "path": "string (required) - Relative path to the file"
}
```

**Output:**
```json
{
  "path": "src/index.ts",
  "content": "...",
  "language": "typescript",
  "lines": 150
}
```

---

### `get_project_summary`

Get a summary of the project structure, languages, and recent decisions.

**Input:** None

**Output:**
```json
{
  "name": "my-project",
  "description": "...",
  "languages": ["TypeScript", "JavaScript"],
  "total_files": 150,
  "total_lines": 25000,
  "key_directories": ["src", "tests"],
  "recent_decisions": [...],
  "dependencies": ["express", "react", ...]
}
```

---

## Symbol & Dependency Tools

### `get_symbol`

Find a function, class, interface, or type by name.

**Input:**
```json
{
  "name": "string (required) - Symbol name",
  "kind": "string (optional) - function|class|interface|type|method|enum",
  "limit": "number (optional) - Max results (default: 10)"
}
```

---

### `get_dependencies`

Get what a file imports and what imports it.

**Input:**
```json
{
  "path": "string (required) - Relative path to the file"
}
```

**Output:**
```json
{
  "file": "src/auth/login.ts",
  "imports": [{ "file": "src/db/users.ts", "symbols": ["getUser"] }],
  "imported_by": [{ "file": "src/api/routes.ts", "symbols": ["login"] }],
  "symbols": [{ "name": "login", "kind": "function", "line": 15, "exported": true }]
}
```

---

### `get_file_summary`

Get a compressed summary of a file (10x smaller than full content).

**Input:**
```json
{
  "path": "string (required) - Relative path to the file"
}
```

---

## Learning Tools

### `get_predicted_files`

Get files predicted to be relevant based on current context.

**Input:**
```json
{
  "current_file": "string (required) - Current file path",
  "query": "string (required) - What you are working on"
}
```

---

### `get_learning_stats`

Get usage statistics and learning metrics.

**Input:** None

**Output:**
```json
{
  "usage": { "total_queries": 150, "total_file_views": 500 },
  "compression": { "avg_compression_ratio": "8.5x", "tokens_saved": 45000 },
  "cache": { "hot_cache_size": 25, "cached_files": [...] }
}
```

---

### `mark_context_useful`

Provide feedback on whether retrieved context was useful.

**Input:**
```json
{
  "query": "string (required) - The query that was made",
  "was_useful": "boolean (required) - Whether it was useful"
}
```

---

## Multi-Project Tools

### `list_projects`

List all registered projects across your system.

**Input:** None

---

### `switch_project`

Switch to a different registered project.

**Input:**
```json
{
  "project_id": "string (required) - Project ID to switch to"
}
```

---

### `search_all_projects`

Search across all registered projects.

**Input:**
```json
{
  "query": "string (required) - Search query",
  "limit": "number (optional) - Results per project (default: 5)"
}
```

---

### `record_decision_with_author`

Record a decision with author attribution and status.

**Input:**
```json
{
  "title": "string (required)",
  "description": "string (required)",
  "author": "string (required)",
  "status": "string (optional) - proposed|accepted|deprecated|superseded",
  "files": "string[] (optional)",
  "tags": "string[] (optional)"
}
```

---

### `update_decision_status`

Update the status of an existing decision.

**Input:**
```json
{
  "decision_id": "string (required)",
  "status": "string (required) - proposed|accepted|deprecated|superseded",
  "superseded_by": "string (optional) - ID of superseding decision"
}
```

---

### `export_decisions_to_adr`

Export all decisions to ADR markdown files.

**Input:**
```json
{
  "output_dir": "string (optional) - Output directory (default: docs/decisions)",
  "format": "string (optional) - madr|nygard|simple (default: madr)",
  "include_index": "boolean (optional) - Generate README (default: true)"
}
```

---

### `discover_projects`

Discover potential projects in common locations.

**Input:** None

---

## Feature Context Tools

### `get_active_context`

Get the current feature context including files being worked on.

**Input:** None

**Output:**
```json
{
  "summary": "Working on auth refactor",
  "current_feature": { "name": "auth-refactor", "files_count": 5 },
  "active_files": [...],
  "recent_changes": [...],
  "recent_queries": [...]
}
```

---

### `set_feature_context`

Start tracking a new feature.

**Input:**
```json
{
  "name": "string (required) - Feature name",
  "files": "string[] (optional) - Initial files to track"
}
```

---

### `list_recent_contexts`

List recently worked on features/contexts.

**Input:** None

---

### `switch_feature_context`

Switch back to a previously worked on feature.

**Input:**
```json
{
  "context_id": "string (required) - Context ID to switch to"
}
```

---

## Living Documentation Tools

### `generate_docs`

Generate documentation for a file or the entire architecture.

**Input:**
```json
{
  "path": "string (optional) - Path to document (omit for architecture)",
  "type": "string (optional) - component|architecture"
}
```

---

### `get_architecture`

Get project architecture overview with layers, data flow, and ASCII diagram.

**Input:** None

**Output:**
```json
{
  "name": "my-project",
  "description": "...",
  "diagram": "ASCII architecture diagram",
  "layers": [{ "name": "API", "directory": "src/api", "purpose": "..." }],
  "data_flow": "Request → Router → Controller → Service → Database",
  "key_components": [...],
  "dependencies": [...]
}
```

---

### `get_component_doc`

Get detailed documentation for a component/file.

**Input:**
```json
{
  "path": "string (required) - Relative path to file"
}
```

**Output:**
```json
{
  "file": "src/auth/login.ts",
  "name": "Authentication Module",
  "purpose": "Handles user authentication",
  "public_interface": [...],
  "dependencies": [...],
  "dependents": [...],
  "change_history": [...],
  "complexity": "medium",
  "documentation_score": 85
}
```

---

### `get_changelog`

Get changelog of recent changes grouped by day.

**Input:**
```json
{
  "since": "string (optional) - yesterday|today|this week|this month|date",
  "group_by": "string (optional) - day|week",
  "include_decisions": "boolean (optional)"
}
```

---

### `validate_docs`

Check for outdated documentation and calculate documentation score.

**Input:** None

---

### `what_happened`

Query recent project activity - commits, file changes, and decisions.

**Input:**
```json
{
  "since": "string (required) - Time period",
  "scope": "string (optional) - Limit to specific directory"
}
```

---

### `find_undocumented`

Find code that lacks documentation.

**Input:**
```json
{
  "importance": "string (optional) - low|medium|high|all",
  "type": "string (optional) - file|function|class|interface|all"
}
```

---

## Context Rot Prevention Tools

### `get_context_health`

Check current context health, detect drift, and get compaction suggestions.

**Input:**
```json
{
  "include_history": "boolean (optional)"
}
```

**Output:**
```json
{
  "health": "healthy|warning|critical",
  "tokens_used": 4500,
  "tokens_limit": 8000,
  "utilization": "56%",
  "drift_score": 0.15,
  "compaction_needed": false,
  "suggestions": [...]
}
```

---

### `trigger_compaction`

Manually trigger context compaction to reduce token usage.

**Input:**
```json
{
  "strategy": "string (optional) - summarize|selective|aggressive",
  "preserve_recent": "number (optional) - Messages to preserve",
  "target_utilization": "number (optional) - Target percentage"
}
```

---

### `mark_critical`

Mark content as critical - it will never be compressed or removed.

**Input:**
```json
{
  "content": "string (required) - Critical content",
  "type": "string (optional) - decision|requirement|instruction|custom",
  "reason": "string (optional)"
}
```

---

### `get_critical_context`

Get all marked critical context items.

**Input:**
```json
{
  "type": "string (optional) - Filter by type"
}
```

---

## Confidence Scoring Tools

### `get_confidence`

Get confidence score for a code suggestion.

**Input:**
```json
{
  "code": "string (required) - Code to evaluate",
  "context": "string (optional) - What this code is for"
}
```

**Output:**
```json
{
  "confidence": "high|medium|low|uncertain",
  "score": 85,
  "reasoning": "Found 3 similar patterns in codebase",
  "indicator": "🟢",
  "sources": {
    "codebase": [...],
    "decisions": [...],
    "patterns": [...]
  },
  "warnings": [...]
}
```

---

### `list_sources`

List all sources used for a code suggestion.

**Input:**
```json
{
  "code": "string (required)",
  "context": "string (optional)",
  "include_snippets": "boolean (optional)"
}
```

---

### `check_conflicts`

Check if code conflicts with past architectural decisions.

**Input:**
```json
{
  "code": "string (required) - Code to check"
}
```

**Output:**
```json
{
  "has_conflicts": true,
  "conflicts": [{
    "decision_id": "...",
    "decision_title": "Use JWT for auth",
    "conflict_description": "Code uses session-based auth",
    "severity": "warning"
  }]
}
```

---

## Change Intelligence Tools

### `what_changed`

Query what changed in the codebase.

**Input:**
```json
{
  "since": "string (required) - yesterday|today|this week|date",
  "file": "string (optional) - Filter to specific file",
  "author": "string (optional) - Filter by author"
}
```

**Output:**
```json
{
  "period": "yesterday",
  "total_files": 15,
  "total_lines_added": 450,
  "total_lines_removed": 120,
  "by_author": { "john": 10, "jane": 5 },
  "changes": [...]
}
```

---

### `why_broke`

Diagnose why something broke. Correlates errors with recent changes.

**Input:**
```json
{
  "error": "string (required) - Error message",
  "file": "string (optional) - File where error occurs",
  "line": "number (optional) - Line number"
}
```

**Output:**
```json
{
  "likely_cause": {
    "file": "src/api/users.ts",
    "author": "john",
    "timestamp": "...",
    "commit_message": "Refactored user validation",
    "diff": "..."
  },
  "confidence": 85,
  "related_changes": [...],
  "past_similar_bugs": [...],
  "suggested_fix": "Restore the null check on line 45"
}
```

---

### `find_similar_bugs`

Find similar bugs from history with their fixes.

**Input:**
```json
{
  "error": "string (required) - Error message",
  "limit": "number (optional) - Max results (default: 5)"
}
```

---

### `suggest_fix`

Get fix suggestions for an error based on history and patterns.

**Input:**
```json
{
  "error": "string (required)",
  "context": "string (optional) - Additional context"
}
```

---

## Architecture Enforcement Tools

### `validate_pattern`

Validate code against established project patterns.

**Input:**
```json
{
  "code": "string (required) - Code to validate",
  "type": "string (optional) - error_handling|api_call|component|validation|auto"
}
```

**Output:**
```json
{
  "valid": false,
  "score": 65,
  "matched_pattern": "Error Handling",
  "violations": [{
    "rule": "Never swallow errors silently",
    "message": "Empty catch block",
    "severity": "critical",
    "suggestion": "Add logging or rethrow"
  }],
  "existing_alternatives": [...]
}
```

---

### `suggest_existing`

Find existing functions that match your intent. Prevents creating duplicates.

**Input:**
```json
{
  "intent": "string (required) - What you want to do",
  "limit": "number (optional) - Max suggestions (default: 5)"
}
```

**Output:**
```json
{
  "suggestions": [{
    "name": "validateEmail",
    "file": "src/utils/validators.ts",
    "line": 45,
    "signature": "validateEmail(email: string): boolean",
    "description": "Validates email format",
    "usage_count": 15,
    "similarity": 0.92
  }]
}
```

---

### `learn_pattern`

Teach a new pattern to the system.

**Input:**
```json
{
  "code": "string (required) - Example code",
  "name": "string (required) - Pattern name",
  "description": "string (optional)",
  "category": "string (optional) - error_handling|api_call|component|..."
}
```

---

### `list_patterns`

List all learned patterns.

**Input:**
```json
{
  "category": "string (optional) - Filter by category"
}
```

---

### `get_pattern`

Get details of a specific pattern.

**Input:**
```json
{
  "id": "string (required) - Pattern ID"
}
```

---

### `add_pattern_example`

Add an example or anti-pattern to an existing pattern.

**Input:**
```json
{
  "pattern_id": "string (required)",
  "code": "string (required)",
  "explanation": "string (required)",
  "is_anti_pattern": "boolean (optional) - Mark as what NOT to do"
}
```

---

### `get_architecture_stats`

Get statistics about patterns and functions.

**Input:** None

---

## Test Awareness Tools

### `get_related_tests`

Get tests related to a file or function.

**Input:**
```json
{
  "file": "string (required) - File path",
  "function": "string (optional) - Function name"
}
```

**Output:**
```json
{
  "file": "src/auth/login.ts",
  "function": "login",
  "total": 5,
  "tests": [{
    "id": "...",
    "name": "should authenticate valid user",
    "file": "tests/auth/login.test.ts",
    "line_start": 15,
    "covers_functions": ["login", "validateCredentials"],
    "last_status": "pass"
  }]
}
```

---

### `check_tests`

Check if a code change would break tests.

**Input:**
```json
{
  "change": "string (required) - The proposed code change",
  "file": "string (required) - File being changed"
}
```

**Output:**
```json
{
  "safe": false,
  "coverage_percent": 80,
  "related_tests": 5,
  "would_pass": [...],
  "would_fail": [{
    "test_name": "should validate email",
    "reason": "Changed validation regex",
    "confidence": 85,
    "suggested_fix": "Update expected value"
  }],
  "uncertain": [...],
  "suggested_updates": [...]
}
```

---

### `suggest_test_update`

Get suggested test updates for a code change.

**Input:**
```json
{
  "change": "string (required) - The code change",
  "failing_tests": "string[] (optional) - Test IDs that failed"
}
```

---

### `get_test_coverage`

Get test coverage for a file.

**Input:**
```json
{
  "file": "string (required) - File path"
}
```

**Output:**
```json
{
  "file": "src/auth/login.ts",
  "total_tests": 5,
  "coverage_percent": 80,
  "covered_functions": ["login", "logout", "validateCredentials"],
  "uncovered_functions": ["refreshToken"]
}
```

---

## MCP Resources

### `memorylayer://project/summary`

Read-only access to project summary.

**MIME Type:** `application/json`

---

### `memorylayer://decisions/recent`

Read-only access to recent decisions.

**MIME Type:** `application/json`

---

## Example Usage

### Understanding Code

```
User: "How does user authentication work?"

AI calls: get_context({ query: "user authentication login flow" })
Returns: Auth middleware, login handler, JWT utilities, related decisions
```

### Before Making Changes

```
User: "I want to add email validation"

AI calls: suggest_existing({ intent: "validate email" })
Returns: Existing validateEmail function in src/utils/validators.ts

AI calls: check_tests({ change: "new validation logic", file: "src/auth/register.ts" })
Returns: Would break 2 tests, suggests updates
```

### Debugging

```
User: "Getting 'Cannot read property email of undefined'"

AI calls: why_broke({ error: "Cannot read property email of undefined" })
Returns: Likely caused by commit abc123 which refactored user response

AI calls: suggest_fix({ error: "Cannot read property email of undefined" })
Returns: Add null check before accessing user.email
```

### Architecture Validation

```
User: "Is this code pattern correct?"

AI calls: validate_pattern({ code: "try { ... } catch (e) { return null; }" })
Returns: Score 40/100, violation: "Never swallow errors silently"
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Feb 2026 | Initial release with 51 tools |

---

*Documentation generated for MemoryLayer v1.0*
