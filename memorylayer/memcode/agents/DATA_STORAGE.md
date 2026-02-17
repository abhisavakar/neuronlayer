# Agent Orchestration Data Storage Architecture

## 📊 Overview

The Agent Orchestration Layer uses a **multi-tier storage strategy**:

1. **SQLite Database** - Primary persistence (structured data)
2. **JSON State Files** - Human-readable pipeline snapshots
3. **Markdown Documents** - Living documentation (13 doc types)
4. **File System** - Temporary files (spikes, build artifacts)

---

## 🗄️ Database Schema (SQLite)

### **Core MemoryLayer Tables** (Already Exist)

| Table | Purpose | Agent Usage |
|-------|---------|-------------|
| `files` | File metadata & content hash | All agents |
| `embeddings` | 384-dim semantic vectors | Why, Research |
| `dependencies` | File relationships | Research, Architect |
| `decisions` | Architectural decisions | Why, Moderator |
| `sessions` | Session history | All agents |
| `symbols` | Code symbols (functions, classes) | Research |
| `patterns` | Reusable code patterns | Research, Moderator |
| `test_index` | Test coverage mapping | Tester |

---

### **Agent Orchestration Tables** (NEW)

Located in `src/agents/database-schema.ts`:

#### 1. **pipeline_states** - Pipeline Lifecycle
```sql
CREATE TABLE pipeline_states (
  id TEXT PRIMARY KEY,              -- feat-{timestamp}-{random}
  feature_request TEXT NOT NULL,    -- "Add user authentication"
  status TEXT NOT NULL,             -- impulse|research|building|complete
  project_path TEXT NOT NULL,       -- "/project/path"
  state_json TEXT NOT NULL,         -- Full PipelineState JSON
  created_at INTEGER,               -- unix epoch
  updated_at INTEGER
);
```
**Used by:** PipelineStateManager, Moderator Agent
**Stores:** Complete state of every feature pipeline

#### 2. **failures** - Never Repeat Mistakes
```sql
CREATE TABLE failures (
  id TEXT PRIMARY KEY,
  feature TEXT NOT NULL,            -- "WebSocket notifications"
  approach TEXT NOT NULL,           -- "Native WebSockets"
  why_failed TEXT NOT NULL,         -- "Scaling issues"
  lesson TEXT NOT NULL,             -- "Use Redis pub/sub"
  feature_embedding BLOB,           -- For semantic search
  logged_at INTEGER
);
```
**Used by:** Why Agent, Research Agent
**Stores:** What was tried, what failed, why, and lessons learned

**Example Query:**
```typescript
// Find similar past failures
const failures = await db.all(`
  SELECT * FROM failures 
  WHERE feature_embedding MATCH ?
  ORDER BY logged_at DESC
  LIMIT 5
`, [embedding]);
```

#### 3. **estimates** - Improve Estimation Accuracy
```sql
CREATE TABLE estimates (
  id TEXT PRIMARY KEY,
  feature TEXT NOT NULL,
  estimated_sessions INTEGER,       -- How many sessions predicted
  actual_sessions INTEGER,          -- How many actually took
  complexity_score REAL,            -- 1-10 complexity rating
  files_created INTEGER,
  files_modified INTEGER,
  notes TEXT,
  completed_at INTEGER
);
```
**Used by:** Estimator Agent, Retrospective Agent
**Stores:** Estimated vs actual effort for learning

**Example Data:**
```json
{
  "feature": "Add OAuth authentication",
  "estimated_sessions": 3,
  "actual_sessions": 5,
  "complexity_score": 7.5,
  "correction_factor": 1.67  -- Learn: multiply future estimates by 1.67
}
```

#### 4. **retrospectives** - Learn From Every Feature
```sql
CREATE TABLE retrospectives (
  id TEXT PRIMARY KEY,
  feature TEXT NOT NULL,
  surprises TEXT,                   -- "OAuth was more complex than expected"
  would_change TEXT,                -- "Use simpler auth first"
  new_patterns TEXT,                -- JSON array of patterns discovered
  spike_accuracy REAL,              -- How accurate was the spike (0-100%)
  logged_at INTEGER
);
```
**Used by:** Retrospective Agent, Research Agent
**Stores:** Post-feature learnings and pattern discoveries

#### 5. **spikes** - Feasibility Experiments
```sql
CREATE TABLE spikes (
  id TEXT PRIMARY KEY,
  feature TEXT NOT NULL,
  question TEXT NOT NULL,           -- "Can we stream LLM via WebSocket?"
  approach TEXT NOT NULL,           -- "Bidirectional WebSocket"
  result TEXT NOT NULL,             -- "Viable with Redis"
  viable BOOLEAN,                   -- true|false
  lessons TEXT,
  time_spent INTEGER,               -- In minutes
  logged_at INTEGER
);
```
**Used by:** Spike Agent, Research Agent
**Stores:** Throwaway prototype results

#### 6. **docs_cache** - Prevent Outdated API Usage
```sql
CREATE TABLE docs_cache (
  id TEXT PRIMARY KEY,
  library TEXT NOT NULL,            -- "fastapi"
  version TEXT NOT NULL,            -- "0.115.0"
  content TEXT NOT NULL,            -- Full API docs
  source_url TEXT,                  -- "https://fastapi.tiangolo.com/"
  fetched_at INTEGER,
  expires_at INTEGER                -- Auto-expire after 7 days
);
```
**Used by:** Documentation Agent
**Stores:** Cached library documentation with auto-expiry

**Example:**
```typescript
// Before Builder writes code
const docs = await db.get(`
  SELECT * FROM docs_cache 
  WHERE library = ? AND version = ?
  AND expires_at > unixepoch()
`, ['fastapi', '0.115.0']);

if (!docs) {
  // Fetch from web
  await fetchAndCacheDocs('fastapi', '0.115.0');
}
```

#### 7. **complexity_snapshots** - Detect Code Smell Early
```sql
CREATE TABLE complexity_snapshots (
  id INTEGER PRIMARY KEY,
  file_path TEXT NOT NULL,
  lines INTEGER,
  functions INTEGER,
  dependencies INTEGER,
  complexity_score REAL,            -- Calculated metric
  snapshot_at INTEGER
);
```
**Used by:** Smell Agent, Moderator Agent
**Stores:** File complexity over time to detect growing complexity

**Use Case:**
```typescript
// Detect complexity trend
const snapshots = await db.all(`
  SELECT * FROM complexity_snapshots 
  WHERE file_path = ?
  ORDER BY snapshot_at DESC
  LIMIT 5
`, [filePath]);

const trend = calculateComplexityTrend(snapshots);
if (trend > 1.5) {
  warn("Complexity growing too fast");
}
```

#### 8. **agent_logs** - Execution Audit Trail
```sql
CREATE TABLE agent_logs (
  id INTEGER PRIMARY KEY,
  pipeline_id TEXT,
  agent_name TEXT NOT NULL,         -- "why|research|builder"
  phase TEXT NOT NULL,              -- "impulse|research|building"
  action TEXT NOT NULL,             -- "analyze|build|test"
  input_summary TEXT,               -- Brief input description
  output_summary TEXT,              -- Brief output summary
  duration_ms INTEGER,              -- How long it took
  success BOOLEAN,
  error_message TEXT,
  timestamp INTEGER
);
```
**Used by:** All agents, debugging, performance monitoring
**Stores:** Complete audit trail of every agent action

**Example Query:**
```sql
-- Find slow agents
SELECT agent_name, AVG(duration_ms) as avg_time
FROM agent_logs
GROUP BY agent_name
ORDER BY avg_time DESC;
```

#### 9. **pattern_usage** - Track Pattern Adoption
```sql
CREATE TABLE pattern_usage (
  id INTEGER PRIMARY KEY,
  pattern_id TEXT NOT NULL,
  pipeline_id TEXT,
  file_path TEXT,
  compliance_score REAL,            -- 0-100% how well it follows pattern
  used_at INTEGER
);
```
**Used by:** Pattern Validator, Retrospective Agent
**Stores:** Which patterns are actually used and how well

---

## 📁 File Storage Strategy

### **1. Pipeline State Snapshots** (JSON)
```
.memorylayer/
├── pipelines/
│   ├── feat-1707412345678-ab12cd/
│   │   ├── state.json              # Full PipelineState
│   │   ├── why-output.json         # Why Agent result
│   │   ├── research-output.json    # Research Agent result
│   │   └── ...
│   └── feat-1707412400000-ef34gh/
│       └── ...
```

**Purpose:** Human-readable, version-controlled snapshots
**Updated:** After every agent completes

### **2. Living Documentation** (Markdown)
```
docs/
├── CODEBASE_MAP.md                 # Updated after every build step
├── ARCHITECTURE.md                 # Updated after Architect Agent
├── DECISIONS.md                    # Updated after new decisions
├── PATTERNS.md                     # Updated after Retrospective
├── SECURITY.md                     # Updated after Security Agent
├── FAILURES.md                     # Updated after Retrospective
├── ESTIMATES.md                    # Updated after Retrospective
├── CHANGELOG.md                    # Updated after Review Agent
├── INFRASTRUCTURE.md               # Updated after Deployment
├── DEPLOYMENT.md                   # Updated after Deployment
├── ROUTING.md                      # Updated after Deployment
├── CI_CD.md                        # Updated after Deployment
└── RUNBOOK.md                      # Updated after Deployment
```

**Purpose:** Persistent knowledge base
**Updated:** By Moderator Agent automatically

### **3. Spike Code** (Temporary)
```
.spikes/
├── feat-auth-oauth/
│   ├── spike-question.md           # "Can we use OAuth?"
│   ├── code/                       # Throwaway prototype
│   └── results.md                  # Viable|Not Viable
└── feat-realtime-chat/
    └── ...
```

**Purpose:** Feasibility experiments
**Lifecycle:** Created during Spike phase, archived after Retrospective

### **4. Cached Documentation** (SQLite + Files)
```
.docs-cache/
├── fastapi-0.115.0.md
├── sqlalchemy-2.0.0.md
├── next.js-16.0.0.md
└── ...
```

**Purpose:** Fast lookup of library docs
**Expiry:** 7 days, then re-fetched

---

## 🔄 Data Flow

### **Phase 0: Why Agent**
```
Input: Feature request
↓
Query: failures, decisions, files (embeddings)
↓
Output: verdict, reasoning, questions
↓
Store: pipeline_states, agent_logs
```

### **Phase 1: Research Agent**
```
Input: Feature request + Why output
↓
Query: files, patterns, failures, retrospectives
↓
Output: prior_art, approaches, unknowns
↓
Store: pipeline_states, agent_logs
```

### **Phase 4: Builder Agent (Each Step)**
```
Input: Build step specification
↓
Query: docs_cache (if library used)
↓
Output: code, explanation
↓
Store: files (actual code), complexity_snapshots, agent_logs
↓
Moderator: Update CODEBASE_MAP.md
```

### **Phase 6: Retrospective Agent**
```
Input: Complete pipeline state
↓
Query: estimates (for accuracy)
↓
Output: learnings, new patterns
↓
Store: retrospectives, patterns, estimates, failures
↓
Moderator: Update PATTERNS.md, FAILURES.md, ESTIMATES.md
```

---

## 📊 Data Retention

| Data Type | Storage | Retention | Cleanup |
|-----------|---------|-----------|---------|
| Pipeline states | SQLite + JSON | 1 year | Archive to S3 after 90 days |
| Failures | SQLite | Forever | Never (learning data) |
| Estimates | SQLite | Forever | Never (improves predictions) |
| Retrospectives | SQLite | Forever | Never (pattern source) |
| Agent logs | SQLite | 90 days | Auto-delete after 90 days |
| Docs cache | SQLite + Files | 7 days | Auto-expire and re-fetch |
| Spike code | Files | Until retrospective | Delete after retrospective |
| Living docs | Markdown | Forever | Version controlled |

---

## 🔍 Example Queries

### **Find Similar Past Failures**
```sql
SELECT f.*, 
       cosine_similarity(f.feature_embedding, ?) as similarity
FROM failures f
WHERE similarity > 0.7
ORDER BY similarity DESC, logged_at DESC
LIMIT 5;
```

### **Get Estimation Correction Factor**
```sql
SELECT 
  AVG(CAST(actual_sessions AS FLOAT) / estimated_sessions) as correction_factor
FROM estimates
WHERE actual_sessions IS NOT NULL
AND completed_at > unixepoch() - 7776000;  -- Last 90 days
```

### **Detect Scope Creep**
```sql
SELECT 
  p.id,
  p.feature_request,
  json_array_length(p.state_json, '$.completed_steps') as actual_steps,
  json_extract(p.state_json, '$.decomposition.total_steps') as planned_steps
FROM pipeline_states p
WHERE actual_steps > planned_steps * 1.5;
```

### **Find Stale Documentation**
```sql
SELECT library, version, fetched_at
FROM docs_cache
WHERE expires_at < unixepoch()
ORDER BY fetched_at ASC;
```

---

## 💾 Storage Locations

| Component | Path | Size Estimate |
|-----------|------|---------------|
| SQLite DB | `.memorylayer/memorylayer.db` | 10-100 MB |
| Embeddings | In SQLite (BLOB) | 50-500 MB |
| Pipeline JSON | `.memorylayer/pipelines/` | 1-10 MB |
| Living Docs | `docs/` | 100 KB - 1 MB |
| Docs Cache | `.docs-cache/` | 10-50 MB |
| Spike Code | `.spikes/` | 1-5 MB |

**Total:** ~100 MB - 1 GB per project

---

## 🚀 Next Steps

1. **Initialize Schema**:
```typescript
import { AgentOrchestrationSchema } from './agents/database-schema.js';
db.exec(AgentOrchestrationSchema);
```

2. **Add to Database Initialization**:
```typescript
// In src/storage/database.ts
import { AgentOrchestrationSchema } from '../agents/database-schema.js';

// Add to initializeDatabase function
db.exec(AgentOrchestrationSchema);
```

3. **Test Data Flow**:
```typescript
// Run through complete pipeline
const state = await pipelineManager.createPipeline("Test feature");
await whyAgent.analyze({ feature_request: "Test" });
// Verify data in database
```

---

## 📚 Summary

**9 New Tables** for agent orchestration:
- `pipeline_states` - Pipeline lifecycle
- `failures` - Never repeat mistakes
- `estimates` - Improve predictions
- `retrospectives` - Learn from every feature
- `spikes` - Feasibility experiments
- `docs_cache` - Prevent outdated APIs
- `complexity_snapshots` - Detect code smell
- `agent_logs` - Execution audit trail
- `pattern_usage` - Track pattern adoption

**Multi-tier storage**:
- SQLite: Structured data, fast queries
- JSON: Human-readable snapshots
- Markdown: Living documentation
- Files: Temporary artifacts

**Persistent learning** = Agents get smarter over time! 🧠
