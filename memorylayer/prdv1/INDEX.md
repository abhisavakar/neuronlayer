# MemoryLayer v1.1 - PRD

**Next version features and specifications**

**Version:** 1.1
**Status:** Planning
**Last Updated:** February 2026

---

## Overview

This folder contains specifications for the next major features that will differentiate MemoryLayer from competitors.

---

## Documents

| Document | Description | Status | Priority |
|----------|-------------|--------|----------|
| [ACTIVE-FEATURE-CONTEXT.md](./ACTIVE-FEATURE-CONTEXT.md) | Hot context caching for current work | Planned | P0 |

---

## Killer Feature: Active Feature Context

### The Problem (2026 Reality)

From market research, the #1 complaint with AI coding tools:

> **"AI forgets context mid-session"**
> **"AI keeps asking what I'm working on"**
> **"I have to re-explain everything"**

### Our Solution

Keep the current feature you're working on "hot" in memory:

```
User opens files → Cached instantly
User makes changes → Recorded
User asks question → Hot context injected FIRST
AI responds → Instant (no searching)
```

### Why This Is Killer

| Competitor | Has This? |
|------------|-----------|
| OpenClaw | ❌ No |
| Claude Context | ❌ No |
| Mem0 | ❌ No |
| MCP Memory Service | ❌ No |
| **MemoryLayer** | ✅ Yes |

---

## Implementation Summary

### New Components

| Component | Purpose |
|-----------|---------|
| FeatureContextManager | Tracks current work |
| Hot Cache | Keeps files in memory |
| Change Tracker | Records edits |
| Query Tracker | Remembers questions |

### New MCP Tools

| Tool | Purpose |
|------|---------|
| `get_active_context` | Get current feature context |
| `set_feature_context` | Set what you're working on |
| `list_recent_contexts` | Show recent features |
| `switch_feature_context` | Switch to previous work |

### Performance Targets

| Operation | Target |
|-----------|--------|
| Hot context retrieval | <5ms |
| Full response | <100ms |
| File cache hit rate | >80% |

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Implementation | 2 days | Working feature |
| Testing | 1 day | Bug fixes |
| Documentation | 0.5 day | User guide |
| Launch | - | Release |

**Total: ~3.5 days**

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Response speed improvement | 10x |
| User feedback | "It just knows what I'm doing" |
| Competitive differentiation | Unique feature |

---

## Business Impact

| Impact | Description |
|--------|-------------|
| Differentiation | Only tool with this feature |
| Marketing | Clear, simple value prop |
| Retention | Users stay because it "just works" |

---

## Next Steps

1. ✅ Technical specification complete
2. ⏳ Implementation (2 days)
3. ⏳ Testing
4. ⏳ Launch

---

*PRD v1.1 - February 2026*
