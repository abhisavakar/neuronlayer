# memcode - AI Coding Assistant

An intelligent coding agent powered by **MemoryLayer**.

## Quick Start

```bash
# Build
npm run build

# Run with Anthropic API key
export ANTHROPIC_API_KEY=your-key
node dist/agent.js

# Or specify model
node dist/agent.js --model gpt-4o --api-key sk-your-key

# Or use npm script
npm run memcode
```

## Features

- **Persistent Memory**: Decisions, patterns, and context persist across sessions
- **51 MemoryLayer Tools**: Full access to MemoryLayer's semantic understanding
- **Multi-LLM Support**: Anthropic, OpenAI, OpenRouter (200+ models), Local (Ollama)
- **File Operations**: Read, write, edit files with change tracking
- **Shell Commands**: Run commands, tests, git operations
- **Session Management**: Save and resume conversations
- **Cost Tracking**: Track token usage and estimated costs

## Architecture

```
src/agent/
├── index.ts              # Entry point
├── core/
│   ├── orchestrator.ts   # Main agent loop
│   └── conversation.ts   # Message management
├── llm/
│   ├── index.ts          # Provider factory
│   ├── types.ts          # LLM interfaces
│   └── providers/
│       ├── anthropic.ts  # Claude API
│       ├── openrouter.ts # 200+ models
│       └── openai.ts     # GPT-4o, o1
├── tools/
│   ├── index.ts          # Tool registry
│   └── executor.ts       # Execute tools
├── session/
│   └── manager.ts        # Session CRUD
├── ui/
│   └── cli.ts            # CLI interface
└── config/
    └── index.ts          # Configuration
```

## Configuration

Configuration is stored in `~/.memcode/config.json`:

```json
{
  "defaultModel": "claude-sonnet-4-20250514",
  "providers": {
    "anthropic": { "apiKey": "sk-ant-..." },
    "openrouter": { "apiKey": "sk-or-..." },
    "openai": { "apiKey": "sk-..." }
  },
  "agent": {
    "maxTokensPerTurn": 8192,
    "maxTurns": 10,
    "autoContext": true,
    "streamResponses": true
  }
}
```

## In-Session Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/model [name]` | Show or switch model |
| `/models` | List available models |
| `/context` | Show current context |
| `/feature [name]` | Set feature context |
| `/clear` | Clear conversation |
| `/save` | Save session |
| `/sessions` | List recent sessions |
| `/continue [id]` | Continue a session |
| `/cost` | Show cost summary |
| `/exit` | Exit memcode |

## Tools Available

### MemoryLayer Tools (51)
- `get_context` - Get relevant codebase context
- `search_codebase` - Semantic code search
- `record_decision` - Record architectural decisions
- `validate_pattern` - Validate against patterns
- `why_broke` - Diagnose errors
- `suggest_fix` - Get fix suggestions
- ... and 45 more

### File Operations
- `read_file` - Read file contents
- `write_file` - Write to file
- `edit_file` - Search and replace
- `list_files` - List directory
- `delete_file` - Delete file

### Shell Operations
- `run_command` - Execute shell command
- `run_tests` - Run tests

### Git Operations
- `git_status` - Show status
- `git_diff` - Show diff
- `git_commit` - Create commit
- `git_log` - Show log
