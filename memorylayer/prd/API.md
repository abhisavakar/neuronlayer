# MemoryLayer v1.0 - API Reference

**Version:** 1.0
**Protocol:** MCP (Model Context Protocol)
**Last Updated:** February 2026

---

## Overview

MemoryLayer exposes its functionality through the MCP protocol, providing:
- **5 Tools** - Functions the AI can call
- **2 Resources** - Read-only data the AI can access

---

## MCP Tools

### 1. `get_context`

**Purpose:** Get relevant codebase context for a query. This is the primary tool for understanding code.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "What you are trying to understand or do"
    },
    "current_file": {
      "type": "string",
      "description": "Path to the file currently being discussed (optional)"
    },
    "max_tokens": {
      "type": "number",
      "description": "Maximum tokens to return (default: 6000)"
    }
  },
  "required": ["query"]
}
```

**Output:**

```json
{
  "context": "## Codebase Context\n\n### Relevant Code\n...",
  "sources": [
    "src/auth/middleware.ts",
    "src/api/routes.ts",
    "src/models/user.ts"
  ],
  "token_count": 4523,
  "decisions": [
    {
      "id": "abc-123",
      "title": "Use JWT for authentication",
      "description": "Chose JWT over sessions for stateless auth...",
      "created_at": "2026-02-10T12:00:00.000Z"
    }
  ]
}
```

**Example Usage:**

```
User: "How does user authentication work in this app?"

AI calls: get_context({
  query: "user authentication flow login JWT middleware",
  current_file: "src/api/routes.ts"
})

Returns: Relevant auth code, middleware, and previous decisions about auth
```

**Context Format:**

The `context` field contains markdown-formatted content:

```markdown
## Codebase Context

### Working File
File: src/api/routes.ts
```typescript
// Currently active file content
```

### Relevant Code

#### src/auth/middleware.ts (relevance: 92%)
```typescript
export function authMiddleware(req, res, next) {
  // JWT verification logic
}
```

#### src/models/user.ts (relevance: 85%)
```typescript
export interface User {
  id: string;
  email: string;
}
```

### Architecture Decisions

- **Use JWT for authentication** (2/10/2026)
  Chose JWT over sessions for stateless auth in distributed environment.
```

---

### 2. `search_codebase`

**Purpose:** Search the codebase semantically. Returns raw search results without assembly.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query"
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of results (default: 10)"
    }
  },
  "required": ["query"]
}
```

**Output:**

```json
{
  "results": [
    {
      "file": "src/auth/middleware.ts",
      "preview": "export function authMiddleware(req, res, next) {\n  const token = req.headers.authorization;\n  ...",
      "relevance": 0.92,
      "line_start": 1,
      "line_end": 50
    },
    {
      "file": "src/api/routes.ts",
      "preview": "import { authMiddleware } from '../auth/middleware';\n\nrouter.use(authMiddleware);\n...",
      "relevance": 0.85,
      "line_start": 1,
      "line_end": 50
    }
  ]
}
```

**Example Usage:**

```
User: "Find all files related to payment processing"

AI calls: search_codebase({
  query: "payment processing stripe checkout",
  limit: 15
})

Returns: List of payment-related files with previews
```

---

### 3. `record_decision`

**Purpose:** Record an architectural or design decision for future reference.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Short title for the decision"
    },
    "description": {
      "type": "string",
      "description": "Why this decision was made, context, tradeoffs"
    },
    "files": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Related files (optional)"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Tags like 'architecture', 'database', 'security' (optional)"
    }
  },
  "required": ["title", "description"]
}
```

**Output:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Use PostgreSQL for primary database",
  "description": "Chose PostgreSQL over MongoDB because we need ACID transactions...",
  "files": ["src/db/connection.ts", "src/models/payment.ts"],
  "tags": ["database", "architecture"],
  "created_at": "2026-02-14T10:30:00.000Z",
  "message": "Decision recorded successfully"
}
```

**Example Usage:**

```
User: "Let's use Redis for caching because it's fast and we need pub/sub"

AI calls: record_decision({
  title: "Use Redis for caching and pub/sub",
  description: "Chose Redis over Memcached because we need pub/sub for real-time notifications. Redis also provides persistence options if needed later.",
  files: ["src/cache/redis.ts", "src/services/notifications.ts"],
  tags: ["caching", "infrastructure", "real-time"]
})

Returns: Confirmation with decision ID
```

**Best Practices for Decisions:**

1. **Title:** Keep it short and action-oriented
   - Good: "Use PostgreSQL for primary database"
   - Bad: "Database decision"

2. **Description:** Include:
   - What was decided
   - Why (rationale)
   - Alternatives considered
   - Tradeoffs accepted

3. **Tags:** Use consistent tags across decisions:
   - `architecture`, `database`, `api`, `security`, `performance`
   - `frontend`, `backend`, `infrastructure`, `testing`

---

### 4. `get_file_context`

**Purpose:** Get the full content and metadata of a specific file.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Relative path to the file"
    }
  },
  "required": ["path"]
}
```

**Output (Success):**

```json
{
  "path": "src/auth/middleware.ts",
  "content": "import { verify } from 'jsonwebtoken';\nimport { config } from '../config';\n\nexport function authMiddleware(req, res, next) {\n  // Full file content...\n}\n",
  "language": "typescript",
  "lines": 45
}
```

**Output (Error):**

```json
{
  "error": "File not found: src/nonexistent.ts"
}
```

**Example Usage:**

```
User: "Show me the contents of the auth middleware file"

AI calls: get_file_context({
  path: "src/auth/middleware.ts"
})

Returns: Full file content with metadata
```

**Notes:**
- Path should be relative to the project root
- Sets this file as the "active file" in working context
- File is added to "recently viewed" list

---

### 5. `get_project_summary`

**Purpose:** Get a high-level overview of the project.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {}
}
```

**Output:**

```json
{
  "name": "my-awesome-app",
  "description": "A SaaS application for task management",
  "languages": ["typescript", "javascript", "css"],
  "total_files": 234,
  "total_lines": 45678,
  "key_directories": ["src", "api", "components", "lib"],
  "recent_decisions": [
    {
      "id": "abc-123",
      "title": "Use Next.js for frontend",
      "description": "Chose Next.js for SSR and built-in routing...",
      "created_at": "2026-02-12T09:00:00.000Z"
    }
  ],
  "dependencies": [
    "next",
    "react",
    "prisma",
    "@tanstack/react-query",
    "tailwindcss"
  ],
  "architecture_notes": ""
}
```

**Example Usage:**

```
User: "Give me an overview of this project"

AI calls: get_project_summary()

Returns: Project name, stats, languages, key directories, dependencies
```

---

## MCP Resources

Resources are read-only data that the AI can access without making a tool call.

### 1. `memorylayer://decisions/recent`

**Purpose:** Access the last 10 architectural decisions.

**MIME Type:** `application/json`

**Content:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Use PostgreSQL for primary database",
    "description": "Chose PostgreSQL over MongoDB...",
    "files": ["src/db/connection.ts"],
    "tags": ["database", "architecture"],
    "created_at": "2026-02-14T10:30:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Use JWT for authentication",
    "description": "Stateless auth for distributed system...",
    "files": ["src/auth/middleware.ts"],
    "tags": ["security", "architecture"],
    "created_at": "2026-02-13T15:45:00.000Z"
  }
]
```

**Usage:** AI can read this resource to quickly access recent decisions without a tool call.

---

### 2. `memorylayer://project/overview`

**Purpose:** Get a markdown-formatted project overview.

**MIME Type:** `text/markdown`

**Content:**

```markdown
# my-awesome-app

A SaaS application for task management.

## Statistics
- **Total Files**: 234
- **Total Lines**: 45,678
- **Languages**: typescript, javascript, css

## Key Directories
- `src/`
- `api/`
- `components/`
- `lib/`

## Dependencies
- next
- react
- prisma
- @tanstack/react-query
- tailwindcss
... and 15 more

## Recent Decisions

### Use PostgreSQL for primary database
Chose PostgreSQL over MongoDB because we need ACID transactions for payment processing.
_2/14/2026_

### Use JWT for authentication
Stateless auth for distributed system with multiple API servers.
_2/13/2026_
```

**Usage:** AI can read this for a quick project overview.

---

## Error Handling

All tools return errors in a consistent format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `File not found: {path}` | File doesn't exist | Check path spelling |
| `Unknown tool: {name}` | Invalid tool name | Use correct tool name |
| `Embedding model not initialized` | Model failed to load | Restart server |

---

## Rate Limits & Performance

| Operation | Typical Time | Notes |
|-----------|--------------|-------|
| `get_context` | 200-500ms | Depends on codebase size |
| `search_codebase` | 50-100ms | Linear in file count |
| `record_decision` | 100-200ms | Includes embedding generation |
| `get_file_context` | <50ms | Direct file read |
| `get_project_summary` | <50ms | Cached data |

**No rate limits** - all operations are local.

---

## Usage Patterns

### Pattern 1: Understanding Code

```
1. User asks about a feature
2. AI calls get_context with relevant query
3. AI reads the context and responds
4. If more detail needed, AI calls get_file_context
```

### Pattern 2: Recording Decisions

```
1. User and AI discuss architecture
2. Decision is made
3. AI calls record_decision with summary
4. Decision is available in future sessions
```

### Pattern 3: Project Onboarding

```
1. User opens new project
2. AI calls get_project_summary
3. AI reads memorylayer://project/overview
4. AI provides onboarding summary
```

### Pattern 3: Searching for Specific Code

```
1. User asks to find something
2. AI calls search_codebase
3. AI presents results
4. User picks file to explore
5. AI calls get_file_context
```

---

## Integration Example

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "memorylayer": {
      "command": "memorylayer",
      "args": ["--project", "/path/to/your/project"]
    }
  }
}
```

### Typical AI System Prompt Enhancement

When MemoryLayer is available, the AI should:

1. **Always use `get_context`** before answering code questions
2. **Proactively record decisions** when architecture is discussed
3. **Reference previous decisions** when relevant
4. **Use `get_project_summary`** for onboarding questions

---

*API Reference maintained by the MemoryLayer team.*
