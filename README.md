# NeuronLayer

**Code intelligence layer disguised as memory.**

NeuronLayer isn't another memory tool. It's a code-intelligence layer that gives AI assistants deep understanding of your codebase - understanding that persists across sessions.

[![npm version](https://img.shields.io/npm/v/neuronlayer.svg)](https://www.npmjs.com/package/neuronlayer)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)

---

## What Makes NeuronLayer Different

Most "memory tools" for AI are just note-taking with embeddings. NeuronLayer does something fundamentally different:

| Memory Tools | NeuronLayer |
|--------------|-------------|
| Store text, retrieve by similarity | **Parse code structure** (AST-based) |
| Keyword/embedding search | **Understand dependencies** (what imports what) |
| Tag-based organization | **Transitive impact analysis** (change X → affects Y, Z) |
| Session notes | **Circular dependency detection** |
| | **Test coverage mapping** (which tests cover which functions) |
| | **Predict test failures** before you run them |
| | **Conflict detection** with recorded decisions |

**The AI thinks it's using memory tools. It's actually getting code intelligence.**

---

## The Problem

AI coding assistants are powerful but blind:

- **No structural understanding** - AI doesn't know your dependency graph
- **No impact awareness** - "changing this file breaks 12 others"
- **No test knowledge** - AI suggestions break tests it doesn't know exist
- **No persistent decisions** - architectural choices forgotten each session

## The Solution

NeuronLayer gives AI assistants **persistent code intelligence**:

- **Dependency graph** - knows what imports what, transitively
- **Impact analysis** - "changing auth.ts affects 8 files and 4 tests"
- **Test awareness** - indexes tests, predicts failures, suggests updates
- **Decision memory** - architectural decisions survive across sessions
- **Circular dependency detection** - finds import cycles automatically

---

## Compatibility

| Tool | Supported | Auto-Configure |
|------|-----------|----------------|
| Claude Desktop | Yes | `neuronlayer init` |
| Claude Code (CLI) | Yes | `neuronlayer init` |
| Cursor | Yes | Via MCP support |
| OpenCode | Yes | `neuronlayer init` |
| VS Code + Continue | Yes | Manual config |
| Any MCP Client | Yes | Manual config |

---

## Quick Start

### Installation

```bash
npm install -g neuronlayer
```

### One-Command Setup

```bash
cd your-project
neuronlayer init
```

That's it! This automatically:
1. Registers your project
2. Configures Claude Desktop, Claude Code, and OpenCode
3. Indexes your codebase (AST parsing, dependency graph, tests)

Just restart your AI tool and NeuronLayer is active.

---

## Code Intelligence Features

### Dependency Graph

NeuronLayer builds a complete dependency graph of your codebase:

```
src/auth/login.ts
├── imports: ./utils, ../api/client, ./types
└── imported by: src/pages/auth.tsx, src/hooks/useAuth.ts
```

### Impact Analysis

Before making changes, the AI can ask "what's the blast radius?"

```
get_impact_analysis({ file: "src/auth/login.ts" })

→ Risk Level: MEDIUM
→ Direct dependents: 3 files
→ Indirect dependents: 5 files (2 hops)
→ Affected tests: 4 tests
→ Circular dependencies: none
```

### Circular Dependency Detection

Automatically finds import cycles that cause subtle bugs:

```
find_circular_deps()

→ Found 2 circular dependency chains:
  1. src/a.ts → src/b.ts → src/c.ts → src/a.ts
  2. src/utils/index.ts → src/utils/helpers.ts → src/utils/index.ts
```

### Test Awareness

NeuronLayer indexes your tests and knows:
- Which functions each test covers
- Which tests would be affected by a change
- Suggests test updates when code changes

### Real-Time Impact Warnings

When you save a file, NeuronLayer tells you what's affected:

```
[Impact] src/auth/login.ts changed → 3 file(s) may be affected
  → src/pages/auth.tsx
  → src/hooks/useAuth.ts
  → src/components/LoginForm.tsx
```

---

## MCP Tools

### Gateway Tools (Smart Routing)

| Tool | Purpose |
|------|---------|
| `memory_query` | Search codebase, find code, look up symbols, get file context |
| `memory_record` | Save decisions, learn patterns, record feedback, track features |
| `memory_review` | Pre-code review: check patterns, conflicts, tests, get suggestions |
| `memory_status` | Project overview, architecture, recent changes, health check |
| `memory_ghost` | Proactive intelligence: conflicts, "you solved this before", session resume |
| `memory_verify` | Pre-commit check: validate imports, security, dependencies |

### Code Intelligence Tools

| Tool | Purpose |
|------|---------|
| `get_impact_analysis` | **Analyze blast radius** - all affected files, tests, risk level |
| `find_circular_deps` | **Detect import cycles** - find circular dependencies |
| `get_dependencies` | Get imports and importers for a file |
| `get_file_summary` | Compressed file overview (10x smaller than full content) |

### Utility Tools

| Tool | Purpose |
|------|---------|
| `memory_refresh` | Trigger manual refresh after external changes |
| `switch_project` | Switch between registered projects |
| `trigger_compaction` | Reduce memory when context is full |
| `export_decisions_to_adr` | Export decisions as ADR markdown files |

---

## Language Support

| Language | Parsing | Dependency Tracking |
|----------|---------|---------------------|
| TypeScript/JavaScript | Full AST | Yes |
| Python | Full AST | Yes |
| Go | Regex-based | Yes |
| Rust | Regex-based | Yes |
| Java | Regex-based | Yes |

---

## Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Dependency Graph** | Working | Tracks imports, exports, transitive dependencies |
| **Impact Analysis** | Working | Shows blast radius of changes |
| **Circular Detection** | Working | Finds import cycles automatically |
| **Test Indexing** | Working | Indexes tests, maps coverage, predicts failures |
| **Semantic Search** | Working | Find code by meaning using embeddings |
| **Decision Recording** | Working | Log architectural decisions with context |
| **Pattern Library** | Working | Learn and validate coding patterns |
| **AST Parsing** | Working | Extract symbols, functions, classes, imports |
| **Context Compaction** | Working | Smart summarization when context fills |
| **Git Integration** | Working | Track changes, correlate with decisions |
| **Multi-Project** | Working | Switch between projects seamlessly |
| **Impact Warnings** | Working | Real-time notifications on file changes |

---

## Architecture

```
+-------------------------------------------------------------+
|                      NEURONLAYER                             |
+-------------------------------------------------------------+
|                                                              |
|  +--------------+    +--------------+    +--------------+   |
|  |   AI Tool    |--->|  MCP Server  |--->|   Code       |   |
|  | Claude/etc   |    |   (stdio)    |    | Intelligence |   |
|  +--------------+    +--------------+    +--------------+   |
|                                                    |         |
|                            +--------------------+--+----+   |
|                            |                    v       |   |
|  +--------------+    +-----+----+    +------------------+|  |
|  |  Your Code   |--->| Indexer  |--->|  SQLite + Vec DB ||  |
|  |  (watched)   |    | AST/Deps |    |  + Dep Graph     ||  |
|  +--------------+    +----------+    +------------------+|  |
|                                                          |  |
+-------------------------------------------------------------+
```

### Core Modules

```
src/core/
├── engine.ts            # Main engine, coordinates everything
├── ghost-mode.ts        # Proactive conflict detection
├── test-awareness/      # Test indexing & failure prediction
├── change-intelligence/ # Git tracking & impact analysis
├── architecture/        # Pattern library & validation
├── context-rot/         # Context health & compaction
├── living-docs/         # Architecture & changelog generation
└── refresh/             # Intelligent refresh system

src/storage/
├── tier1.ts             # Hot cache (instant)
├── tier2.ts             # SQLite + dependency graph (fast)
└── tier3.ts             # Vector embeddings (semantic)

src/indexing/
├── ast.ts               # AST parsing (TS/JS/Python/Go/Rust/Java)
├── indexer.ts           # File indexing + dependency building
└── embeddings.ts        # Vector embedding generation
```

---

## CLI Commands

```bash
# Quick setup (auto-configures AI tools)
neuronlayer init

# Initialize specific project
neuronlayer init /path/to/project

# List all registered projects
neuronlayer projects list

# Add a new project
neuronlayer projects add /path/to/my-project

# Switch active project
neuronlayer projects switch <id>

# Export decisions to ADR files
neuronlayer export --format madr

# Show help
neuronlayer help
```

---

## Manual Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "neuronlayer": {
      "command": "npx",
      "args": ["-y", "neuronlayer", "--project", "/path/to/your/project"]
    }
  }
}
```

Config locations:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

---

## Data Storage

Each project has isolated data:

```
~/.memorylayer/
├── projects/
│   ├── project-a-abc123/
│   │   ├── neuronlayer.db   # SQLite + dependency graph
│   │   └── embeddings/      # Vector index
│   └── project-b-def456/
│       └── ...
└── registry.json            # Project registry
```

---

## NeuronLayer vs Other Tools

### vs grep/ripgrep

NeuronLayer **doesn't compete with grep** - Claude already has grep. They serve different purposes:

| grep does | NeuronLayer does |
|-----------|------------------|
| Text matching | **Semantic search** ("how does auth work?") |
| Regex patterns | **Dependency analysis** (what depends on this?) |
| Fast file search | **Impact prediction** (what breaks if I change this?) |
| | **Test awareness** (which tests cover this function?) |

### vs Simple Memory Tools

| Memory tools do | NeuronLayer does |
|-----------------|------------------|
| Store notes | **Parse code structure** |
| Keyword search | **Graph traversal** |
| Tag organization | **Circular dependency detection** |
| | **Test failure prediction** |

---

## Privacy

NeuronLayer is **100% local**:

- All data stored on your machine
- No cloud services
- No telemetry
- No LLM calls (pure code analysis)
- Works completely offline

---

## Development

```bash
# Clone
git clone https://github.com/abhisavakar/neuronlayer.git
cd neuronlayer

# Install
npm install

# Build
npm run build

# Type check
npm run typecheck
```

---

## License

MIT License - see [LICENSE](LICENSE)

---

## Author

**Abhishek Arun Savakar** - [savakar.com](https://savakar.com)

---

Built with [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic.
