# MemoryLayer - Product Roadmap

**Last Updated:** February 2026

---

## Vision

> Make AI truly understand codebases - achieving 100x improvement in cost, quality, and speed for AI-assisted development.

---

## Roadmap Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          THE PATH TO 100x                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Phase 1: Foundation          Phase 2: Intelligence                 │
│  ──────────────────          ────────────────────                   │
│  Weeks 1-4                   Weeks 5-8                              │
│  Target: 10x                 Target: 30x                            │
│                                                                      │
│  ✓ MCP Server                ✓ AST-aware retrieval                  │
│  ✓ Semantic search           ✓ Dependency graph                     │
│  ✓ 3-tier storage            ✓ Auto-extract decisions               │
│  ✓ Decision memory           ✓ Git commit analysis                  │
│  ✓ Token budgeting           ✓ Import/export tracking               │
│                                                                      │
│                                                                      │
│  Phase 3: Learning           Phase 4: Scale                         │
│  ─────────────────           ──────────────                         │
│  Weeks 9-14                  Weeks 15-20                            │
│  Target: 100x                Target: Enterprise                     │
│                                                                      │
│  ✓ Query expansion           ✓ Multi-project support                │
│  ✓ Compressed representations ✓ Team/author attribution            │
│  ✓ Predictive pre-fetch      ✓ ADR export                          │
│  ✓ Usage-based learning      ✓ CLI commands                        │
│  ✓ Personalized ranking      □ VS Code extension                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation (Weeks 1-4) ✓ COMPLETE

**Goal:** Ship a working MCP server that provides basic retrieval.

**Target Improvement:** 10x (primarily cost reduction)

### Week 1: Project Setup ✓

| Task | Status | Notes |
|------|--------|-------|
| Initialize TypeScript project | ✓ | esbuild for bundling |
| Set up MCP server scaffold | ✓ | @modelcontextprotocol/sdk |
| Create SQLite database schema | ✓ | WAL mode enabled |
| Implement basic file structure | ✓ | Clean module separation |

### Week 2: Indexing Pipeline ✓

| Task | Status | Notes |
|------|--------|-------|
| File watcher with chokidar | ✓ | Debounced, ignores patterns |
| Embedding generation | ✓ | transformers.js, local |
| Store embeddings in SQLite | ✓ | Binary blob storage |
| Initial indexing on startup | ✓ | Progress events |

### Week 3: Context Assembly ✓

| Task | Status | Notes |
|------|--------|-------|
| Semantic search implementation | ✓ | Cosine similarity |
| Token budget manager | ✓ | 6K default budget |
| Relevance ranking | ✓ | Similarity + boosts |
| Context formatter | ✓ | Markdown output |

### Week 4: MCP Integration ✓

| Task | Status | Notes |
|------|--------|-------|
| Implement `get_context` tool | ✓ | Primary tool |
| Implement `search_codebase` tool | ✓ | Raw search |
| Implement `record_decision` tool | ✓ | With embedding |
| Test with Claude Desktop | ✓ | Manual testing |
| Basic documentation | ✓ | PRD folder |

### Phase 1 Deliverables ✓

- [x] Working MCP server binary
- [x] 5 MCP tools implemented
- [x] 2 MCP resources implemented
- [x] SQLite storage with embeddings
- [x] Unit tests passing
- [x] Documentation complete

---

## Phase 2: Intelligence (Weeks 5-8) ✓ COMPLETE

**Goal:** Add understanding of code structure and relationships.

**Target Improvement:** 30x (quality improvement)

### Week 5-6: AST Analysis ✓

| Task | Status | Notes |
|------|--------|-------|
| Regex-based parsing | ✓ | TS/JS/Python support |
| Extract functions, classes, types | ✓ | Structured symbols table |
| Build dependency graph | ✓ | Import tracking |
| Import/export tracking | ✓ | Module relationships |

**Technical Details:**

```typescript
// New types for AST data
interface CodeSymbol {
  type: 'function' | 'class' | 'type' | 'variable';
  name: string;
  file: string;
  line: number;
  signature?: string;
  docstring?: string;
}

interface Dependency {
  from: string;  // file path
  to: string;    // file path
  type: 'imports' | 'calls' | 'extends' | 'implements';
  symbols: string[];  // what's imported/called
}
```

**New Tool: `get_symbol`**

```json
{
  "name": "get_symbol",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "type": { "type": "string", "enum": ["function", "class", "type", "any"] }
    }
  }
}
```

### Week 7-8: Decision System ✓

| Task | Status | Notes |
|------|--------|-------|
| Auto-extract from git commits | ✓ | Parse commit messages |
| Auto-detect from comments | ✓ | // DECISION: comments |
| Link decisions to code | ✓ | Files array in decisions |
| Surface in context | ✓ | Semantic search |

**Auto-Detection Patterns:**

```typescript
// Git commit messages
// feat(auth): Use JWT instead of sessions - better for scale

// Code comments
// DECISION: Using PostgreSQL for ACID compliance
// ARCHITECTURE: Event-driven pattern for notifications
// TODO(decision): Need to decide on caching strategy

// ADR files
// docs/decisions/001-use-postgresql.md
```

### Phase 2 Deliverables ✓

- [x] Regex-based AST parsing for TS/JS/Python
- [x] Symbol extraction (functions, classes, types)
- [x] Dependency graph in database
- [x] Auto-decision extraction from git/comments
- [x] `get_symbol` tool
- [x] `get_dependencies` tool
- [x] Updated documentation

---

## Phase 3: Learning (Weeks 9-14) ✓ COMPLETE

**Goal:** System learns from usage and predicts needs.

**Target Improvement:** 100x (the full vision)

### Week 9-10: Query Expansion & Retrieval ✓

| Task | Status | Notes |
|------|--------|-------|
| Query expansion | ✓ | Expand queries for better retrieval |
| Usage-based learning | ✓ | Track what context was useful |
| Personalized ranking | ✓ | Boost frequently accessed files |

**Concept:**

```
User Query: "Fix the bug in checkout"
                │
                ▼
┌───────────────────────────────────────┐
│ Small LLM asks:                       │
│ "What files/concepts are needed?"     │
│                                       │
│ Output:                               │
│ - checkout flow                       │
│ - payment processing                  │
│ - cart state management               │
│ - error handling patterns             │
└───────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ Targeted retrieval for each concept  │
│ Much more relevant than single query │
└───────────────────────────────────────┘
```

### Week 11-12: Compression & Prediction ✓

| Task | Status | Notes |
|------|--------|-------|
| File summaries | ✓ | 10x compression |
| Predictive pre-fetching | ✓ | Based on usage patterns |
| Hot cache management | ✓ | LRU cache for files |

**Compression Example:**

```
Original file: 500 lines, ~2000 tokens
Compressed summary: 50 tokens

"AuthMiddleware: JWT verification for protected routes.
Exports: authMiddleware, requireRole, optionalAuth.
Uses: jsonwebtoken, config.JWT_SECRET.
Called by: all /api routes except /auth/login."
```

### Week 13-14: Usage Learning ✓

| Task | Status | Notes |
|------|--------|-------|
| Track context effectiveness | ✓ | mark_context_useful tool |
| Learn from user behavior | ✓ | Track file access |
| Personalized ranking | ✓ | Relevance score boosts |

**Learning Signals:**

1. **Positive signals:**
   - Context was included in AI response
   - User asked follow-up about that code
   - User edited the retrieved file

2. **Negative signals:**
   - Context was ignored by AI
   - User asked "that's not what I meant"
   - User provided different context manually

### Phase 3 Deliverables ✓

- [x] Query expansion for better retrieval
- [x] File summary generation (10x compression)
- [x] Predictive pre-fetching
- [x] Usage tracking database
- [x] Personalized ranking with relevance scores
- [x] `get_file_summary` tool
- [x] `get_predicted_files` tool
- [x] `get_learning_stats` tool
- [x] `mark_context_useful` tool

---

## Phase 4: Scale (Weeks 15-20) ✓ MOSTLY COMPLETE

**Goal:** Enterprise readiness and team features.

**Target:** Market expansion

### Week 15-16: Multi-Project ✓

| Task | Status | Notes |
|------|--------|-------|
| Project registry | ✓ | ~/.memorylayer/registry.json |
| Project switching | ✓ | CLI and MCP tools |
| Cross-project search | ✓ | Search across all projects |
| Project discovery | ✓ | Find projects in common locations |

### Week 17-18: Team Features ✓

| Task | Status | Notes |
|------|--------|-------|
| Author attribution | ✓ | Author field on decisions |
| Decision status | ✓ | proposed/accepted/deprecated/superseded |
| ADR export | ✓ | MADR, Nygard, Simple formats |
| CLI commands | ✓ | Project management CLI |

### Week 19-20: Distribution

| Task | Status | Notes |
|------|--------|-------|
| VS Code extension | □ | Future work |
| Cloud sync (opt-in) | □ | Future work |
| Enterprise auth | □ | Future work |

---

## Feature Backlog (Unprioritized)

### High Value, Low Effort

- [ ] Cursor IDE support
- [ ] Automatic README generation
- [ ] Code search in Claude Code
- [x] Export decisions to ADR files

### High Value, High Effort

- [ ] Multi-model embedding support
- [ ] Custom embedding fine-tuning
- [ ] Real-time collaboration
- [ ] Code review integration

### Low Priority

- [ ] Web dashboard
- [ ] Mobile companion app
- [ ] Public API
- [ ] Marketplace for plugins

---

## Success Metrics by Phase

### Phase 1 (Complete)

| Metric | Target | Actual |
|--------|--------|--------|
| Setup time | < 2 min | ~2 min |
| Index speed | < 2 min/100K LOC | TBD |
| Search latency | < 100ms | ~50ms |
| Works with Claude Desktop | Yes | Yes |

### Phase 2

| Metric | Target |
|--------|--------|
| AST parsing coverage | 90% of files |
| Dependency accuracy | 95% |
| Auto-decision extraction | 50%+ of decisions |
| User satisfaction | 4/5 stars |

### Phase 3

| Metric | Target |
|--------|--------|
| Context relevance | 95%+ |
| Prediction accuracy | 60% hit rate |
| Cost reduction | 30x vs baseline |
| Learning improvement | +20% over 4 weeks |

### Phase 4

| Metric | Target |
|--------|--------|
| Team adoption | 5+ teams |
| Enterprise pilots | 2+ companies |
| Revenue | $10K MRR |

---

## Competitive Landscape

### Current Competitors

| Product | Approach | Weakness |
|---------|----------|----------|
| Cursor | IDE-integrated | Vendor lock-in |
| Continue | VS Code extension | Setup complexity |
| Cody | Sourcegraph-based | Requires Sourcegraph |
| Codeium | Cloud-based | Privacy concerns |

### MemoryLayer Differentiation

1. **MCP-native** - Works with any MCP client
2. **Local-first** - No cloud, no privacy concerns
3. **Decision memory** - Unique feature
4. **Semantic understanding** - Not just keyword search
5. **Learning** - Gets smarter over time

---

## Technical Debt to Address

### Phase 2

- [ ] Add sqlite-vec for faster vector search
- [ ] Implement proper chunking for large files
- [ ] Add database migrations

### Phase 3

- [ ] Optimize embedding batch processing
- [ ] Add caching layer
- [ ] Implement proper logging

### Phase 4

- [ ] Security audit
- [ ] Performance benchmarks
- [ ] Load testing

---

## Open Questions

### Technical

1. **Embedding model:** Should we switch to code-specific model?
2. **Multi-file chunks:** How to handle functions spanning files?
3. **Real-time updates:** How fast is fast enough?

### Product

1. **Pricing:** Free vs freemium vs paid?
2. **Open source:** When/if to open source?
3. **Community:** Discord vs GitHub discussions?

### Business

1. **Target market:** Solo devs vs teams vs enterprise?
2. **Go-to-market:** Product Hunt vs direct outreach?
3. **Partnerships:** Claude Desktop exclusivity?

---

*Roadmap maintained by the MemoryLayer team. Subject to change based on user feedback and market conditions.*
