# MemoryLayer Development Progress

> Last Updated: 2026-02-15

## Overview

MemoryLayer is an MCP (Model Context Protocol) server that provides intelligent codebase context to AI assistants. It indexes code, tracks decisions, and delivers relevant context based on semantic understanding.

---

## Implementation Status

### Fully Implemented

| Feature | Priority | Description | Files |
|---------|----------|-------------|-------|
| **Semantic Search & Indexing** | Core | Vector embeddings for code search using local transformers | `src/indexing/indexer.ts`, `src/indexing/embeddings.ts` |
| **AST & Symbol Extraction** | Core | Parse TypeScript/JavaScript for functions, classes, interfaces | `src/indexing/ast.ts` |
| **File Summarization** | Core | 10x compression of file content for efficient context | `src/core/summarizer.ts` |
| **Decision Recording & ADR Export** | Core | Record architectural decisions, export to ADR markdown | `src/core/decisions.ts`, `src/core/adr-exporter.ts`, `src/core/decision-extractor.ts` |
| **Three-Tier Storage** | Core | Hot/warm/cold storage for optimal retrieval | `src/storage/tier1.ts`, `src/storage/tier2.ts`, `src/storage/tier3.ts` |
| **Context Assembly** | Core | Intelligent context assembly with token budgeting | `src/core/context.ts` |
| **Active Feature Context** | P0 | Track files, changes, and queries for current work session | `src/core/feature-context.ts` |
| **Multi-Project Support** | P4 | Register and switch between multiple projects | `src/core/project-manager.ts` |
| **Living Documentation** | P0 | Auto-generate architecture docs, changelogs, component docs | `src/core/living-docs/` |
| **Context Rot Prevention** | P0 | Detect drift, track context health, smart compaction | `src/core/context-rot/` |
| **Confidence Scoring** | P1 | Score code suggestions, track sources, detect conflicts | `src/core/confidence/` |

---

## Recently Completed: Context Rot Prevention (P0)

### What It Does
- Monitors context health (token usage, utilization)
- Detects drift from initial requirements
- Identifies contradictions in conversation
- Marks and preserves critical context (decisions, requirements, instructions)
- Smart compaction with 3 strategies: summarize, selective, aggressive
- Auto-compaction based on health status

### New Files Created
```
src/core/context-rot/
├── index.ts                    # Barrel export
├── context-rot-prevention.ts   # Main orchestrator
├── context-health.ts           # Health monitoring
├── drift-detector.ts           # Drift detection
├── compaction.ts               # Compaction strategies
└── critical-context.ts         # Critical context management
```

### New MCP Tools
| Tool | Description |
|------|-------------|
| `get_context_health` | Check context health, drift score, and suggestions |
| `trigger_compaction` | Manually trigger context compaction |
| `mark_critical` | Mark content as critical (never compress) |
| `get_critical_context` | Get all critical context items |

### Database Tables Added
- `critical_context` - Stores marked critical context items
- `context_health_history` - Tracks health metrics over time

---

## Previously Completed: Living Documentation (P0)

### What It Does
- Generates architecture documentation with ASCII diagrams
- Creates component-level documentation from AST data
- Produces changelogs from git history
- Validates documentation freshness
- Tracks project activity
- Finds undocumented code

### New Files Created
```
src/core/living-docs/
├── index.ts                    # Barrel export
├── doc-engine.ts               # Main LivingDocumentationEngine
├── architecture-generator.ts   # Architecture doc generation
├── component-generator.ts      # Component doc from AST
├── changelog-generator.ts      # Git-based changelogs
├── doc-validator.ts            # Outdated/undocumented detection
└── activity-tracker.ts         # "What happened" queries

src/types/documentation.ts      # Type definitions
```

### New MCP Tools
| Tool | Description |
|------|-------------|
| `generate_docs` | Generate documentation for a file or architecture |
| `get_architecture` | Get project architecture overview with ASCII diagram |
| `get_component_doc` | Get detailed documentation for a component/file |
| `get_changelog` | Get changelog of recent changes |
| `validate_docs` | Check for outdated docs and documentation score |
| `what_happened` | Query recent project activity |
| `find_undocumented` | Find code that lacks documentation |

### Database Tables Added
- `documentation` - Stores generated documentation with timestamps
- `activity_log` - Tracks activities for "what happened" queries

---

## Recently Completed: Confidence Scoring (P1)

### What It Does
- Calculates confidence scores (0-100%) for code suggestions
- Determines confidence levels: high (80-100%), medium (50-80%), low (20-50%), guessing (0-20%)
- Tracks sources: codebase matches, decision alignment, pattern matching
- Detects warnings: security issues, deprecated patterns, high complexity
- Checks for conflicts with recorded architectural decisions

### New Files Created
```
src/core/confidence/
├── index.ts                    # Barrel export
├── confidence-scorer.ts        # Main ConfidenceScorer class
├── source-tracker.ts           # Source tracking
├── warning-detector.ts         # Warning detection
└── conflict-checker.ts         # Decision conflict checking
```

### New MCP Tools
| Tool | Description |
|------|-------------|
| `get_confidence` | Get confidence score for code suggestion |
| `list_sources` | List all sources used for a suggestion |
| `check_conflicts` | Check if code conflicts with past decisions |

### Confidence Calculation
- 50% weight: Codebase matches (similar code found)
- 30% weight: Decision alignment (matches past decisions)
- 20% weight: Pattern matching (follows established patterns)

### Warnings Detected
- Security issues (eval, innerHTML, SQL injection, etc.)
- Deprecated patterns (var, Buffer constructor, substr, etc.)
- High complexity (nested conditionals, ternaries)
- Decision conflicts (contradicts recorded decisions)
- Untested approaches (no matching tests)

---

## Not Yet Implemented

### Phase 4: Change Intelligence (P1)
**Effort:** 1 week

**Description:** Understand impact of code changes.

**Planned Features:**
- Dependency impact analysis
- Breaking change detection
- Suggest affected tests
- Change ripple visualization

---

### Phase 5: Architecture Enforcement (P2)
**Effort:** 2 weeks

**Description:** Enforce architectural rules and patterns.

**Planned Features:**
- Define layer boundaries
- Detect architecture violations
- Suggest fixes for violations
- Track architecture drift over time

---

### Phase 6: Test-Aware Suggestions (P2)
**Effort:** 2 weeks

**Description:** Integrate test coverage into context.

**Planned Features:**
- Map code to tests
- Suggest tests to run after changes
- Identify untested code paths
- Test coverage visualization

---

## Existing MCP Tools (All Working)

### Core Tools
| Tool | Description |
|------|-------------|
| `get_context` | Get relevant codebase context for a query |
| `search_codebase` | Semantic search across files |
| `record_decision` | Record an architectural decision |
| `get_file_context` | Get content and metadata of a file |
| `get_project_summary` | Get project structure overview |

### Symbol & Dependency Tools
| Tool | Description |
|------|-------------|
| `get_symbol` | Find function, class, interface by name |
| `get_dependencies` | Get imports and dependents of a file |
| `get_file_summary` | Get compressed summary of a file |

### Learning & Prediction Tools
| Tool | Description |
|------|-------------|
| `get_predicted_files` | Get files predicted to be relevant |
| `get_learning_stats` | Get usage statistics and metrics |
| `mark_context_useful` | Provide feedback on context quality |

### Multi-Project Tools
| Tool | Description |
|------|-------------|
| `list_projects` | List all registered projects |
| `switch_project` | Switch to a different project |
| `search_all_projects` | Search across all projects |
| `discover_projects` | Find projects in common locations |

### Decision Tools
| Tool | Description |
|------|-------------|
| `record_decision_with_author` | Record decision with attribution |
| `update_decision_status` | Update decision status |
| `export_decisions_to_adr` | Export to ADR markdown files |

### Feature Context Tools
| Tool | Description |
|------|-------------|
| `get_active_context` | Get current feature context |
| `set_feature_context` | Start tracking a new feature |
| `list_recent_contexts` | List recent feature contexts |
| `switch_feature_context` | Switch to a previous context |

---

## Project Structure

```
MemoryLayer/
├── src/
│   ├── cli/              # CLI commands
│   ├── core/             # Core business logic
│   │   ├── living-docs/  # Living Documentation module
│   │   ├── engine.ts     # Main MemoryLayerEngine
│   │   ├── context.ts    # Context assembly
│   │   ├── decisions.ts  # Decision tracking
│   │   └── ...
│   ├── indexing/         # Code indexing & embeddings
│   ├── server/           # MCP server & tools
│   ├── storage/          # Database & storage tiers
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── tests/                # Test files
├── dist/                 # Build output
└── package.json
```

---

## Tech Stack

- **Runtime:** Node.js with ES Modules
- **Language:** TypeScript
- **Database:** SQLite (better-sqlite3)
- **Embeddings:** @xenova/transformers (local, no API)
- **AST Parsing:** TypeScript compiler API
- **Build:** esbuild
- **Testing:** Vitest

---

## How to Run

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Start MCP server (via stdio)
node dist/index.js /path/to/project
```

---

## Configuration

The server accepts command-line arguments:
- First argument: Project path to index
- `--data-dir`: Custom data directory (default: `.memorylayer/`)

Example MCP client configuration:
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

---

## Next Steps

1. ~~**Context Rot Prevention (P0)**~~ - ✅ Complete
2. ~~**Confidence Scoring (P1)**~~ - ✅ Complete
3. **Change Intelligence (P1)** - Useful for refactoring
4. **Architecture Enforcement (P2)** - Nice to have
5. **Test-Aware Suggestions (P2)** - Nice to have
