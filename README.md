# MemoryLayer

> **Persistent memory for AI coding assistants**

An MCP server that helps AI assistants remember your decisions, understand your codebase, and not repeat past mistakes.

Works with **Claude Code**, **OpenCode**, **Claude Desktop**, and any MCP-compatible coding agent.

---

## The Problem

AI coding assistants forget everything. You explain your architecture, and 10 minutes later they suggest something that contradicts it. They invent libraries that don't exist. They create functions you already have.

## What MemoryLayer Does

**It gives AI assistants memory that persists across sessions.**

1. **Remembers your decisions** - "We use JWT for auth" stays remembered
2. **Knows your codebase** - Semantic search finds code by meaning
3. **Catches hallucinations** - Verifies imports actually exist
4. **Surfaces past context** - "You solved this 2 weeks ago in auth.ts"
5. **Warns about conflicts** - Alerts when code contradicts past decisions

---

## Quick Example

```
Without MemoryLayer:
  You: "We decided to use PostgreSQL"
  AI:  "Got it!"
  ...later...
  AI:  "Let's set up MongoDB for this"

With MemoryLayer:
  You: "We decided to use PostgreSQL"
  AI:  [Records decision]
  ...later...
  AI:  "I'll add this to your PostgreSQL schema"
       (Or warns if it tries to use MongoDB)
```

---

## Installation

```bash
git clone https://github.com/abhisavakar/memorylayer.git
cd memorylayer
npm install
npm run build
```

### Claude Code / OpenCode

Add to your MCP config (`~/.claude/claude_desktop_config.json` or similar):

```json
{
  "mcpServers": {
    "memorylayer": {
      "command": "node",
      "args": ["/path/to/memorylayer/dist/index.js", "/path/to/your/project"]
    }
  }
}
```

### Any MCP-Compatible Agent

MemoryLayer is a standard MCP server. Point your agent to:
```
node /path/to/memorylayer/dist/index.js /path/to/your/project
```

---

## Core Features

### 1. Decision Memory

Record architectural decisions. MemoryLayer remembers them and warns when code conflicts.

```
"Record decision: Use REST API, not GraphQL"
→ Saved. Will warn if GraphQL code is written later.
```

### 2. Semantic Code Search

Find code by what it does, not just keywords.

```
"How does authentication work?"
→ Returns: auth middleware, login handlers, token validation
  (Not just files with "auth" in the name)
```

### 3. Import Verification

Catches when AI hallucinates packages that don't exist.

```
AI writes: import { foo } from 'made-up-package'
→ Warning: Package 'made-up-package' is not installed
```

### 4. Context Resurrection

Remembers what you were working on across sessions.

```
"What was I working on?"
→ "Last session you were debugging token refresh in auth.ts.
   You seemed stuck on handling expired tokens."
```

### 5. Déjà Vu Detection

Surfaces similar problems you've solved before.

```
"How do I handle API errors?"
→ "You solved something similar 2 weeks ago in src/api/client.ts"
```

---

## The 6 Tools

| Tool | What it does |
|------|--------------|
| `memory_query` | Search codebase, get context |
| `memory_record` | Save decisions, patterns |
| `memory_review` | Check code against patterns/decisions |
| `memory_verify` | Verify imports exist |
| `memory_status` | Project overview |
| `memory_ghost` | Proactive conflict detection |

---

## How It Works

```
Your AI Assistant (Claude, etc.)
         │
         │ MCP Protocol
         ▼
    MemoryLayer
    ├── Decision Store (SQLite)
    ├── Code Index (Embeddings)
    ├── Pattern Memory
    └── Session Context
         │
         ▼
    Local Storage (~50-200MB)
```

Everything runs locally. No cloud. Embeddings generated with transformers.js.

---

## What This Is NOT

- **Not a security scanner** - We do basic pattern checks, but use real tools (Semgrep, npm audit) for security
- **Not a replacement for tests** - We track test relationships, but don't run them
- **Not magic** - AI will still make mistakes, just fewer of them

---

## Development

```bash
npm run build      # Build
npm run test       # Run tests
npm run typecheck  # Type check
```

---

## License

Proprietary. See LICENSE for details.

---

<p align="center">
  <i>MemoryLayer - Because AI shouldn't forget what you told it</i>
</p>
