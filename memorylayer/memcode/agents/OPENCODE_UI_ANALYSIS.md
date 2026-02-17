# OpenCode UI Feature Analysis

## 🎯 Goal: Replicate OpenCode's UI + Tools, Use MemoryLayer Brain

We want **OpenCode's UI and basic tools** but with **MemoryLayer's 18-agent intelligence** as the brain.

---

## 🛡️ 1. PERMISSION SYSTEM

### Permission Flow
```
Agent wants to: Edit file src/auth.ts
↓
System checks: Do we have permission for "edit" on "src/auth.ts"?
↓
If NO → Show permission prompt to user
↓
User options:
  ✅ "Allow once"    → Grant permission for this action only
  ✅ "Allow always"   → Grant permission for all "edit" actions
  ❌ "Reject"        → Deny permission (halt execution)
```

### Operations Requiring Permission

| Operation | Permission Type | UI Display |
|-----------|----------------|------------|
| **Edit file** | `edit` | Show diff viewer of changes |
| **Write new file** | `write` | Show file path + content preview |
| **Delete file** | `delete` | Show file path + confirmation |
| **Run bash command** | `bash` | Show command description + actual command |
| **Read file** | `read` | Show file path (auto-allowed usually) |
| **Search files** | `glob/grep` | Show search pattern |
| **Web fetch** | `webfetch` | Show URL being fetched |
| **Web search** | `websearch` | Show search query |
| **Subagent task** | `task` | Show subagent type + description |
| **Commit changes** | `git-commit` | Show commit message + files |

### Permission UI Components

```typescript
interface PermissionPrompt {
  id: string;
  permission: string;           // "edit", "bash", etc.
  patterns: string[];           // ["src/auth.ts"]
  metadata: {
    filePath?: string;
    command?: string;
    description?: string;
  };
  actions: ["once", "always", "reject"];
}

// UI Display:
┌─────────────────────────────────────────────────────┐
│ 🔒 Permission Required                              │
│                                                     │
│ The agent wants to edit a file:                     │
│                                                     │
│ File: src/auth.ts                                   │
│ Changes: +15 lines, -3 lines                        │
│                                                     │
│ [View Diff]                                         │
│                                                     │
│ [Allow Once]  [Allow Always]  [Reject]             │
└─────────────────────────────────────────────────────┘
```

---

## 🧰 2. BASIC TOOLS (We Need These)

### Core Tool Set

| Tool | Icon | Description | Permission |
|------|------|-------------|------------|
| `read` | 👓 | Read file contents | Auto-allow |
| `write` | 📝 | Create new file | Ask |
| `edit` | ✏️ | Edit existing file | Ask |
| `delete` | 🗑️ | Delete file | Ask |
| `bash` | 🖥️ | Run shell command | Ask |
| `glob` | 📁 | Find files by pattern | Auto-allow |
| `grep` | 🔍 | Search file contents | Auto-allow |
| `webfetch` | 🌐 | Fetch URL content | Auto-allow |
| `websearch` | 🔎 | Search web | Auto-allow |
| `task` | 🤖 | Delegate to subagent | Ask |
| `todo_write` | ✅ | Manage todo list | Auto-allow |
| `apply_patch` | 🩹 | Apply file patch | Ask |

### Tool Call Display Pattern

```typescript
// Every tool call shows:
interface ToolCallUI {
  icon: string;              // Tool-specific icon
  title: string;             // Human-readable name
  subtitle: string;          // File name or brief desc
  args?: string[];           // Key parameters
  status: "pending" | "loading" | "success" | "error";
  output?: string;           // Tool output (collapsible)
  duration?: number;         // Execution time
}

// Example displays:
┌────────────────────────────────────────────────────┐
│ 👓 Read                                     0.2s   │
│ src/auth.ts                                         │
│ [View content...]                                  │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ ✏️ Edit                                     0.5s   │
│ src/auth.ts                                         │
│ +15 lines, -3 lines                                │
│ [View diff...]                                     │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ 🖥️ Bash                                     2.1s   │
│ Running tests...                                    │
│ $ npm test                                          │
│ [View output...]                                    │
│ ✓ 42 tests passed                                  │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ 🔍 Grep                                     0.3s   │
│ Searching: "user.*auth"                             │
│ Found 5 matches in 3 files                         │
│ [View results...]                                  │
└────────────────────────────────────────────────────┘
```

---

## 🎨 3. UI COMPONENTS

### Main Chat Interface

```
┌──────────────────────────────────────────────────────────────┐
│  OpenCode - MemoryLayer Brain                  [Settings]   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 👤 User                                               │   │
│  │ Add user authentication with OAuth                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🤖 Assistant (Thinking...)                            │   │
│  │                                                       │   │
│  │ 🔬 Research Agent investigating...                   │   │
│  │ [████████████████░░░░░░░░] 40%                       │   │
│  │                                                       │   │
│  │ 👓 Read                                    0.2s      │   │
│  │ src/auth/existing.ts                                 │   │
│  │                                                       │   │
│  │ 🔍 Grep                                    0.3s      │   │
│  │ Searching for "OAuth"...                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🔒 Permission Required                               │   │
│  │                                                       │   │
│  │ The agent wants to write a new file:                 │   │
│  │ src/auth/oauth.ts                                    │   │
│  │                                                       │   │
│  │ [Allow Once] [Allow Always] [Reject]                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  > Type / for commands                                       │
│  [Send] [Attach]                                             │
└──────────────────────────────────────────────────────────────┘
```

### Diff Viewer Component

```
┌─────────────────────────────────────────────────────────────┐
│  File: src/auth.ts                                  [Close] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┬─────────────────────────┐      │
│  │ Before                  │ After                   │      │
│  ├─────────────────────────┼─────────────────────────┤      │
│  │ 1  function login() {   │ 1  async function      │      │
│  │ 2    return basicAuth() │    login() {           │      │
│  │ 3  }                    │ 2    if (useOAuth) {   │      │
│  │                         │ 3      return          │      │
│  │                         │        oauthLogin()    │      │
│  │                         │ 4    }                 │      │
│  │                         │ 5    return            │      │
│  │                         │        basicAuth()     │      │
│  │                         │ 6  }                   │      │
│  └─────────────────────────┴─────────────────────────┘      │
│                                                              │
│  Changes: +6 lines, -3 lines                                │
└─────────────────────────────────────────────────────────────┘
```

### Status Indicators

```typescript
// Real-time status display
interface StatusIndicator {
  type: "spinner" | "text" | "progress";
  message: string;
  progress?: number;  // 0-100
}

// Examples:
🔍 "Research Agent gathering context..."
✏️ "Builder Agent writing code..."  
🧪 "Tester Agent running tests..."
🔄 "Retrying (attempt 2/3)..."
```

### Progress Bars

```
Phase Progress:
├─ Phase 0: Why         ✓ Complete
├─ Phase 1: Research    ✓ Complete  
├─ Phase 2: Planning    ✓ Complete
├─ Phase 4: Building    ████████░░ 80%
│  ├─ Step 1: Database  ✓
│  ├─ Step 2: Service   ✓
│  ├─ Step 3: API       ▶ In Progress
│  └─ Step 4: Frontend  ○ Pending
├─ Phase 5: Review      ○ Pending
└─ Phase 6: Reflect     ○ Pending
```

---

## ⌨️ 4. CLI/TUI INTERFACE

### Command Palette (Type `/`)

```
> /

Commands:
  /new           Start new conversation
  /models        Change AI model
  /sessions      View all sessions
  /continue      Continue last session
  /cost          View token usage
  /help          Show help
  /plan          Enter plan mode (read-only)
  /exit          Exit

Shortcuts:
  Ctrl+P         Command palette
  Ctrl+N         New conversation
  Ctrl+O         Open session
  Up/Down        Navigate history
  Shift+Enter    New line
```

### Session View

```
┌────────────────────────────────────────────────────────────┐
│ Session: Add user authentication              [Active]     │
├────────────────────────────────────────────────────────────┤
│ Model: Claude 3.5 Sonnet                                   │
│ Status: Building (Step 3/4)                                │
│ Cost: $0.0234                                              │
│ Tokens: 2,345 / 8,000                                      │
├────────────────────────────────────────────────────────────┤
│ Conversation:                                              │
│                                                            │
│ You: Add OAuth authentication                             │
│                                                            │
│ Assistant: I'll help you add OAuth authentication.        │
│ Let me start by researching your codebase...              │
│                                                            │
│ [View 15 tool calls...]                                   │
│                                                            │
│ You: Use Google OAuth specifically                        │
│                                                            │
│ Assistant: I'll configure Google OAuth...                 │
│                                                            │
│ > Use Google OAuth specifically                           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### File Tree View

```
📁 Project Root
├── 📄 README.md
├── 📁 src
│   ├── 📁 auth
│   │   ├── 📄 index.ts      [Modified]
│   │   ├── 📄 oauth.ts      [New]
│   │   └── 📄 basic.ts      [Unchanged]
│   ├── 📁 api
│   │   └── 📄 routes.ts     [Modified]
│   └── 📁 db
│       └── 📄 users.ts      [Unchanged]
├── 📁 tests
│   └── 📄 auth.test.ts      [New]
└── 📄 package.json

Legend: [Modified] [New] [Unchanged]
```

---

## 🔄 5. STREAMING & REAL-TIME UPDATES

### Streaming Text Display

```typescript
// Throttle text updates to prevent flicker
const TEXT_RENDER_THROTTLE_MS = 100;

// Display partial responses as they arrive
"I'll help you add OAuth authentication. First, let me..."
↓
"I'll help you add OAuth authentication. First, let me research your existing code..."
↓
"I'll help you add OAuth authentication. First, let me research your existing code to understand the current setup."
```

### Tool Execution Streaming

```
┌────────────────────────────────────────────────────────────┐
│ 🖥️ Bash                                          Running...│
│ npm test                                                   │
│                                                            │
│ > project@1.0.0 test                                       │
│ > jest                                                     │
│                                                            │
│ PASS  tests/auth.test.js                                   │
│  ● Console                                                 │
│                                                            │
│    console.log                                             │
│      Setting up test database...                          │
│                                                            │
│ [Streaming output...]                                      │
└────────────────────────────────────────────────────────────┘
```

### Auto-Scroll Behavior

```typescript
// Auto-scroll to bottom when new content arrives
// UNLESS user has manually scrolled up

let userScrolled = false;

onNewContent(() => {
  if (!userScrolled) {
    scrollToBottom();
  }
});

onUserScroll(() => {
  if (!atBottom()) {
    userScrolled = true;
    showScrollToBottomButton();
  }
});
```

---

## ⚠️ 6. ERROR HANDLING UI

### Error Display

```
┌────────────────────────────────────────────────────────────┐
│ ❌ Error                                                    │
│                                                             │
│ Failed to run tests:                                        │
│ Cannot find module './auth' from 'tests/auth.test.ts'      │
│                                                             │
│ [Retry] [Skip] [Show Details]                              │
└────────────────────────────────────────────────────────────┘
```

### Retry with Countdown

```
┌────────────────────────────────────────────────────────────┐
│ ⚠️  Retrying in 5s... (Attempt 2/3)                        │
│                                                             │
│ Previous attempt failed:                                    │
│ Connection timeout                                          │
│                                                             │
│ [Retry Now] [Cancel]                                       │
└────────────────────────────────────────────────────────────┘
```

---

## 🔔 7. NOTIFICATIONS & TOASTS

### Toast Types

```typescript
interface Toast {
  id: string;
  type: "success" | "error" | "loading" | "info";
  title: string;
  message?: string;
  duration?: number;  // Auto-dismiss after ms
  actions?: Action[];
}

// Examples:
┌──────────────────────────────────────┐
│ ✅ File saved                        │
│ src/auth/oauth.ts                    │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ ❌ Permission denied                 │
│ User rejected file edit              │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ ⏳ Running tests...                  │
│ This may take a moment               │
└──────────────────────────────────────┘
```

---

## 🎨 8. THEMING & STYLING

### Color Scheme

```css
:root {
  /* Primary Colors */
  --color-primary: #0066CC;
  --color-success: #28A745;
  --color-warning: #FFC107;
  --color-error: #DC3545;
  --color-info: #17A2B8;
  
  /* Neutral Colors */
  --color-bg: #0D1117;        /* Dark background */
  --color-fg: #C9D1D9;        /* Light text */
  --color-border: #30363D;    /* Borders */
  --color-muted: #8B949E;     /* Secondary text */
  
  /* Agent Colors */
  --color-why: #FF6B6B;       /* Red - Challenge */
  --color-research: #4ECDC4;  /* Teal - Investigation */
  --color-builder: #45B7D1;   /* Blue - Build */
  --color-tester: #96CEB4;    /* Green - Test */
  --color-moderator: #FFEAA7; /* Yellow - Orchestrate */
}
```

### Agent Icons

| Agent | Icon | Color |
|-------|------|-------|
| Why | ❓ | Red |
| Research | 🔬 | Teal |
| Planner | 📋 | Blue |
| Architect | 🏗️ | Purple |
| Builder | 🔨 | Orange |
| Tester | 🧪 | Green |
| Reviewer | 👁️ | Yellow |
| Moderator | 🎛️ | Gray |

---

## 📊 9. COMPARISON: OpenCode UI vs MemoryLayer Brain

| Feature | OpenCode | MemoryLayer |
|---------|----------|-------------|
| **Brain** | Single agent | 18 specialized agents |
| **Planning** | Implicit | Explicit (Planner Agent) |
| **Memory** | Session-only | Persistent across sessions |
| **Learning** | None | Failure memory, estimates |
| **Tools** | 12 tools | 12 tools + 51 MCP tools |
| **UI** | ✅ Full TUI | ✅ Replicate exact same |
| **Permissions** | ✅ Pattern-based | ✅ Same system |
| **Streaming** | ✅ Real-time | ✅ Same |
| **Diff Viewer** | ✅ Built-in | ✅ Same |
| **Cost Tracking** | ✅ Built-in | ✅ Same |

---

## 🚀 10. IMPLEMENTATION PLAN

### Phase 1: Core UI (Week 1)
1. ✅ Permission system (pattern-based)
2. ✅ Tool call display components
3. ✅ Basic chat interface
4. ✅ Diff viewer
5. ✅ Status indicators

### Phase 2: Tools (Week 2)
1. ✅ Read/Write/Edit tools
2. ✅ Bash tool with permission tracking
3. ✅ Glob/Grep search tools
4. ✅ WebFetch/WebSearch tools
5. ✅ Task delegation

### Phase 3: TUI (Week 3)
1. ✅ CLI interface
2. ✅ Command palette (/commands)
3. ✅ File tree view
4. ✅ Session management
5. ✅ Real-time streaming

### Phase 4: Integration (Week 4)
1. ✅ Connect to MemoryLayer agents
2. ✅ Multi-agent coordination
3. ✅ Persistent state storage
4. ✅ Cost tracking
5. ✅ Polish & testing

---

## 📝 Summary

**What We Need to Build:**

### UI Components
- ✅ Permission prompt modal
- ✅ Tool call display cards
- ✅ Diff viewer (split/unified)
- ✅ Chat interface with streaming
- ✅ Status/progress indicators
- ✅ File tree navigator
- ✅ Command palette

### Permission System
- ✅ Pattern-based matching
- ✅ Three actions: once/always/reject
- ✅ Per-session tracking
- ✅ Diff preview for edits

### Basic Tools (12)
- read, write, edit, delete
- bash, glob, grep
- webfetch, websearch
- task, todo_write, apply_patch

### Intelligence (MemoryLayer)
- 18 specialized agents
- Persistent memory
- Failure learning
- Pattern recognition

**Result:** OpenCode's UI + MemoryLayer's Brain = 🚀
