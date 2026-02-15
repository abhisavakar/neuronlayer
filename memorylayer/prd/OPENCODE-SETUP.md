# MemoryLayer + OpenCode Setup Guide

This guide explains how to configure MemoryLayer as an MCP server for [OpenCode](https://opencode.ai).

---

## Prerequisites

1. **Node.js 18+** installed
2. **OpenCode** installed (`npm install -g opencode`)
3. **MemoryLayer** built (`npm run build`)

---

## Quick Setup

### Step 1: Create `opencode.json` in your project root

**IMPORTANT:** Use **absolute paths** for reliable operation.

**Windows:**
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["node", "C:\\Users\\YOUR_USERNAME\\path\\to\\memorylayer\\dist\\index.js", "--project", "C:\\Users\\YOUR_USERNAME\\path\\to\\your\\project"],
      "enabled": true
    }
  }
}
```

**macOS/Linux:**
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["node", "/home/user/memorylayer/dist/index.js", "--project", "/home/user/myproject"],
      "enabled": true
    }
  }
}
```

### Step 2: Start OpenCode

```bash
opencode
```

### Step 3: Verify Connection

Inside OpenCode, type:
```
/mcp
```

You should see:
```
MCP Servers
  memorylayer (local)
    Status: connected
```

Or from terminal:
```bash
opencode mcp list
```

---

## Working Configuration Examples

### Windows (Tested & Working)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["node", "C:\\Users\\abhis\\Desktop\\memorylayer\\dist\\index.js", "--project", "C:\\Users\\abhis\\Desktop\\myproject"],
      "enabled": true
    }
  }
}
```

### macOS

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["node", "/Users/username/memorylayer/dist/index.js", "--project", "/Users/username/myproject"],
      "enabled": true
    }
  }
}
```

### Linux

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["node", "/home/user/memorylayer/dist/index.js", "--project", "/home/user/myproject"],
      "enabled": true
    }
  }
}
```

### Current Directory as Project

If you want MemoryLayer to use the current directory:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["node", "C:\\full\\path\\to\\memorylayer\\dist\\index.js", "--project", "."],
      "enabled": true
    }
  }
}
```

**Note:** The `--project .` works, but the path to `dist/index.js` must still be absolute.

---

## Global Setup

For system-wide availability, create the config in your home directory:

**Windows:** `%USERPROFILE%\.config\opencode\opencode.json`
**macOS/Linux:** `~/.config/opencode/opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["node", "/absolute/path/to/memorylayer/dist/index.js", "--project", "."],
      "enabled": true
    }
  }
}
```

---

## After npm Publish

Once MemoryLayer is published to npm, setup becomes simpler:

### Using npx

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["npx", "-y", "memorylayer", "--project", "."],
      "enabled": true
    }
  }
}
```

### Global Install

```bash
npm install -g memorylayer
```

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["memorylayer", "--project", "."],
      "enabled": true
    }
  }
}
```

---

## Configuration Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"local"` \| `"remote"` | Yes | Server type |
| `command` | `string[]` | Yes (local) | Command array (NOT a string) |
| `enabled` | `boolean` | Yes | Must be `true` to connect |
| `environment` | `object` | No | Environment variables |

### Example with Environment Variables

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["node", "C:\\path\\to\\memorylayer\\dist\\index.js", "--project", "."],
      "enabled": true,
      "environment": {
        "MEMORYLAYER_MAX_TOKENS": "8000",
        "MEMORYLAYER_DEBUG": "true"
      }
    }
  }
}
```

---

## Available Tools (51 Total)

Once connected, OpenCode's AI can use all MemoryLayer tools:

### Core Tools (5)
| Tool | Description |
|------|-------------|
| `get_context` | Get relevant codebase context for a query |
| `search_codebase` | Semantic search across all files |
| `record_decision` | Save an architectural decision |
| `get_file_context` | Get content of a specific file |
| `get_project_summary` | Overview of project structure |

### Symbol & Dependency Tools (3)
| Tool | Description |
|------|-------------|
| `get_symbol` | Find functions, classes, types by name |
| `get_dependencies` | See imports/exports for a file |
| `get_file_summary` | Get compressed file summary (10x smaller) |

### Learning Tools (3)
| Tool | Description |
|------|-------------|
| `get_predicted_files` | Files predicted to be relevant |
| `get_learning_stats` | Usage statistics |
| `mark_context_useful` | Feedback for learning |

### Multi-Project Tools (6)
| Tool | Description |
|------|-------------|
| `list_projects` | List all registered projects |
| `switch_project` | Switch active project |
| `search_all_projects` | Search across all projects |
| `discover_projects` | Find projects on system |
| `record_decision_with_author` | Decision with author attribution |
| `update_decision_status` | Update decision lifecycle |
| `export_decisions_to_adr` | Export to ADR markdown files |

### Feature Context Tools (4)
| Tool | Description |
|------|-------------|
| `get_active_context` | Get current work session context |
| `set_feature_context` | Start tracking a feature |
| `list_recent_contexts` | List recent work sessions |
| `switch_feature_context` | Switch to previous session |

### Living Documentation Tools (7)
| Tool | Description |
|------|-------------|
| `generate_docs` | Generate documentation |
| `get_architecture` | Get project architecture overview |
| `get_component_doc` | Get detailed component docs |
| `get_changelog` | Get changelog of recent changes |
| `validate_docs` | Check for outdated docs |
| `what_happened` | Query recent project activity |
| `find_undocumented` | Find code lacking docs |

### Context Rot Prevention Tools (4)
| Tool | Description |
|------|-------------|
| `get_context_health` | Check context health |
| `trigger_compaction` | Manually compact context |
| `mark_critical` | Mark content as critical |
| `get_critical_context` | Get critical items |

### Confidence Scoring Tools (3)
| Tool | Description |
|------|-------------|
| `get_confidence` | Get confidence score for code |
| `list_sources` | List sources for a suggestion |
| `check_conflicts` | Check for decision conflicts |

### Change Intelligence Tools (4)
| Tool | Description |
|------|-------------|
| `what_changed` | Query what changed |
| `why_broke` | Diagnose why something broke |
| `find_similar_bugs` | Find similar bugs from history |
| `suggest_fix` | Get fix suggestions |

### Architecture Enforcement Tools (7)
| Tool | Description |
|------|-------------|
| `validate_pattern` | Validate code against patterns |
| `suggest_existing` | Find existing functions |
| `learn_pattern` | Teach a new pattern |
| `list_patterns` | List all patterns |
| `get_pattern` | Get pattern details |
| `add_pattern_example` | Add example to pattern |
| `get_architecture_stats` | Get architecture statistics |

### Test Awareness Tools (4)
| Tool | Description |
|------|-------------|
| `get_related_tests` | Get tests for a file/function |
| `check_tests` | Check if change breaks tests |
| `suggest_test_update` | Get test update suggestions |
| `get_test_coverage` | Get test coverage |

---

## Troubleshooting

### "MCP server failed" or won't connect

**Most common cause:** Relative paths don't work reliably.

```json
// ❌ WRONG - Relative path
"command": ["node", "dist/index.js", "--project", "."]

// ✅ CORRECT - Absolute path
"command": ["node", "C:\\Users\\you\\memorylayer\\dist\\index.js", "--project", "."]
```

### "Configuration is invalid"

Ensure `command` is an array of strings:

```json
// ❌ WRONG - Single string
"command": "node dist/index.js --project ."

// ✅ CORRECT - Array of strings
"command": ["node", "dist/index.js", "--project", "."]
```

### Server starts but immediately fails

**Check if MemoryLayer runs manually first:**

```bash
node C:\path\to\memorylayer\dist\index.js --project C:\path\to\your\project
```

If you see errors, the issue is with MemoryLayer itself, not OpenCode.

**Common errors:**
- "Cannot find module" - Run `npm run build` first
- "ENOENT" - Path is wrong
- Database errors - Delete `~/.memorylayer/projects/` and retry

### "No tools available" after connecting

1. Verify connection with `/mcp` inside OpenCode
2. Ensure `enabled: true` is set in config
3. Restart OpenCode after config changes

### Check Server Startup Manually

Test if MemoryLayer starts correctly:

```bash
# Windows
node C:\path\to\memorylayer\dist\index.js --project C:\path\to\project

# macOS/Linux
node /path/to/memorylayer/dist/index.js --project /path/to/project
```

You should see:
```
MemoryLayer starting...
Project: /path/to/project
Indexing started...
Indexing complete: XX files indexed
MemoryLayer MCP server started
```

### View Debug Logs

Run OpenCode with debug logging:

```bash
opencode --log-level DEBUG
```

### Reset MemoryLayer Data

If you have persistent issues, clear the data:

```bash
# Windows
rmdir /s %USERPROFILE%\.memorylayer

# macOS/Linux
rm -rf ~/.memorylayer
```

---

## Example Usage in OpenCode

Once configured, try these prompts:

```
> Search for authentication code in this project

> What architectural decisions have been made?

> Show me the project summary

> Find the function that handles user login

> What changed yesterday?

> Why did the tests break?

> Check if this code follows our patterns: async function fetchData() { ... }

> Get tests related to src/auth/login.ts

> Record a decision: We chose SQLite because it requires no server setup
```

---

## Data Storage

MemoryLayer stores data in:

```
~/.memorylayer/
├── registry.json          # Project registry
└── projects/
    └── {project-name}-{hash}/
        ├── memorylayer.db  # SQLite database
        └── tier1.json      # Working context
```

---

## Links

- [OpenCode Documentation](https://opencode.ai/docs/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [MemoryLayer API Reference](./API.md)
- [MemoryLayer Architecture](./ARCHITECTURE.md)

---

*Last updated: February 2026*
