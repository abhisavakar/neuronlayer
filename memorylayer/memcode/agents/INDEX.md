# Agent Orchestration Layer - Agent Plans

This directory contains detailed implementation plans for all 18 agents in the Agent Orchestration Layer.

## Overview

The Agent Orchestration Layer provides cognitive workflow that turns feature requests into production code using the same reasoning patterns as senior engineers.

## Architecture

```
┌─────────────────────────────────────────────┐
│          AGENT ORCHESTRATION LAYER           │
│  (Reasoning, workflow, agent coordination)   │
├─────────────────────────────────────────────┤
│              MEMORYLAYER (MCP)               │
│  (Memory, search, patterns, decisions,       │
│   tests, confidence, change intelligence)    │
├─────────────────────────────────────────────┤
│              CODEBASE                        │
│  (Source files, git history, tests)          │
└─────────────────────────────────────────────┘
```

## Agent Registry

### Phase 0: IMPULSE
| Agent | Purpose | Can Block? |
|-------|---------|------------|
| **Why Agent** | Challenges whether the feature should exist | Yes |

### Phase 1: RESEARCH
| Agent | Purpose | Can Block? |
|-------|---------|------------|
| **Research Agent** | Studies prior art, past failures, existing solutions | No |
| **Documentation Agent** | Fetches latest official docs, prevents outdated API usage | Yes (on version mismatch) |

### Phase 2: MENTAL MODEL
| Agent | Purpose | Can Block? |
|-------|---------|------------|
| **Planner Agent** | Creates high-level feature plan | Yes |
| **Architect Agent** | Designs technical architecture | Yes |
| **Security Agent** | Reviews security implications | Yes (on critical) |
| **Estimator Agent** | Estimates effort based on history | No |
| **Designer Agent** | Plans UI/UX for frontend features | No |

### Phase 3: PROTOTYPE
| Agent | Purpose | Can Block? |
|-------|---------|------------|
| **Spike Agent** | Builds throwaway proof of concept | Yes (can kill feature) |

### Phase 4: BUILD
| Agent | Purpose | Can Block? |
|-------|---------|------------|
| **Decomposer Agent** | Breaks plan into ordered implementation steps | Yes |
| **Tester Agent** | Writes tests before code, validates after | Yes |
| **Builder Agent** | Writes production code one step at a time | No |
| **Smell Agent** | Detects code smells, complexity, scope creep | No (warns only) |
| **Rubber Duck Agent** | Debugs by forcing explanation of the problem | No (on-demand) |

### Phase 5: REVIEW
| Agent | Purpose | Can Block? |
|-------|---------|------------|
| **Review Agent** | Full code review of completed feature | Yes |

### Phase 5.5: DEPLOY
| Agent | Purpose | Can Block? |
|-------|---------|------------|
| **Deployment Agent** | Manages Terraform, Docker, Nginx, CI/CD | Yes |

### Phase 6: REFLECT
| Agent | Purpose | Can Block? |
|-------|---------|------------|
| **Retrospective Agent** | Captures learnings, updates failure memory | No |

### Always Running
| Agent | Purpose | Can Block? |
|-------|---------|------------|
| **Moderator Agent** | Monitors consistency, propagates changes to docs | Yes (on conflicts) |

## Agent Categories

- **Gatekeepers** (require human approval): Why, Planner, Architect, Decomposer, Review, Deployment
- **Advisors** (provide input but don't block): Research, Estimator, Designer, Smell, Rubber Duck, Retrospective
- **Executors** (do the work): Builder, Tester, Spike
- **Knowledge** (fetch and verify external information): Documentation
- **Supervisors** (watch everything): Moderator, Security

## Implementation Order

1. **Foundation First**: Moderator Agent (runs across all phases)
2. **Pre-Build Agents**: Why, Research, Documentation, Planner, Architect
3. **Build Agents**: Decomposer, Tester, Builder, Smell
4. **Post-Build Agents**: Security, Estimator, Designer, Review, Deployment, Retrospective
5. **Specialized**: Spike, Rubber Duck

## Directory Structure

```
memorylayer/memcode/agents/
├── INDEX.md                    # This file
├── 00-infrastructure/
│   ├── PIPELINE_STATE.md       # PipelineState interface
│   ├── ORCHESTRATOR.md         # Main orchestrator
│   └── COMMUNICATION.md        # Agent communication protocol
├── 01-moderator/
│   ├── PLAN.md                 # Moderator agent plan
│   └── TESTS.md                # Test cases
├── 02-why-agent/
│   ├── PLAN.md                 # Why agent plan
│   └── TESTS.md                # Test cases
├── 03-research-agent/
│   ├── PLAN.md
│   └── TESTS.md
├── 04-documentation-agent/
│   ├── PLAN.md
│   └── TESTS.md
├── 05-planner-agent/
│   ├── PLAN.md
│   └── TESTS.md
├── 06-architect-agent/
│   ├── PLAN.md
│   └── TESTS.md
├── 07-security-agent/
│   ├── PLAN.md
│   └── TESTS.md
├── 08-estimator-agent/
│   ├── PLAN.md
│   └── TESTS.md
├── 09-designer-agent/
│   ├── PLAN.md
│   └── TESTS.md
├── 10-spike-agent/
│   ├── PLAN.md
│   └── TESTS.md
├── 11-decomposer-agent/
│   ├── PLAN.md
│   └── TESTS.md
├── 12-tester-agent/
│   ├── PLAN.md
│   └── TESTS.md
├── 13-builder-agent/
│   ├── PLAN.md
│   └── TESTS.md
├── 14-smell-agent/
│   ├── PLAN.md
│   └── TESTS.md
├── 15-rubber-duck-agent/
│   ├── PLAN.md
│   └── TESTS.md
├── 16-review-agent/
│   ├── PLAN.md
│   └── TESTS.md
├── 17-deployment-agent/
│   ├── PLAN.md
│   └── TESTS.md
└── 18-retrospective-agent/
    ├── PLAN.md
    └── TESTS.md
```

## Status

| Phase | Status |
|-------|--------|
| Infrastructure | Not Started |
| Moderator Agent | Not Started |
| Why Agent | Not Started |
| Research Agent | Not Started |
| Documentation Agent | Not Started |
| Planner Agent | Not Started |
| Architect Agent | Not Started |
| Security Agent | Not Started |
| Estimator Agent | Not Started |
| Designer Agent | Not Started |
| Spike Agent | Not Started |
| Decomposer Agent | Not Started |
| Tester Agent | Not Started |
| Builder Agent | Not Started |
| Smell Agent | Not Started |
| Rubber Duck Agent | Not Started |
| Review Agent | Not Started |
| Deployment Agent | Not Started |
| Retrospective Agent | Not Started |

## Dependencies on MemoryLayer

The orchestration layer requires these new MemoryLayer tools:

### New Tools Required
- `log_failure` / `get_failures` - Failure memory
- `update_estimate` / `get_estimates` - Estimation tracking
- `log_retrospective` / `get_retrospectives` - Retrospectives
- `log_spike` / `get_spike_results` - Spike tracking
- `check_complexity_trend` - Complexity monitoring
- `detect_scope_creep` - Scope creep detection
- `cache_docs` / `get_cached_docs` / `check_version_drift` - Documentation cache

### New Database Tables Required
- `docs_cache` - Cached library documentation
- `failures` - Past failures and lessons
- `estimates` - Estimation accuracy tracking
- `retrospectives` - Post-feature learnings
- `spikes` - Spike results
- `complexity_snapshots` - File complexity over time

## Next Steps

1. Implement infrastructure (PipelineState, Orchestrator)
2. Implement Moderator Agent (foundation for all others)
3. Build agents in order, testing each thoroughly
4. Integrate all agents into complete pipeline
5. End-to-end testing with real features
