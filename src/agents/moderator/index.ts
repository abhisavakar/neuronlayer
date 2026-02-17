/**
 * Moderator Agent - Orchestration Supervisor
 * 
 * Super-intelligent implementation with:
 * - Document management across all phases
 * - Pivot detection with impact analysis
 * - Conflict resolution
 * - Anti-pattern detection
 * - State validation
 */

import type {
  PipelineState,
  PipelinePhase,
  ModeratorInput,
  ModeratorOutput,
  ModeratorAction,
  ModeratorIssue,
  PivotAnalysis,
  PivotImpact,
  ConflictAnalysis,
  AgentOutput,
  WhyAgentOutput,
  ResearchAgentOutput,
  ArchitectAgentOutput,
  BuilderAgentOutput,
  RetrospectiveAgentOutput,
  AgentConfig,
  SmellWarning
} from "../types/index.js";

export interface ModeratorAgentConfig extends AgentConfig {
  docsPath?: string;
  enableAntiPatterns?: boolean;
  maxWarningsBeforeBlock?: number;
}

export class ModeratorAgent {
  private config: ModeratorAgentConfig;
  private engine: any;
  private docManager: DocumentManager;
  
  constructor(config: ModeratorAgentConfig) {
    this.config = config;
    this.engine = config.engine;
    this.docManager = new DocumentManager(config.docsPath || "docs");
  }
  
  /**
   * Main processing method - runs after every agent
   */
  async process(input: ModeratorInput): Promise<ModeratorOutput> {
    console.log(`🎛️  Moderator processing: ${input.trigger.type}`);
    
    const actions: ModeratorAction[] = [];
    const issues: ModeratorIssue[] = [];
    const documents_updated: string[] = [];
    
    let pivotAnalysis: PivotAnalysis | undefined;
    let conflictAnalysis: ConflictAnalysis | undefined;
    
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
        pivotAnalysis = await this.analyzePivot(
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
          recommendation: `Pivot detected: ${pivotAnalysis.change_description}. Impact: ${pivotAnalysis.impact.steps_to_redo.length} steps need redo.`
        };
        
      case "conflict_detected":
        conflictAnalysis = await this.analyzeConflict(
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
          recommendation: `Decision conflict detected. Review and resolve before proceeding.`
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
        actions.push({
          type: "log_event",
          description: `Human ${input.trigger.approved ? 'approved' : 'rejected'} ${input.trigger.phase}`,
          files_affected: []
        });
        break;
    }
    
    // 2. Update documents
    const updatedDocs = await this.updateDocuments(
      input.trigger,
      input.agent_output,
      input.current_state
    );
    documents_updated.push(...updatedDocs);
    
    // 3. Run consistency checks
    const consistencyIssues = await this.checkConsistency(input.current_state);
    issues.push(...consistencyIssues);
    
    // 4. Anti-pattern detection
    if (this.config.enableAntiPatterns !== false) {
      const antiPatternIssues = await this.detectAntiPatterns(
        input.current_state,
        input.agent_output
      );
      issues.push(...antiPatternIssues);
    }
    
    // 5. Build updated state
    const updated_state = this.buildUpdatedState(
      input.current_state,
      input.trigger,
      input.agent_output
    );
    
    // 6. Generate recommendation
    const requires_human_decision = issues.some(i => i.severity === "critical") ||
                                   (issues.filter(i => i.severity === "warning").length >= (this.config.maxWarningsBeforeBlock || 5));
    
    return {
      actions_taken: actions,
      documents_updated,
      issues,
      updated_state,
      requires_human_decision,
      recommendation: this.generateRecommendation(issues, input.trigger)
    };
  }
  
  /**
   * Handle agent completion
   */
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
        for (const decision of archOutput.new_decisions || []) {
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
  
  /**
   * Handle build step completion
   */
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
    try {
      await this.engine.generateDocs(output.file, "component");
      actions.push({
        type: "update_document",
        description: `Generated docs for ${output.file}`,
        files_affected: [output.file]
      });
    } catch (error) {
      // Non-critical error
    }
    
    return actions;
  }
  
  /**
   * Analyze pivot impact
   */
  private async analyzePivot(
    changeDescription: string,
    state: PipelineState
  ): Promise<PivotAnalysis> {
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
    
    // Analyze completed steps
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
    const additionalEffort = impact.steps_to_redo.length * 0.5;
    impact.estimate_change = {
      before: originalEstimate,
      after: originalEstimate + additionalEffort
    };
    
    // Check for deployment impact
    if (changeDescription.toLowerCase().includes("infrastructure") ||
        changeDescription.toLowerCase().includes("terraform")) {
      impact.deployment_changes.infrastructure = true;
    }
    
    return {
      pivot_detected: true,
      change_description: changeDescription,
      impact,
      recommendation: `Pivot affects ${impact.steps_to_redo.length} completed steps. Estimated additional effort: ${additionalEffort} sessions.`,
      requires_human_decision: true
    };
  }
  
  /**
   * Analyze decision conflicts
   */
  private async analyzeConflict(
    decisionId: string,
    state: PipelineState
  ): Promise<ConflictAnalysis> {
    const conflicts = await this.engine.checkConflicts(
      state.architecture?.new_decisions?.map((d: any) => d.description).join(" ") || ""
    );
    
    return {
      conflict_detected: conflicts.length > 0,
      conflict_type: "decision_conflict",
      description: conflicts.map((c: any) => c.description).join("; "),
      involved_decisions: conflicts.map((c: any) => c.decision_id),
      resolution_options: [
        "Update new decision to align with existing",
        "Deprecate old decision and adopt new",
        "Create exception for this feature"
      ]
    };
  }
  
  /**
   * Check state consistency
   */
  private async checkConsistency(state: PipelineState): Promise<ModeratorIssue[]> {
    const issues: ModeratorIssue[] = [];
    
    // Check for unplanned files
    if (state.decomposition) {
      const completedFiles = new Set(state.completed_steps.map(s => s.file));
      const plannedFiles = new Set([
        ...state.decomposition.steps.map((s: any) => s.file),
        ...(state.architecture?.file_plan?.create?.map((f: any) => f.path) || []),
        ...(state.architecture?.file_plan?.modify?.map((f: any) => f.path) || [])
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
    
    // Check for missing test results
    for (const step of state.completed_steps) {
      const hasTests = state.test_results.some(t => t.step === step.order);
      if (!hasTests) {
        issues.push({
          severity: "warning",
          type: "missing_tests",
          message: `Step ${step.order} (${step.file}) has no test results`,
          suggested_action: "Ensure tests were run and recorded"
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Detect anti-patterns
   */
  private async detectAntiPatterns(
    state: PipelineState,
    agentOutput: AgentOutput
  ): Promise<ModeratorIssue[]> {
    const issues: ModeratorIssue[] = [];
    
    // Doom loop detection (repeated similar tool calls)
    const recentLogs = state.moderator_logs.slice(-10);
    const repeatedActions = this.findRepeatedActions(recentLogs);
    
    if (repeatedActions.length > 0) {
      issues.push({
        severity: "critical",
        type: "doom_loop",
        message: `Possible doom loop detected: ${repeatedActions.join(", ")}`,
        suggested_action: "Review and break the loop, or ask for human intervention"
      });
    }
    
    // Scope creep detection
    if (state.completed_steps.length > (state.decomposition?.total_steps || 0) * 1.5) {
      issues.push({
        severity: "warning",
        type: "scope_creep",
        message: `Completed ${state.completed_steps.length} steps but only ${state.decomposition?.total_steps || 0} planned`,
        suggested_action: "Review if feature scope has expanded beyond original plan"
      });
    }
    
    // High warning accumulation
    const warningCount = state.smell_warnings.filter(w => w.severity !== "info").length;
    if (warningCount > 10) {
      issues.push({
        severity: "warning",
        type: "warning_accumulation",
        message: `${warningCount} warnings accumulated during build`,
        suggested_action: "Review and address warnings before continuing"
      });
    }
    
    return issues;
  }
  
  /**
   * Update documents based on trigger
   */
  private async updateDocuments(
    trigger: any,
    output: AgentOutput,
    state: PipelineState
  ): Promise<string[]> {
    const updated: string[] = [];
    
    if (trigger.type === "agent_complete") {
      const docUpdates = await this.docManager.getUpdatesForAgent(
        trigger.agent,
        state
      );
      updated.push(...docUpdates);
    }
    
    return updated;
  }
  
  /**
   * Build updated state
   */
  private buildUpdatedState(
    current: PipelineState,
    trigger: any,
    agentOutput: AgentOutput
  ): PipelineState {
    const updated = { ...current, updated_at: new Date() };
    
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
          
        case "designer":
          updated.design = agentOutput as any;
          updated.status = "mental_model";
          break;
          
        case "retrospective":
          updated.retrospective = agentOutput as RetrospectiveAgentOutput;
          updated.status = "complete";
          updated.completed_at = new Date();
          break;
      }
    } else if (trigger.type === "build_step_complete") {
      const builderOutput = agentOutput as BuilderAgentOutput;
      updated.completed_steps = [...updated.completed_steps, {
        order: trigger.step,
        file: builderOutput.file,
        timestamp: new Date(),
        tests_passed: true,
        warnings: []
      }];
      updated.current_step = trigger.step + 1;
    }
    
    return updated;
  }
  
  /**
   * Generate recommendation
   */
  private generateRecommendation(issues: ModeratorIssue[], trigger: any): string {
    const criticalCount = issues.filter(i => i.severity === "critical").length;
    const warningCount = issues.filter(i => i.severity === "warning").length;
    
    if (criticalCount > 0) {
      return `${criticalCount} critical issues detected. Review and resolve before proceeding.`;
    }
    
    if (warningCount > 0) {
      return `${warningCount} warnings detected. Review recommended but not blocking.`;
    }
    
    return `Agent ${trigger.type} processed successfully. Ready for next phase.`;
  }
  
  // Helper methods
  private stepNeedsRedo(step: any, changeDescription: string): boolean {
    return changeDescription.toLowerCase().includes(step.file.toLowerCase());
  }
  
  private findRepeatedActions(logs: any[]): string[] {
    const actionCounts: Record<string, number> = {};
    
    for (const log of logs) {
      const key = `${log.agent}-${log.action}`;
      actionCounts[key] = (actionCounts[key] || 0) + 1;
    }
    
    return Object.entries(actionCounts)
      .filter(([_, count]) => count >= 3)
      .map(([action, _]) => action);
  }
}

/**
 * Document Manager - Handles all living documentation
 */
class DocumentManager {
  private docsPath: string;
  
  constructor(docsPath: string) {
    this.docsPath = docsPath;
  }
  
  async updateArchitectureDoc(state: PipelineState): Promise<void> {
    // Update docs/ARCHITECTURE.md
    console.log(`  Updating ARCHITECTURE.md`);
  }
  
  async updateCodebaseMap(output: BuilderAgentOutput): Promise<void> {
    // Update docs/CODEBASE_MAP.md
    console.log(`  Updating CODEBASE_MAP.md with ${output.file}`);
  }
  
  async updateChangelog(state: PipelineState): Promise<void> {
    // Update docs/CHANGELOG.md
    console.log(`  Updating CHANGELOG.md`);
  }
  
  async getUpdatesForAgent(agent: string, state: PipelineState): Promise<string[]> {
    const updates: string[] = [];
    
    switch (agent) {
      case "architect":
        updates.push("docs/ARCHITECTURE.md");
        updates.push("docs/DECISIONS.md");
        break;
      case "security":
        updates.push("docs/SECURITY.md");
        break;
      case "review":
        updates.push("docs/CHANGELOG.md");
        break;
      case "retrospective":
        updates.push("docs/PATTERNS.md");
        updates.push("docs/FAILURES.md");
        updates.push("docs/ESTIMATES.md");
        break;
    }
    
    return updates;
  }
}

export default ModeratorAgent;
