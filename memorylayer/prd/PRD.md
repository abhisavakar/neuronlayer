# MemoryLayer v1.0 - Product Requirements Document

**Version:** 1.0
**Last Updated:** February 2026
**Status:** In Development

---

## Executive Summary

MemoryLayer is a persistent memory layer for AI coding assistants that solves the fundamental problem of **context amnesia** - the frustrating reality that AI assistants forget everything between sessions.

### The One-Liner
> "MemoryLayer makes AI truly understand your codebase - not just retrieve, but remember."

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Target Users](#target-users)
4. [Product Goals](#product-goals)
5. [Features - v1.0](#features---v10)
6. [User Stories](#user-stories)
7. [Success Criteria](#success-criteria)
8. [Out of Scope (v1)](#out-of-scope-v1)
9. [Dependencies](#dependencies)
10. [Risks & Mitigations](#risks--mitigations)

---

## Problem Statement

### The Context Amnesia Problem

Every AI coding assistant today suffers from a fundamental limitation:

| Problem | Impact |
|---------|--------|
| **Session-based memory** | Close your chat, lose everything |
| **No persistent understanding** | AI doesn't remember your architecture, patterns, or decisions |
| **Constant re-explanation** | "We use PostgreSQL because..." every single session |
| **Linear cost scaling** | More code = exponentially higher API costs |
| **Lost in the middle** | Large contexts (200K tokens) degrade quality |

### The Pain for Vibe Coders

"Vibe coding" = heavy AI-assisted development with constant back-and-forth. These users:
- Feel context loss most acutely
- Experience session resets that break their flow
- Waste 5-15 minutes per session re-explaining their project
- Pay high API costs for repeatedly sending the same context
- Get frustrated when AI "forgets" architectural decisions

### Quantified Pain

| Metric | Current State |
|--------|---------------|
| Time lost per session | 5-15 minutes re-explaining |
| Context relevance | ~3% of retrieved code is relevant |
| Monthly cost (1M LOC project) | $300+ in API costs |
| Effective codebase limit | ~100K LOC before quality degrades |

---

## Solution Overview

### What is MemoryLayer?

MemoryLayer is an **MCP (Model Context Protocol) server** that provides AI assistants with:

1. **Persistent Memory** - Remembers across sessions, never explain the same thing twice
2. **Semantic Understanding** - Knows what code means, not just where it is
3. **Smart Retrieval** - Retrieves only the most relevant context (95%+ relevance)
4. **Decision Tracking** - Records and surfaces architectural decisions
5. **Local-First** - Private, fast, works offline

### How It Works

```
┌─────────────────┐     MCP Protocol     ┌─────────────────┐
│  Claude Desktop │ ◄──────────────────► │  MemoryLayer    │
│  (or any MCP    │                      │  Server         │
│   client)       │                      │                 │
└─────────────────┘                      └────────┬────────┘
                                                  │
                                         ┌────────▼────────┐
                                         │   Your Codebase │
                                         │   (indexed &    │
                                         │    embedded)    │
                                         └─────────────────┘
```

1. **User opens project** → MemoryLayer indexes all code files
2. **User asks question** → AI calls `get_context` tool
3. **MemoryLayer returns** → Relevant code + decisions + history
4. **AI responds** → With full context, no re-explanation needed
5. **User makes decision** → AI records it via `record_decision`
6. **Next session** → Everything is remembered

---

## Target Users

### Primary: "Vibe Coders"

**Definition:** Developers who use AI assistants for 50%+ of their coding time.

**Characteristics:**
- Solo developers, indie hackers, startup engineers
- Heavy users of Claude Desktop, Claude Code, Cursor, ChatGPT
- Work on projects ranging from 10K to 1M+ lines of code
- Feel frustrated by "the AI forgot everything again"
- Value speed and flow over manual documentation

**User Persona: "Alex the Indie Hacker"**
- Building a SaaS product solo
- Uses Claude for 80% of coding tasks
- Has a 50K LOC codebase
- Spends 10+ minutes per session re-explaining architecture
- Pays $100+/month in AI API costs

### Secondary: Teams

- Small development teams (2-5 people)
- Want shared context across team members
- Need to preserve institutional knowledge

---

## Product Goals

### v1.0 Goals

| Goal | Target | Measurement |
|------|--------|-------------|
| **Reduce re-explanation time** | 90% reduction | User-reported time savings |
| **Improve context relevance** | 95% relevant | Manual evaluation of retrieved context |
| **Setup time** | < 2 minutes | Time from install to first query |
| **Works with Claude Desktop** | Yes | Manual testing |
| **Local-first** | 100% local | No external API calls for core features |

### The 100x Vision (Future)

```
100x = Cost Reduction × Quality Improvement × Speed × Persistence
     = 33x × 2x × 1.5x × 1x
     = ~100x better than current tools
```

| Dimension | Today | MemoryLayer Target |
|-----------|-------|-------------------|
| Cost (1M LOC) | $300/mo | $3/mo |
| Context relevance | ~3% | 95% |
| Response time | 5-10s | <500ms |
| Re-explanation | Every session | Never |
| Codebase limit | ~100K LOC | 10M+ LOC |

---

## Features - v1.0

### Core Features

#### 1. Semantic Codebase Search
**What:** Search your codebase using natural language, not just keywords.

**MCP Tool:** `search_codebase`

```json
{
  "query": "authentication middleware",
  "limit": 10
}
```

**Returns:** Files and code snippets ranked by semantic relevance.

#### 2. Intelligent Context Assembly
**What:** Automatically assemble the most relevant context for any query.

**MCP Tool:** `get_context`

```json
{
  "query": "How does user authentication work?",
  "current_file": "src/api/routes.ts",
  "max_tokens": 6000
}
```

**Returns:**
- Relevant code snippets (ranked)
- Related architectural decisions
- Working file context
- Historical context

**Token Budget Management:**
- Default: 6,000 tokens
- Tier 1 (Working): ~1,000 tokens
- Tier 2 (Relevant): ~4,000 tokens
- Tier 3 (Archive): ~500 tokens
- Decisions: ~500 tokens

#### 3. Decision Memory
**What:** Record and recall architectural decisions automatically.

**MCP Tool:** `record_decision`

```json
{
  "title": "Use PostgreSQL for primary database",
  "description": "Chose PostgreSQL over MongoDB because we need ACID transactions for payment processing. Considered MySQL but PostgreSQL has better JSON support.",
  "files": ["src/db/connection.ts", "src/models/payment.ts"],
  "tags": ["database", "architecture"]
}
```

**MCP Resource:** `memorylayer://decisions/recent`

#### 4. Project Understanding
**What:** Automatically understand project structure, languages, and dependencies.

**MCP Tool:** `get_project_summary`

**Returns:**
- Project name and description
- Languages used
- Total files and lines of code
- Key directories
- Dependencies (from package.json, requirements.txt, etc.)
- Recent decisions

**MCP Resource:** `memorylayer://project/overview`

#### 5. File Context
**What:** Get detailed context about any specific file.

**MCP Tool:** `get_file_context`

```json
{
  "path": "src/auth/middleware.ts"
}
```

**Returns:** Full file content, language, line count.

### Technical Features

#### 6. Local Embeddings
- Uses `transformers.js` with `all-MiniLM-L6-v2` model
- No API calls, fully local
- 384-dimensional embeddings
- Handles files up to 8K characters

#### 7. Three-Tier Storage
| Tier | Purpose | Speed | Contents |
|------|---------|-------|----------|
| Tier 1 | Working memory | <10ms | Current session, active file |
| Tier 2 | Indexed codebase | <100ms | All files with embeddings |
| Tier 3 | Archive | <500ms | Historical sessions, old decisions |

#### 8. Real-Time Indexing
- Watches file system for changes (chokidar)
- Incremental re-indexing on file changes
- Ignores node_modules, .git, build folders

#### 9. Smart Ranking
Results are ranked by:
- Semantic similarity (primary)
- Same directory as current file (+50% boost)
- Recently modified (+30% boost for <24h)
- Recently viewed in session (+30% boost)

---

## User Stories

### Setup Stories

**US-1: First-Time Setup**
> As a developer, I want to set up MemoryLayer in under 2 minutes so I can start using it immediately.

Acceptance Criteria:
- `npm install -g memorylayer`
- Add config to Claude Desktop
- Restart Claude Desktop
- Working

**US-2: Auto-Indexing**
> As a developer, I want MemoryLayer to automatically index my codebase so I don't have to configure anything.

Acceptance Criteria:
- Detects project type automatically
- Indexes all code files
- Shows progress indicator
- Completes in <2 minutes for 100K LOC

### Daily Use Stories

**US-3: Context-Aware Questions**
> As a developer, I want to ask questions about my codebase and get relevant code context automatically.

Example:
- User: "How does the payment processing work?"
- AI calls `get_context` with query
- MemoryLayer returns relevant files: payment.ts, stripe.ts, orders.ts
- AI responds with understanding of the full flow

**US-4: Remember Decisions**
> As a developer, I want the AI to remember architectural decisions I've made so I don't have to explain them again.

Example:
- Session 1: "Let's use PostgreSQL because we need ACID transactions"
- AI calls `record_decision`
- Session 2: User asks about database
- AI retrieves decision and responds with context

**US-5: Project Onboarding**
> As a developer joining a new project, I want to quickly understand the codebase structure.

Example:
- User: "Give me an overview of this project"
- AI calls `get_project_summary`
- MemoryLayer returns: languages, structure, dependencies, decisions
- AI provides comprehensive onboarding

### Advanced Stories

**US-6: Cross-File Understanding**
> As a developer, I want the AI to understand how different files relate to each other.

Example:
- User: "What calls the createUser function?"
- MemoryLayer finds createUser and files that import it
- AI explains the call chain

**US-7: Persistent Context**
> As a developer, I want context to persist across sessions without any action from me.

Acceptance Criteria:
- Decisions persist in SQLite database
- Session history is preserved
- Recent files are remembered
- No manual save required

---

## Success Criteria

### v1.0 Launch Criteria

| Criteria | Target | How to Measure |
|----------|--------|----------------|
| Setup time | < 2 minutes | Timed test with new user |
| Index speed | < 2 min / 100K LOC | Benchmark on test projects |
| Search latency | < 100ms | Measure in code |
| Context assembly | < 500ms | Measure in code |
| Claude Desktop works | Yes | Manual testing |
| 0 API calls | Yes | Network monitoring |
| Tests pass | 100% | `npm test` |

### User Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Beta users | 10 active | Week 4 |
| User satisfaction | "It helped" from 3/5 users | Week 4 |
| Time saved | 5+ min/session reported | Week 6 |
| Daily active use | 50%+ of beta users | Week 8 |

---

## Out of Scope (v1)

The following features are explicitly **not** in v1.0:

| Feature | Why Deferred | Planned For |
|---------|--------------|-------------|
| VS Code extension | Focus on MCP first | v2.0 |
| Team/shared memory | Solo users first | v2.0 |
| Cloud sync | Local-first philosophy | v2.0+ |
| AST-aware retrieval | Complexity | v1.5 |
| LLM-in-the-loop retrieval | Requires API calls | v2.0 |
| Git commit analysis | Nice-to-have | v1.5 |
| Multi-project support | One project first | v1.5 |
| Custom embedding models | MiniLM is sufficient | v2.0 |

---

## Dependencies

### Technical Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥18.0 | Runtime |
| @modelcontextprotocol/sdk | ^1.0.0 | MCP server |
| @xenova/transformers | ^2.17.0 | Local embeddings |
| better-sqlite3 | ^11.0.0 | Database |
| chokidar | ^3.6.0 | File watching |
| glob | ^10.0.0 | File discovery |

### External Dependencies

| Dependency | Risk Level | Mitigation |
|------------|------------|------------|
| Claude Desktop | Medium | MCP is a standard, not Claude-specific |
| MCP Protocol | Low | Anthropic is actively developing |
| transformers.js | Low | Well-maintained, active community |

---

## Risks & Mitigations

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Embedding model too slow | Medium | High | Use quantized model, batch processing |
| SQLite limitations at scale | Low | Medium | Designed for up to 1M LOC, can migrate later |
| MCP protocol changes | Low | High | Pin SDK version, follow MCP spec |
| Large files crash system | Medium | Medium | Chunk large files, set size limits |

### Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Users don't understand value | Medium | High | Clear onboarding, demo videos |
| Setup too complex | Medium | High | One-command install, auto-config |
| Context not relevant enough | Medium | High | Iterative improvement of ranking |
| Competition from IDE vendors | High | Medium | Focus on MCP ecosystem, stay nimble |

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **MCP** | Model Context Protocol - standard for AI tool integration |
| **Embedding** | Vector representation of text for semantic search |
| **Vibe Coding** | Heavy AI-assisted development style |
| **Context Amnesia** | AI forgetting everything between sessions |
| **Token Budget** | Maximum tokens allocated for context |

### References

- [MCP Specification](https://modelcontextprotocol.io/)
- [transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/mcp)

---

*Document maintained by the MemoryLayer team.*
