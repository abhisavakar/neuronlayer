# BUILDING: OpenCode UI + MemoryLayer Brain

## Master Plan Document

**Goal:** Build OpenCode's exact UI and tools, but use MemoryLayer's 18-agent system as the brain.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE LAYER                         │
│  (OpenCode-style TUI - React Terminal UI)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Permission   │  │ Tool Display │  │ Chat Stream  │          │
│  │ System       │  │ Cards        │  │ Interface    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                     TOOL EXECUTION LAYER                         │
│  (12 OpenCode-compatible tools)                                 │
├─────────────────────────────────────────────────────────────────┤
│                     AGENT ORCHESTRATION                          │
│  (MemoryLayer 18-Agent System)                                  │
├─────────────────────────────────────────────────────────────────┤
│                     MEMORY LAYER                                 │
│  (SQLite + 51 MCP Tools)                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Permission System

### Permission Types

| Operation | Permission | UI Display |
|-----------|-----------|------------|
| **Edit file** | `edit` | Show diff viewer |
| **Write file** | `write` | Show path + preview |
| **Delete file** | `delete` | Show path + confirmation |
| **Run bash** | `bash` | Show command |
| **Subagent task** | `task` | Show agent type |

### Permission Prompt UI

```
┌────────────────────────────────────────────┐
│ 🔒 Permission Required                      │
│                                             │
│ File: src/auth.ts                          │
│ Changes: +15 lines, -3 lines               │
│                                             │
│ [View Diff]                                │
│                                             │
│ [Allow Once] [Allow Always] [Reject]      │
└────────────────────────────────────────────┘
```

### Three Actions
- **Allow Once** - Grant for this action only
- **Allow Always** - Grant for pattern (e.g., all edits to src/*.ts)
- **Reject** - Deny permission

---

## Phase 2: Basic Tools (12 Tools)

| Tool | Icon | Permission |
|------|------|------------|
| `read` | 👓 | Auto-allow |
| `write` | 📝 | Ask |
| `edit` | ✏️ | Ask |
| `delete` | 🗑️ | Ask |
| `bash` | 🖥️ | Ask |
| `glob` | 📁 | Auto-allow |
| `grep` | 🔍 | Auto-allow |
| `webfetch` | 🌐 | Auto-allow |
| `websearch` | 🔎 | Auto-allow |
| `task` | 🤖 | Ask |
| `todo` | ✅ | Auto-allow |
| `patch` | 🩹 | Ask |

### Tool Display Pattern

```
┌────────────────────────────────────────────┐
│ ✏️ Edit                               0.5s │
│ src/auth.ts                                │
│ +15 lines, -3 lines                        │
│ [View diff...]                             │
└────────────────────────────────────────────┘
```

---

## Phase 3: UI Components

### 1. Chat Interface

```
┌──────────────────────────────────────────────────────┐
│ OpenCode - MemoryLayer Brain              [Settings] │
├──────────────────────────────────────────────────────┤
│                                                      │
│ 👤 User                                              │
│ Add OAuth authentication                             │
│                                                      │
│ 🤖 Assistant (Thinking...)                          │
│                                                      │
│ 🔬 Research Agent investigating...                  │
│ [████████████████░░░░░░░░] 40%                      │
│                                                      │
│ 🔒 Permission Required                               │
│ File: src/auth/oauth.ts                             │
│ [Allow Once] [Allow Always] [Reject]               │
│                                                      │
├──────────────────────────────────────────────────────┤
│ > Type / for commands                                │
└──────────────────────────────────────────────────────┘
```

### 2. Diff Viewer

```
┌──────────────────────────────────────────────────────┐
│ File: src/auth.ts                           [Close]  │
├──────────────────────────────────────────────────────┤
│ ┌───────────────────┬───────────────────┐           │
│ │ Before            │ After             │           │
│ ├───────────────────┼───────────────────┤           │
│ │ function login()  │ async function    │           │
│ │   return basic()  │   login() {       │           │
│ │ }                 │     if (oauth)    │           │
│ └───────────────────┴───────────────────┘           │
└──────────────────────────────────────────────────────┘
```

### 3. Command Palette

```
> /

Commands:
  /new           Start new conversation
  /models        Change AI model
  /sessions      View all sessions
  /continue      Continue last session
  /cost          View token usage
  /plan          Enter plan mode (read-only)
  /help          Show help
  /exit          Exit
```

---

## Phase 4: Implementation Plan

### Week 1: Core Infrastructure
- **Days 1-2:** Permission system
- **Days 3-5:** 12 basic tools
- **Days 6-7:** Tool registry & executor

### Week 2: UI Components
- **Days 1-2:** Tool call cards & diff viewer
- **Days 3-4:** Chat interface
- **Days 5-6:** Status indicators
- **Day 7:** File tree & navigation

### Week 3: TUI Application
- **Days 1-2:** Main app structure & routing
- **Days 3-4:** Command palette
- **Days 5-6:** Keyboard shortcuts
- **Day 7:** Real-time streaming

### Week 4: Integration
- **Days 1-2:** Agent bridge
- **Days 3-4:** Connect 18 agents
- **Days 5-6:** End-to-end testing
- **Day 7:** Polish & documentation

---

## Key Features Checklist

### UI Components
- [ ] Permission prompt modal
- [ ] Tool call cards
- [ ] Diff viewer (split/unified)
- [ ] Chat interface
- [ ] Status indicators
- [ ] Spinner/loading states
- [ ] File tree
- [ ] Command palette

### Tools (12)
- [ ] read, write, edit, delete
- [ ] bash, glob, grep
- [ ] webfetch, websearch
- [ ] task, todo, patch

### TUI Features
- [ ] Command palette (/commands)
- [ ] Keyboard shortcuts
- [ ] Session management
- [ ] Real-time streaming
- [ ] Auto-scroll
- [ ] Error handling

---

## What Makes It Different

| Feature | OpenCode | MemoryLayer (Ours) |
|---------|----------|-------------------|
| **Brain** | Single agent | **18 specialized agents** |
| **Planning** | Implicit | **Explicit with Planner Agent** |
| **Memory** | Session-only | **Persistent + learns** |
| **Learning** | None | **Failure memory + estimates** |
| **Tools** | 12 tools | **12 + 51 MCP tools** |
| **UI** | Full TUI | **Exact same replica** |

---

**Result:** OpenCode's familiar UI + MemoryLayer's super-intelligence = 🚀

---

## Phase 5: Terminal UI Conversion (Ink)

**Status:** IN PROGRESS  
**Goal:** Convert web-based TUI to terminal-based UI using Ink v6  
**Date:** February 16, 2026

---

### Current State Analysis

**Web-based TUI exists at:** `src/tui/`
- Uses React DOM (`react-dom/client`)
- CSS-in-JS styles (inline styles)
- HTML elements (`<div>`, `<header>`, `<aside>`)
- Has `index.html` for browser rendering

**Target:** Terminal UI using **Ink** (v6 already installed in package.json)

---

### Conversion Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 TERMINAL UI (Ink + React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Box          │  │ Text         │  │ useInput     │          │
│  │ (layout)     │  │ (content)    │  │ (keyboard)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                     NEW COMPONENTS                               │
│  src/tui-terminal/                                              │
│  ├── cli.tsx          Entry point (Ink render)                  │
│  ├── App.tsx          Main layout with terminal dimensions      │
│  ├── components/                                                │
│  │   ├── Header.tsx    Top bar with title                       │
│  │   ├── Sidebar.tsx   Session list (vertical)                 │
│  │   ├── ChatPanel.tsx Message display area                    │
│  │   ├── InputBox.tsx  Text input with ink-text-input          │
│  │   ├── StatusBar.tsx Bottom status line                      │
│  │   └── CommandPalette.tsx  Modal commands                     │
│  └── hooks/                                                     │
│      ├── useTerminalSize.ts  Terminal dimensions                │
│      └── useKeyboard.ts      Keyboard shortcuts                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Component Conversion Mapping

| Component | Web (Current) | Terminal (Ink) | Key Changes |
|-----------|---------------|----------------|-------------|
| **App** | `<div>` layout | `<Box>` flexbox | Replace all DOM containers with `<Box>` |
| **Header** | `<header>` style | `<Box borderBottom>` | Single row with `<Text>` elements |
| **Sidebar** | `<aside>` 280px | `<Box width={30}>` | Session list with `<Select>` or arrow nav |
| **ChatPanel** | `<div>` scroll | `<Static>` + `<Box>` | Terminal-native scrollback |
| **Messages** | CSS styled | `<Text>` color prop | 16/256 color palette |
| **Input** | `<input>` | `ink-text-input` | Terminal input handling |
| **StatusBar** | `<footer>` fixed | `<Box>` bottom fixed | Real-time updates with `<Text>` |

---

### Dependencies to Add

```bash
# Core Ink ecosystem
npm install ink-text-input ink-select-input ink-spinner ink-link

# For advanced UI
npm install @inkjs/ui
```

---

### Files to Create

#### 1. Entry Point
**File:** `src/tui-terminal/cli.tsx`
```typescript
#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import App from './App.js';

render(<App />);
```

#### 2. Main App Layout
**File:** `src/tui-terminal/App.tsx`
- Full-screen terminal layout
- Handle terminal resize events
- Manage app state (sessions, messages, etc.)
- Keyboard shortcuts with `useInput`

#### 3. Components (Terminal versions)
**Directory:** `src/tui-terminal/components/`

- **Header.tsx** - Logo, title, session info
- **Sidebar.tsx** - Sessions list with selection
- **ChatPanel.tsx** - Messages display area
- **InputBox.tsx** - Message input with history
- **StatusBar.tsx** - Agent status, cost, tokens
- **CommandPalette.tsx** - Modal command interface
- **PermissionPrompt.tsx** - Permission requests

#### 4. Hooks
**Directory:** `src/tui-terminal/hooks/`

- **useTerminalSize.ts** - Track terminal dimensions
- **useKeyboard.ts** - Global keyboard shortcuts
- **useSessions.ts** - Session management

---

### Build Configuration Update

**Update:** `esbuild.config.js`
```javascript
// Add terminal TUI entry point
await build({
  ...commonOptions,
  entryPoints: ['src/tui-terminal/cli.tsx'],
  outfile: 'dist/tui.js',
  banner: {
    js: '#!/usr/bin/env node'
  }
});
```

**Add npm scripts to package.json:**
```json
{
  "scripts": {
    "tui": "node dist/tui.js",
    "tui:build": "node esbuild.config.js",
    "tui:dev": "tsx watch src/tui-terminal/cli.tsx"
  }
}
```

---

### Terminal UI Design

```
┌────────────────────────────────────────────────────────────┐
│ 🧠 MemoryLayer │ Session: OAuth Auth    │ 18 Agents ⚡     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 👤 User                                                    │
│ Add OAuth authentication with Google and GitHub           │
│                                                            │
│ 🤖 Assistant                                               │
│ I'll help you add OAuth authentication. Let me start by   │
│ researching the current auth setup...                     │
│                                                            │
│ 🔬 Research Agent                                         │
│ Analyzing src/auth/...                                    │
│ [████████████████░░░░░░░░] 40%                           │
│                                                            │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ > Type message or / for commands...                       │
├────────────────────────────────────────────────────────────┤
│ Agent: research │ Phase: investigating │ Cost: $0.002 │ 150│
└────────────────────────────────────────────────────────────┘
```

**Command Palette (activated with `/`)**
```
Commands:
  /new        Start new conversation
  /sessions   List all sessions
  /switch     Switch session
  /delete     Delete current session  
  /cost       View token usage
  /agents     List active agents
  /help       Show help
  /exit       Exit
```

---

### Key Features for Terminal UI

1. **Keyboard Navigation**
   - `↑/↓` - Scroll through messages
   - `Tab` - Focus between areas
   - `Ctrl+N` - New session
   - `Ctrl+P` - Command palette
   - `/` - Quick command
   - `Esc` - Cancel/close
   - `Ctrl+C` - Exit

2. **Layout Modes**
   - **Compact mode:** Chat only (no sidebar)
   - **Full mode:** Sidebar + Chat (requires 100+ cols)
   - **Command mode:** Full-screen command palette

3. **Terminal Features**
   - Auto-resize on terminal resize
   - Proper handling of terminal colors
   - Support for light/dark terminal themes
   - Mouse support (optional)

---

### Implementation Checklist

- [ ] Install ink-text-input and @inkjs/ui
- [ ] Create `src/tui-terminal/` directory structure
- [ ] Create entry point `cli.tsx`
- [ ] Create main `App.tsx` with layout
- [ ] Convert `Header.tsx` to terminal version
- [ ] Convert `Sidebar.tsx` to terminal version  
- [ ] Convert `ChatPanel.tsx` to terminal version
- [ ] Create `InputBox.tsx` with ink-text-input
- [ ] Create `StatusBar.tsx` terminal version
- [ ] Create `CommandPalette.tsx` modal
- [ ] Update esbuild.config.js with TUI entry
- [ ] Add npm scripts
- [ ] Test terminal UI with `npm run tui`

---

### Testing Commands

```bash
# Build terminal UI
npm run tui:build

# Run terminal UI
npm run tui

# Or run directly with tsx (dev mode)
npx tsx src/tui-terminal/cli.tsx
```

---

**Result:** `npm run tui` → Opens interactive terminal interface 🖥️

---

## Summary

**Phase 1-4:** Web-based UI (COMPLETE)  
**Phase 5:** Terminal UI Conversion (IN PROGRESS)

**Next Steps:**
1. Install additional Ink dependencies
2. Create terminal UI directory structure
3. Convert components one by one
4. Update build configuration
5. Test and iterate

**Command to run:** `npm run tui` 🚀
