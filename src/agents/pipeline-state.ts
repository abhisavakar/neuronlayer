/**
 * Pipeline State Manager
 * 
 * Manages persistence and lifecycle of pipeline states
 */

import type { PipelineState, PipelinePhase } from "../types/index.js";

export class PipelineStateManager {
  private db: any;  // Database connection
  private projectPath: string;
  
  constructor(db: any, projectPath: string) {
    this.db = db;
    this.projectPath = projectPath;
  }
  
  /**
   * Create a new pipeline state for a feature
   */
  async createPipeline(featureRequest: string): Promise<PipelineState> {
    const featureId = this.generateFeatureId();
    const now = new Date();
    
    const state: PipelineState = {
      feature_id: featureId,
      feature_request: featureRequest,
      status: "impulse",
      project_path: this.projectPath,
      started_at: now,
      updated_at: now,
      current_step: 0,
      completed_steps: [],
      test_results: [],
      smell_warnings: [],
      docs_context_per_step: new Map(),
      pivots: [],
      moderator_logs: [],
      human_approvals: [],
      // All agent outputs start as null
      why: null,
      research: null,
      documentation: null,
      plan: null,
      architecture: null,
      security: null,
      estimate: null,
      design: null,
      spike: null,
      decomposition: null,
      review: null,
      deployment: null,
      retrospective: null
    };
    
    // Persist to database
    await this.persistState(state);
    
    return state;
  }
  
  /**
   * Load an existing pipeline state
   */
  async loadPipeline(featureId: string): Promise<PipelineState | null> {
    const row = await this.db.get(
      "SELECT * FROM pipeline_states WHERE id = ?",
      [featureId]
    );
    
    if (!row) return null;
    
    return this.deserializeState(row);
  }
  
  /**
   * Save pipeline state updates
   */
  async saveState(state: PipelineState): Promise<void> {
    state.updated_at = new Date();
    await this.persistState(state);
  }
  
  /**
   * Update pipeline phase
   */
  async updatePhase(state: PipelineState, phase: PipelinePhase): Promise<void> {
    state.status = phase;
    state.updated_at = new Date();
    
    if (phase === "complete") {
      state.completed_at = new Date();
    }
    
    await this.persistState(state);
  }
  
  /**
   * Record human approval
   */
  async recordApproval(
    state: PipelineState,
    phase: PipelinePhase,
    approver: string,
    notes?: string
  ): Promise<void> {
    state.human_approvals.push({
      phase,
      timestamp: new Date(),
      approver,
      notes
    });
    
    await this.saveState(state);
  }
  
  /**
   * Record a pivot event
   */
  async recordPivot(
    state: PipelineState,
    description: string,
    impact: any,
    approved: boolean
  ): Promise<void> {
    state.pivots.push({
      timestamp: new Date(),
      description,
      impact,
      approved
    });
    
    await this.saveState(state);
  }
  
  /**
   * Add completed build step
   */
  async addCompletedStep(
    state: PipelineState,
    step: number,
    file: string,
    testsPassed: boolean,
    warnings: any[]
  ): Promise<void> {
    state.completed_steps.push({
      order: step,
      file,
      timestamp: new Date(),
      tests_passed: testsPassed,
      warnings
    });
    
    state.current_step = step + 1;
    await this.saveState(state);
  }
  
  /**
   * Add test results
   */
  async addTestResults(
    state: PipelineState,
    step: number,
    testFile: string,
    passed: number,
    failed: number,
    coverage: number
  ): Promise<void> {
    state.test_results.push({
      step,
      test_file: testFile,
      passed,
      failed,
      coverage,
      timestamp: new Date()
    });
    
    await this.saveState(state);
  }
  
  /**
   * List all pipelines for a project
   */
  async listPipelines(projectPath?: string): Promise<PipelineState[]> {
    const path = projectPath || this.projectPath;
    
    const rows = await this.db.all(
      "SELECT * FROM pipeline_states WHERE project_path = ? ORDER BY updated_at DESC",
      [path]
    );
    
    return rows.map((row: any) => this.deserializeState(row));
  }
  
  /**
   * Get active (non-complete) pipelines
   */
  async getActivePipelines(): Promise<PipelineState[]> {
    const rows = await this.db.all(
      `SELECT * FROM pipeline_states 
       WHERE project_path = ? 
       AND status NOT IN ('complete', 'rejected')
       ORDER BY updated_at DESC`,
      [this.projectPath]
    );
    
    return rows.map((row: any) => this.deserializeState(row));
  }
  
  /**
   * Persist state to database
   */
  private async persistState(state: PipelineState): Promise<void> {
    const json = JSON.stringify(this.serializeState(state));
    
    await this.db.run(
      `INSERT OR REPLACE INTO pipeline_states 
       (id, feature_request, status, project_path, state_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        state.feature_id,
        state.feature_request,
        state.status,
        state.project_path,
        json,
        Math.floor(state.started_at.getTime() / 1000),
        Math.floor(state.updated_at.getTime() / 1000)
      ]
    );
  }
  
  /**
   * Serialize state for storage
   */
  private serializeState(state: PipelineState): any {
    return {
      ...state,
      started_at: state.started_at.toISOString(),
      updated_at: state.updated_at.toISOString(),
      completed_at: state.completed_at?.toISOString(),
      docs_context_per_step: Object.fromEntries(state.docs_context_per_step),
      completed_steps: state.completed_steps.map(s => ({
        ...s,
        timestamp: s.timestamp.toISOString()
      })),
      test_results: state.test_results.map(t => ({
        ...t,
        timestamp: t.timestamp.toISOString()
      })),
      pivots: state.pivots.map(p => ({
        ...p,
        timestamp: p.timestamp.toISOString()
      })),
      moderator_logs: state.moderator_logs.map(l => ({
        ...l,
        timestamp: l.timestamp.toISOString()
      })),
      human_approvals: state.human_approvals.map(a => ({
        ...a,
        timestamp: a.timestamp.toISOString()
      }))
    };
  }
  
  /**
   * Deserialize state from storage
   */
  private deserializeState(row: any): PipelineState {
    const parsed = JSON.parse(row.state_json);
    
    return {
      ...parsed,
      feature_id: row.id,
      feature_request: row.feature_request,
      status: row.status,
      project_path: row.project_path,
      started_at: new Date(parsed.started_at),
      updated_at: new Date(parsed.updated_at),
      completed_at: parsed.completed_at ? new Date(parsed.completed_at) : undefined,
      docs_context_per_step: new Map(Object.entries(parsed.docs_context_per_step || {})),
      completed_steps: (parsed.completed_steps || []).map((s: any) => ({
        ...s,
        timestamp: new Date(s.timestamp)
      })),
      test_results: (parsed.test_results || []).map((t: any) => ({
        ...t,
        timestamp: new Date(t.timestamp)
      })),
      pivots: (parsed.pivots || []).map((p: any) => ({
        ...p,
        timestamp: new Date(p.timestamp)
      })),
      moderator_logs: (parsed.moderator_logs || []).map((l: any) => ({
        ...l,
        timestamp: new Date(l.timestamp)
      })),
      human_approvals: (parsed.human_approvals || []).map((a: any) => ({
        ...a,
        timestamp: new Date(a.timestamp)
      }))
    };
  }
  
  /**
   * Generate unique feature ID
   */
  private generateFeatureId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `feat-${timestamp}-${random}`;
  }
  
  /**
   * Initialize database schema
   */
  static async initializeSchema(db: any): Promise<void> {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS pipeline_states (
        id TEXT PRIMARY KEY,
        feature_request TEXT NOT NULL,
        status TEXT NOT NULL,
        project_path TEXT NOT NULL,
        state_json TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipeline_states(status);
      CREATE INDEX IF NOT EXISTS idx_pipeline_project ON pipeline_states(project_path);
      CREATE INDEX IF NOT EXISTS idx_pipeline_updated ON pipeline_states(updated_at);
    `);
  }
}

export default PipelineStateManager;
