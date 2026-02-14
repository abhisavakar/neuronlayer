# MemoryLayer v1.0 - Technical Architecture

**Version:** 1.0
**Last Updated:** February 2026

---

## System Overview

MemoryLayer is built as an MCP (Model Context Protocol) server that provides persistent, intelligent context to AI coding assistants.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│                                                                      │
│   ┌─────────────────┐                                               │
│   │  Claude Desktop │                                               │
│   │  (MCP Client)   │                                               │
│   └────────┬────────┘                                               │
│            │ MCP Protocol (stdio)                                   │
└────────────┼────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         MCP SERVER LAYER                             │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    src/server/mcp.ts                         │   │
│   │  - Handles MCP protocol communication                        │   │
│   │  - Routes tool calls to handlers                             │   │
│   │  - Manages server lifecycle                                  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              ▼               ▼               ▼                      │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│   │ src/server/  │  │ src/server/  │  │              │             │
│   │ tools.ts     │  │ resources.ts │  │  (prompts)   │             │
│   │              │  │              │  │  future      │             │
│   │ 5 Tools      │  │ 2 Resources  │  │              │             │
│   └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CORE ENGINE LAYER                            │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                   src/core/engine.ts                         │   │
│   │  - Main orchestration                                        │   │
│   │  - Coordinates all subsystems                                │   │
│   │  - Manages initialization and shutdown                       │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              ▼               ▼               ▼                      │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│   │ src/core/    │  │ src/core/    │  │ src/core/    │             │
│   │ context.ts   │  │ decisions.ts │  │ learning.ts  │             │
│   │              │  │              │  │ (future)     │             │
│   │ Context      │  │ Decision     │  │              │             │
│   │ Assembly     │  │ Tracking     │  │              │             │
│   └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         INDEXING LAYER                               │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                  src/indexing/indexer.ts                     │   │
│   │  - Orchestrates file indexing                                │   │
│   │  - Manages embedding generation                              │   │
│   │  - Handles incremental updates                               │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              ▼               ▼               ▼                      │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│   │ src/indexing/│  │ src/indexing/│  │ src/indexing/│             │
│   │ watcher.ts   │  │ embeddings.ts│  │ ast.ts       │             │
│   │              │  │              │  │ (future)     │             │
│   │ File System  │  │ Vector       │  │              │             │
│   │ Monitoring   │  │ Generation   │  │              │             │
│   └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         STORAGE LAYER                                │
│                                                                      │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│   │   TIER 1     │  │   TIER 2     │  │   TIER 3     │             │
│   │   Working    │  │   Indexed    │  │   Archive    │             │
│   │              │  │              │  │              │             │
│   │ tier1.json   │  │ SQLite +     │  │ SQLite       │             │
│   │ + Memory     │  │ Embeddings   │  │ Compressed   │             │
│   │              │  │              │  │              │             │
│   │ <10ms        │  │ <100ms       │  │ <500ms       │             │
│   │ ~1K tokens   │  │ ~4K tokens   │  │ ~500 tokens  │             │
│   └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                  src/storage/database.ts                     │   │
│   │  - SQLite initialization                                     │   │
│   │  - Schema management                                         │   │
│   │  - WAL mode for performance                                  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. MCP Server Layer

#### `src/server/mcp.ts`

The main MCP server that handles protocol communication.

```typescript
class MCPServer {
  private server: Server;
  private engine: MemoryLayerEngine;

  // Handles:
  // - ListToolsRequest
  // - CallToolRequest
  // - ListResourcesRequest
  // - ReadResourceRequest
}
```

**Responsibilities:**
- Initialize MCP server with capabilities
- Route tool calls to appropriate handlers
- Format responses for MCP protocol
- Handle shutdown gracefully

#### `src/server/tools.ts`

Defines and handles all MCP tools.

| Tool | Input | Output |
|------|-------|--------|
| `get_context` | query, current_file?, max_tokens? | context, sources, token_count, decisions |
| `search_codebase` | query, limit? | results[] |
| `record_decision` | title, description, files?, tags? | decision object |
| `get_file_context` | path | content, language, lines |
| `get_project_summary` | (none) | summary object |

#### `src/server/resources.ts`

Defines and handles MCP resources.

| Resource URI | Type | Content |
|--------------|------|---------|
| `memorylayer://decisions/recent` | JSON | Last 10 decisions |
| `memorylayer://project/overview` | Markdown | Project summary |

---

### 2. Core Engine Layer

#### `src/core/engine.ts`

The main orchestration class that coordinates all subsystems.

```typescript
class MemoryLayerEngine {
  private config: MemoryLayerConfig;
  private db: Database;
  private tier1: Tier1Storage;
  private tier2: Tier2Storage;
  private tier3: Tier3Storage;
  private indexer: Indexer;
  private contextAssembler: ContextAssembler;
  private decisionTracker: DecisionTracker;

  // Lifecycle
  async initialize(): Promise<void>
  shutdown(): void

  // API
  async getContext(query, currentFile?, maxTokens?): Promise<AssembledContext>
  async searchCodebase(query, limit?): Promise<SearchResult[]>
  async recordDecision(title, description, files?, tags?): Promise<Decision>
  getProjectSummary(): ProjectSummary
}
```

#### `src/core/context.ts`

Assembles context from all tiers with intelligent ranking.

```typescript
class ContextAssembler {
  async assemble(query: string, options: AssemblyOptions): Promise<AssembledContext> {
    // 1. Load Tier 1 (working context)
    // 2. Semantic search Tier 2
    // 3. Rank results
    // 4. Query Tier 3 if budget remains
    // 5. Get relevant decisions
    // 6. Format final context
  }

  private rankResults(results, currentFile?): SearchResult[] {
    // Boost by:
    // - Semantic similarity (base)
    // - Same directory (+50%)
    // - Recently modified (+30%)
    // - Recently viewed (+30%)
  }
}
```

#### `src/core/decisions.ts`

Manages architectural decision tracking.

```typescript
class DecisionTracker {
  async recordDecision(title, description, files, tags): Promise<Decision>
  getRecentDecisions(limit): Decision[]
  async searchDecisions(query, limit): Promise<Decision[]>
}
```

---

### 3. Indexing Layer

#### `src/indexing/indexer.ts`

Orchestrates the indexing pipeline.

```typescript
class Indexer extends EventEmitter {
  // Events: indexingStarted, progress, indexingComplete, fileIndexed, error

  async performInitialIndex(): Promise<void>
  async indexFile(absolutePath: string): Promise<void>
  startWatching(): void
  stopWatching(): void
}
```

**Indexing Flow:**

```
1. Scan project for code files (glob patterns)
2. For each file:
   a. Read content
   b. Calculate hash (skip if unchanged)
   c. Generate embedding
   d. Store in Tier 2
3. Start file watcher
4. On file change:
   a. Debounce (500ms)
   b. Re-index changed files
```

#### `src/indexing/embeddings.ts`

Generates vector embeddings using local models.

```typescript
class EmbeddingGenerator {
  private model: FeatureExtractionPipeline;

  async initialize(): Promise<void>  // Load model
  async embed(text: string): Promise<Float32Array>  // Generate embedding
  async embedBatch(texts: string[], batchSize?): Promise<Float32Array[]>
}
```

**Model Details:**
- Model: `Xenova/all-MiniLM-L6-v2`
- Dimensions: 384
- Max input: ~8000 characters
- Quantized for speed
- Fully local (no API calls)

#### `src/indexing/watcher.ts`

Monitors file system for changes.

```typescript
class FileWatcher extends EventEmitter {
  // Events: file (add/change/unlink), ready, error

  start(): void
  stop(): void
}
```

**Configuration:**
- Uses chokidar
- Ignores: node_modules, .git, dist, build, etc.
- Debounces rapid changes
- Depth limit: 20 levels

---

### 4. Storage Layer

#### Three-Tier Architecture

Inspired by human memory systems:

| Tier | Analogy | Contents | Storage | Access Time |
|------|---------|----------|---------|-------------|
| **Tier 1** | Working Memory | Current session state | JSON + Memory | <10ms |
| **Tier 2** | Short-term Memory | Indexed codebase | SQLite + Embeddings | <100ms |
| **Tier 3** | Long-term Memory | Historical archive | SQLite Compressed | <500ms |

#### `src/storage/tier1.ts`

Working context for the current session.

```typescript
interface Tier1Context {
  activeFile: ActiveFile | null;
  recentDecisions: Decision[];  // Max 20
  session: {
    startTime: Date;
    filesViewed: string[];  // Max 50
    currentGoal?: string;
  };
  immediateContext: ContextSnippet[];  // Max 10
}
```

**Storage:** JSON file (`tier1.json`) + in-memory cache

#### `src/storage/tier2.ts`

Indexed codebase with vector search.

**Database Schema:**

```sql
-- Files metadata
CREATE TABLE files (
  id INTEGER PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  content_hash TEXT NOT NULL,
  preview TEXT,
  language TEXT,
  size_bytes INTEGER,
  line_count INTEGER,
  last_modified INTEGER,
  indexed_at INTEGER
);

-- Embeddings (binary blobs)
CREATE TABLE embeddings (
  file_id INTEGER PRIMARY KEY,
  embedding BLOB NOT NULL,
  dimension INTEGER NOT NULL
);

-- Dependencies (for future use)
CREATE TABLE dependencies (
  source_file_id INTEGER,
  target_file_id INTEGER,
  relationship TEXT
);

-- Decisions
CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  files TEXT,  -- JSON array
  tags TEXT,   -- JSON array
  created_at INTEGER,
  embedding BLOB
);

-- Project summary (singleton)
CREATE TABLE project_summary (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT,
  description TEXT,
  languages TEXT,
  key_directories TEXT,
  architecture_notes TEXT,
  updated_at INTEGER
);
```

**Vector Search:**
- Cosine similarity computed in JavaScript
- All embeddings loaded for search (scales to ~10K files)
- Future: Use sqlite-vec extension for larger scale

#### `src/storage/tier3.ts`

Archive storage for historical data.

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  start_time INTEGER,
  end_time INTEGER,
  files_viewed TEXT,  -- JSON array
  summary TEXT
);
```

---

## Data Flow

### Query Flow

```
User asks question
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ 1. Claude Desktop sends query via MCP                         │
│    Tool: get_context                                          │
│    Args: { query: "How does auth work?", current_file: "..." }│
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ 2. MCP Server routes to handleToolCall                        │
│    src/server/tools.ts                                        │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ 3. Engine calls ContextAssembler                              │
│    src/core/context.ts                                        │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ 4. Context Assembly Pipeline                                   │
│                                                                │
│    a. Generate query embedding (EmbeddingGenerator)            │
│    b. Load Tier 1 context (working memory)                     │
│    c. Search Tier 2 (semantic search)                          │
│    d. Rank results (similarity + boosts)                       │
│    e. Fill token budget (default 6000)                         │
│    f. Search Tier 3 if budget remains                          │
│    g. Get relevant decisions                                   │
│    h. Format final context                                     │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ 5. Return AssembledContext                                     │
│    {                                                           │
│      context: "## Codebase Context\n...",                     │
│      sources: ["src/auth/middleware.ts", ...],                │
│      tokenCount: 4523,                                         │
│      decisions: [...]                                          │
│    }                                                           │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ 6. Claude uses context to respond                              │
└───────────────────────────────────────────────────────────────┘
```

### Indexing Flow

```
Project opened
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ 1. Engine.initialize()                                         │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ 2. Indexer.performInitialIndex()                               │
│                                                                │
│    a. Glob for all code files                                  │
│    b. Filter by extensions (.ts, .js, .py, etc.)              │
│    c. For each file:                                           │
│       - Read content                                           │
│       - Calculate SHA256 hash                                  │
│       - Skip if hash unchanged                                 │
│       - Generate embedding                                     │
│       - Store in database                                      │
│    d. Emit progress events                                     │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ 3. Indexer.startWatching()                                     │
│                                                                │
│    - chokidar watches project directory                        │
│    - On add/change: queue file for re-indexing                │
│    - On unlink: remove from database                           │
│    - Debounce: 500ms                                           │
└───────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Default Configuration

```typescript
interface MemoryLayerConfig {
  projectPath: string;          // Absolute path to project
  dataDir: string;              // ~/.memorylayer/projects/{name}-{hash}
  maxTokens: number;            // 6000
  embeddingModel: string;       // 'Xenova/all-MiniLM-L6-v2'
  watchIgnore: string[];        // Patterns to ignore
}
```

### Ignored Patterns

```typescript
[
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.map',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/.env*',
  '**/*.log'
]
```

### Supported File Types

```typescript
// Full list in src/utils/files.ts
const LANGUAGE_MAP = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  // ... 50+ extensions
}
```

---

## Performance Characteristics

### Time Complexity

| Operation | Time | Notes |
|-----------|------|-------|
| Initial index (100K LOC) | ~2 min | Dominated by embedding generation |
| Single file index | ~100ms | Embedding + DB write |
| Semantic search | ~50ms | Linear scan of embeddings |
| Context assembly | ~200ms | Search + ranking + formatting |
| File change detection | ~10ms | chokidar event |

### Space Complexity

| Component | Size | Notes |
|-----------|------|-------|
| Embedding per file | ~1.5KB | 384 floats × 4 bytes |
| 10K files embeddings | ~15MB | In SQLite database |
| 100K files embeddings | ~150MB | May need optimization |
| Model (quantized) | ~23MB | Downloaded on first run |

### Scaling Limits (v1)

| Metric | Soft Limit | Hard Limit |
|--------|------------|------------|
| Files | 10,000 | 50,000 |
| Lines of code | 1,000,000 | 5,000,000 |
| Single file size | 100KB | 1MB |
| Decisions | 1,000 | 10,000 |

---

## Security Considerations

### Local-First Design

- **No external API calls** for core functionality
- All embeddings generated locally
- Data stored in user's home directory
- No telemetry or analytics

### Data Storage

- SQLite database in `~/.memorylayer/`
- WAL mode for crash safety
- No encryption (user's responsibility)
- Respects .gitignore patterns

### Potential Risks

| Risk | Mitigation |
|------|------------|
| Sensitive code in embeddings | Embeddings are not reversible |
| Decisions contain secrets | User responsibility, education |
| MCP protocol security | Trust Claude Desktop's implementation |

---

## Future Architecture (v2+)

### Planned Improvements

1. **AST-aware indexing** (tree-sitter)
   - Extract functions, classes, types
   - Build dependency graph
   - Smarter chunking

2. **sqlite-vec integration**
   - Hardware-accelerated vector search
   - Scale to 100K+ files

3. **LLM-in-the-loop retrieval**
   - Use small LLM to decide what to retrieve
   - More targeted context

4. **Compressed representations**
   - AI-generated file summaries
   - 10x more context in same tokens

5. **Predictive pre-fetching**
   - Predict what context will be needed
   - Pre-load into Tier 1

---

## Testing Strategy

### Unit Tests

Location: `tests/unit/`

| File | Coverage |
|------|----------|
| `tokens.test.ts` | TokenBudget, estimateTokens |
| `files.test.ts` | detectLanguage, isCodeFile, hash, preview |

### Integration Tests (Planned)

| Test | Description |
|------|-------------|
| Indexing pipeline | Index test project, verify embeddings |
| Context assembly | Query, verify relevant results |
| MCP protocol | Full round-trip with mock client |

### Manual Testing

```bash
# Build
npm run build

# Run with test project
node dist/index.js --project /path/to/test/project

# Add to Claude Desktop config and test
```

---

## Deployment

### npm Package

```json
{
  "name": "memorylayer",
  "bin": {
    "memorylayer": "dist/index.js"
  }
}
```

### Installation

```bash
npm install -g memorylayer
```

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "memorylayer": {
      "command": "memorylayer",
      "args": ["--project", "/path/to/project"]
    }
  }
}
```

---

*Architecture document maintained by the MemoryLayer team.*
