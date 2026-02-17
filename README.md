# MemoryLayer

> **AI Memory Infrastructure for Coding Agents**

Like Redis is a caching layer for applications, MemoryLayer is a memory layer for AI coding assistants.

Works with **Claude Code**, **OpenCode**, **Claude Desktop**, and any MCP-compatible coding agent.

---

## The Problem

AI coding assistants have no long-term memory. They forget your decisions, reinvent code that already exists, and lose context between sessions.

## What MemoryLayer Is

**A memory layer that gives AI coding assistants persistent memory.**

```
┌─────────────────────────────────┐
│      AI Coding Assistant        │
│   (Claude Code, OpenCode, etc)  │
└─────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│         MemoryLayer             │  ← We are here
│    (AI Memory Infrastructure)   │
├─────────────────────────────────┤
│  • Decision memory              │
│  • Codebase understanding       │
│  • Session context              │
│  • Pattern recognition          │
└─────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│        Your Codebase            │
└─────────────────────────────────┘
```

## What It Does

| Capability | What it means |
|------------|---------------|
| **Decision Memory** | AI remembers "we use PostgreSQL" and warns if it suggests MongoDB |
| **Semantic Search** | Find code by meaning, not just keywords |
| **Hallucination Check** | Catches when AI invents packages that don't exist |
| **Context Resurrection** | "Welcome back, you were working on auth..." |
| **Conflict Detection** | Warns when new code contradicts past decisions |

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
  AI:  [Records to memory layer]
  ...later...
  AI:  "I'll add this to your PostgreSQL schema"
       (Memory layer enforces past decisions)
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

Add to your MCP config:

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

MemoryLayer is a standard MCP server:
```
node /path/to/memorylayer/dist/index.js /path/to/your/project
```

---

## Core Features

### Decision Memory
```
"Record decision: Use REST API, not GraphQL"
→ Stored. AI will be warned if it writes GraphQL later.
```

### Semantic Code Search
```
"How does authentication work?"
→ Returns relevant code by meaning, not just filename matching
```

### Import Verification
```
AI writes: import { foo } from 'made-up-package'
→ Warning: Package 'made-up-package' is not installed
```

### Context Resurrection
```
"What was I working on?"
→ "Last session: debugging token refresh in auth.ts"
```

### Déjà Vu Detection
```
"How do I handle API errors?"
→ "You solved this 2 weeks ago in src/api/client.ts"
```

---

## How We're Different

| | Vector DB (Pinecone) | Framework (LangChain) | **MemoryLayer** |
|-|---------------------|----------------------|-----------------|
| **Purpose** | Store embeddings | Orchestrate AI | Persistent memory for coding agents |
| **Scope** | General storage | General AI apps | Coding-specific |
| **Context** | You build it | You build it | Built-in (decisions, patterns, sessions) |

---

## The 6 Tools

| Tool | Purpose |
|------|---------|
| `memory_query` | Search codebase, get context |
| `memory_record` | Save decisions, patterns |
| `memory_review` | Check code against decisions |
| `memory_verify` | Verify imports exist |
| `memory_status` | Project overview |
| `memory_ghost` | Proactive conflict detection |

---

## Architecture

```
AI Assistant
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

Everything runs locally. No cloud. No data leaves your machine.

---

## What This Is NOT

- **Not a vector database** - We use embeddings, but we're a memory layer, not storage
- **Not a security scanner** - Basic pattern checks only; use real tools for security
- **Not magic** - AI still makes mistakes, just fewer

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
  <b>MemoryLayer</b><br>
  <i>The missing memory layer for AI coding assistants</i>
</p>
