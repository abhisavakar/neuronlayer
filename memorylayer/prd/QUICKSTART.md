# MemoryLayer - Quick Start Guide

**Version:** 1.0
**Time to Complete:** 2 minutes

---

## What is MemoryLayer?

MemoryLayer is a persistent memory layer for AI coding assistants. It makes AI truly understand your codebase by:

- **Remembering** across sessions (never re-explain your architecture)
- **Understanding** code semantically (not just keyword matching)
- **Learning** from your decisions (architectural choices persist)
- **Working locally** (private, fast, no API costs)

---

## Installation

### Prerequisites

- Node.js 18 or higher
- Claude Desktop (or any MCP-compatible client)

### Step 1: Install MemoryLayer

```bash
# Global install (recommended)
npm install -g memorylayer

# Or run directly
npx memorylayer --project /path/to/your/project
```

### Step 2: Configure Claude Desktop

Edit `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "memorylayer": {
      "command": "memorylayer",
      "args": ["--project", "/path/to/your/project"]
    }
  }
}
```

**Windows path example:**
```json
{
  "mcpServers": {
    "memorylayer": {
      "command": "memorylayer",
      "args": ["--project", "C:\\Users\\you\\projects\\my-app"]
    }
  }
}
```

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop. You should see MemoryLayer in the MCP tools.

---

## Usage

### Ask Questions About Your Code

Just ask naturally - MemoryLayer automatically provides context:

```
You: "How does authentication work in this app?"

Claude uses: get_context("authentication flow login middleware")
Claude responds: With full understanding of your auth code
```

### Search Your Codebase

```
You: "Find all files related to payment processing"

Claude uses: search_codebase("payment processing")
Claude responds: Lists relevant files with previews
```

### Record Decisions

When you make architectural decisions, they're remembered:

```
You: "Let's use Redis for caching because we need pub/sub"

Claude uses: record_decision({
  title: "Use Redis for caching",
  description: "Chose Redis for caching and pub/sub...",
  tags: ["infrastructure", "caching"]
})

Next session: Claude already knows about Redis decision
```

### Get Project Overview

```
You: "Give me an overview of this project"

Claude uses: get_project_summary()
Claude responds: Languages, structure, dependencies, recent decisions
```

---

## Available Tools

| Tool | What It Does |
|------|--------------|
| `get_context` | Get relevant code for any query |
| `search_codebase` | Search semantically |
| `record_decision` | Save architectural decisions |
| `get_file_context` | Get specific file content |
| `get_project_summary` | Get project overview |

---

## How It Works

```
1. You open your project
   └── MemoryLayer indexes all code files (~2 min for 100K LOC)

2. You ask a question
   └── Claude calls get_context with your query

3. MemoryLayer returns
   └── Relevant code snippets + past decisions + project context

4. Claude responds
   └── With full understanding, no re-explanation needed

5. You make a decision
   └── Claude records it for future sessions

6. Next session
   └── Everything is remembered!
```

---

## Tips for Best Results

### 1. Let It Index First

Wait for initial indexing to complete before asking questions. You'll see progress in the terminal.

### 2. Record Important Decisions

When you make a choice, record it:
- "We chose X because..."
- "The architecture uses Y pattern..."
- "We're not using Z because..."

### 3. Be Specific in Questions

- Good: "How does the user authentication middleware validate JWT tokens?"
- Less good: "How does auth work?"

### 4. Reference Files When Relevant

- "Looking at `src/api/routes.ts`, how does the error handling work?"

---

## Troubleshooting

### "MemoryLayer not appearing in Claude Desktop"

1. Check the config file path is correct
2. Ensure the project path exists
3. Restart Claude Desktop completely

### "Indexing takes too long"

Large projects (500K+ LOC) may take 5-10 minutes. This only happens once.

### "Context doesn't seem relevant"

Try being more specific in your query. The semantic search works best with descriptive phrases.

### "Decisions not being remembered"

Ensure Claude is actually calling `record_decision`. You can ask: "Please record that we decided to use X".

---

## Data & Privacy

- **All local**: Data stored in `~/.memorylayer/`
- **No cloud**: Zero external API calls
- **No telemetry**: We don't collect anything
- **Your data**: You can delete `~/.memorylayer/` anytime

---

## What's Next?

1. **Try it out** - Ask questions about your codebase
2. **Record decisions** - Build your project's memory
3. **Give feedback** - Help us improve

---

## Getting Help

- GitHub Issues: [Report bugs](https://github.com/your-org/memorylayer/issues)
- Documentation: See other files in this PRD folder

---

*Welcome to MemoryLayer! Never explain your codebase again.*
