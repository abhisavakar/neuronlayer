# NeuronLayer

**Persistent memory layer for AI coding assistants. Your codebase documents itself.**

[![npm version](https://img.shields.io/npm/v/neuronlayer.svg)](https://www.npmjs.com/package/neuronlayer)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)

---

## The Problem

AI coding assistants are powerful but forgetful:

| Problem | Stat |
|---------|------|
| Productivity paradox | 19% SLOWER with AI |
| "Almost right" frustration | 66% of developers |
| Trust issues | Only 29% trust AI code |
| Context collapse | AI forgets mid-session |
| Technical debt | 1.64x higher errors |
| Code duplication | 4x more cloning |

## The Solution

NeuronLayer gives AI assistants persistent, intelligent memory:

- **Never forget context** - Decisions, patterns, and history persist across sessions
- **Self-documenting codebase** - Architecture docs generate automatically
- **Context rot prevention** - AI stays sharp even in long sessions
- **Pattern enforcement** - Stops code duplication before it happens
- **Test-aware suggestions** - AI respects your tests

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

### Output

```
NeuronLayer initialized!

Project: my-project
Path: /home/user/my-project
Data: ~/.memorylayer/projects/my-project-abc123

Configured MCP Clients:
  ✓ Claude Desktop: ~/.config/claude/claude_desktop_config.json
  ✓ OpenCode: ~/.opencode/config.json
  ✓ Claude Code: ~/.claude.json

Restart your AI tools to activate.
```

---

## Manual Configuration

If you prefer manual setup or use a different MCP client:

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

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| **Semantic Search** | Find code by meaning, not just keywords |
| **Decision Recording** | Log architectural decisions with context |
| **Pattern Library** | Learn and enforce coding patterns |
| **File Indexing** | AST-based symbol extraction |

### Advanced Features

| Feature | Description |
|---------|-------------|
| **Living Documentation** | Auto-generated architecture docs |
| **Context Rot Prevention** | Smart compaction keeps AI focused |
| **Confidence Scoring** | Know when AI is guessing vs confident |
| **Change Intelligence** | "What changed?" and "Why did it break?" |
| **Architecture Enforcement** | Suggest existing functions, prevent duplication |
| **Test-Aware Suggestions** | Predict test failures before they happen |

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

## MCP Tools

NeuronLayer exposes 25+ MCP tools:

### Query & Search
- `memory_query` - Semantic search across codebase
- `memory_status` - Project overview and health

### Recording
- `memory_record` - Save decisions, patterns, feedback
- `memory_review` - Pre-flight check before code changes
- `memory_verify` - Validate AI-generated code

### Ghost Mode (AI-Proactive)
- `memory_ghost` - Conflicts, deja vu, session resurrection

### Living Documentation
- `get_architecture` - Project structure overview
- `get_changelog` - Recent changes with context
- `what_happened` - "What did we do yesterday?"

### Architecture Enforcement
- `validate_pattern` - Check code against patterns
- `suggest_existing` - Find reusable functions
- `learn_pattern` - Teach new patterns

### Test Awareness
- `get_related_tests` - Tests for a file/function
- `check_tests` - Predict test failures
- `suggest_test_update` - Test update suggestions

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

# Discover projects in common locations
neuronlayer projects discover

# Show help
neuronlayer help
```

---

## Data Storage

NeuronLayer stores project data separately for each project:

```
~/.memorylayer/
├── projects/
│   ├── project-a-abc123/
│   │   ├── memorylayer.db    # SQLite database
│   │   └── embeddings/       # Vector index
│   └── project-b-def456/
│       ├── memorylayer.db
│       └── embeddings/
└── registry.json             # Project registry
```

Each project is isolated - no data mixing between projects.

---

## Privacy

NeuronLayer is **100% local by default**:

- All data stored on your machine
- No cloud services required
- No telemetry or tracking
- Works completely offline

---

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/abhisavakar/neuronlayer.git
cd neuronlayer

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas We Need Help

- Additional language support (Python, Go, Rust AST)
- IDE extensions (VS Code, JetBrains)
- Cursor integration (when they add MCP support)
- Documentation improvements
- Performance optimizations

---

## Roadmap

- [x] Core MCP server
- [x] Living Documentation
- [x] Context Rot Prevention
- [x] Confidence Scoring
- [x] Change Intelligence
- [x] Architecture Enforcement
- [x] Test-Aware Suggestions
- [x] Auto-setup for Claude Desktop
- [x] Auto-setup for OpenCode
- [ ] VS Code extension
- [ ] Cursor support (pending MCP)
- [ ] Team features (shared memory)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Author

**Abhishek Arun Savakar** - [savakar.com](https://savakar.com)

---

## Acknowledgments

Built with:
- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [tree-sitter](https://tree-sitter.github.io/tree-sitter/) for AST parsing
- [Xenova/transformers](https://github.com/xenova/transformers.js) for embeddings

---

**Made with determination over a weekend.**

*Your codebase documents itself. AI that never forgets.*
