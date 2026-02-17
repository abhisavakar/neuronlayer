# memcode - Development Plan

## Executive Summary

Build **memcode** - an intelligent coding agent that uses **MemoryLayer as its core intelligence**, not just an addon. This agent will surpass OpenCode and Claude Code by providing persistent memory, semantic code understanding, and 51 specialized tools.

**Name:** `memcode` (Memory + Code)
**Package:** Part of MemoryLayer (same npm package)
**Command:** `memcode` or `npx memorylayer agent`
**LLM Support:** All providers from day 1 (OpenRouter, Anthropic, OpenAI, Local)

---

## Why This Is Huge

| Competitor | Limitation | memcode Advantage |
|------------|------------|-------------------|
| **OpenCode** | MCP is optional addon | MemoryLayer IS the core |
| **Claude Code** | Session memory only | Cross-session persistence |
| **Cursor** | Paid, no memory | Free models + learning |
| **All** | No pattern learning | Architecture enforcement |

**Unique Capabilities:**
- Persistent decisions, patterns, and context across sessions
- Semantic search with 384-dim embeddings
- Bug correlation with `why_broke`, `find_similar_bugs`
- Test failure prediction
- Architecture pattern validation

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       memcode                                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │   CLI   │◄──►│  Orchestrator │◄──►│  LLM Provider   │    │
│  │   /TUI  │    │              │    │  (Multi-model)  │    │
│  └─────────┘    └──────────────┘    └─────────────────┘    │
│        │               │                     │              │
│        ▼               ▼                     ▼              │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │ Session │    │Tool Executor │    │  Cost Tracker   │    │
│  │ Manager │    │              │    │                 │    │
│  └─────────┘    └──────────────┘    └─────────────────┘    │
│                        │                                    │
│        ┌───────────────┼───────────────┐                   │
│        ▼               ▼               ▼                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────────┐          │
│  │MemoryLayer│  │ File Ops  │  │ Shell/Git     │          │
│  │ (51 tools)│  │ R/W/Edit  │  │ Commands      │          │
│  └───────────┘  └───────────┘  └───────────────┘          │
│        │                                                    │
│        ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MemoryLayer Storage (SQLite + 3-Tier + Embeddings) │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
memcode/
├── PLAN.md                  # This file
├── README.md                # Documentation
└── src/
    ├── index.ts             # Entry point
    ├── core/
    │   ├── orchestrator.ts  # Main agent loop
    │   ├── context-builder.ts # Build LLM context
    │   ├── response-parser.ts # Parse tool calls
    │   └── conversation.ts  # Message management
    ├── llm/
    │   ├── index.ts         # Provider factory
    │   ├── types.ts         # Interfaces
    │   └── providers/
    │       ├── anthropic.ts # Claude API
    │       ├── openrouter.ts # 200+ models
    │       ├── openai.ts    # GPT-4o, o1
    │       └── local.ts     # Ollama
    ├── tools/
    │   ├── index.ts         # Tool registry
    │   ├── executor.ts      # Execute tools
    │   └── builtin/
    │       ├── file-ops.ts  # read/write/edit
    │       ├── shell.ts     # run commands
    │       └── git.ts       # git operations
    ├── session/
    │   ├── manager.ts       # Session CRUD
    │   └── storage.ts       # Persistence
    ├── ui/
    │   ├── cli.ts           # Basic CLI
    │   └── tui.ts           # Rich TUI (ink)
    └── config/
        └── index.ts         # Config management
```

---

## Implementation Phases

### Phase 1: MVP Foundation (Week 1)
**Goal:** Basic CLI agent with MemoryLayer + ALL LLM providers

**Tasks:**
1. Create `memcode/` directory structure
2. Implement `Orchestrator` - single turn chat loop
3. Implement ALL LLM providers:
   - `AnthropicProvider` (Claude 3.5 Sonnet)
   - `OpenRouterProvider` (200+ models, free Kimi K2.5)
   - `OpenAIProvider` (GPT-4o)
   - `LocalProvider` (Ollama)
4. Create `ToolRegistry` wrapping MemoryLayerEngine
5. Basic CLI with readline
6. Simple session save/restore
7. Cost tracking

**Files to Create:**
- `memcode/src/index.ts`
- `memcode/src/core/orchestrator.ts`
- `memcode/src/llm/providers/anthropic.ts`
- `memcode/src/llm/providers/openrouter.ts`
- `memcode/src/llm/providers/openai.ts`
- `memcode/src/llm/providers/local.ts`
- `memcode/src/tools/index.ts`
- `memcode/src/ui/cli.ts`
- `memcode/src/session/manager.ts`
- `memcode/src/cost/tracker.ts`

**Reuse from MemoryLayer:**
- `src/core/engine.ts` → MemoryLayerEngine (direct import)
- `src/server/tools.ts` → Tool definitions
- `src/types/index.ts` → All interfaces

**Verification:**
```bash
npm run build
memcode --project .
> what does this codebase do?
# Should use get_context and return MemoryLayer-enriched answer

memcode --model openrouter/kimi-k2.5-free
# Should work with free model
```

---

### Phase 2: File & Shell Operations (Week 2)
**Goal:** Add file/shell tools for real coding tasks

**Tasks:**
1. Add file tools: `read_file`, `write_file`, `edit_file`
2. Add shell tools: `run_command`, `run_tests`
3. Add git tools: `git_status`, `git_diff`, `git_commit`
4. Permission system (confirm before write/execute)
5. Model switching command (`/model`)
6. Cost dashboard (`/cost`)

**Files to Create:**
- `memcode/src/tools/builtin/file-ops.ts`
- `memcode/src/tools/builtin/shell.ts`
- `memcode/src/tools/builtin/git.ts`
- `memcode/src/core/permissions.ts`

**Verification:**
```bash
memcode
> /model gpt-4o
> create a new file hello.ts with console.log
# Should ask for permission, then create file
> run npm test
# Should execute and show results
```

---

### Phase 3: TUI & Polish (Week 3)
**Goal:** Beautiful TUI + production ready

**Tasks:**
1. Implement TUI with `ink` (React for terminal)
2. Markdown rendering with syntax highlighting
3. Diff viewer for file changes
4. Status bar (model, project, cost)
5. Context indicator (active files, feature)
6. Session resume with history
7. Configuration file (`~/.memcode/config.json`)
8. Slash commands (/help, /context, /feature, /cost)
9. Error handling and recovery
10. Documentation and README

**Files to Create:**
- `memcode/src/ui/tui.tsx`
- `memcode/src/ui/components/`
- `memcode/src/config/schema.ts`
- `memcode/README.md`

**Verification:**
```bash
memcode                    # Starts TUI
memcode --continue         # Resume last session
memcode --model gpt-4o     # Start with specific model
/help                      # Shows all commands
/cost                      # Shows token usage
```

---

## Critical Files to Reference

| File | Purpose |
|------|---------|
| `src/core/engine.ts` | MemoryLayerEngine - instantiate this |
| `src/server/tools.ts` | Tool definitions + handleToolCall |
| `src/types/index.ts` | All TypeScript interfaces |
| `src/core/feature-context.ts` | Session tracking pattern |
| `src/indexing/embeddings.ts` | Embedding generation |

---

## Tool Integration

**MemoryLayer Tools (51):** Direct calls to MemoryLayerEngine
```typescript
import { MemoryLayerEngine } from '../src/core/engine.js';

const engine = new MemoryLayerEngine(config);
const result = await engine.getContext(query, currentFile, maxTokens);
```

**File Tools (new):**
```typescript
{ name: 'read_file', execute: (path) => readFileSync(path) }
{ name: 'write_file', execute: (path, content) => writeFileSync(path, content) }
{ name: 'edit_file', execute: (path, search, replace) => editFile(...) }
```

**Shell Tools (new):**
```typescript
{ name: 'run_command', execute: (cmd) => execSync(cmd) }
{ name: 'run_tests', execute: (pattern) => execSync('npm test ' + pattern) }
```

---

## LLM Provider Configuration

### Provider Interface
```typescript
interface LLMProvider {
  name: string;
  stream(messages, tools): AsyncGenerator<StreamChunk>;
  countTokens(messages): number;
  getCost(): { input: number, output: number };
}
```

### Supported Models

| Provider | Models | Cost |
|----------|--------|------|
| **OpenRouter** | kimi-k2.5-free, claude, gpt-4o, llama | Free to $$ |
| **Anthropic** | claude-3.5-sonnet, claude-4-opus | $$ |
| **OpenAI** | gpt-4o, gpt-4o-mini, o1 | $$ |
| **Local** | codellama, deepseek-coder, qwen | Free |

---

## Config File (`~/.memcode/config.json`)

```json
{
  "defaultModel": "openrouter/kimi-k2.5-free",
  "providers": {
    "anthropic": { "apiKey": "sk-ant-..." },
    "openrouter": { "apiKey": "sk-or-..." },
    "openai": { "apiKey": "sk-..." },
    "local": { "endpoint": "http://localhost:11434" }
  },
  "agent": {
    "maxTokensPerTurn": 8000,
    "autoContext": true,
    "streamResponses": true,
    "confirmWrites": true,
    "confirmShell": true
  }
}
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Setup time | < 1 minute |
| First response | < 3 seconds |
| Context relevance | 95%+ (via MemoryLayer) |
| Session persistence | 100% |
| Model switching | Instant |
| Free model support | Yes (Kimi, Ollama) |

---

## Package.json Updates

```json
{
  "bin": {
    "memorylayer": "dist/index.js",
    "memcode": "dist/memcode/index.js"
  },
  "scripts": {
    "build:memcode": "esbuild memcode/src/index.ts --bundle --outdir=dist/memcode",
    "memcode": "node dist/memcode/index.js"
  }
}
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| API rate limits | Multiple providers, local fallback |
| Token costs | Cost tracking, warnings, free models |
| Large codebases | MemoryLayer handles (tested 1M+ LOC) |
| Session corruption | Auto-backup before write |

---

## Next Steps After MVP

1. **VS Code Extension** - Bring memcode to IDE
2. **Team Features** - Shared decisions, patterns
3. **Cloud Sync** - Sync memory across machines
4. **Plugin System** - Custom tools and providers
5. **Voice Mode** - Voice input/output
