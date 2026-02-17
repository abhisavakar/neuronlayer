# Agent Orchestration Layer — Architecture & Implementation Plan

**Version:** 1.0
**Status:** Planning
**Date:** February 2026
**Depends On:** MemoryLayer v1.0 (MCP Server)

---

## 1. What This Is

The Agent Orchestration Layer is the reasoning engine that sits on top of MemoryLayer. MemoryLayer provides persistent memory, semantic search, pattern recognition, and decision tracking. The orchestration layer provides the cognitive workflow — the sequence of thinking that turns a feature request into production code the way a senior engineer's brain works.

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

---

## 2. Agent Registry

### 2.1 All Agents

| # | Agent | Phase | Purpose | Can Block? |
|---|-------|-------|---------|------------|
| 1 | Why Agent | 0 - Impulse | Challenges whether the feature should exist | Yes |
| 2 | Research Agent | 1 - Research | Studies prior art, past failures, existing solutions | No |
| 3 | Documentation Agent | 1 - Research + 4 - Build | Fetches latest official docs, prevents outdated API usage | Yes (on version mismatch) |
| 4 | Planner Agent | 2 - Mental Model | Creates high-level feature plan | Yes |
| 5 | Architect Agent | 2 - Mental Model | Designs technical architecture | Yes |
| 6 | Security Agent | 2 - Mental Model | Reviews security implications | Yes (on critical) |
| 7 | Estimator Agent | 2 - Mental Model | Estimates effort based on history | No |
| 8 | Designer Agent | 2 - Mental Model | Plans UI/UX for frontend features | No |
| 9 | Spike Agent | 3 - Prototype | Builds throwaway proof of concept | Yes (can kill feature) |
| 10 | Decomposer Agent | 4 - Build | Breaks plan into ordered implementation steps | Yes |
| 11 | Tester Agent | 4 - Build | Writes tests before code, validates after | Yes |
| 12 | Builder Agent | 4 - Build | Writes production code one step at a time | No |
| 13 | Smell Agent | 4 - Build | Detects code smells, complexity, scope creep | No (warns only) |
| 14 | Rubber Duck Agent | 4 - Build | Debugs by forcing explanation of the problem | No (on-demand) |
| 15 | Review Agent | 5 - Review | Full code review of completed feature | Yes |
| 16 | Deployment Agent | 5.5 - Deploy | Manages Terraform, Docker, Nginx, CI/CD | Yes |
| 17 | Retrospective Agent | 6 - Reflect | Captures learnings, updates failure memory | No |
| 18 | Moderator Agent | Always | Monitors consistency, propagates changes to docs | Yes (on conflicts) |

### 2.2 Agent Categories

**Gatekeepers** (require human approval to proceed): Why, Planner, Architect, Decomposer, Review, Deployment

**Advisors** (provide input but don't block): Research, Estimator, Designer, Smell, Rubber Duck, Retrospective

**Executors** (do the work): Builder, Tester, Spike

**Knowledge** (fetch and verify external information): Documentation

**Supervisors** (watch everything): Moderator, Security

---

## 3. Phase Architecture

### Phase 0: IMPULSE — Why Agent

**Trigger:** New feature request received

**Purpose:** Challenge whether this feature should exist at all. Apply Step 1 and Step 2 of the 5-Step Algorithm: make the requirements less dumb, then try to delete.

**MemoryLayer MCP Calls:**

```
search_codebase(query: feature_description)
  → Does something similar already exist?

what_happened(since: "3 months")
  → Did we attempt this before?

get_failures(similar_to: feature_description)          [NEW TOOL]
  → Did a previous attempt fail? Why?

check_conflicts(proposed: feature_description)
  → Does this contradict existing architectural decisions?

get_context(query: feature_description, max_tokens: 4000)
  → What existing code is relevant?
```

**Agent Logic:**

```
INPUT: Raw feature request (natural language)

PROCESS:
  1. Search for prior art in codebase
  2. Search for past failures related to this feature
  3. Check for decision conflicts
  4. Evaluate: Is this feature necessary?
  5. Evaluate: Can existing code solve 80% of this?
  6. Evaluate: What is the simplest version that delivers value?

OUTPUT: {
  verdict: "proceed" | "simplify" | "reject" | "merge_with_existing",
  original_request: string,
  simplified_version: string | null,
  existing_code_that_helps: string[],
  past_failures: Failure[],
  conflicts: Conflict[],
  questions_for_human: string[],
  reasoning: string
}
```

**Stop Point:** Human reviews verdict, approves or modifies.

---

### Phase 1: RESEARCH — Research Agent

**Trigger:** Why Agent verdict is "proceed" or "simplify", human approved

**Purpose:** Gather all available knowledge before designing. A senior engineer researches before building.

**MemoryLayer MCP Calls:**

```
search_codebase(query: approved_feature, limit: 20)
  → All related code in the project

suggest_existing(intent: feature_description)
  → Reusable components and functions

list_patterns(category: relevant_category)
  → Established patterns to follow

get_architecture()
  → Current system architecture

list_sources()
  → All knowledge sources (decisions, patterns, codebase)

get_retrospectives(feature_type: similar_type)          [NEW TOOL]
  → What did we learn from building similar features?

get_failures(similar_to: feature_description)           [NEW TOOL]
  → What approaches failed before and why?
```

**Agent Logic:**

```
INPUT: Approved feature brief from Why Agent

PROCESS:
  1. Deep search for related code (internal prior art)
  2. Find reusable components (don't rebuild what exists)
  3. Find applicable patterns (follow established conventions)
  4. Read architecture (understand where this fits)
  5. Read past retrospectives for similar features
  6. Read past failures to avoid repeating mistakes
  7. Synthesize into research brief

OUTPUT: {
  prior_art: {
    existing_code: FileReference[],
    reusable_components: Component[],
    applicable_patterns: Pattern[]
  },
  warnings: {
    past_failures: Failure[],
    lessons_from_retrospectives: Lesson[]
  },
  constraints: {
    architectural_decisions: Decision[],
    patterns_to_follow: Pattern[],
    security_requirements: string[]
  },
  options: {
    approach_a: { description, pros, cons, risk_level },
    approach_b: { description, pros, cons, risk_level },
    recommended: "a" | "b"
  },
  unknowns: string[]
}
```

**Stop Point:** Human reviews research, selects approach.

---

### Phase 1.5: DOCUMENTATION — Documentation Agent

**Trigger:** Runs during Research phase, during Architect phase, and before EVERY build step.

**Purpose:** Fetch and verify latest official documentation for all libraries and frameworks used. Prevents the single biggest source of bugs in AI-assisted development: the AI confidently writing code using deprecated or outdated API patterns because its training data is stale.

**Why This Agent Exists:**

Half the bugs in vibe coding come from outdated API syntax. Next.js 16 patterns differ from Next.js 14. FastAPI evolves. AWS SDK changes. The AI confidently writes code using deprecated methods and the developer doesn't catch it because they're not reading the code. This agent kills that entire problem class.

**When It Triggers:**

```
TRIGGER POINTS:
│
├── During RESEARCH phase:
│   "What's the latest way to do X in FastAPI?"
│   "Has this API changed since the AI's training data?"
│
├── During ARCHITECT phase:
│   "What's the current best practice for this pattern?"
│   "Are there breaking changes in the latest version?"
│
├── Before EACH BUILD step:
│   "Check the latest docs for every library this step uses"
│   "Verify the function signatures haven't changed"
│
└── When RUBBER DUCK triggers:
    "Is this error because we're using a deprecated API?"
```

**MemoryLayer MCP Calls:**

```
get_cached_docs(library: library_name, version: version)     [NEW TOOL]
  → Check if we already have current docs cached

cache_docs(library, version, content, source_url)            [NEW TOOL]
  → Store fetched documentation locally

check_version_drift(requirements_file: path)                 [NEW TOOL]
  → Compare project versions against cached docs

search_codebase(query: "package.json requirements.txt")
  → Find project dependency files for version detection
```

**Agent Logic:**

```
INPUT: {
  libraries: ["fastapi", "sqlalchemy", "next.js"],
  specific_apis: ["FastAPI dependency injection", "SQLAlchemy async session"],
  current_versions: { fastapi: "0.115", sqlalchemy: "2.0", next: "16" }
}

PROCESS:
  1. Read project's package.json / requirements.txt for EXACT versions
  2. Check MemoryLayer docs cache for current versions
  3. If cache miss or stale (> 7 days):
     - Fetch latest official documentation for those versions
     - Sources (priority order):
       a. Official docs (docs.python.org, fastapi.tiangolo.com, nextjs.org)
       b. GitHub repos (README, CHANGELOG, migration guides)
       c. Release notes for current version
       d. Stack Overflow (only for specific error patterns)
  4. Compare against what the AI "thinks" the API looks like
  5. Flag any deprecated patterns, breaking changes, or version mismatches
  6. Create a "docs context" that gets injected into Builder's prompt

OUTPUT: {
  docs_context: {
    library: string,
    version: string,
    relevant_apis: {
      name: string,
      current_signature: string,
      usage_example: string,
      deprecation_warnings: string[],
      breaking_changes_from_previous: string[]
    }[],
    migration_notes: string[],
    common_pitfalls: string[]
  }[],
  warnings: {
    outdated_pattern: string,
    correct_pattern: string,
    source: string
  }[],
  version_mismatches: {
    library: string,
    project_version: string,
    latest_version: string,
    breaking_changes: boolean
  }[]
}
```

**Integration with Builder Agent:**

```
BEFORE Builder writes any code:
│
├── Decomposer identifies libraries needed for this step
├── Documentation Agent fetches/retrieves latest docs for those libraries
├── Docs context is injected into Builder's prompt
│
│   Builder prompt now includes:
│   "CURRENT API REFERENCE (verified from official docs):
│    FastAPI 0.115: Depends() syntax is...
│    SQLAlchemy 2.0: async session pattern is...
│    DO NOT use deprecated patterns from older versions."
│
└── Builder writes code using VERIFIED current APIs
```

**No dedicated stop point.** Documentation Agent runs automatically. It blocks only if it detects a critical version mismatch (e.g., project uses library v3 but AI is generating v2 patterns).

---

### Phase 2: MENTAL MODEL — Planner + Architect + Security + Estimator + Designer

**Trigger:** Human approves research and selects approach.

**Purpose:** Create the complete mental model before any code is written. This is where the human and system align on exactly what will be built.

#### 2a. Planner Agent

**MemoryLayer MCP Calls:**

```
get_context(query: feature, current_file: entry_point, max_tokens: 6000)
  → Full context for planning

what_changed(since: "last feature completion")
  → Current project momentum and state

get_changelog(since: "this week")
  → What's in flight right now
```

**Agent Logic:**

```
INPUT: Research brief + selected approach

PROCESS:
  1. Write user story with acceptance criteria
  2. Define scope boundaries (what is IN and OUT)
  3. Identify the vertical slice (DB → Service → API → Frontend)
  4. Define data flow through the entire slice
  5. Identify integration points with existing code
  6. List assumptions that need validation

OUTPUT: {
  user_story: string,
  acceptance_criteria: string[],
  scope: {
    in_scope: string[],
    out_of_scope: string[],
    deferred: string[]
  },
  vertical_slice: {
    database: { tables, columns, migrations },
    service: { functions, business_logic },
    api: { endpoints, request_schemas, response_schemas },
    frontend: { components, pages, user_flows }
  },
  data_flow: DataFlowStep[],
  integration_points: {
    file: string,
    what_changes: string,
    risk: "low" | "medium" | "high"
  }[],
  assumptions: string[]
}
```

#### 2b. Architect Agent

**MemoryLayer MCP Calls:**

```
get_architecture()
  → Current architecture to fit within

validate_pattern(code: proposed_structure)
  → Does this follow patterns?

suggest_existing(intent: each_component_needed)
  → What already exists to reuse?

check_conflicts(code: proposed_architecture)
  → Any decision conflicts?

get_confidence(code: proposed_architecture)
  → System confidence in this approach

get_component_doc(path: each_integration_point)
  → Understand what we're integrating with
```

**Agent Logic:**

```
INPUT: Planner output

PROCESS:
  1. Map feature to existing architecture layers
  2. Identify: files to CREATE (new)
  3. Identify: files to MODIFY (existing, with specific changes)
  4. Identify: files UNCHANGED (exist, will be called but not modified)
  5. Validate against existing patterns
  6. Check for conflicts with recorded decisions
  7. Get confidence score from MemoryLayer
  8. Define new architectural decisions if any

OUTPUT: {
  architecture_fit: {
    layer: string,
    directory: string,
    follows_pattern: boolean
  },
  file_plan: {
    create: {
      path: string,
      purpose: string,
      template_pattern: string,
      depends_on: string[]
    }[],
    modify: {
      path: string,
      what_changes: string,
      risk: "low" | "medium" | "high",
      current_purpose: string
    }[],
    unchanged: {
      path: string,
      role: string
    }[]
  },
  new_decisions: {
    title: string,
    description: string,
    alternatives_considered: string[],
    reasoning: string
  }[],
  pattern_compliance: {
    score: number,
    violations: string[],
    suggestions: string[]
  },
  confidence: {
    score: number,
    level: "high" | "medium" | "low",
    concerns: string[]
  }
}
```

#### 2c. Security Agent

**MemoryLayer MCP Calls:**

```
search_codebase(query: "authentication authorization middleware")
  → Current auth implementation

validate_pattern(code: proposed, category: "authentication")
  → Security pattern compliance

get_component_doc(path: "auth/")
  → Auth system documentation
```

**Agent Logic:**

```
INPUT: Architect output

PROCESS:
  1. Identify all data inputs in the feature
  2. Check each input for validation requirements
  3. Identify PII or sensitive data handling
  4. Check authentication requirements per endpoint
  5. Check authorization (who can access what)
  6. Identify rate limiting needs
  7. Check for EU AI Act compliance (if AI features)
  8. Review error messages (no internal detail leakage)

OUTPUT: {
  risk_level: "low" | "medium" | "high" | "critical",
  requirements: {
    authentication: { endpoints_needing_auth: string[], method: string },
    authorization: { roles_required: Record<string, string[]> },
    input_validation: {
      field: string,
      rules: string[],
      sanitization: string
    }[],
    pii_handling: {
      fields: string[],
      encryption: string,
      retention: string
    },
    rate_limiting: {
      endpoints: string[],
      limits: string
    },
    eu_ai_act: {
      applicable: boolean,
      requirements: string[]
    }
  },
  warnings: string[],
  test_cases_required: string[]
}
```

#### 2d. Estimator Agent

**MemoryLayer MCP Calls:**

```
get_estimates(complexity: similar_complexity)             [NEW TOOL]
  → Past estimates vs actuals for similar features

get_retrospectives(feature_type: similar_type)            [NEW TOOL]
  → Lessons about estimation from past features
```

**Agent Logic:**

```
INPUT: Architect output (file plan with create/modify counts)

PROCESS:
  1. Count files to create and modify
  2. Assess complexity based on integration points
  3. Look up past features with similar complexity
  4. Compare estimated vs actual for those features
  5. Apply correction factor based on historical accuracy
  6. Account for: new tech, unfamiliar patterns, external dependencies

OUTPUT: {
  estimate: {
    optimistic: number,     // sessions
    realistic: number,
    pessimistic: number
  },
  complexity_score: number,   // 1-10
  basis: {
    similar_features: {
      name: string,
      estimated: number,
      actual: number
    }[],
    correction_factor: number,
    confidence: "high" | "medium" | "low"
  },
  risk_factors: string[],
  suggestion: string          // "Consider spiking the OAuth integration first"
}
```

#### 2e. Designer Agent

**MemoryLayer MCP Calls:**

```
search_codebase(query: "component UI pattern")
  → Existing UI components and patterns

get_component_doc(path: "frontend/components/")
  → Existing component documentation

list_patterns(category: "component")
  → UI component patterns
```

**Agent Logic:**

```
INPUT: Planner output (vertical slice frontend section)

PROCESS:
  1. Map user flow (screen by screen)
  2. Identify existing components to reuse
  3. Define new components needed
  4. Specify responsive behavior
  5. Define accessibility requirements
  6. Define loading and error states
  7. Define empty states

OUTPUT: {
  user_flow: {
    step: number,
    screen: string,
    user_action: string,
    system_response: string
  }[],
  components: {
    reuse: { name: string, path: string, modifications: string }[],
    create: {
      name: string,
      purpose: string,
      props: { name: string, type: string, required: boolean }[],
      states: string[],
      accessibility: string[]
    }[]
  },
  states: {
    loading: string,
    empty: string,
    error: string,
    success: string
  }
}
```

**Phase 2 Stop Point:** Human reviews and approves the complete mental model: plan + architecture + security + estimate + design.

---

### Phase 3: PROTOTYPE — Spike Agent

**Trigger:** Human approves mental model. Spike only runs if Estimator flagged high risk or unknowns exist.

**Purpose:** Test the riskiest assumption before committing to full implementation. Throwaway code.

**Rules:**
- Spike code lives in a temporary branch, never merged
- Maximum 1-2 sessions
- Spike answers exactly ONE question: "Is this approach viable?"
- No tests, no patterns, no documentation — pure feasibility

**Agent Logic:**

```
INPUT: {
  question: "Can we stream LLM responses through WebSocket?",
  time_limit: "2 sessions",
  success_criteria: "Bidirectional WebSocket with chunked LLM response"
}

PROCESS:
  1. Build the minimum code to answer the question
  2. Test feasibility
  3. Record what worked and what didn't
  4. Record lessons learned

OUTPUT: {
  question: string,
  verdict: "viable" | "not_viable" | "viable_with_changes",
  evidence: string,
  lessons: string[],
  changes_to_plan: string[],     // if viable_with_changes
  time_spent: number,
  code_location: string          // temp branch reference
}

MEMORYLAYER WRITE:
  log_spike(feature, question, approach, result, viable, lessons)  [NEW TOOL]
```

**Stop Point:** Human reviews spike results, decides to proceed, pivot, or kill.

---

### Phase 4: BUILD — Decomposer + Tester + Builder + Smell + Rubber Duck

**Trigger:** Human approves spike results (or spike was skipped).

#### 4a. Decomposer Agent

Takes the approved plan and creates the ordered implementation steps.

**MemoryLayer MCP Calls:**

```
get_component_doc(path: each_file_to_modify)
  → Understand current state of files

get_related_tests(file: each_file_to_modify)
  → What tests exist for these files

list_patterns(category: relevant)
  → Patterns each step should follow
```

**Agent Logic:**

```
INPUT: Approved plan + architecture + security requirements

PROCESS:
  1. Order steps bottom-up: DB → Service → API → Frontend
  2. For each step define:
     - Exact file and function
     - Input and output
     - Dependencies on previous steps
     - Which layer it belongs to
     - Security requirements from Security Agent
     - Design requirements from Designer Agent
  3. Identify test requirements per step
  4. Estimate per-step complexity

OUTPUT: {
  steps: {
    order: number,
    layer: "database" | "service" | "api" | "frontend",
    action: "create" | "modify",
    file: string,
    function_name: string,
    description: string,
    input: { name: string, type: string }[],
    output: { type: string, description: string },
    depends_on: number[],           // step numbers
    security: string[],             // from Security Agent
    design: string | null,          // from Designer Agent
    test_cases: string[],           // what to test
    pattern_to_follow: string | null,
    estimated_complexity: "low" | "medium" | "high"
  }[],
  total_steps: number,
  build_order_rationale: string
}
```

**Stop Point:** Human approves implementation plan.

#### 4b. Tester Agent — Pre-Build

Writes tests BEFORE Builder writes code. Tests define the contract.

**MemoryLayer MCP Calls:**

```
get_related_tests(file: target_file)
  → Existing tests to not duplicate

check_tests(change: planned_change)
  → Will existing tests be affected?

get_test_coverage(file: target_file)
  → Current coverage to improve
```

**Agent Logic:**

```
INPUT: One decomposed step

PROCESS:
  1. Read the step's input/output contract
  2. Write unit test for happy path
  3. Write unit test for error cases
  4. Write unit test for edge cases
  5. Write security test cases (from Security Agent)
  6. Verify no duplication with existing tests

OUTPUT: {
  test_file: string,
  test_code: string,
  test_cases: {
    name: string,
    type: "unit" | "integration" | "security",
    tests: "happy_path" | "error" | "edge_case",
    assertion: string
  }[],
  existing_tests_affected: {
    file: string,
    needs_update: boolean,
    reason: string
  }[]
}
```

**Stop Point:** Human reviews test cases.

#### 4c. Builder Agent

Writes code to make the tests pass. One step at a time.

**MemoryLayer MCP Calls:**

```
validate_pattern(code: what_I_just_wrote)
  → Pattern compliance check

get_confidence(code: what_I_just_wrote)
  → Confidence score

suggest_existing(intent: what_Im_building)
  → Am I duplicating existing code?

get_context(query: current_step, current_file: target)
  → Relevant context for this step
```

**Agent Logic:**

```
INPUT: One decomposed step + tests for that step

PROCESS:
  1. Read the step specification
  2. Read existing code in target file (if modify)
  3. Read the tests to understand the contract
  4. Write code that follows specified patterns
  5. Validate against patterns
  6. Check for duplication
  7. Explain what was written and why

OUTPUT: {
  file: string,
  code: string,
  explanation: {
    what_it_does: string,
    why_this_approach: string,
    how_it_connects: string          // to previous step
  },
  pattern_validation: {
    score: number,
    violations: string[]
  },
  confidence: {
    score: number,
    concerns: string[]
  }
}
```

**Stop Point:** Human reviews code, comments, modifies, approves.

#### 4d. Tester Agent — Post-Build

Runs all tests after Builder completes a step.

```
PROCESS:
  1. Run new tests for this step
  2. Run all related existing tests
  3. Report results

OUTPUT: {
  new_tests: { passed: number, failed: number, details: TestResult[] },
  existing_tests: { passed: number, failed: number, details: TestResult[] },
  coverage: { before: number, after: number },
  verdict: "all_pass" | "failures_exist"
}

IF failures_exist:
  → Builder fixes before proceeding
  → No new step until all tests pass
```

#### 4e. Smell Agent — After Each Build Step

Runs passively after each build step. Warns but does not block.

**MemoryLayer MCP Calls:**

```
check_complexity_trend(file: changed_file)               [NEW TOOL]
  → Is complexity growing too fast?

detect_scope_creep(plan: original_plan, current: current_state)  [NEW TOOL]
  → Are we building more than planned?
```

**Agent Logic:**

```
INPUT: Builder output + original plan

CHECKS:
  1. File length: > 300 lines? WARN
  2. Function length: > 50 lines? WARN
  3. Dependencies added: > 3 new imports? WARN
  4. Copy-paste detected: similar code blocks? WARN
  5. Complexity trend: growing faster than historical average? WARN
  6. Scope creep: building something not in the original plan? WARN

OUTPUT: {
  warnings: {
    type: "complexity" | "scope_creep" | "duplication" | "size",
    severity: "info" | "warning" | "critical",
    message: string,
    suggestion: string
  }[],
  metrics: {
    file_lines: number,
    functions_added: number,
    dependencies_added: number,
    scope_drift_score: number      // 0 = on track, 100 = off the rails
  }
}
```

#### 4f. Rubber Duck Agent — On Demand

Triggered when Builder encounters an error or gets stuck.

```
INPUT: Error message or "I'm stuck on X"

PROCESS:
  1. Ask: "What should this code do? Explain step by step."
  2. Ask: "What does it actually do? Trace the execution."
  3. Identify: The delta between 1 and 2 IS the bug.
  4. Ask: "What assumption might be wrong?"
  5. Only THEN suggest a fix with root cause analysis.

OUTPUT: {
  root_cause: string,
  wrong_assumption: string,
  suggested_fix: {
    file: string,
    change: string,
    reasoning: string
  },
  similar_past_bugs: Bug[]        // from MemoryLayer
}

MEMORYLAYER CALL:
  find_similar_bugs(error: error_message)
  → Has this type of bug happened before?
```

#### Build Phase Loop

```
FOR each step in decomposition:
  │
  ├── Documentation Agent fetches latest docs for step's libraries
  ├── Tester writes tests (with verified API signatures)
  ├── Builder writes code (with docs context injected)
  ├── Tester runs tests
  │   ├── IF fail → Rubber Duck diagnoses → Builder fixes → Tester reruns
  │   └── IF pass → continue
  ├── Smell Agent checks
  │   ├── IF critical warning → Human reviews
  │   └── IF info/warning → Log, continue
  ├── Moderator updates CODEBASE_MAP.md
  │
  └── >>> Human verifies → Next step
```

---

### Phase 5: REVIEW — Review Agent

**Trigger:** All build steps complete, all tests pass.

**Purpose:** Full code review of the entire feature diff, like a senior engineer would do.

**MemoryLayer MCP Calls:**

```
validate_pattern(code: complete_feature_diff)
  → Pattern compliance across entire feature

get_confidence(code: complete_feature_diff)
  → Overall confidence

check_tests(change: complete_feature_diff)
  → Full test coverage verification

check_conflicts(code: complete_feature_diff)
  → Any decision conflicts in final form

get_architecture()
  → Does the feature fit the architecture properly?
```

**Agent Logic:**

```
INPUT: Complete feature diff (all files created/modified)

CHECKS:
  1. Does implementation match the approved plan?
  2. Are all acceptance criteria met?
  3. Pattern violations across all new code?
  4. Dead code or unused imports?
  5. Error messages helpful to users (not developers)?
  6. Edge cases handled?
  7. Security requirements from Security Agent all implemented?
  8. Design requirements from Designer Agent all implemented?
  9. Would a new developer understand this code?
  10. Performance concerns (N+1 queries, unbounded loops)?

OUTPUT: {
  verdict: "approve" | "changes_required",
  score: number,                  // 0-100
  checks: {
    plan_match: boolean,
    acceptance_criteria: { criterion: string, met: boolean }[],
    pattern_compliance: number,
    security_compliance: number,
    test_coverage: number,
    readability: number
  },
  required_changes: {
    file: string,
    issue: string,
    severity: "must_fix" | "should_fix" | "nice_to_have",
    suggestion: string
  }[],
  summary: string
}
```

**Stop Point:** Human reviews. If changes required, Builder fixes, Tester reruns, Review re-checks.

---

### Phase 5.5: DEPLOY — Deployment Agent

**Trigger:** Review Agent approves feature.

**Purpose:** Get the code running in the target environment. Not just "push to prod" — the full infrastructure pipeline including Terraform, Docker, Nginx, and CI/CD.

**Sub-Systems:**

```
┌─────────────────────────────────────────────────┐
│              DEPLOYMENT AGENT                    │
│                                                  │
│  ┌───────────┐ ┌──────────┐ ┌────────────────┐ │
│  │   INFRA   │ │ CONTAINER│ │    ROUTING     │ │
│  │ Terraform │ │  Docker  │ │  Nginx/Caddy   │ │
│  └───────────┘ └──────────┘ └────────────────┘ │
│  ┌───────────┐ ┌──────────┐ ┌────────────────┐ │
│  │    CI/CD  │ │  SECRETS │ │   MONITORING   │ │
│  │  Pipeline │ │   Mgmt   │ │  Health Checks │ │
│  └───────────┘ └──────────┘ └────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Four Deployment Modes:**

```
MODE 1: INFRASTRUCTURE (Terraform)
  When: New service, new database, new cache, scaling change
  Actions:
    - Read existing Terraform state
    - Generate/modify .tf files for new resources
    - Plan (terraform plan) — show what will change
    - >>> STOP — Human approves infra changes
    - Apply (terraform apply)
    - Update INFRASTRUCTURE.md

MODE 2: CONTAINERIZATION (Docker)
  When: New service, dependency change, runtime change
  Actions:
    - Read existing Dockerfile
    - Update or create Dockerfile for changes
    - Update docker-compose.yml if needed
    - Build and test locally
    - Push to container registry
    - Update DEPLOYMENT.md

MODE 3: ROUTING (Nginx/Caddy)
  When: New API endpoints, new frontend routes, SSL changes
  Actions:
    - Read existing nginx.conf / Caddyfile
    - Add new routes, upstream configs, SSL certs
    - Validate config (nginx -t)
    - >>> STOP — Human approves routing changes
    - Reload configuration
    - Update ROUTING.md

MODE 4: PIPELINE (CI/CD)
  When: New test requirements, new build steps, new deploy targets
  Actions:
    - Read existing CI/CD config (GitHub Actions, etc.)
    - Add/modify pipeline steps
    - Ensure tests run before deploy
    - Ensure rollback is possible
    - Update CI_CD.md
```

**MemoryLayer MCP Calls:**

```
search_codebase(query: "Dockerfile docker-compose terraform nginx")
  → Find existing deployment configuration

get_component_doc(path: "infrastructure/")
  → Current infrastructure documentation

get_context(query: "deployment configuration", max_tokens: 6000)
  → Full deployment context

get_cached_docs(library: "terraform-aws", version: current)
  → Latest Terraform provider docs

get_cached_docs(library: "nginx", version: current)
  → Latest Nginx configuration reference

get_cached_docs(library: "docker", version: current)
  → Latest Docker best practices
```

**Agent Logic:**

```
INPUT: Approved feature + Review Agent output

PROCESS:
  1. ANALYZE: What infrastructure does this feature need?
     - New database tables? → Migration already done in Build
     - New environment variables? → Add to secrets management
     - New API endpoints? → Update Nginx routing
     - New service? → Terraform + Docker + routing
     - Changed dependencies? → Rebuild container
     - Changed ports? → Update docker-compose + Nginx

  2. CHECK: Read existing deployment configuration
     - Current Terraform state
     - Current Docker setup
     - Current Nginx config
     - Current CI/CD pipeline

  3. DOCS: Documentation Agent fetches latest docs
     - Terraform provider docs for AWS resources used
     - Docker best practices for current base image
     - Nginx config reference for routing patterns

  4. PLAN: Generate deployment plan
     - What files to create/modify
     - What commands to run
     - What order (infra → container → routing → pipeline)
     - What can go wrong (rollback plan)

  5. SECURITY CHECK: Security Agent reviews deployment
     - No secrets in Dockerfiles or Terraform
     - Environment variables for all sensitive config
     - SSL/TLS configured correctly
     - Network security groups correct
     - CORS settings correct for new endpoints

OUTPUT: {
  deployment_plan: {
    infrastructure: {
      changes: TerraformChange[],
      new_resources: string[],
      estimated_cost_change: string
    },
    containerization: {
      dockerfile_changes: string,
      compose_changes: string,
      new_env_vars: { name: string, secret: boolean }[]
    },
    routing: {
      new_routes: { path: string, upstream: string }[],
      ssl_changes: boolean,
      nginx_config_diff: string
    },
    pipeline: {
      new_steps: string[],
      modified_steps: string[]
    }
  },
  rollback_plan: {
    steps: string[],
    automated: boolean
  },
  pre_deploy_checks: string[],
  post_deploy_checks: string[],
  estimated_downtime: string
}
```

**Stop Point:** Human approves deployment plan.

**Execution Sequence:**

```
AFTER human approval:
│
├── 1. Apply infrastructure changes (Terraform)
├── 2. Build and push containers (Docker)
├── 3. Update routing (Nginx)
├── 4. Update CI/CD pipeline
├── 5. Run pre-deploy health checks
├── 6. Deploy
├── 7. Run post-deploy health checks
│   ├── IF health checks pass → Feature live
│   └── IF health checks fail → Automatic rollback
├── 8. Moderator updates:
│      - INFRASTRUCTURE.md
│      - DEPLOYMENT.md
│      - ROUTING.md
│      - CI_CD.md
│      - RUNBOOK.md
│
└── Feature deployed successfully
```

---

### Phase 6: REFLECT — Retrospective Agent

**Trigger:** Review Agent approves AND Deployment Agent succeeds. Feature is merged and live.

**Purpose:** Learn from the experience. This is what makes the system smarter over time.

**MemoryLayer MCP Calls (WRITES):**

```
record_decision(title, description, files, tags)
  → Record any new architectural decisions

learn_pattern(name, category, examples)
  → Codify any new patterns that emerged

log_failure(feature, approach, why_failed, lesson)         [NEW TOOL]
  → Record what didn't work (if anything)

update_estimate(feature, estimated, actual, notes)         [NEW TOOL]
  → Track estimation accuracy

log_retrospective(feature, surprises, would_change, ...)   [NEW TOOL]
  → Store the learning for future features

generate_docs(path: each_new_file, type: "component")
  → Generate living docs for all new code
```

**Agent Logic:**

```
INPUT: Completed feature + all phase outputs

PROCESS:
  1. Compare estimated vs actual effort
  2. What was surprising during implementation?
  3. What would we do differently next time?
  4. Did the spike (if any) accurately predict feasibility?
  5. What new patterns emerged worth codifying?
  6. What should be added to failure memory?
  7. Update all documentation

OUTPUT: {
  feature: string,
  estimation_accuracy: {
    estimated: number,
    actual: number,
    variance: number,
    correction_factor: number
  },
  learnings: {
    surprises: string[],
    would_change: string[],
    new_patterns: Pattern[],
    failures: Failure[]
  },
  spike_accuracy: number | null,
  documentation_updates: string[],
  decisions_recorded: string[]
}
```

No stop point — this runs automatically after merge.

---

### Moderator Agent — Continuous

**Runs:** After every agent output and on any pivot/change.

**Purpose:** Single source of truth. If anything changes anywhere, Moderator propagates to everywhere.

**MemoryLayer MCP Calls:**

```
record_decision()         → On architectural decisions
generate_docs()           → On file changes
learn_pattern()           → On new patterns
what_changed()            → On pivot detection
check_conflicts()         → On consistency verification
```

**Trigger Events:**

```
TRIGGERS:
  │
  ├── AFTER Why Agent      → Log feature initiation
  ├── AFTER Research       → Log research findings
  ├── AFTER Documentation  → Cache docs, flag version mismatches
  ├── AFTER Planner        → Create planning document, update project status
  ├── AFTER Architect      → Update ARCHITECTURE.md, record decisions
  ├── AFTER Security       → Update SECURITY.md
  ├── AFTER Estimator      → Log estimate for future comparison
  ├── AFTER Spike          → Log spike results
  ├── AFTER each Build step → Update CODEBASE_MAP.md, track progress
  ├── AFTER Review         → Update CHANGELOG.md
  ├── AFTER Deployment     → Update INFRASTRUCTURE.md, DEPLOYMENT.md,
  │                          ROUTING.md, CI_CD.md, RUNBOOK.md
  ├── AFTER Retrospective  → Update all learning documents
  │
  ├── ON PIVOT:
  │   1. Detect scope change
  │   2. Generate impact report:
  │      - Files already written that need modification
  │      - Steps already completed that need revision
  │      - Tests that need rewriting
  │      - Decisions that need reversing
  │      - Estimates that need updating
  │      - Deployment config that needs updating
  │      - Documentation cache that needs refreshing (new libraries)
  │   3. Present impact to human
  │   4. On approval: re-trigger affected agents
  │   5. Documentation Agent re-fetches docs if libraries changed
  │
  └── ON CONFLICT:
      1. Detect decision conflict
      2. Flag to human with both sides
      3. On resolution: update DECISIONS.md
```

**Moderator Output on Pivot:**

```
OUTPUT: {
  pivot_detected: boolean,
  change_description: string,
  impact: {
    files_to_modify: { path: string, reason: string }[],
    steps_to_redo: number[],
    tests_to_rewrite: string[],
    decisions_to_reverse: string[],
    estimate_change: { before: number, after: number },
    deployment_changes: {
      infrastructure: boolean,
      container: boolean,
      routing: boolean,
      pipeline: boolean
    },
    docs_cache_invalidated: string[]
  },
  recommendation: string,
  requires_human_decision: boolean
}
```

---

## 4. Document Management System

The Moderator maintains these documents throughout the lifecycle:

```
/docs/
├── CODEBASE_MAP.md          Updated: After every Build step
│   Every file, purpose, I/O, connections
│
├── ARCHITECTURE.md          Updated: After Architect, after decisions
│   System architecture, layers, data flow
│
├── DECISIONS.md             Updated: After Architect, Retrospective, pivots
│   All architectural decisions + reasoning + alternatives
│
├── PATTERNS.md              Updated: After Retrospective, pattern learning
│   Codified patterns the Builder must follow
│
├── CHANGELOG.md             Updated: After Review approves
│   What shipped, when, why
│
├── SECURITY.md              Updated: After Security Agent
│   Security requirements, PII map, compliance
│
├── FAILURES.md              Updated: After Retrospective
│   What was tried, what failed, why, lessons
│
├── ESTIMATES.md             Updated: After Retrospective
│   Estimated vs actual, correction factors
│
├── INFRASTRUCTURE.md        Updated: After Deployment Agent
│   Terraform resources, cloud architecture, costs
│
├── DEPLOYMENT.md            Updated: After Deployment Agent
│   Docker setup, container registry, build process
│
├── ROUTING.md               Updated: After Deployment Agent
│   Nginx config, SSL, domain mapping
│
├── CI_CD.md                 Updated: After Deployment Agent
│   Pipeline stages, test gates, deploy process
│
├── RUNBOOK.md               Updated: After Deployment Agent
│   How to deploy, rollback, scale, debug in production
│
├── /plans/
│   ├── /active/
│   │   └── feature-{name}.md    Created: After Planner
│   │       Contains: plan + architecture + security + estimate + design
│   │       Updated: On pivot by Moderator
│   │
│   └── /done/
│       └── feature-{name}.md    Moved: After Retrospective
│           Contains: plan + outcomes + learnings
│
├── /spikes/
│   └── spike-{name}.md         Created: After Spike Agent
│       Contains: question, approach, results, lessons
│
├── /retrospectives/
│   └── retro-{name}.md         Created: After Retrospective Agent
│       Contains: full learning report
│
└── /docs-cache/
    └── {library}-{version}.md   Updated: Documentation Agent
        Cached API references for project dependencies
        Invalidated after 7 days or on version change
```

---

## 5. Agent Communication Protocol

Agents don't talk to each other directly. They communicate through a shared state object that flows through the pipeline.

```typescript
interface PipelineState {
  // Feature identity
  feature_id: string;
  feature_request: string;
  status: PipelinePhase;

  // Phase outputs (accumulated as pipeline progresses)
  why: WhyAgentOutput | null;
  research: ResearchAgentOutput | null;
  documentation: DocumentationAgentOutput | null;
  plan: PlannerAgentOutput | null;
  architecture: ArchitectAgentOutput | null;
  security: SecurityAgentOutput | null;
  estimate: EstimatorAgentOutput | null;
  design: DesignerAgentOutput | null;
  spike: SpikeAgentOutput | null;
  decomposition: DecomposerAgentOutput | null;

  // Build tracking
  current_step: number;
  completed_steps: CompletedStep[];
  test_results: TestResult[];
  smell_warnings: SmellWarning[];
  docs_context_per_step: Map<number, DocumentationAgentOutput>;

  // Post-build
  review: ReviewAgentOutput | null;
  deployment: DeploymentAgentOutput | null;
  retrospective: RetrospectiveAgentOutput | null;

  // Meta
  pivots: PivotEvent[];
  moderator_logs: ModeratorLog[];
  human_approvals: Approval[];
  started_at: Date;
  updated_at: Date;
}

type PipelinePhase =
  | "impulse"
  | "research"
  | "documentation"
  | "planning"
  | "spiking"
  | "building"
  | "reviewing"
  | "deploying"
  | "reflecting"
  | "complete";
```

---

## 6. New MemoryLayer Tools Required

These tools must be added to MemoryLayer before the orchestration layer can function:

| Tool | Purpose | Database Table |
|------|---------|----------------|
| `log_failure` | Record what approach failed and why | failures |
| `get_failures` | Find past failures similar to current feature | failures |
| `update_estimate` | Record estimated vs actual effort | estimates |
| `get_estimates` | Find past estimates for similar complexity | estimates |
| `log_retrospective` | Store post-feature learnings | retrospectives |
| `get_retrospectives` | Find learnings from similar past features | retrospectives |
| `log_spike` | Record spike question, approach, and result | spikes |
| `get_spike_results` | Find past spike results for similar questions | spikes |
| `check_complexity_trend` | Track file complexity over time | complexity_snapshots |
| `detect_scope_creep` | Compare current state against original plan | uses pipeline state |
| `cache_docs` | Store fetched library documentation locally | docs_cache |
| `get_cached_docs` | Retrieve cached docs for a library + version | docs_cache |
| `check_version_drift` | Compare project versions against cached docs | docs_cache |

### New Database Tables

```sql
-- Documentation cache
CREATE TABLE docs_cache (
  id TEXT PRIMARY KEY,
  library TEXT NOT NULL,
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  fetched_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER,
  UNIQUE(library, version)
);

CREATE INDEX IF NOT EXISTS idx_docs_library ON docs_cache(library);
CREATE INDEX IF NOT EXISTS idx_docs_expires ON docs_cache(expires_at);

-- Failure memory
CREATE TABLE failures (
  id TEXT PRIMARY KEY,
  feature TEXT NOT NULL,
  approach TEXT NOT NULL,
  why_failed TEXT NOT NULL,
  lesson TEXT NOT NULL,
  related_decision TEXT,
  logged_at INTEGER DEFAULT (unixepoch())
);

-- Estimation tracking
CREATE TABLE estimates (
  id TEXT PRIMARY KEY,
  feature TEXT NOT NULL,
  estimated_sessions INTEGER,
  actual_sessions INTEGER,
  complexity_score REAL,
  files_created INTEGER,
  files_modified INTEGER,
  notes TEXT,
  completed_at INTEGER
);

-- Retrospectives
CREATE TABLE retrospectives (
  id TEXT PRIMARY KEY,
  feature TEXT NOT NULL,
  surprises TEXT,
  would_change TEXT,
  new_patterns TEXT,
  spike_accuracy REAL,
  logged_at INTEGER DEFAULT (unixepoch())
);

-- Spike results
CREATE TABLE spikes (
  id TEXT PRIMARY KEY,
  feature TEXT NOT NULL,
  question TEXT NOT NULL,
  approach TEXT NOT NULL,
  result TEXT NOT NULL,
  viable BOOLEAN,
  lessons TEXT,
  time_spent INTEGER,
  logged_at INTEGER DEFAULT (unixepoch())
);

-- Complexity tracking
CREATE TABLE complexity_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  lines INTEGER,
  functions INTEGER,
  dependencies INTEGER,
  complexity_score REAL,
  snapshot_at INTEGER DEFAULT (unixepoch())
);
```

---

## 7. Implementation Sequence

### Phase A: Foundation (Week 1-2)

```
Step 1: Pipeline State Schema
  - Define PipelineState TypeScript interface
  - Define all 18 agent output interfaces
  - Build state persistence (SQLite or JSON file)

Step 2: Pipeline Engine
  - Build the orchestrator that moves state through phases
  - Implement stop-point logic (pause for human approval)
  - Implement phase transition rules

Step 3: Moderator Agent
  - Build first because it runs across all phases
  - Document update logic (all 13 doc files)
  - Pivot detection logic
  - Conflict detection logic
```

### Phase B: Pre-Build Agents (Week 3-4)

```
Step 4: Why Agent
  - Requirement challenging logic
  - Prior art search integration
  - Simplification suggestions

Step 5: Research Agent
  - Deep search integration
  - Options synthesis
  - Warning aggregation

Step 6: Documentation Agent
  - Version detection from package.json / requirements.txt
  - Official docs fetching and parsing
  - Docs caching in MemoryLayer (cache_docs, get_cached_docs)
  - Version drift detection (check_version_drift)
  - Stale cache invalidation (7-day expiry)
  - Docs context injection format for Builder prompt

Step 7: Planner Agent
  - Vertical slice decomposition
  - Scope definition
  - Data flow mapping

Step 8: Architect Agent
  - File plan generation (create/modify/unchanged)
  - Pattern validation integration
  - Confidence scoring integration
```

### Phase C: Build Agents (Week 5-6)

```
Step 9: Decomposer Agent
  - Step ordering logic (bottom-up)
  - Dependency mapping
  - Per-step specification
  - Library identification per step (for Documentation Agent)

Step 10: Tester Agent
  - Pre-build test generation
  - Post-build test execution
  - Coverage tracking

Step 11: Builder Agent
  - Single-step code generation
  - Docs context consumption (from Documentation Agent)
  - Pattern compliance
  - Explanation generation

Step 12: Smell Agent
  - Complexity monitoring
  - Scope creep detection
  - Warning system
```

### Phase D: Post-Build Agents (Week 7-8)

```
Step 13: Security Agent
  - Security requirement generation
  - Compliance checking
  - Deployment security review

Step 14: Estimator Agent
  - Historical comparison
  - Correction factor calculation

Step 15: Designer Agent
  - User flow definition
  - Component specification

Step 16: Review Agent
  - Full-diff review logic
  - Acceptance criteria verification

Step 17: Deployment Agent
  - Terraform integration (plan, apply, state reading)
  - Docker management (Dockerfile generation, compose, build, push)
  - Nginx/Caddy config generation and validation
  - CI/CD pipeline modification (GitHub Actions, etc.)
  - Secrets management (env var detection, no hardcoded secrets)
  - Health check execution (pre-deploy and post-deploy)
  - Rollback automation
  - Deployment document generation (INFRASTRUCTURE.md, DEPLOYMENT.md,
    ROUTING.md, CI_CD.md, RUNBOOK.md)

Step 18: Retrospective Agent
  - Learning capture
  - MemoryLayer write-back

Step 19: Rubber Duck Agent
  - Explanation-driven debugging
  - Root cause analysis

Step 20: Spike Agent
  - Throwaway prototype management
  - Feasibility evaluation
```

### Phase E: Integration & Polish (Week 9-10)

```
Step 21: New MemoryLayer tools
  - Failures (log_failure, get_failures)
  - Estimates (update_estimate, get_estimates)
  - Retrospectives (log_retrospective, get_retrospectives)
  - Spikes (log_spike, get_spike_results)
  - Complexity (check_complexity_trend)
  - Documentation cache (cache_docs, get_cached_docs, check_version_drift)

Step 22: End-to-end pipeline testing with a real feature

Step 23: Pivot handling and recovery testing

Step 24: Deployment pipeline testing (Terraform + Docker + Nginx)

Step 25: Documentation and README
```

---

## 8. How to Run the Pipeline (User Interface)

```
# Start a new feature
agent start "Add candidate login with email/password"

  → Why Agent runs, presents verdict
  → Human approves: "proceed"

  → Research Agent runs, presents options
  → Documentation Agent fetches latest FastAPI, SQLAlchemy, Next.js docs
  → Human selects: "approach A"

  → Planner + Architect + Security + Estimator + Designer run
  → Human approves: "looks good"

  → Estimator says: "High risk on OAuth integration"
  → Spike Agent runs throwaway prototype
  → Human reviews: "viable, proceed"

  → Decomposer breaks into 8 steps
  → Human approves: "go"

  → Step 1: Docs Agent verifies APIs → Tester writes tests → Builder codes → Tests pass → Next
  → Step 2: Docs Agent verifies APIs → Tester writes tests → Builder codes → Tests pass → Next
  → ...
  → Step 8: Complete

  → Review Agent does full code review
  → Human approves: "merge"

  → Deployment Agent generates deployment plan
     - Terraform: No new infrastructure needed
     - Docker: Rebuild container (new dependencies)
     - Nginx: Add /api/v1/auth/* routes
     - CI/CD: No changes
  → Human approves: "deploy"
  → Health checks pass → Feature live

  → Retrospective Agent captures learnings
  → Moderator updates all docs
  → Feature complete

# Check status anytime
agent status

# Pivot mid-feature
agent pivot "Actually, use OAuth instead of email/password"
  → Moderator generates impact report
  → Human approves impact
  → Documentation Agent fetches OAuth library docs
  → Pipeline re-enters from affected phase

# Resume after break
agent resume
  → Loads pipeline state, continues from last stop point

# Check docs freshness
agent docs-status
  → Shows cached docs, versions, staleness
```

---

## 9. Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Features shipped without reverting | > 90% | Git history |
| Test coverage per feature | > 80% | Coverage reports |
| Estimation accuracy | Within 30% | Estimates vs actuals |
| Scope creep detection | Caught before review | Smell Agent logs |
| Pattern compliance | > 85% score | MemoryLayer validation |
| Time to first build step | < 30 minutes | Pipeline timestamps |
| Failure repeat rate | 0% | Failure memory matches |
| Doc freshness | < 24h stale | Moderator validation |
| Deprecated API usage | 0 instances | Documentation Agent warnings |
| Deployment success rate | > 95% first attempt | Deployment Agent logs |
| Rollback time | < 5 minutes | Deployment Agent automation |
| Docs cache hit rate | > 80% | Documentation Agent metrics |

---

## 10. Full Pipeline Summary

```
Phase 0:   IMPULSE         → Why Agent
Phase 1:   RESEARCH        → Research Agent + Documentation Agent
Phase 2:   MENTAL MODEL    → Planner + Architect + Security + Estimator + Designer
Phase 3:   PROTOTYPE       → Spike Agent
Phase 4:   BUILD           → Decomposer + (Documentation → Tester → Builder) loop
                              + Smell Agent + Rubber Duck Agent
Phase 5:   REVIEW          → Review Agent
Phase 5.5: DEPLOY          → Deployment Agent (+ Security + Documentation)
Phase 6:   REFLECT         → Retrospective Agent
ALWAYS:    MODERATOR       → Document management + consistency

Total Agents: 18
Total Documents Managed: 13
Total MemoryLayer Tools: 38+ (25 existing + 13 new)
Total Database Tables: 21+ (15 existing + 6 new)
```

---

## 11. What This System Is NOT

- NOT autonomous. Every phase has a human stop point.
- NOT a replacement for thinking. The human still makes all decisions.
- NOT an AI that writes entire features. It writes one step at a time.
- NOT magic. It's a disciplined workflow with persistent memory.

It is: **a senior engineering team's cognitive process, codified into a repeatable pipeline, backed by persistent memory that gets smarter with every feature shipped.**
