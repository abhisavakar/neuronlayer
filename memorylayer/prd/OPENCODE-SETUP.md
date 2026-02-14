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

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["node", "path/to/memorylayer/dist/index.js", "--project", "."],
      "enabled": true
    }
  }
}
```

### Step 2: Verify Connection

```bash
opencode mcp list
```

You should see:
```
┌  MCP Servers
│
●  ✓ memorylayer connected
│      node dist/index.js --project .
│
└  1 server(s)
```

### Step 3: Start OpenCode

```bash
opencode
```

---

## Configuration Options

### Local Project Setup

For a project-specific setup, create `opencode.json` in your project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["node", "C:/path/to/memorylayer/dist/index.js", "--project", "."],
      "enabled": true
    }
  }
}
```

### Global Setup

For system-wide availability, create `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["node", "C:/Users/YOUR_USERNAME/path/to/memorylayer/dist/index.js", "--project", "."],
      "enabled": true
    }
  }
}
```

### Using npx (After Publishing)

Once MemoryLayer is published to npm:

```json
{
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["npx", "-y", "memorylayer", "--project", "."],
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
| `command` | `string[]` | Yes (local) | Command to execute |
| `enabled` | `boolean` | No | Enable/disable server (default: false) |
| `environment` | `object` | No | Environment variables |

### Example with Environment Variables

```json
{
  "mcp": {
    "memorylayer": {
      "type": "local",
      "command": ["node", "dist/index.js", "--project", "."],
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

## Available Tools

Once connected, OpenCode's AI can use these MemoryLayer tools:

### Core Tools
| Tool | Description |
|------|-------------|
| `get_context` | Get relevant codebase context for a query |
| `search_codebase` | Semantic search across all files |
| `record_decision` | Save an architectural decision |
| `get_file_context` | Get content of a specific file |
| `get_project_summary` | Overview of project structure |

### Symbol & Dependency Tools
| Tool | Description |
|------|-------------|
| `get_symbol` | Find functions, classes, types by name |
| `get_dependencies` | See imports/exports for a file |

### Learning Tools
| Tool | Description |
|------|-------------|
| `get_file_summary` | Get compressed file summary (10x smaller) |
| `get_predicted_files` | Files predicted to be relevant |
| `get_learning_stats` | Usage statistics |
| `mark_context_useful` | Feedback for learning |

### Multi-Project Tools
| Tool | Description |
|------|-------------|
| `list_projects` | List all registered projects |
| `switch_project` | Switch active project |
| `search_all_projects` | Search across all projects |
| `discover_projects` | Find projects on system |

### Team Tools
| Tool | Description |
|------|-------------|
| `record_decision_with_author` | Decision with author attribution |
| `update_decision_status` | Update decision lifecycle |
| `export_decisions_to_adr` | Export to ADR markdown files |

---

## Troubleshooting

### "Configuration is invalid"

Ensure `command` is an array of strings, not a single string:

```json
// ❌ Wrong
"command": "node dist/index.js --project ."

// ✓ Correct
"command": ["node", "dist/index.js", "--project", "."]
```

### "MCP server not connected"

1. Check the path to `dist/index.js` is correct
2. Ensure MemoryLayer is built: `npm run build`
3. Check `enabled: true` is set

### "No tools available"

1. Verify connection: `opencode mcp list`
2. Check server logs in OpenCode debug mode
3. Ensure you're in the correct directory

### View Server Logs

Run OpenCode with debug logging:

```bash
opencode --log-level DEBUG
```

---

## Example Usage in OpenCode

Once configured, try these prompts in OpenCode:

```
> Search for authentication code in this project

> What architectural decisions have been made?

> Show me the project summary

> Find the function that handles user login

> What files import the database module?

> Record a decision: We chose SQLite for local storage because it's embedded and requires no separate server
```

---

## Data Storage

MemoryLayer stores data in:

```
~/.memorylayer/
├── registry.json          # Project registry
└── projects/
    └── {project-name}-{id}/
        ├── memorylayer.db  # SQLite database
        └── tier1.json      # Working context
```

---

## Links

- [OpenCode Documentation](https://opencode.ai/docs/)
- [OpenCode MCP Servers](https://opencode.ai/docs/mcp-servers/)
- [OpenCode Config](https://opencode.ai/docs/config/)
- [MCP Protocol](https://modelcontextprotocol.io/)

---

*Last updated: February 2026*
