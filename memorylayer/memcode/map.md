# memcode Implementation Map

> Status verification of MemoryLayer implementation based on PLAN.md files

---

## Quick Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **PRDv1 Core Features** | ✅ Complete | All 6 phases implemented |
| **memcode Agent Phase 1** | ✅ Complete | MVP foundation working |
| **memcode Agent Phase 2** | ✅ Complete | File/shell/git tools implemented |
| **memcode Agent Phase 3** | ✅ Complete | Rich CLI + Diff Viewer + Config |
| **AI Integration (prdv1)** | ❌ Not Started | 90% local processing works, AI enhancements planned |

---

## PRDv1 Features (src/core/)

All 6 phases from `prdv1/PLAN.md` are **fully implemented**:

### Phase 1: Living Documentation ✅

**Files:** `src/core/living-docs/`
| File | Purpose | Status |
|------|---------|--------|
| `index.ts` | Barrel export | ✅ |
| `doc-engine.ts` | Main LivingDocumentationEngine | ✅ |
| `architecture-generator.ts` | Architecture doc generation | ✅ |
| `component-generator.ts` | Component doc from AST | ✅ |
| `changelog-generator.ts` | Git-based changelogs | ✅ |
| `doc-validator.ts` | Outdated/undocumented detection | ✅ |
| `activity-tracker.ts` | "What happened" queries | ✅ |

**MCP Tools:** `generate_docs`, `get_architecture`, `get_component_doc`, `get_changelog`, `validate_docs`, `what_happened`, `find_undocumented`

### Phase 2: Context Rot Prevention ✅

**Files:** `src/core/context-rot/`
| File | Purpose | Status |
|------|---------|--------|
| `index.ts` | Barrel export | ✅ |
| `context-rot-prevention.ts` | Main orchestrator | ✅ |
| `context-health.ts` | Health monitoring | ✅ |
| `drift-detector.ts` | Detect conversation drift | ✅ |
| `compaction.ts` | Context compaction strategies | ✅ |
| `critical-context.ts` | Critical content preservation | ✅ |

**MCP Tools:** `get_context_health`, `trigger_compaction`, `mark_critical`, `get_critical_context`

### Phase 3: Confidence Scoring ✅

**Files:** `src/core/confidence/`
| File | Purpose | Status |
|------|---------|--------|
| `index.ts` | Barrel export | ✅ |
| `confidence-scorer.ts` | Main ConfidenceScorer class | ✅ |
| `source-tracker.ts` | Source tracking | ✅ |
| `warning-detector.ts` | Security/complexity warnings | ✅ |
| `conflict-checker.ts` | Decision conflict detection | ✅ |

**MCP Tools:** `get_confidence`, `list_sources`, `check_conflicts`

### Phase 4: Change Intelligence ✅

**Files:** `src/core/change-intelligence/`
| File | Purpose | Status |
|------|---------|--------|
| `index.ts` | Barrel export | ✅ |
| `change-intelligence.ts` | Main orchestrator | ✅ |
| `change-tracker.ts` | Git change tracking | ✅ |
| `bug-correlator.ts` | Bug correlation with changes | ✅ |
| `fix-suggester.ts` | Fix suggestions from history | ✅ |

**MCP Tools:** `what_changed`, `why_broke`, `find_similar_bugs`, `suggest_fix`

### Phase 5: Architecture Enforcement ✅

**Files:** `src/core/architecture/`
| File | Purpose | Status |
|------|---------|--------|
| `index.ts` | Barrel export | ✅ |
| `architecture-enforcement.ts` | Main orchestrator | ✅ |
| `pattern-library.ts` | SQLite pattern storage | ✅ |
| `pattern-learner.ts` | Pattern extraction | ✅ |
| `pattern-validator.ts` | Code validation | ✅ |
| `duplicate-detector.ts` | Function duplication detection | ✅ |

**MCP Tools:** `validate_pattern`, `suggest_existing`, `learn_pattern`, `list_patterns`, `get_pattern`, `add_pattern_example`, `get_architecture_stats`

### Phase 6: Test-Aware Suggestions ✅

**Files:** `src/core/test-awareness/`
| File | Purpose | Status |
|------|---------|--------|
| `index.ts` | Barrel export | ✅ |
| `test-awareness.ts` | Main orchestrator | ✅ |
| `test-indexer.ts` | Test discovery and indexing | ✅ |
| `test-parser.ts` | Framework-specific parsing | ✅ |
| `change-validator.ts` | Change impact analysis | ✅ |
| `test-suggester.ts` | Test update suggestions | ✅ |

**MCP Tools:** `get_related_tests`, `check_tests`, `suggest_test_update`, `get_test_coverage`

---

## memcode Agent (src/agent/)

Based on `memcode/PLAN.md`:

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | MVP Foundation | ✅ Complete |
| Phase 2 | File & Shell Operations | ✅ Complete |
| Phase 3 | TUI & Polish | ✅ Complete |

### Phase 1: MVP Foundation ✅

All Phase 1 tasks completed (location differs from plan - implemented in `src/agent/` not `memcode/src/`):

| Planned File | Actual File | Status |
|--------------|-------------|--------|
| `memcode/src/index.ts` | `src/agent/index.ts` | ✅ |
| `memcode/src/core/orchestrator.ts` | `src/agent/core/orchestrator.ts` | ✅ |
| `memcode/src/core/conversation.ts` | `src/agent/core/conversation.ts` | ✅ |
| `memcode/src/llm/providers/anthropic.ts` | `src/agent/llm/providers/anthropic.ts` | ✅ |
| `memcode/src/llm/providers/openrouter.ts` | `src/agent/llm/providers/openrouter.ts` | ✅ |
| `memcode/src/llm/providers/openai.ts` | `src/agent/llm/providers/openai.ts` | ✅ |
| `memcode/src/llm/providers/local.ts` | Uses OpenAI-compatible API | ✅ |
| `memcode/src/tools/index.ts` | `src/agent/tools/index.ts` | ✅ |
| `memcode/src/tools/executor.ts` | `src/agent/tools/executor.ts` | ✅ |
| `memcode/src/ui/cli.ts` | `src/agent/ui/cli.ts` | ✅ |
| `memcode/src/session/manager.ts` | `src/agent/session/manager.ts` | ✅ |
| `memcode/src/config/index.ts` | `src/agent/config/index.ts` | ✅ |
| `memcode/src/cost/tracker.ts` | `src/agent/llm/index.ts` (estimateCost) | ✅ |
| System prompts | `src/agent/prompts/system.ts` | ✅ |

**LLM Providers Implemented:**
- ✅ Anthropic (Claude)
- ✅ OpenRouter (200+ models)
- ✅ OpenAI (GPT-4o, o1)
- ✅ Local (Ollama via OpenAI-compatible API)

**Features Working:**
- ✅ Orchestrator with agent loop
- ✅ Streaming responses
- ✅ Tool calling
- ✅ Session management (save/restore)
- ✅ Cost tracking
- ✅ All 51 MemoryLayer tools exposed
- ✅ Slash commands (/model, /context, /feature, /clear, /save, /sessions, /continue, /cost, /help)

### Phase 2: File & Shell Operations ✅

**IMPLEMENTED** in `src/agent/tools/executor.ts` (consolidated rather than separate files):

**File Operations:**
| Tool | Description | Status |
|------|-------------|--------|
| `read_file` | Read file contents | ✅ |
| `write_file` | Write/create files (auto-creates dirs) | ✅ |
| `edit_file` | Search/replace editing | ✅ |
| `list_files` | List directory contents | ✅ |
| `delete_file` | Delete files | ✅ |

**Shell Operations:**
| Tool | Description | Status |
|------|-------------|--------|
| `run_command` | Execute shell commands | ✅ |
| `run_tests` | Run tests (auto-detect vitest/jest/mocha) | ✅ |

**Git Operations:**
| Tool | Description | Status |
|------|-------------|--------|
| `git_status` | Show staged/unstaged/untracked | ✅ |
| `git_diff` | Show diff (staged or unstaged) | ✅ |
| `git_commit` | Stage and commit changes | ✅ |
| `git_log` | Show commit history | ✅ |

**Configuration Options:**
```typescript
interface ExecutorConfig {
  projectPath: string;
  allowShell?: boolean;     // Enable/disable shell commands
  allowFileWrite?: boolean; // Enable/disable file writes
  timeout?: number;         // Command timeout (default: 30s)
}
```

**Note:** Permission system is config-based (`allowShell`, `allowFileWrite`) rather than a separate file.

### Phase 3: TUI & Polish ✅ COMPLETE

**Rich CLI implemented** in `src/agent/ui/cli.ts` + `src/agent/ui/diff.ts`:

| Feature | Planned | Status |
|---------|---------|--------|
| Markdown rendering | ✓ | ✅ Headers, bold, italic, lists, code blocks |
| Syntax highlighting | ✓ | ✅ Code blocks with background color |
| Status bar | ✓ | ✅ Shows project, model, tool count |
| Spinner | ✓ | ✅ Animated thinking indicator |
| Tool visualization | ✓ | ✅ Tool calls and results formatted |
| Cost tracking display | ✓ | ✅ Token count and cost per response |
| Help commands | ✓ | ✅ /help, /model, /context, /cost, /diff, etc. |
| Input box UI | ✓ | ✅ Nice bordered input area |
| Ink/React TUI | ✓ | ⚡ Uses readline (simpler, works well) |
| Diff viewer | ✓ | ✅ LCS-based diff with colors |
| Context indicator | ✓ | ✅ Via /context command |
| Config file | ✓ | ✅ `~/.memcode/config.json` |

**Diff Viewer Features (`src/agent/ui/diff.ts`):**
- LCS-based diff algorithm for accurate changes
- Color-coded output (+green/-red)
- Context line collapsing
- File operation preview (create/modify/delete)
- Search/replace preview
- Git diff formatting

**Config File (`~/.memcode/config.json`):**
```typescript
interface MemcodeConfig {
  defaultModel: string;
  providers: { anthropic?, openrouter?, openai?, local? };
  agent: { maxTokensPerTurn, maxTurns, autoContext, streamResponses };
  ui: { showCosts, showTokens, colorOutput, showDiffs, diffContextLines, diffMaxLines };
  keybinds: { submit, newline, exit, clear, help };
  permissions: { allowShell, allowFileWrite, confirmFileWrite, confirmShell };
}
```

**What's working:**
```
┌─────────────────────────────────────────────────────────┐
│  memcode — AI coding assistant powered by MemoryLayer  │
└─────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ ⬡ ProjectName  │  ◈ model-name  │  ⚡ 58 tools
└──────────────────────────────────────────────────────────────┘

┌─ MODIFY src/example.ts
│ +5 -2
├──────────────────────────────────────────────────────────────
│   1   function hello() {
│   2 - console.log("old");
│   2 + console.log("new");
└──────────────────────────────────────────────────────────────
```

---

## AI Integration (prdv1/AI-INTEGRATION.md)

**Status:** ❌ NOT IMPLEMENTED (Planned Only)

The `AI-INTEGRATION.md` documents planned AI enhancements for the PRDv1 features:

| Feature | Current (No-AI) | Planned (With AI) | Status |
|---------|-----------------|-------------------|--------|
| Living Documentation | AST structure, file lists | Human-readable explanations | ❌ |
| Context Rot Prevention | Token counting, truncation | Intelligent summarization | ❌ |
| Change Intelligence | Git correlation | Root cause analysis | ❌ |
| Test Awareness | Test indexing | Test code generation | ❌ |
| Confidence Scoring | Pattern matching | AI reasoning explanations | ❌ |

**Planned Files (not created):**
```
src/core/ai/
├── index.ts
├── ai-provider.ts
├── providers/
│   ├── claude-provider.ts
│   ├── openai-provider.ts
│   ├── ollama-provider.ts
│   └── noop-provider.ts
├── documentation-ai.ts
├── summarization-ai.ts
├── diagnosis-ai.ts
├── test-generation-ai.ts
└── budget-tracker.ts
```

---

## Tools Summary

**Total Tools:** 58 tools (47 MCP + 11 builtin)

### MCP Tools (47) - `src/server/tools.ts`

| Category | Count | Tools |
|----------|-------|-------|
| Core Context | 11 | get_context, search_codebase, record_decision, get_file_context, get_project_summary, get_symbol, get_dependencies, get_file_summary, get_predicted_files, get_learning_stats, mark_context_useful |
| Multi-Project | 6 | list_projects, switch_project, search_all_projects, record_decision_with_author, update_decision_status, export_decisions_to_adr, discover_projects |
| Feature Context | 4 | get_active_context, set_feature_context, list_recent_contexts, switch_feature_context |
| Living Docs | 7 | generate_docs, get_architecture, get_component_doc, get_changelog, validate_docs, what_happened, find_undocumented |
| Context Rot | 4 | get_context_health, trigger_compaction, mark_critical, get_critical_context |
| Confidence | 3 | get_confidence, list_sources, check_conflicts |
| Change Intel | 4 | what_changed, why_broke, find_similar_bugs, suggest_fix |
| Architecture | 7 | validate_pattern, suggest_existing, learn_pattern, list_patterns, get_pattern, add_pattern_example, get_architecture_stats |
| Test Awareness | 4 | get_related_tests, check_tests, suggest_test_update, get_test_coverage |

### Builtin Agent Tools (11) - `src/agent/tools/executor.ts`

| Category | Count | Tools |
|----------|-------|-------|
| File Ops | 5 | read_file, write_file, edit_file, list_files, delete_file |
| Shell | 2 | run_command, run_tests |
| Git | 4 | git_status, git_diff, git_commit, git_log |

---

## File Structure Verification

### Core Implementation (src/core/)
```
src/core/
├── engine.ts                 # ✅ Main MemoryLayerEngine
├── context.ts                # ✅ Context assembly
├── decisions.ts              # ✅ Decision tracking
├── decision-extractor.ts     # ✅ Auto-extract decisions
├── adr-exporter.ts           # ✅ ADR export
├── feature-context.ts        # ✅ Feature context tracking
├── project-manager.ts        # ✅ Multi-project support
├── learning.ts               # ✅ Usage learning
├── summarizer.ts             # ✅ File summarization
├── living-docs/              # ✅ Living Documentation
├── context-rot/              # ✅ Context Rot Prevention
├── confidence/               # ✅ Confidence Scoring
├── change-intelligence/      # ✅ Change Intelligence
├── architecture/             # ✅ Architecture Enforcement
└── test-awareness/           # ✅ Test Awareness
```

### Agent Implementation (src/agent/)
```
src/agent/
├── index.ts                  # ✅ Entry point
├── core/
│   ├── orchestrator.ts       # ✅ Main agent loop
│   └── conversation.ts       # ✅ Message management
├── llm/
│   ├── index.ts              # ✅ Provider factory
│   ├── types.ts              # ✅ Interfaces
│   └── providers/
│       ├── anthropic.ts      # ✅ Claude API
│       ├── openrouter.ts     # ✅ OpenRouter
│       └── openai.ts         # ✅ OpenAI/Local
├── tools/
│   ├── index.ts              # ✅ Tool registry
│   └── executor.ts           # ✅ Tool execution + diff generation
├── session/
│   └── manager.ts            # ✅ Session management
├── ui/
│   ├── cli.ts                # ✅ CLI interface
│   └── diff.ts               # ✅ Diff viewer (LCS-based)
├── config/
│   └── index.ts              # ✅ Configuration (~/.memcode/config.json)
└── prompts/
    └── system.ts             # ✅ System prompts
```

### Implementation Notes
```
src/agent/
├── tools/
│   └── executor.ts           # ✅ Contains ALL builtin tools (file, shell, git)
│                             #    + diff generation for file ops
├── config/
│   └── index.ts              # ✅ Persistent config at ~/.memcode/config.json
│                             #    + expanded schema (ui, keybinds, permissions)
└── ui/
    ├── cli.ts                # ✅ Rich CLI with markdown, spinner, status bar
    └── diff.ts               # ✅ LCS-based diff viewer with colors
```

---

## Verification Commands

```bash
# Build passes
npm run build

# MCP server works
npx memorylayer --project .

# memcode agent starts with all tools (47 MCP + 11 builtin)
node dist/agent/index.js --project .
```

---

## Next Steps

### memcode Agent - ✅ COMPLETE
All 3 phases implemented:
- Phase 1: MVP Foundation ✅
- Phase 2: File & Shell Operations ✅
- Phase 3: TUI & Polish ✅

### Optional Future Enhancements

**UI Enhancements:**
- Ink/React TUI for more advanced interaction (if needed)
- Interactive confirmation prompts for destructive operations
- Context indicator in input prompt

**AI Integration (prdv1):**
1. Create `src/core/ai/` directory structure
2. Implement AI provider interface (Claude, OpenAI, Ollama, NoOp)
3. Add optional AI enhancements:
   - Documentation explanations
   - Intelligent summarization
   - Root cause analysis
   - Test code generation
4. Add budget tracking

---

*Last verified: February 2026*
