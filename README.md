# MemoryLayer

> **Persistent memory layer for AI coding assistants** - An MCP server that makes AI truly understand your codebase

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.4+-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple)](https://modelcontextprotocol.io/)

---

## The Problem

AI coding assistants have a memory problem:

| Issue | Impact |
|-------|--------|
| **Context forgetting** | AI forgets what you discussed 5 minutes ago |
| **Hallucinations** | AI invents libraries that don't exist |
| **Security vulnerabilities** | AI code has 1.7x more security issues |
| **Code duplication** | AI creates functions that already exist |
| **Decision conflicts** | AI ignores architectural decisions you made |
| **Productivity paradox** | Developers are 19% slower with AI despite feeling faster |

## The Solution

MemoryLayer gives AI assistants **persistent, intelligent memory** through the Model Context Protocol (MCP):

- **Remembers decisions** - "We chose JWT for auth because..."
- **Knows your codebase** - Semantic search across all files
- **Catches hallucinations** - Verifies imports actually exist
- **Prevents security issues** - OWASP Top 10 scanning
- **Surfaces similar problems** - "You solved this 2 weeks ago in auth.ts"
- **Tracks what you're working on** - Context resurrection across sessions

---

## Quick Start

### 1. Install

```bash
# Clone the repository
git clone https://github.com/yourusername/memorylayer.git
cd memorylayer

# Install dependencies
npm install

# Build
npm run build
```

### 2. Configure with Claude Desktop

Add to your `claude_desktop_config.json`:

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

### 3. Start Using

Once configured, Claude will automatically have access to MemoryLayer's tools. Try:

- "What's the architecture of this project?"
- "Record a decision: We're using PostgreSQL for the database"
- "Review this code for issues"
- "What was I working on last session?"

---

## Features

### Semantic Code Search

Find code by meaning, not just keywords:

```
Query: "how does authentication work?"
→ Returns: auth middleware, JWT validation, login flow, session management
```

### Decision Tracking

Record and enforce architectural decisions:

```
"Record decision: Use GraphQL instead of REST for all new APIs"
→ Later, when writing REST code: "Warning: conflicts with decision to use GraphQL"
```

### Pre-Commit Quality Gate

Catch issues before they land:

```typescript
// Checks:
// - Do imports exist? (catches hallucinations)
// - Security vulnerabilities? (OWASP Top 10)
// - Packages installed?
// - Follows project patterns?
// - Will tests break?
```

### Ghost Mode (Proactive Intelligence)

MemoryLayer silently tracks your work and surfaces relevant information:

- **Conflict Radar**: Warns when code conflicts with past decisions
- **Déjà Vu Detection**: "You solved a similar problem 2 weeks ago"
- **Context Resurrection**: "Welcome back! Last time you were working on auth..."

### Living Documentation

Documentation that stays in sync with your code:

- Auto-generated architecture diagrams
- Change-aware component docs
- Freshness validation

---

## Tools Reference

MemoryLayer exposes **6 gateway tools** that intelligently route to 50+ internal functions:

### `memory_query` - Search & Understand

```typescript
// Semantic code search
{ query: "how does authentication work?" }

// Get file with context
{ query: "src/auth/login.ts", action: "file" }

// Find symbol definitions
{ query: "UserService", action: "symbol" }

// Check if function exists
{ query: "validate email format", action: "existing" }
```

### `memory_record` - Remember Things

```typescript
// Record a decision
{ title: "Use JWT for auth", content: "Because we need stateless authentication" }

// Learn a pattern
{ code: "export const handler = ...", pattern_name: "API Handler Pattern" }

// Mark something critical (survives context compaction)
{ content: "Never delete user data without backup", critical_type: "requirement" }
```

### `memory_review` - Check Code Quality

```typescript
// Full review
{ code: "const query = `SELECT * FROM users WHERE id = ${id}`" }

// Response includes:
// - Pattern compliance
// - Security issues (SQL injection detected!)
// - Test impact
// - Decision conflicts
// - Existing alternatives
```

### `memory_verify` - Pre-Commit Gate

```typescript
// Verify AI-generated code before committing
{
  code: "import { foo } from 'nonexistent-package'",
  file: "src/utils.ts",
  checks: ["imports", "security", "dependencies"]
}

// Response:
// verdict: "fail"
// issues: [{ type: "missing_package", message: "Package not installed" }]
```

### `memory_status` - Project Overview

```typescript
// Project summary with welcome back message
{ action: "summary" }

// What changed recently
{ action: "changed", since: "yesterday" }

// Architecture overview
{ action: "architecture" }

// Context health (memory usage, drift detection)
{ action: "health" }
```

### `memory_ghost` - Proactive Intelligence

```typescript
// Full ghost insight
{ mode: "full" }

// Check for decision conflicts
{ mode: "conflicts", code: "..." }

// Find similar past problems
{ mode: "dejavu", query: "handle auth errors" }

// Resurrect last session context
{ mode: "resurrect" }
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Interface                            │
│  memory_query  memory_record  memory_review  memory_verify   │
│  memory_status  memory_ghost                                 │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Gateway Layer                             │
│         Routes to 50+ internal tools automatically           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Core Engine                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Indexer  │  │ Context  │  │ Decision │  │ Learning │    │
│  │          │  │Assembler │  │ Tracker  │  │ Engine   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Ghost   │  │ Déjà Vu  │  │   Code   │  │   Test   │    │
│  │  Mode    │  │ Detector │  │ Verifier │  │Awareness │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Storage Tiers                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Tier 1  │  │  Tier 2  │  │  Tier 3  │                  │
│  │ Hot/Fast │  │ Indexed  │  │ Archive  │                  │
│  │  Cache   │  │ SQLite   │  │  Store   │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **Indexer** | Scans codebase, extracts symbols, generates embeddings |
| **Context Assembler** | Assembles relevant context for queries |
| **Decision Tracker** | Records and searches architectural decisions |
| **Learning Engine** | Tracks usage patterns, predicts needed files |
| **Ghost Mode** | Silent tracking, conflict detection |
| **Déjà Vu Detector** | Finds similar past problems |
| **Code Verifier** | Import/security/dependency verification |
| **Test Awareness** | Tracks tests, predicts failures |

### Storage Tiers

| Tier | Contents | Access Speed |
|------|----------|--------------|
| **Tier 1** | Active context, recent decisions | Instant (memory) |
| **Tier 2** | Indexed files, embeddings, patterns | Fast (SQLite) |
| **Tier 3** | Historical context, archived sessions | Standard (disk) |

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MEMORYLAYER_DATA_DIR` | `.memorylayer` | Data storage directory |
| `MEMORYLAYER_MAX_TOKENS` | `100000` | Maximum context tokens |
| `MEMORYLAYER_EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Embedding model |

### Ignore Patterns

Create `.memorylayerignore` in your project root:

```
# Ignore test fixtures
test/fixtures/**

# Ignore generated files
dist/**
*.generated.ts

# Ignore large data files
*.csv
*.json
data/**
```

---

## Performance

MemoryLayer is optimized for speed:

| Metric | Value |
|--------|-------|
| Semantic search | <50ms for 10k files |
| Context assembly | <100ms |
| Embedding generation | ~10ms per chunk |
| Memory overhead | ~50MB base + embeddings |

### Benchmarks

```
┌─────────────────────────────────────────────────────────────┐
│ MemoryLayer vs Traditional Grep                             │
├─────────────────────────────────────────────────────────────┤
│ Semantic Search:  759x faster                               │
│ Token Usage:      51.7% reduction                           │
│ Relevance:        3.46x better (Cohen's d)                  │
│ Statistical:      p < 0.001                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Scanning

The `memory_verify` tool scans for OWASP Top 10 vulnerabilities:

| Vulnerability | CWE | Severity |
|--------------|-----|----------|
| SQL Injection | CWE-89 | Critical |
| XSS | CWE-79 | High |
| Command Injection | CWE-78 | Critical |
| Path Traversal | CWE-22 | High |
| Hardcoded Secrets | CWE-798 | Critical |
| Insecure Random | CWE-330 | Medium |
| Weak Crypto | CWE-327 | High |
| Prototype Pollution | CWE-1321 | High |
| Unsafe Eval | CWE-95 | High |
| SSRF | CWE-918 | High |
| Open Redirect | CWE-601 | Medium |

---

## Development

### Project Structure

```
memorylayer/
├── src/
│   ├── core/           # Core engine components
│   │   ├── engine.ts   # Main orchestrator
│   │   ├── context.ts  # Context assembly
│   │   ├── ghost-mode.ts
│   │   ├── deja-vu.ts
│   │   ├── code-verifier.ts
│   │   └── ...
│   ├── indexing/       # File indexing & embeddings
│   ├── storage/        # Tiered storage (Tier1/2/3)
│   ├── server/         # MCP server & gateways
│   │   └── gateways/   # Tool handlers
│   └── types/          # TypeScript definitions
├── tests/              # Test suites
├── dist/               # Build output
└── package.json
```

### Scripts

```bash
# Development
npm run build          # Build the project
npm run dev            # Watch mode
npm run typecheck      # TypeScript check

# Testing
npm run test           # Run tests (watch)
npm run test:run       # Run tests once

# Benchmarks
npm run benchmark      # Run performance benchmarks
npm run benchmark:quick
```

### Adding a New Tool

1. Create handler in `src/server/gateways/`
2. Add types to `src/server/gateways/types.ts`
3. Register in `src/server/gateways/index.ts`
4. Add engine methods in `src/core/engine.ts`

---

## Roadmap

### Completed

- [x] Semantic code search
- [x] Decision tracking
- [x] Living documentation
- [x] Context rot prevention
- [x] Confidence scoring
- [x] Change intelligence
- [x] Architecture enforcement
- [x] Test awareness
- [x] Ghost mode (proactive intelligence)
- [x] Déjà vu detection
- [x] Context resurrection
- [x] Pre-commit quality gate
- [x] Security scanning

### Planned

- [ ] Multi-language support (Python, Go, Rust)
- [ ] Team collaboration features
- [ ] IDE plugins (VS Code, JetBrains)
- [ ] Cloud sync option
- [ ] Custom embedding models

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- TypeScript with strict mode
- ESLint + Prettier
- Comprehensive JSDoc comments
- Unit tests for new features

---

## License

This project is proprietary. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol that makes this possible
- [Xenova/transformers](https://github.com/xenova/transformers.js) - Local embedding generation
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Fast SQLite bindings
- [Chokidar](https://github.com/paulmillr/chokidar) - File watching

---

<p align="center">
  <b>MemoryLayer</b> - Making AI coding assistants actually remember
</p>
