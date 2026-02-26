# MemoryLayer

**Persistent memory layer for AI coding assistants. Your codebase documents itself.**

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

MemoryLayer gives AI assistants persistent, intelligent memory:

- **Never forget context** - Decisions, patterns, and history persist across sessions
- **Self-documenting codebase** - Architecture docs generate automatically
- **Context rot prevention** - AI stays sharp even in long sessions
- **Pattern enforcement** - Stops code duplication before it happens
- **Test-aware suggestions** - AI respects your tests

---

## Features

### Core Features (Free)

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

## Quick Start

### Installation

```bash
npm install -g neuronlayer
```

### Usage with Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "memorylayer": {
      "command": "npx",
      "args": ["-y", "neuronlayer", "--project", "/path/to/your/project"]
    }
  }
}
```

### Usage with Any MCP Client

```bash
# Start the MCP server
memorylayer --project /path/to/your/project
```

---

## How It Works

```
+-------------------------------------------------------------+
|                      MEMORYLAYER                             |
+-------------------------------------------------------------+
|                                                              |
|  +--------------+    +--------------+    +--------------+   |
|  |   AI Tool    |--->|  MCP Server  |--->|   Memory     |   |
|  | (Claude etc) |    |   (stdio)    |    |   Engine     |   |
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

MemoryLayer exposes 25+ MCP tools:

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

## Configuration

MemoryLayer stores data in:
- **Windows**: `%APPDATA%\.memorylayer\<project-hash>\`
- **macOS/Linux**: `~/.memorylayer/<project-hash>/`

### CLI Commands

```bash
# List all indexed projects
memorylayer projects

# Export decisions as ADRs
memorylayer export --format adr --output ./docs/decisions

# Show help
memorylayer help
```

---

## Architecture

```
src/
├── core/                    # Business logic
│   ├── engine.ts            # Main orchestrator
│   ├── living-docs/         # Auto-documentation
│   ├── context-rot/         # Context health management
│   ├── confidence/          # Trust scoring
│   ├── change-intelligence/ # What changed & why
│   ├── architecture/        # Pattern enforcement
│   └── test-awareness/      # Test-respecting suggestions
├── server/
│   ├── mcp.ts               # MCP protocol handler
│   ├── tools.ts             # Tool definitions
│   └── gateways/            # Unified tool APIs
├── storage/
│   ├── tier1.ts             # Hot cache
│   ├── tier2.ts             # SQLite storage
│   └── tier3.ts             # Vector embeddings
├── indexing/
│   ├── indexer.ts           # File indexing
│   ├── ast.ts               # AST parsing
│   ├── embeddings.ts        # Embedding generation
│   └── watcher.ts           # File watching
└── types/                   # TypeScript definitions
```

---

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/anthropics/memorylayer.git
cd memorylayer

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build the project |
| `npm run dev` | Development mode with watch |
| `npm run test` | Run tests |
| `npm run typecheck` | Type check without building |
| `npm run benchmark` | Run performance benchmarks |

---

## Privacy

MemoryLayer is **100% local by default**:

- All data stored on your machine
- No cloud services required
- No telemetry or tracking
- Works offline

Optional cloud features (coming soon) will use your own infrastructure.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas We Need Help

- Additional language support (Python, Go, Rust AST)
- IDE extensions (VS Code, JetBrains)
- Documentation improvements
- Performance optimizations
- Bug fixes and test coverage

---

## Roadmap

- [x] Core MCP server
- [x] Living Documentation
- [x] Context Rot Prevention
- [x] Confidence Scoring
- [x] Change Intelligence
- [x] Architecture Enforcement
- [x] Test-Aware Suggestions
- [ ] VS Code extension
- [ ] Team features (shared memory)
- [ ] Enterprise deployment (AWS Bedrock)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

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
