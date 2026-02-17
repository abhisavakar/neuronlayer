# Pipeline State Infrastructure

## Overview

The Pipeline State is the shared state object that flows through all phases of the agent orchestration pipeline. It contains all outputs from each agent and tracks the current status of feature development.

## State Interface

```typescript
interface PipelineState {
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

type PipelinePhase =
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
```

## Agent Output Interfaces

### Why Agent Output
```typescript
interface WhyAgentOutput {
  verdict: "proceed" | "simplify" | "reject" | "merge_with_existing";
  original_request: string;
  simplified_version: string | null;
  existing_code_that_helps: string[];
  past_failures: Failure[];
  conflicts: Conflict[];
  questions_for_human: string[];
  reasoning: string;
}

interface Failure {
  id: string;
  feature: string;
  approach: string;
  why_failed: string;
  lesson: string;
}

interface Conflict {
  decision_id: string;
  title: string;
  conflict_type: string;
  description: string;
}
```

### Research Agent Output
```typescript
interface ResearchAgentOutput {
  prior_art: {
    existing_code: FileReference[];
    reusable_components: Component[];
    applicable_patterns: Pattern[];
  };
  warnings: {
    past_failures: Failure[];
    lessons_from_retrospectives: Lesson[];
  };
  constraints: {
    architectural_decisions: Decision[];
    patterns_to_follow: Pattern[];
    security_requirements: string[];
  };
  options: {
    approach_a: Approach;
    approach_b: Approach;
    recommended: "a" | "b";
  };
  unknowns: string[];
}

interface FileReference {
  path: string;
  purpose: string;
  relevance_score: number;
}

interface Component {
  name: string;
  path: string;
  description: string;
  reusability: "high" | "medium" | "low";
}

interface Pattern {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface Decision {
  id: string;
  title: string;
  description: string;
  status: "active" | "deprecated" | "superseded";
}

interface Lesson {
  feature: string;
  surprise: string;
  would_change: string;
}

interface Approach {
  description: string;
  pros: string[];
  cons: string[];
  risk_level: "low" | "medium" | "high";
}
```

### Documentation Agent Output
```typescript
interface DocumentationAgentOutput {
  docs_context: LibraryDocContext[];
  warnings: DocWarning[];
  version_mismatches: VersionMismatch[];
}

interface LibraryDocContext {
  library: string;
  version: string;
  relevant_apis: APIInfo[];
  migration_notes: string[];
  common_pitfalls: string[];
}

interface APIInfo {
  name: string;
  current_signature: string;
  usage_example: string;
  deprecation_warnings: string[];
  breaking_changes_from_previous: string[];
}

interface DocWarning {
  outdated_pattern: string;
  correct_pattern: string;
  source: string;
}

interface VersionMismatch {
  library: string;
  project_version: string;
  latest_version: string;
  breaking_changes: boolean;
}
```

### Planner Agent Output
```typescript
interface PlannerAgentOutput {
  user_story: string;
  acceptance_criteria: string[];
  scope: {
    in_scope: string[];
    out_of_scope: string[];
    deferred: string[];
  };
  vertical_slice: {
    database: DatabaseLayer;
    service: ServiceLayer;
    api: APILayer;
    frontend: FrontendLayer;
  };
  data_flow: DataFlowStep[];
  integration_points: IntegrationPoint[];
  assumptions: string[];
}

interface DatabaseLayer {
  tables: Table[];
  migrations: Migration[];
}

interface Table {
  name: string;
  columns: Column[];
}

interface Column {
  name: string;
  type: string;
  constraints: string[];
}

interface Migration {
  name: string;
  changes: string;
}

interface ServiceLayer {
  functions: ServiceFunction[];
  business_logic: string;
}

interface ServiceFunction {
  name: string;
  purpose: string;
  inputs: Parameter[];
  outputs: Output[];
}

interface Parameter {
  name: string;
  type: string;
}

interface Output {
  type: string;
  description: string;
}

interface APILayer {
  endpoints: Endpoint[];
  request_schemas: Schema[];
  response_schemas: Schema[];
}

interface Endpoint {
  method: string;
  path: string;
  description: string;
  auth_required: boolean;
}

interface Schema {
  name: string;
  fields: Field[];
}

interface Field {
  name: string;
  type: string;
  required: boolean;
}

interface FrontendLayer {
  components: ComponentSpec[];
  pages: Page[];
  user_flows: UserFlow[];
}

interface ComponentSpec {
  name: string;
  purpose: string;
  props: Prop[];
}

interface Prop {
  name: string;
  type: string;
  required: boolean;
}

interface Page {
  name: string;
  route: string;
  components: string[];
}

interface UserFlow {
  step: number;
  action: string;
  result: string;
}

interface DataFlowStep {
  order: number;
  from: string;
  to: string;
  data: string;
  transformation: string;
}

interface IntegrationPoint {
  file: string;
  what_changes: string;
  risk: "low" | "medium" | "high";
}
```

### Architect Agent Output
```typescript
interface ArchitectAgentOutput {
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
    level: "high" | "medium" | "low";
    concerns: string[];
  };
}

interface CreateFile {
  path: string;
  purpose: string;
  template_pattern: string;
  depends_on: string[];
}

interface ModifyFile {
  path: string;
  what_changes: string;
  risk: "low" | "medium" | "high";
  current_purpose: string;
}

interface UnchangedFile {
  path: string;
  role: string;
}
```

### Security Agent Output
```typescript
interface SecurityAgentOutput {
  risk_level: "low" | "medium" | "high" | "critical";
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

interface AuthRequirements {
  endpoints_needing_auth: string[];
  method: string;
}

interface AuthzRequirements {
  roles_required: Record<string, string[]>;
}

interface ValidationRule {
  field: string;
  rules: string[];
  sanitization: string;
}

interface PIIHandling {
  fields: string[];
  encryption: string;
  retention: string;
}

interface RateLimitConfig {
  endpoints: string[];
  limits: string;
}

interface EUAIActCompliance {
  applicable: boolean;
  requirements: string[];
}
```

### Estimator Agent Output
```typescript
interface EstimatorAgentOutput {
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

interface SimilarFeature {
  name: string;
  estimated: number;
  actual: number;
}
```

### Designer Agent Output
```typescript
interface DesignerAgentOutput {
  user_flow: UserFlowStep[];
  components: {
    reuse: ReusableComponent[];
    create: NewComponent[];
  };
  states: {
    loading: string;
    empty: string;
    error: string;
    success: string;
  };
}

interface UserFlowStep {
  step: number;
  screen: string;
  user_action: string;
  system_response: string;
}

interface ReusableComponent {
  name: string;
  path: string;
  modifications: string;
}

interface NewComponent {
  name: string;
  purpose: string;
  props: Prop[];
  states: string[];
  accessibility: string[];
}
```

### Spike Agent Output
```typescript
interface SpikeAgentOutput {
  question: string;
  verdict: "viable" | "not_viable" | "viable_with_changes";
  evidence: string;
  lessons: string[];
  changes_to_plan: string[];
  time_spent: number;
  code_location: string;
}
```

### Decomposer Agent Output
```typescript
interface DecomposerAgentOutput {
  steps: BuildStep[];
  total_steps: number;
  build_order_rationale: string;
}

interface BuildStep {
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
  estimated_complexity: "low" | "medium" | "high";
}
```

### Tester Agent Output
```typescript
interface TesterAgentOutput {
  test_file: string;
  test_code: string;
  test_cases: TestCase[];
  existing_tests_affected: AffectedTest[];
}

interface TestCase {
  name: string;
  type: "unit" | "integration" | "security";
  tests: "happy_path" | "error" | "edge_case";
  assertion: string;
}

interface AffectedTest {
  file: string;
  needs_update: boolean;
  reason: string;
}
```

### Builder Agent Output
```typescript
interface BuilderAgentOutput {
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
```

### Smell Agent Output
```typescript
interface SmellAgentOutput {
  warnings: SmellWarning[];
  metrics: {
    file_lines: number;
    functions_added: number;
    dependencies_added: number;
    scope_drift_score: number;
  };
}

interface SmellWarning {
  type: "complexity" | "scope_creep" | "duplication" | "size";
  severity: "info" | "warning" | "critical";
  message: string;
  suggestion: string;
}
```

### Review Agent Output
```typescript
interface ReviewAgentOutput {
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

interface CriterionCheck {
  criterion: string;
  met: boolean;
}

interface RequiredChange {
  file: string;
  issue: string;
  severity: "must_fix" | "should_fix" | "nice_to_have";
  suggestion: string;
}
```

### Deployment Agent Output
```typescript
interface DeploymentAgentOutput {
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

interface InfrastructurePlan {
  changes: TerraformChange[];
  new_resources: string[];
  estimated_cost_change: string;
}

interface TerraformChange {
  resource: string;
  action: "create" | "modify" | "delete";
  details: string;
}

interface ContainerPlan {
  dockerfile_changes: string;
  compose_changes: string;
  new_env_vars: EnvVar[];
}

interface EnvVar {
  name: string;
  secret: boolean;
}

interface RoutingPlan {
  new_routes: Route[];
  ssl_changes: boolean;
  nginx_config_diff: string;
}

interface Route {
  path: string;
  upstream: string;
}

interface PipelinePlan {
  new_steps: string[];
  modified_steps: string[];
}
```

### Retrospective Agent Output
```typescript
interface RetrospectiveAgentOutput {
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
    failures: Failure[];
  };
  spike_accuracy: number | null;
  documentation_updates: string[];
  decisions_recorded: string[];
}
```

### Rubber Duck Agent Output
```typescript
interface RubberDuckAgentOutput {
  root_cause: string;
  wrong_assumption: string;
  suggested_fix: {
    file: string;
    change: string;
    reasoning: string;
  };
  similar_past_bugs: Bug[];
}

interface Bug {
  id: string;
  error_message: string;
  solution: string;
  context: string;
}
```

## Supporting Types

```typescript
interface CompletedStep {
  order: number;
  file: string;
  timestamp: Date;
  tests_passed: boolean;
  warnings: SmellWarning[];
}

interface TestResult {
  step: number;
  test_file: string;
  passed: number;
  failed: number;
  coverage: number;
  timestamp: Date;
}

interface SmellWarning {
  type: "complexity" | "scope_creep" | "duplication" | "size";
  severity: "info" | "warning" | "critical";
  message: string;
  suggestion: string;
}

interface PivotEvent {
  timestamp: Date;
  description: string;
  impact: PivotImpact;
  approved: boolean;
}

interface PivotImpact {
  files_to_modify: { path: string; reason: string }[];
  steps_to_redo: number[];
  tests_to_rewrite: string[];
  decisions_to_reverse: string[];
  estimate_change: { before: number; after: number };
}

interface ModeratorLog {
  timestamp: Date;
  event: string;
  agent: string;
  action: string;
  files_updated: string[];
}

interface Approval {
  phase: PipelinePhase;
  timestamp: Date;
  approver: string;
  notes?: string;
}
```

## State Persistence

The Pipeline State is persisted to:
1. **SQLite Database** - Primary storage for structured data
2. **JSON Files** - Human-readable snapshots in `.memorylayer/pipelines/`
3. **Session Files** - Full state for resumption

### Database Schema

```sql
CREATE TABLE pipeline_states (
  id TEXT PRIMARY KEY,
  feature_request TEXT NOT NULL,
  status TEXT NOT NULL,
  project_path TEXT NOT NULL,
  state_json TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE pipeline_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pipeline_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  output_json TEXT,
  completed_at INTEGER,
  FOREIGN KEY (pipeline_id) REFERENCES pipeline_states(id)
);

CREATE INDEX idx_pipeline_status ON pipeline_states(status);
CREATE INDEX idx_pipeline_project ON pipeline_states(project_path);
CREATE INDEX idx_steps_pipeline ON pipeline_steps(pipeline_id);
```

## State Transitions

```
impulse → research → documentation → planning → mental_model
                                            ↓
                                    spiking (optional)
                                            ↓
                                        building
                                            ↓
                                        reviewing
                                            ↓
                                        deploying
                                            ↓
                                        reflecting
                                            ↓
                                        complete

Alternative paths:
- Any phase → rejected (via Why Agent or human)
- Any phase → impulse (pivot detected by Moderator)
- building → building (next step)
- building → reviewing (all steps complete)
```
