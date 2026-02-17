/**
 * Agent Orchestration Layer - Type Definitions
 * 
 * Shared types and interfaces for all agents in the pipeline
 */

// ============================================================================
// Pipeline State
// ============================================================================

export type PipelinePhase =
  | "impulse"
  | "research"
  | "documentation"
  | "planning"
  | "mental_model"
  | "spiking"
  | "building"
  | "reviewing"
  | "deploying"
  | "reflecting"
  | "complete"
  | "rejected";

export type AgentVerdict = "proceed" | "simplify" | "reject" | "merge_with_existing";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type EffortLevel = "low" | "medium" | "high";

export interface PipelineState {
  // Feature identity
  feature_id: string;
  feature_request: string;
  status: PipelinePhase;
  
  // Metadata
  project_path: string;
  started_at: Date;
  updated_at: Date;
  completed_at?: Date;
  
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
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface CompletedStep {
  order: number;
  file: string;
  timestamp: Date;
  tests_passed: boolean;
  warnings: SmellWarning[];
}

export interface TestResult {
  step: number;
  test_file: string;
  passed: number;
  failed: number;
  coverage: number;
  timestamp: Date;
}

export interface SmellWarning {
  type: "complexity" | "scope_creep" | "duplication" | "size";
  severity: "info" | "warning" | "critical";
  message: string;
  suggestion: string;
}

export interface PivotEvent {
  timestamp: Date;
  description: string;
  impact: PivotImpact;
  approved: boolean;
}

export interface PivotImpact {
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

export interface ModeratorLog {
  timestamp: Date;
  event: string;
  agent: string;
  action: string;
  files_updated: string[];
}

export interface Approval {
  phase: PipelinePhase;
  timestamp: Date;
  approver: string;
  notes?: string;
}

// ============================================================================
// Why Agent Output
// ============================================================================

export interface WhyAgentOutput {
  verdict: AgentVerdict;
  original_request: string;
  simplified_version: string | null;
  existing_code_that_helps: ExistingCode[];
  past_failures: PastFailure[];
  conflicts: DecisionConflict[];
  questions_for_human: string[];
  reasoning: string;
}

export interface ExistingCode {
  path: string;
  purpose: string;
  relevance_score: number;
  how_it_helps: string;
}

export interface PastFailure {
  id: string;
  feature: string;
  approach: string;
  why_failed: string;
  lesson: string;
  relevance_score: number;
}

export interface DecisionConflict {
  decision_id: string;
  title: string;
  conflict_type: "technical" | "architectural" | "business";
  description: string;
  severity: "blocking" | "warning";
}

// ============================================================================
// Research Agent Output
// ============================================================================

export interface ResearchAgentOutput {
  prior_art: {
    existing_code: ResearchExistingCode[];
    reusable_components: ReusableComponent[];
    applicable_patterns: ApplicablePattern[];
  };
  warnings: {
    past_failures: ResearchFailure[];
    lessons_from_retrospectives: Lesson[];
  };
  constraints: {
    architectural_decisions: RelevantDecision[];
    patterns_to_follow: Pattern[];
    security_requirements: string[];
  };
  options: {
    approach_a: Approach;
    approach_b: Approach;
    recommended: "a" | "b";
  };
  unknowns: string[];
  project_context: {
    recent_changes: string[];
    active_features: string[];
    current_momentum: string;
  };
}

export interface ResearchExistingCode {
  path: string;
  summary: string;
  relevance_score: number;
  how_to_use: string;
  dependencies: string[];
}

export interface ReusableComponent {
  name: string;
  path: string;
  description: string;
  interface: string;
  reusability: "high" | "medium" | "low";
  modification_needed: string | null;
}

export interface ApplicablePattern {
  id: string;
  name: string;
  category: string;
  description: string;
  examples: string[];
  confidence: number;
}

export interface ResearchFailure {
  id: string;
  feature: string;
  approach: string;
  why_failed: string;
  lesson: string;
  how_to_avoid: string;
  relevance: number;
}

export interface Lesson {
  feature: string;
  surprise: string;
  would_change: string;
  recommendation: string;
}

export interface RelevantDecision {
  id: string;
  title: string;
  description: string;
  status: "active" | "deprecated";
  impact: string;
}

export interface Approach {
  description: string;
  pros: string[];
  cons: string[];
  risk_level: RiskLevel;
  estimated_effort: EffortLevel;
  fits_patterns: boolean;
  alignment_score: number;
}

export interface Pattern {
  id: string;
  name: string;
  category: string;
  description: string;
}

// ============================================================================
// Documentation Agent Output
// ============================================================================

export interface DocumentationAgentOutput {
  docs_context: LibraryDocContext[];
  warnings: DocWarning[];
  version_mismatches: VersionMismatch[];
}

export interface LibraryDocContext {
  library: string;
  version: string;
  relevant_apis: APIInfo[];
  migration_notes: string[];
  common_pitfalls: string[];
}

export interface APIInfo {
  name: string;
  current_signature: string;
  usage_example: string;
  deprecation_warnings: string[];
  breaking_changes_from_previous: string[];
}

export interface DocWarning {
  outdated_pattern: string;
  correct_pattern: string;
  source: string;
}

export interface VersionMismatch {
  library: string;
  project_version: string;
  latest_version: string;
  breaking_changes: boolean;
}

// ============================================================================
// Planner Agent Output
// ============================================================================

export interface PlannerAgentOutput {
  user_story: string;
  acceptance_criteria: string[];
  scope: Scope;
  vertical_slice: VerticalSlice;
  data_flow: DataFlowStep[];
  integration_points: IntegrationPoint[];
  assumptions: string[];
}

export interface Scope {
  in_scope: string[];
  out_of_scope: string[];
  deferred: string[];
}

export interface VerticalSlice {
  database: DatabaseLayer;
  service: ServiceLayer;
  api: APILayer;
  frontend: FrontendLayer;
}

export interface DatabaseLayer {
  tables: Table[];
  migrations: Migration[];
}

export interface Table {
  name: string;
  columns: Column[];
}

export interface Column {
  name: string;
  type: string;
  constraints: string[];
}

export interface Migration {
  name: string;
  changes: string;
}

export interface ServiceLayer {
  functions: ServiceFunction[];
  business_logic: string;
}

export interface ServiceFunction {
  name: string;
  purpose: string;
  inputs: Parameter[];
  outputs: Output[];
}

export interface Parameter {
  name: string;
  type: string;
}

export interface Output {
  type: string;
  description: string;
}

export interface APILayer {
  endpoints: Endpoint[];
  request_schemas: Schema[];
  response_schemas: Schema[];
}

export interface Endpoint {
  method: string;
  path: string;
  description: string;
  auth_required: boolean;
}

export interface Schema {
  name: string;
  fields: Field[];
}

export interface Field {
  name: string;
  type: string;
  required: boolean;
}

export interface FrontendLayer {
  components: ComponentSpec[];
  pages: Page[];
  user_flows: UserFlow[];
}

export interface ComponentSpec {
  name: string;
  purpose: string;
  props: Prop[];
}

export interface Prop {
  name: string;
  type: string;
  required: boolean;
}

export interface Page {
  name: string;
  route: string;
  components: string[];
}

export interface UserFlow {
  step: number;
  action: string;
  result: string;
}

export interface DataFlowStep {
  order: number;
  from: string;
  to: string;
  data: string;
  transformation: string;
}

export interface IntegrationPoint {
  file: string;
  what_changes: string;
  risk: RiskLevel;
}

// ============================================================================
// Architect Agent Output
// ============================================================================

export interface ArchitectAgentOutput {
  architecture_fit: {
    layer: string;
    directory: string;
    follows_pattern: boolean;
  };
  file_plan: {
    create: CreateFile[];
    modify: ModifyFile[];
    unchanged: UnchangedFile[];
  };
  new_decisions: Decision[];
  pattern_compliance: {
    score: number;
    violations: string[];
    suggestions: string[];
  };
  confidence: {
    score: number;
    level: RiskLevel;
    concerns: string[];
  };
}

export interface CreateFile {
  path: string;
  purpose: string;
  template_pattern: string;
  depends_on: string[];
}

export interface ModifyFile {
  path: string;
  what_changes: string;
  risk: RiskLevel;
  current_purpose: string;
}

export interface UnchangedFile {
  path: string;
  role: string;
}

export interface Decision {
  title: string;
  description: string;
  alternatives_considered: string[];
  reasoning: string;
}

// ============================================================================
// Security Agent Output
// ============================================================================

export interface SecurityAgentOutput {
  risk_level: RiskLevel;
  requirements: {
    authentication: AuthRequirements;
    authorization: AuthzRequirements;
    input_validation: ValidationRule[];
    pii_handling: PIIHandling;
    rate_limiting: RateLimitConfig;
    eu_ai_act: EUAIActCompliance;
  };
  warnings: string[];
  test_cases_required: string[];
}

export interface AuthRequirements {
  endpoints_needing_auth: string[];
  method: string;
}

export interface AuthzRequirements {
  roles_required: Record<string, string[]>;
}

export interface ValidationRule {
  field: string;
  rules: string[];
  sanitization: string;
}

export interface PIIHandling {
  fields: string[];
  encryption: string;
  retention: string;
}

export interface RateLimitConfig {
  endpoints: string[];
  limits: string;
}

export interface EUAIActCompliance {
  applicable: boolean;
  requirements: string[];
}

// ============================================================================
// Estimator Agent Output
// ============================================================================

export interface EstimatorAgentOutput {
  estimate: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
  complexity_score: number;
  basis: {
    similar_features: SimilarFeature[];
    correction_factor: number;
    confidence: "high" | "medium" | "low";
  };
  risk_factors: string[];
  suggestion: string;
}

export interface SimilarFeature {
  name: string;
  estimated: number;
  actual: number;
}

// ============================================================================
// Designer Agent Output
// ============================================================================

export interface DesignerAgentOutput {
  user_flow: UserFlowStep[];
  components: {
    reuse: ReusableUIComponent[];
    create: NewComponent[];
  };
  states: {
    loading: string;
    empty: string;
    error: string;
    success: string;
  };
}

export interface UserFlowStep {
  step: number;
  screen: string;
  user_action: string;
  system_response: string;
}

export interface ReusableUIComponent {
  name: string;
  path: string;
  modifications: string;
}

export interface NewComponent {
  name: string;
  purpose: string;
  props: Prop[];
  states: string[];
  accessibility: string[];
}

// ============================================================================
// Spike Agent Output
// ============================================================================

export interface SpikeAgentOutput {
  question: string;
  verdict: "viable" | "not_viable" | "viable_with_changes";
  evidence: string;
  lessons: string[];
  changes_to_plan: string[];
  time_spent: number;
  code_location: string;
}

// ============================================================================
// Decomposer Agent Output
// ============================================================================

export interface DecomposerAgentOutput {
  steps: BuildStep[];
  total_steps: number;
  build_order_rationale: string;
}

export interface BuildStep {
  order: number;
  layer: "database" | "service" | "api" | "frontend";
  action: "create" | "modify";
  file: string;
  function_name: string;
  description: string;
  input: Parameter[];
  output: Output;
  depends_on: number[];
  security: string[];
  design: string | null;
  test_cases: string[];
  pattern_to_follow: string | null;
  estimated_complexity: EffortLevel;
}

// ============================================================================
// Tester Agent Output
// ============================================================================

export interface TesterAgentOutput {
  test_file: string;
  test_code: string;
  test_cases: TestCase[];
  existing_tests_affected: AffectedTest[];
}

export interface TestCase {
  name: string;
  type: "unit" | "integration" | "security";
  tests: "happy_path" | "error" | "edge_case";
  assertion: string;
}

export interface AffectedTest {
  file: string;
  needs_update: boolean;
  reason: string;
}

// ============================================================================
// Builder Agent Output
// ============================================================================

export interface BuilderAgentOutput {
  file: string;
  code: string;
  explanation: {
    what_it_does: string;
    why_this_approach: string;
    how_it_connects: string;
  };
  pattern_validation: {
    score: number;
    violations: string[];
  };
  confidence: {
    score: number;
    concerns: string[];
  };
}

// ============================================================================
// Smell Agent Output
// ============================================================================

export interface SmellAgentOutput {
  warnings: SmellWarning[];
  metrics: {
    file_lines: number;
    functions_added: number;
    dependencies_added: number;
    scope_drift_score: number;
  };
}

// ============================================================================
// Review Agent Output
// ============================================================================

export interface ReviewAgentOutput {
  verdict: "approve" | "changes_required";
  score: number;
  checks: {
    plan_match: boolean;
    acceptance_criteria: CriterionCheck[];
    pattern_compliance: number;
    security_compliance: number;
    test_coverage: number;
    readability: number;
  };
  required_changes: RequiredChange[];
  summary: string;
}

export interface CriterionCheck {
  criterion: string;
  met: boolean;
}

export interface RequiredChange {
  file: string;
  issue: string;
  severity: "must_fix" | "should_fix" | "nice_to_have";
  suggestion: string;
}

// ============================================================================
// Deployment Agent Output
// ============================================================================

export interface DeploymentAgentOutput {
  deployment_plan: {
    infrastructure: InfrastructurePlan;
    containerization: ContainerPlan;
    routing: RoutingPlan;
    pipeline: PipelinePlan;
  };
  rollback_plan: {
    steps: string[];
    automated: boolean;
  };
  pre_deploy_checks: string[];
  post_deploy_checks: string[];
  estimated_downtime: string;
}

export interface InfrastructurePlan {
  changes: TerraformChange[];
  new_resources: string[];
  estimated_cost_change: string;
}

export interface TerraformChange {
  resource: string;
  action: "create" | "modify" | "delete";
  details: string;
}

export interface ContainerPlan {
  dockerfile_changes: string;
  compose_changes: string;
  new_env_vars: EnvVar[];
}

export interface EnvVar {
  name: string;
  secret: boolean;
}

export interface RoutingPlan {
  new_routes: Route[];
  ssl_changes: boolean;
  nginx_config_diff: string;
}

export interface Route {
  path: string;
  upstream: string;
}

export interface PipelinePlan {
  new_steps: string[];
  modified_steps: string[];
}

// ============================================================================
// Retrospective Agent Output
// ============================================================================

export interface RetrospectiveAgentOutput {
  feature: string;
  estimation_accuracy: {
    estimated: number;
    actual: number;
    variance: number;
    correction_factor: number;
  };
  learnings: {
    surprises: string[];
    would_change: string[];
    new_patterns: Pattern[];
    failures: PastFailure[];
  };
  spike_accuracy: number | null;
  documentation_updates: string[];
  decisions_recorded: string[];
}

// ============================================================================
// Rubber Duck Agent Output
// ============================================================================

export interface RubberDuckAgentOutput {
  root_cause: string;
  wrong_assumption: string;
  suggested_fix: {
    file: string;
    change: string;
    reasoning: string;
  };
  similar_past_bugs: Bug[];
}

export interface Bug {
  id: string;
  error_message: string;
  solution: string;
  context: string;
}

// ============================================================================
// Moderator Types
// ============================================================================

export type TriggerEvent =
  | { type: "agent_complete"; agent: string; phase: PipelinePhase }
  | { type: "pivot_detected"; change_description: string }
  | { type: "conflict_detected"; decision_id: string }
  | { type: "build_step_complete"; step: number }
  | { type: "human_approval"; phase: PipelinePhase; approved: boolean };

export interface ModeratorInput {
  trigger: TriggerEvent;
  current_state: PipelineState;
  agent_output: AgentOutput;
  previous_state?: PipelineState;
}

export type AgentOutput =
  | WhyAgentOutput
  | ResearchAgentOutput
  | DocumentationAgentOutput
  | PlannerAgentOutput
  | ArchitectAgentOutput
  | SecurityAgentOutput
  | EstimatorAgentOutput
  | DesignerAgentOutput
  | SpikeAgentOutput
  | DecomposerAgentOutput
  | TesterAgentOutput
  | BuilderAgentOutput
  | SmellAgentOutput
  | ReviewAgentOutput
  | DeploymentAgentOutput
  | RetrospectiveAgentOutput
  | RubberDuckAgentOutput;

export interface ModeratorOutput {
  actions_taken: ModeratorAction[];
  documents_updated: string[];
  issues: ModeratorIssue[];
  pivot_analysis?: PivotAnalysis;
  conflict_analysis?: ConflictAnalysis;
  updated_state: PipelineState;
  requires_human_decision: boolean;
  recommendation: string;
}

export interface ModeratorAction {
  type: "update_document" | "log_event" | "detect_pivot" | "detect_conflict" | "propagate_change";
  description: string;
  files_affected: string[];
}

export interface ModeratorIssue {
  severity: "info" | "warning" | "critical";
  type: string;
  message: string;
  suggested_action: string;
}

export interface PivotAnalysis {
  pivot_detected: boolean;
  change_description: string;
  impact: PivotImpact;
  recommendation: string;
  requires_human_decision: boolean;
}

export interface ConflictAnalysis {
  conflict_detected: boolean;
  conflict_type: string;
  description: string;
  involved_decisions: string[];
  resolution_options: string[];
}

// ============================================================================
// Agent Configuration
// ============================================================================

export interface AgentConfig {
  engine: any;  // MemoryLayerEngine
  projectPath: string;
  llmProvider?: any;
}
