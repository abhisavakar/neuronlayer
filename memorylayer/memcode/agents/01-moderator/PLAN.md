# Moderator Agent

## Overview

The Moderator Agent is the **foundation agent** that runs continuously across all phases. It maintains consistency, propagates changes to documentation, detects pivots, and handles conflicts.

## Purpose

The Moderator ensures that the single source of truth remains accurate. If anything changes anywhere, the Moderator propagates changes everywhere.

## Responsibilities

1. **Document Management** - Maintain all living documentation
2. **Pivot Detection** - Detect when scope changes and manage impact
3. **Conflict Detection** - Identify decision conflicts
4. **Logging** - Track all agent activities
5. **State Validation** - Ensure pipeline state consistency

## When It Runs

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
│   2. Generate impact report
│   3. Present impact to human
│   4. On approval: re-trigger affected agents
│   5. Documentation Agent re-fetches docs if libraries changed
│
└── ON CONFLICT:
    1. Detect decision conflict
    2. Flag to human with both sides
    3. On resolution: update DECISIONS.md
```

## MemoryLayer MCP Calls

```typescript
// Document management
record_decision(title, description, files, tags)
  → On architectural decisions

generate_docs(path: file_path, type: "component")
  → On file changes

learn_pattern(name, category, examples)
  → On new patterns

// Change tracking
what_changed(since: timestamp)
  → On pivot detection

check_conflicts(proposed: change)
  → On consistency verification

// Logging
log_failure(feature, approach, why_failed, lesson)
  → On failures

update_estimate(feature, estimated, actual, notes)
  → On completion

log_retrospective(feature, surprises, would_change, ...)
  → On reflection

log_spike(feature, question, approach, result, viable, lessons)
  → After spike
```

## Input/Output

### Input
```typescript
interface ModeratorInput {
  trigger: TriggerEvent;
  current_state: PipelineState;
  agent_output: AgentOutput;  // Output from the agent that just ran
  previous_state?: PipelineState;
}

type TriggerEvent =
  | { type: "agent_complete"; agent: string; phase: PipelinePhase }
  | { type: "pivot_detected"; change_description: string }
  | { type: "conflict_detected"; decision_id: string }
  | { type: "build_step_complete"; step: number }
  | { type: "human_approval"; phase: PipelinePhase; approved: boolean };
```

### Output
```typescript
interface ModeratorOutput {
  // What the moderator did
  actions_taken: ModeratorAction[];
  
  // Documents updated
  documents_updated: string[];
  
  // Any issues found
  issues: ModeratorIssue[];
  
  // If pivot detected
  pivot_analysis?: PivotAnalysis;
  
  // If conflict detected
  conflict_analysis?: ConflictAnalysis;
  
  // Updated state
  updated_state: PipelineState;
  
  // Requires human decision?
  requires_human_decision: boolean;
  
  // Next recommended action
  recommendation: string;
}

interface ModeratorAction {
  type: "update_document" | "log_event" | "detect_pivot" | "detect_conflict" | "propagate_change";
  description: string;
  files_affected: string[];
}

interface ModeratorIssue {
  severity: "info" | "warning" | "critical";
  type: string;
  message: string;
  suggested_action: string;
}

interface PivotAnalysis {
  pivot_detected: boolean;
  change_description: string;
  impact: PivotImpact;
  recommendation: string;
  requires_human_decision: boolean;
}

interface PivotImpact {
  files_to_modify: { path: string; reason: string }[];
  steps_to_redo: number[];
  tests_to_rewrite: string[];
  decisions_to_reverse: string[];
  estimate_change: { before: number; after: number };
  deployment_changes: {
    infrastructure: boolean;
    container: boolean;
    routing: boolean;
    pipeline: boolean;
  };
  docs_cache_invalidated: string[];
}

interface ConflictAnalysis {
  conflict_detected: boolean;
  conflict_type: string;
  description: string;
  involved_decisions: string[];
  resolution_options: string[];
}
```

## Document Management

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

## Implementation

```typescript
// src/agents/moderator/index.ts

export class ModeratorAgent {
  private engine: MemoryLayerEngine;
  private docManager: DocumentManager;
  private pivotDetector: PivotDetector;
  private conflictDetector: ConflictDetector;
  
  constructor(config: AgentConfig) {
    this.engine = config.engine;
    this.docManager = new DocumentManager(config.projectPath);
    this.pivotDetector = new PivotDetector();
    this.conflictDetector = new ConflictDetector(this.engine);
  }
  
  async process(input: ModeratorInput): Promise<ModeratorOutput> {
    const actions: ModeratorAction[] = [];
    const issues: ModeratorIssue[] = [];
    const documents_updated: string[] = [];
    
    // 1. Handle trigger-specific logic
    switch (input.trigger.type) {
      case "agent_complete":
        const agentActions = await this.handleAgentComplete(
          input.trigger.agent,
          input.agent_output,
          input.current_state
        );
        actions.push(...agentActions);
        break;
        
      case "pivot_detected":
        const pivotAnalysis = await this.analyzePivot(
          input.trigger.change_description,
          input.current_state
        );
        return {
          actions_taken: actions,
          documents_updated,
          issues,
          pivot_analysis: pivotAnalysis,
          updated_state: input.current_state,
          requires_human_decision: true,
          recommendation: "Review pivot impact and approve/reject changes"
        };
        
      case "conflict_detected":
        const conflictAnalysis = await this.analyzeConflict(
          input.trigger.decision_id,
          input.current_state
        );
        return {
          actions_taken: actions,
          documents_updated,
          issues,
          conflict_analysis: conflictAnalysis,
          updated_state: input.current_state,
          requires_human_decision: true,
          recommendation: "Resolve decision conflict"
        };
        
      case "build_step_complete":
        const stepActions = await this.handleBuildStepComplete(
          input.trigger.step,
          input.agent_output as BuilderAgentOutput,
          input.current_state
        );
        actions.push(...stepActions);
        break;
        
      case "human_approval":
        // Just log the approval
        actions.push({
          type: "log_event",
          description: `Human ${input.trigger.approved ? 'approved' : 'rejected'} ${input.trigger.phase}`,
          files_affected: []
        });
        break;
    }
    
    // 2. Update documents based on what happened
    const updatedDocs = await this.updateDocuments(
      input.trigger,
      input.agent_output,
      input.current_state
    );
    documents_updated.push(...updatedDocs);
    
    // 3. Check for consistency issues
    const consistencyIssues = await this.checkConsistency(input.current_state);
    issues.push(...consistencyIssues);
    
    // 4. Build updated state
    const updated_state = this.buildUpdatedState(
      input.current_state,
      input.trigger,
      input.agent_output
    );
    
    return {
      actions_taken: actions,
      documents_updated,
      issues,
      updated_state,
      requires_human_decision: issues.some(i => i.severity === "critical"),
      recommendation: this.generateRecommendation(issues, input.trigger)
    };
  }
  
  private async handleAgentComplete(
    agent: string,
    output: AgentOutput,
    state: PipelineState
  ): Promise<ModeratorAction[]> {
    const actions: ModeratorAction[] = [];
    
    switch (agent) {
      case "why":
        actions.push({
          type: "log_event",
          description: `Feature initiated with verdict: ${(output as WhyAgentOutput).verdict}`,
          files_affected: []
        });
        break;
        
      case "architect":
        // Record new decisions
        const archOutput = output as ArchitectAgentOutput;
        for (const decision of archOutput.new_decisions) {
          await this.engine.recordDecision(
            decision.title,
            decision.description,
            [],
            ["architecture"]
          );
          actions.push({
            type: "update_document",
            description: `Recorded decision: ${decision.title}`,
            files_affected: ["docs/DECISIONS.md"]
          });
        }
        
        // Update architecture doc
        await this.docManager.updateArchitectureDoc(state);
        actions.push({
          type: "update_document",
          description: "Updated ARCHITECTURE.md",
          files_affected: ["docs/ARCHITECTURE.md"]
        });
        break;
        
      case "security":
        await this.docManager.updateSecurityDoc(state);
        actions.push({
          type: "update_document",
          description: "Updated SECURITY.md",
          files_affected: ["docs/SECURITY.md"]
        });
        break;
        
      case "review":
        await this.docManager.updateChangelog(state);
        actions.push({
          type: "update_document",
          description: "Updated CHANGELOG.md",
          files_affected: ["docs/CHANGELOG.md"]
        });
        break;
        
      case "retrospective":
        const retroOutput = output as RetrospectiveAgentOutput;
        
        // Log learnings
        await this.engine.logRetrospective(
          state.feature_request,
          retroOutput.learnings.surprises.join("\n"),
          retroOutput.learnings.would_change.join("\n"),
          JSON.stringify(retroOutput.learnings.new_patterns),
          retroOutput.spike_accuracy
        );
        
        // Update patterns
        for (const pattern of retroOutput.learnings.new_patterns) {
          await this.engine.learnPattern(
            pattern.name,
            pattern.category,
            JSON.stringify(pattern)
          );
        }
        
        actions.push({
          type: "update_document",
          description: "Updated PATTERNS.md, FAILURES.md, ESTIMATES.md",
          files_affected: [
            "docs/PATTERNS.md",
            "docs/FAILURES.md",
            "docs/ESTIMATES.md"
          ]
        });
        break;
    }
    
    return actions;
  }
  
  private async handleBuildStepComplete(
    step: number,
    output: BuilderAgentOutput,
    state: PipelineState
  ): Promise<ModeratorAction[]> {
    const actions: ModeratorAction[] = [];
    
    // Update CODEBASE_MAP.md
    await this.docManager.updateCodebaseMap(output);
    actions.push({
      type: "update_document",
      description: `Updated CODEBASE_MAP.md for step ${step}`,
      files_affected: ["docs/CODEBASE_MAP.md"]
    });
    
    // Generate docs for new file
    await this.engine.generateDocs(output.file, "component");
    
    return actions;
  }
  
  private async analyzePivot(
    changeDescription: string,
    state: PipelineState
  ): Promise<PivotAnalysis> {
    // Compare current state against original plan
    const originalPlan = state.plan;
    const currentDecomposition = state.decomposition;
    
    const impact: PivotImpact = {
      files_to_modify: [],
      steps_to_redo: [],
      tests_to_rewrite: [],
      decisions_to_reverse: [],
      estimate_change: { before: 0, after: 0 },
      deployment_changes: {
        infrastructure: false,
        container: false,
        routing: false,
        pipeline: false
      },
      docs_cache_invalidated: []
    };
    
    // Analyze what files need modification
    for (const step of state.completed_steps) {
      if (this.stepNeedsRedo(step, changeDescription)) {
        impact.steps_to_redo.push(step.order);
        impact.files_to_modify.push({
          path: step.file,
          reason: "Step needs redo due to pivot"
        });
      }
    }
    
    // Calculate estimate change
    const originalEstimate = state.estimate?.estimate.realistic || 0;
    const newEstimate = originalEstimate + (impact.steps_to_redo.length * 0.5);
    impact.estimate_change = {
      before: originalEstimate,
      after: newEstimate
    };
    
    return {
      pivot_detected: true,
      change_description: changeDescription,
      impact,
      recommendation: `Pivot affects ${impact.steps_to_redo.length} completed steps. Estimated additional effort: ${newEstimate - originalEstimate} sessions.`,
      requires_human_decision: true
    };
  }
  
  private async analyzeConflict(
    decisionId: string,
    state: PipelineState
  ): Promise<ConflictAnalysis> {
    // Get conflicting decisions
    const conflicts = await this.engine.checkConflicts(
      state.architecture?.new_decisions.map(d => d.description).join(" ") || ""
    );
    
    return {
      conflict_detected: conflicts.length > 0,
      conflict_type: "decision_conflict",
      description: conflicts.map(c => c.description).join("; "),
      involved_decisions: conflicts.map(c => c.decision_id),
      resolution_options: [
        "Update new decision to align with existing",
        "Deprecate old decision and adopt new",
        "Create exception for this feature"
      ]
    };
  }
  
  private async updateDocuments(
    trigger: TriggerEvent,
    output: AgentOutput,
    state: PipelineState
  ): Promise<string[]> {
    const updated: string[] = [];
    
    // Document updates based on trigger type
    if (trigger.type === "agent_complete") {
      const docUpdates = await this.docManager.getUpdatesForAgent(
        trigger.agent,
        state
      );
      updated.push(...docUpdates);
    }
    
    return updated;
  }
  
  private async checkConsistency(state: PipelineState): Promise<ModeratorIssue[]> {
    const issues: ModeratorIssue[] = [];
    
    // Check if all completed steps are reflected in file plan
    if (state.decomposition) {
      const completedFiles = new Set(state.completed_steps.map(s => s.file));
      const plannedFiles = new Set([
        ...state.decomposition.steps.map(s => s.file),
        ...state.architecture?.file_plan.create.map(f => f.path) || [],
        ...state.architecture?.file_plan.modify.map(f => f.path) || []
      ]);
      
      for (const file of completedFiles) {
        if (!plannedFiles.has(file)) {
          issues.push({
            severity: "warning",
            type: "unplanned_file",
            message: `File ${file} was modified but not in original plan`,
            suggested_action: "Review if this is scope creep"
          });
        }
      }
    }
    
    // Check if tests exist for completed steps
    for (const step of state.completed_steps) {
      const hasTests = state.test_results.some(t => t.step === step.order);
      if (!hasTests) {
        issues.push({
          severity: "warning",
          type: "missing_tests",
          message: `Step ${step.order} (${step.file}) has no test results`,
          suggested_action: "Ensure tests were run"
        });
      }
    }
    
    return issues;
  }
  
  private buildUpdatedState(
    current: PipelineState,
    trigger: TriggerEvent,
    agentOutput: AgentOutput
  ): PipelineState {
    const updated = { ...current, updated_at: new Date() };
    
    // Update based on trigger
    if (trigger.type === "agent_complete") {
      switch (trigger.agent) {
        case "why":
          updated.why = agentOutput as WhyAgentOutput;
          if ((agentOutput as WhyAgentOutput).verdict === "reject") {
            updated.status = "rejected";
          } else {
            updated.status = "research";
          }
          break;
        case "research":
          updated.research = agentOutput as ResearchAgentOutput;
          updated.status = "documentation";
          break;
        case "documentation":
          updated.documentation = agentOutput as DocumentationAgentOutput;
          updated.status = "planning";
          break;
        case "planner":
          updated.plan = agentOutput as PlannerAgentOutput;
          break;
        case "architect":
          updated.architecture = agentOutput as ArchitectAgentOutput;
          break;
        case "security":
          updated.security = agentOutput as SecurityAgentOutput;
          break;
        case "estimator":
          updated.estimate = agentOutput as EstimatorAgentOutput;
          break;
        case "designer":
          updated.design = agentOutput as DesignerAgentOutput;
          updated.status = "mental_model";
          break;
        case "spike":
          updated.spike = agentOutput as SpikeAgentOutput;
          if ((agentOutput as SpikeAgentOutput).verdict === "not_viable") {
            updated.status = "rejected";
          } else {
            updated.status = "building";
          }
          break;
        case "decomposer":
          updated.decomposition = agentOutput as DecomposerAgentOutput;
          break;
        case "review":
          updated.review = agentOutput as ReviewAgentOutput;
          updated.status = "reviewing";
          break;
        case "deployment":
          updated.deployment = agentOutput as DeploymentAgentOutput;
          updated.status = "deploying";
          break;
        case "retrospective":
          updated.retrospective = agentOutput as RetrospectiveAgentOutput;
          updated.status = "complete";
          updated.completed_at = new Date();
          break;
      }
    } else if (trigger.type === "build_step_complete") {
      const builderOutput = agentOutput as BuilderAgentOutput;
      updated.completed_steps.push({
        order: trigger.step,
        file: builderOutput.file,
        timestamp: new Date(),
        tests_passed: true, // Set by Tester Agent
        warnings: []
      });
      updated.current_step = trigger.step + 1;
    }
    
    return updated;
  }
  
  private generateRecommendation(
    issues: ModeratorIssue[],
    trigger: TriggerEvent
  ): string {
    if (issues.some(i => i.severity === "critical")) {
      return "Critical issues detected. Review and resolve before proceeding.";
    }
    
    if (issues.some(i => i.severity === "warning")) {
      return "Warnings detected. Review recommended but not blocking.";
    }
    
    return `Agent ${trigger.type} processed successfully. Ready for next phase.`;
  }
  
  private stepNeedsRedo(step: CompletedStep, changeDescription: string): boolean {
    // Simple heuristic: if change description mentions the file, it needs redo
    return changeDescription.toLowerCase().includes(step.file.toLowerCase());
  }
}
```

## Test Cases

### Test 1: Document Update on Architect Complete
```typescript
it("should update ARCHITECTURE.md after Architect Agent completes", async () => {
  const moderator = new ModeratorAgent(config);
  const state = createMockState({ status: "mental_model" });
  const architectOutput: ArchitectAgentOutput = {
    architecture_fit: { layer: "api", directory: "src/api", follows_pattern: true },
    file_plan: {
      create: [{ path: "src/api/users.ts", purpose: "User endpoints", template_pattern: "controller", depends_on: [] }],
      modify: [],
      unchanged: []
    },
    new_decisions: [{
      title: "Use REST for user API",
      description: "REST over GraphQL for simplicity"
    }],
    pattern_compliance: { score: 95, violations: [], suggestions: [] },
    confidence: { score: 90, level: "high", concerns: [] }
  };
  
  const result = await moderator.process({
    trigger: { type: "agent_complete", agent: "architect", phase: "mental_model" },
    current_state: state,
    agent_output: architectOutput
  });
  
  expect(result.documents_updated).toContain("docs/ARCHITECTURE.md");
  expect(result.documents_updated).toContain("docs/DECISIONS.md");
  expect(result.actions_taken).toHaveLength(2);
});
```

### Test 2: Pivot Detection
```typescript
it("should detect pivot and calculate impact", async () => {
  const moderator = new ModeratorAgent(config);
  const state = createMockState({
    status: "building",
    completed_steps: [
      { order: 1, file: "src/db/users.ts", timestamp: new Date(), tests_passed: true, warnings: [] },
      { order: 2, file: "src/services/users.ts", timestamp: new Date(), tests_passed: true, warnings: [] }
    ],
    decomposition: {
      steps: [
        { order: 1, file: "src/db/users.ts", layer: "database", action: "create" },
        { order: 2, file: "src/services/users.ts", layer: "service", action: "create" },
        { order: 3, file: "src/api/users.ts", layer: "api", action: "create" }
      ],
      total_steps: 3,
      build_order_rationale: "Bottom-up"
    }
  });
  
  const result = await moderator.process({
    trigger: { 
      type: "pivot_detected", 
      change_description: "Need to change user service to support OAuth instead of basic auth"
    },
    current_state: state
  });
  
  expect(result.pivot_analysis?.pivot_detected).toBe(true);
  expect(result.pivot_analysis?.impact.steps_to_redo).toContain(2);
  expect(result.requires_human_decision).toBe(true);
});
```

### Test 3: Conflict Detection
```typescript
it("should detect decision conflicts", async () => {
  const moderator = new ModeratorAgent(config);
  const state = createMockState({
    status: "mental_model",
    architecture: {
      new_decisions: [{
        title: "Use Prisma instead of TypeORM",
        description: "Prisma has better DX"
      }]
    }
  });
  
  // Mock engine to return conflict
  jest.spyOn(config.engine, "checkConflicts").mockResolvedValue([{
    decision_id: "dec-001",
    description: "Previous decision mandated TypeORM for consistency"
  }]);
  
  const result = await moderator.process({
    trigger: { type: "conflict_detected", decision_id: "dec-001" },
    current_state: state
  });
  
  expect(result.conflict_analysis?.conflict_detected).toBe(true);
  expect(result.conflict_analysis?.resolution_options).toHaveLength(3);
});
```

### Test 4: Consistency Check - Unplanned Files
```typescript
it("should warn about unplanned files", async () => {
  const moderator = new ModeratorAgent(config);
  const state = createMockState({
    status: "building",
    completed_steps: [
      { order: 1, file: "src/db/users.ts", timestamp: new Date(), tests_passed: true, warnings: [] }
    ],
    architecture: {
      file_plan: {
        create: [{ path: "src/db/auth.ts" }], // Different file than completed
        modify: [],
        unchanged: []
      }
    }
  });
  
  const result = await moderator.process({
    trigger: { type: "build_step_complete", step: 1 },
    current_state: state,
    agent_output: { file: "src/db/users.ts", code: "..." }
  });
  
  const unplannedIssue = result.issues.find(i => i.type === "unplanned_file");
  expect(unplannedIssue).toBeDefined();
  expect(unplannedIssue?.severity).toBe("warning");
});
```

### Test 5: Build Step Progress Tracking
```typescript
it("should track progress through build steps", async () => {
  const moderator = new ModeratorAgent(config);
  const state = createMockState({
    status: "building",
    current_step: 1,
    completed_steps: []
  });
  
  const builderOutput: BuilderAgentOutput = {
    file: "src/db/users.ts",
    code: "...",
    explanation: { what_it_does: "...", why_this_approach: "...", how_it_connects: "..." },
    pattern_validation: { score: 95, violations: [] },
    confidence: { score: 90, concerns: [] }
  };
  
  const result = await moderator.process({
    trigger: { type: "build_step_complete", step: 1 },
    current_state: state,
    agent_output: builderOutput
  });
  
  expect(result.updated_state.completed_steps).toHaveLength(1);
  expect(result.updated_state.completed_steps[0].file).toBe("src/db/users.ts");
  expect(result.updated_state.current_step).toBe(2);
});
```

### Test 6: Retrospective Logging
```typescript
it("should log retrospectives and update patterns", async () => {
  const moderator = new ModeratorAgent(config);
  const state = createMockState({ status: "reflecting" });
  const retroOutput: RetrospectiveAgentOutput = {
    feature: "Add user auth",
    estimation_accuracy: { estimated: 3, actual: 5, variance: 2, correction_factor: 1.5 },
    learnings: {
      surprises: ["OAuth was more complex than expected"],
      would_change: ["Use simpler auth first"],
      new_patterns: [{
        id: "pat-001",
        name: "Progressive auth",
        category: "authentication",
        description: "Start simple, add OAuth later"
      }],
      failures: []
    },
    spike_accuracy: 80,
    documentation_updates: ["docs/PATTERNS.md"],
    decisions_recorded: ["Use progressive auth"]
  };
  
  const engineSpy = jest.spyOn(config.engine, "learnPattern");
  
  const result = await moderator.process({
    trigger: { type: "agent_complete", agent: "retrospective", phase: "reflecting" },
    current_state: state,
    agent_output: retroOutput
  });
  
  expect(engineSpy).toHaveBeenCalledWith(
    "Progressive auth",
    "authentication",
    expect.any(String)
  );
  expect(result.documents_updated).toContain("docs/PATTERNS.md");
  expect(result.updated_state.status).toBe("complete");
});
```

## Usage Example

```typescript
// In orchestrator, after each agent runs:
const moderatorOutput = await moderatorAgent.process({
  trigger: { type: "agent_complete", agent: "architect", phase: "mental_model" },
  current_state: pipelineState,
  agent_output: architectOutput
});

// Check if human decision needed
if (moderatorOutput.requires_human_decision) {
  await pauseForHumanApproval(moderatorOutput.recommendation);
}

// Update state
pipelineState = moderatorOutput.updated_state;

// Log any issues
for (const issue of moderatorOutput.issues) {
  logger[issue.severity](issue.message);
}
```

## Key Features

1. **Automatic Documentation** - Updates all docs without human intervention
2. **Smart Pivot Detection** - Calculates exact impact of scope changes
3. **Conflict Resolution** - Detects and helps resolve decision conflicts
4. **Consistency Validation** - Ensures pipeline state remains valid
5. **Comprehensive Logging** - Tracks every action for debugging

## Next Steps

1. Implement DocumentManager class for file operations
2. Implement PivotDetector with ML-based change analysis
3. Implement ConflictDetector with semantic similarity
4. Add comprehensive logging
5. Test with real feature pipelines
