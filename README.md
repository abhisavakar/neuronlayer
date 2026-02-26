# NeuronLayer

**Persistent memory layer for AI coding assistants. Your codebase documents itself.**

[![npm version](https://img.shields.io/npm/v/neuronlayer.svg)](https://www.npmjs.com/package/neuronlayer)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)

---

## The Problem

AI coding assistants are powerful but forgetful:

- Context collapse - AI forgets mid-session
- No persistent memory - every session starts fresh
- Code duplication - AI doesn't know what already exists
- Test breakage - AI suggestions break existing tests

## The Solution

NeuronLayer gives AI assistants persistent, intelligent memory:

- **Decisions persist** - Architectural decisions survive across sessions
- **Patterns learned** - AI knows your coding conventions
- **Context preserved** - Smart compaction prevents forgetting
- **Tests respected** - AI knows what tests exist

---

## Compatibility

| Tool | Supported | Auto-Configure |
|------|-----------|----------------|
| Claude Desktop | Yes | `neuronlayer init` |
| Claude Code (CLI) | Yes | `neuronlayer init` |
| OpenCode | Yes | `neuronlayer init` |
| VS Code + Continue | Yes | Manual config |
| Cursor | Not yet | No MCP support |
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
2. Configures Claude Desktop
3. Configures OpenCode
4. Configures Claude Code

Just restart your AI tool and NeuronLayer is active.

---

## MCP Tools

NeuronLayer exposes **12 MCP tools** organized into 6 gateway tools and 6 standalone tools.

### Gateway Tools (Smart Routing)

These are the main tools. Each routes to multiple internal capabilities based on input:

| Tool | Purpose |
|------|---------|
| `memory_query` | Search codebase, find code, look up symbols, get file context |
| `memory_record` | Save decisions, learn patterns, record feedback, track features |
| `memory_review` | Pre-code review: check patterns, conflicts, tests, get suggestions |
| `memory_status` | Project overview, architecture, recent changes, health check |
| `memory_ghost` | Proactive intelligence: conflicts, "you solved this before", session resume |
| `memory_verify` | Pre-commit check: validate imports, security, dependencies |

### Standalone Tools

| Tool | Purpose |
|------|---------|
| `switch_project` | Switch between registered projects |
| `switch_feature_context` | Resume work on a previous feature |
| `trigger_compaction` | Reduce memory when context is full |
| `update_decision_status` | Mark decisions as deprecated/superseded |
| `export_decisions_to_adr` | Export decisions as ADR markdown files |
| `discover_projects` | Find git repos on the system |

---

## Features

### What's Implemented

| Feature | Status | Description |
|---------|--------|-------------|
| **Semantic Search** | Working | Find code by meaning using embeddings |
| **Decision Recording** | Working | Log architectural decisions with context |
| **Pattern Library** | Working | Learn and validate coding patterns |
| **File Indexing** | Working | AST-based symbol extraction |
| **Context Compaction** | Working | Smart summarization when context fills |
| **Test Indexing** | Working | Index tests, predict failures |
| **Git Integration** | Working | Track changes, correlate with decisions |
| **Multi-Project** | Working | Switch between projects |

### Modules

```
src/core/
├── living-docs/         # Architecture & changelog generation
├── context-rot/         # Context health & compaction
├── confidence/          # Source tracking & conflict detection
├── change-intelligence/ # Git tracking & fix suggestions
├── architecture/        # Pattern library & validation
└── test-awareness/      # Test indexing & failure prediction
```

---

## How It Works

```
+-------------------------------------------------------------+
|                      NEURONLAYER                             |
+-------------------------------------------------------------+
|                                                              |
|  +--------------+    +--------------+    +--------------+   |
|  |   AI Tool    |--->|  MCP Server  |--->|   Memory     |   |
|  | Claude/Open  |    |   (stdio)    |    |   Engine     |   |
|  +--------------+    +--------------+    +--------------+   |
|                                                    |         |
|                            +--------------------+--+----+   |
|                            |                    v       |   |
|  +--------------+    +-----+----+    +------------------+|  |
|  |  Your Code   |--->| Indexer  |--->|  SQLite + Vec DB ||  |
|  |  (watched)   |    | (AST/Git)|    |  (embeddings)    ||  |
|  +--------------+    +----------+    +------------------+|  |
|                                                          |  |
+-------------------------------------------------------------+
```

### Memory Tiers

1. **Tier 1** - Hot cache for active files (instant)
2. **Tier 2** - SQLite for decisions, patterns, history (fast)
3. **Tier 3** - Vector embeddings for semantic search (smart)

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

### OpenCode

Add to `~/.opencode/config.json`:

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

---

## Data Storage

Each project has isolated data:

```
~/.memorylayer/
├── projects/
│   ├── project-a-abc123/
│   │   ├── memorylayer.db    # SQLite database
│   │   └── embeddings/       # Vector index
│   └── project-b-def456/
│       └── ...
└── registry.json             # Project registry
```

---

## Privacy

NeuronLayer is **100% local**:

- All data stored on your machine
- No cloud services
- No telemetry
- Works offline

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

# Test
npm test
```

---

## License

MIT License - see [LICENSE](LICENSE)

---

## Author

**Abhishek Arun Savakar** - [savakar.com](https://savakar.com)

---

Built with [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic.
