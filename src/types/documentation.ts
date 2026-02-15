// Living Documentation Types

// Architecture Documentation Types
export interface ArchitectureDoc {
  name: string;
  description: string;
  diagram: string;                    // ASCII art diagram
  layers: ArchitectureLayer[];
  dataFlow: DataFlowStep[];
  keyComponents: ComponentReference[];
  dependencies: DependencyInfo[];
  generatedAt: Date;
}

export interface ArchitectureLayer {
  name: string;              // e.g., "API Layer", "Business Logic"
  directory: string;         // e.g., "src/server"
  files: string[];
  purpose: string;
}

export interface DataFlowStep {
  from: string;
  to: string;
  description: string;
}

export interface ComponentReference {
  name: string;
  file: string;
  purpose: string;
  exports: string[];
}

export interface DependencyInfo {
  name: string;
  version?: string;
  type: 'runtime' | 'dev';
}

// Component Documentation Types
export interface ComponentDoc {
  file: string;
  name: string;
  purpose: string;
  created?: Date;
  lastModified: Date;

  publicInterface: SymbolDoc[];
  dependencies: DependencyDoc[];
  dependents: DependentDoc[];

  changeHistory: ChangeHistoryEntry[];
  contributors: string[];

  complexity: 'low' | 'medium' | 'high';
  documentationScore: number;  // 0-100%
}

export interface SymbolDoc {
  name: string;
  kind: string;
  signature?: string;
  description?: string;
  lineStart: number;
  lineEnd: number;
  exported: boolean;
}

export interface DependencyDoc {
  file: string;
  symbols: string[];
}

export interface DependentDoc {
  file: string;
  symbols: string[];
}

export interface ChangeHistoryEntry {
  date: Date;
  change: string;
  author: string;
  commit: string;
  linesChanged: { added: number; removed: number };
}

// Changelog Types
export interface DailyChangelog {
  date: Date;
  summary: string;
  features: ChangeEntry[];
  fixes: ChangeEntry[];
  refactors: ChangeEntry[];
  filesModified: FileChangeInfo[];
  decisions: string[];
  metrics: ChangeMetrics;
}

export interface ChangeEntry {
  type: 'feature' | 'fix' | 'refactor' | 'docs' | 'test' | 'chore';
  description: string;
  files: string[];
  commit?: string;
}

export interface FileChangeInfo {
  file: string;
  added: number;
  removed: number;
  type: 'new' | 'modified' | 'deleted';
}

export interface ChangeMetrics {
  commits: number;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
}

export interface ChangelogOptions {
  since?: Date | string;
  until?: Date;
  groupBy?: 'day' | 'week' | 'feature';
  includeDecisions?: boolean;
}

// Activity Query Types
export interface ActivityResult {
  timeRange: { since: Date; until: Date };
  scope: string;
  summary: string;
  changes: ActivityChange[];
  decisions: ActivityDecision[];
  filesAffected: string[];
}

export interface ActivityChange {
  timestamp: Date;
  type: 'commit' | 'file_change' | 'decision';
  description: string;
  details: Record<string, unknown>;
}

export interface ActivityDecision {
  id: string;
  title: string;
  date: Date;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  outdatedDocs: OutdatedDoc[];
  undocumentedCode: UndocumentedItem[];
  suggestions: DocSuggestion[];
  score: number;  // 0-100%
}

export interface OutdatedDoc {
  file: string;
  reason: string;
  lastDocUpdate: Date;
  lastCodeChange: Date;
  severity: 'low' | 'medium' | 'high';
}

export interface UndocumentedItem {
  file: string;
  symbol?: string;
  type: 'file' | 'function' | 'class' | 'interface';
  importance: 'low' | 'medium' | 'high';
}

export interface DocSuggestion {
  file: string;
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
}

// ============================================
// Context Rot Prevention Types
// ============================================

export interface ContextHealth {
  // Metrics
  tokensUsed: number;
  tokensLimit: number;
  utilizationPercent: number;

  // Health Indicators
  health: 'good' | 'warning' | 'critical';
  relevanceScore: number;        // 0-1, how relevant is old context
  driftScore: number;            // 0-1, how much has AI drifted
  criticalContextCount: number;  // Number of critical items

  // Detection
  driftDetected: boolean;
  compactionNeeded: boolean;

  // Suggestions
  suggestions: string[];
}

export interface CompactionSuggestion {
  // What to keep
  critical: ContextChunk[];

  // What to summarize
  summarizable: ContextChunk[];

  // What to remove
  removable: ContextChunk[];

  // Estimated savings
  tokensSaved: number;
  newUtilization: number;
}

export interface ContextChunk {
  id: string;
  content: string;
  tokens: number;
  timestamp: Date;
  relevanceScore: number;
  isCritical: boolean;
  type: 'message' | 'decision' | 'requirement' | 'instruction' | 'code';
}

export interface CompactionResult {
  success: boolean;
  strategy: 'summarize' | 'selective' | 'aggressive';
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  preservedCritical: number;
  summarizedChunks: number;
  removedChunks: number;
  summaries: string[];
}

export interface CriticalContext {
  id: string;
  type: 'decision' | 'requirement' | 'instruction' | 'custom';
  content: string;
  reason?: string;
  createdAt: Date;
  source?: string;           // Where this came from (file, message, etc.)
  neverCompress: boolean;
}

export interface DriftResult {
  driftScore: number;        // 0-1, higher = more drift
  driftDetected: boolean;
  missingRequirements: string[];
  contradictions: Contradiction[];
  suggestedReminders: string[];
  topicShift: number;        // 0-1, how much topic has shifted
}

export interface Contradiction {
  earlier: string;
  later: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CompactionOptions {
  strategy: 'summarize' | 'selective' | 'aggressive';
  preserveRecent?: number;     // Number of recent messages to preserve
  targetUtilization?: number;  // Target % (e.g., 50%)
  preserveCritical?: boolean;  // Always preserve critical (default: true)
}

// ============================================
// Confidence Scoring Types
// ============================================

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'guessing';

export interface ConfidenceResult {
  confidence: ConfidenceLevel;
  score: number;              // 0-100
  reasoning: string;
  sources: ConfidenceSources;
  warnings: ConfidenceWarning[];
}

export interface ConfidenceSources {
  codebase: CodebaseMatch[];
  decisions: DecisionMatch[];
  patterns: PatternMatch[];
  usedGeneralKnowledge: boolean;
}

export interface CodebaseMatch {
  file: string;
  line?: number;
  function?: string;
  similarity: number;          // 0-100
  snippet?: string;
  lastModified?: Date;
  usageCount?: number;
}

export interface DecisionMatch {
  id: string;
  title: string;
  date: Date;
  relevance: number;           // 0-100
}

export interface PatternMatch {
  pattern: string;
  confidence: number;          // 0-100
  examples: string[];
}

export type WarningType =
  | 'no_similar_pattern'
  | 'conflicts_with_decision'
  | 'untested_approach'
  | 'high_complexity'
  | 'potential_security_issue'
  | 'deprecated_approach';

export interface ConfidenceWarning {
  type: WarningType;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  suggestion?: string;
  relatedDecision?: string;
}

export interface SourceTracking {
  codebaseMatches: Array<{
    file: string;
    function?: string;
    similarity: number;
    lastModified?: Date;
    usageCount: number;
  }>;
  decisionMatches: Array<{
    id: string;
    title: string;
    date: Date;
    relevance: number;
  }>;
  patternMatches: Array<{
    pattern: string;
    confidence: number;
    examples: string[];
  }>;
  generalKnowledge: {
    used: boolean;
    topics: string[];
    reliability: 'high' | 'medium' | 'low';
  };
}

export interface ConflictResult {
  hasConflicts: boolean;
  conflicts: Array<{
    decisionId: string;
    decisionTitle: string;
    decisionDate: Date;
    conflictDescription: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

// ============================================
// Change Intelligence Types
// ============================================

export interface Change {
  id: string;
  file: string;
  diff: string;
  timestamp: Date;
  author: string;
  commitHash: string;
  commitMessage: string;
  linesAdded: number;
  linesRemoved: number;
  type: 'add' | 'modify' | 'delete' | 'rename';
}

export interface ChangeQueryResult {
  period: string;
  since: Date;
  until: Date;
  changes: Change[];
  totalFiles: number;
  totalLinesAdded: number;
  totalLinesRemoved: number;
  byAuthor: Record<string, number>;
  byType: Record<string, number>;
}

export interface Bug {
  id: string;
  error: string;
  stackTrace?: string;
  file?: string;
  line?: number;
  timestamp: Date;
  status: 'open' | 'fixed';
  relatedChanges: string[];
  fixedBy?: string;
  fixedAt?: Date;
}

export interface PastBug {
  id: string;
  error: string;
  cause?: string;
  fix?: string;
  fixDiff?: string;
  file?: string;
  date: Date;
  similarity: number;
}

export interface Diagnosis {
  likelyCause: Change | null;
  confidence: number;
  relatedChanges: Change[];
  pastSimilarBugs: PastBug[];
  suggestedFix: string | null;
  reasoning: string;
}

export interface FixSuggestion {
  confidence: number;
  fix: string;
  reason: string;
  diff?: string;
  pastFix?: {
    date: Date;
    file: string;
    bugId?: string;
  };
  source: 'history' | 'pattern' | 'general';
}

export interface ChangeQueryOptions {
  since?: string | Date;
  until?: Date;
  file?: string;
  author?: string;
  type?: 'add' | 'modify' | 'delete' | 'rename';
  limit?: number;
}

// ============================================
// Architecture Enforcement Types
// ============================================

export interface Pattern {
  id: string;
  name: string;
  category: PatternCategory;
  description: string;
  examples: CodeExample[];
  antiPatterns: CodeExample[];
  rules: PatternRule[];
  createdAt: Date;
  usageCount: number;
}

export type PatternCategory =
  | 'error_handling'
  | 'api_call'
  | 'component'
  | 'state_management'
  | 'data_fetching'
  | 'authentication'
  | 'validation'
  | 'logging'
  | 'custom';

export interface CodeExample {
  code: string;
  explanation: string;
  file?: string;
}

export interface PatternRule {
  rule: string;
  severity: 'info' | 'warning' | 'critical';
  check?: string;  // Regex or keyword to check
}

export interface PatternValidationResult {
  valid: boolean;
  score: number;  // 0-100
  matchedPattern?: string;
  violations: PatternViolation[];
  suggestions: PatternSuggestion[];
  existingAlternatives: ExistingFunction[];
}

export interface PatternViolation {
  rule: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  line?: number;
  suggestion?: string;
}

export interface PatternSuggestion {
  description: string;
  code?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ExistingFunction {
  name: string;
  file: string;
  line: number;
  signature: string;
  description?: string;
  usageCount: number;
  purpose: string;
  similarity: number;
}

export interface FunctionIndex {
  name: string;
  file: string;
  line: number;
  signature: string;
  exported: boolean;
  usageCount: number;
  parameters: string[];
  returnType?: string;
  docstring?: string;
}

// ============================================
// Test-Aware Suggestions Types (Phase 11)
// ============================================

export type TestFramework = 'jest' | 'mocha' | 'vitest' | 'pytest' | 'unittest' | 'go' | 'unknown';

export interface TestInfo {
  id: string;
  file: string;
  name: string;
  describes: string;                // Parent describe block
  coversFiles: string[];            // Files this test covers (via imports)
  coversFunctions: string[];        // Functions this test calls
  assertions: Assertion[];
  lastRun?: Date;
  lastStatus?: 'pass' | 'fail' | 'skip';
  lineStart: number;
  lineEnd: number;
}

export interface Assertion {
  type: 'equality' | 'truthiness' | 'error' | 'mock' | 'snapshot' | 'other';
  subject: string;                  // What's being tested
  expected?: string;                // Expected value (if extractable)
  code: string;                     // Actual assertion code
  line: number;
}

export interface TestIndex {
  framework: TestFramework;
  tests: TestInfo[];
  fileToCoverage: Map<string, string[]>;      // file -> test IDs
  functionToCoverage: Map<string, string[]>;  // function -> test IDs
  lastIndexed: Date;
}

export interface ChangeAnalysis {
  file: string;
  functions: string[];
  type: 'refactor' | 'add' | 'delete' | 'modify';
  affectedTests: TestInfo[];
  testCoverage: number;             // % of change covered by tests
  risk: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface TestValidationResult {
  safe: boolean;
  relatedTests: TestInfo[];
  wouldPass: TestInfo[];
  wouldFail: PredictedFailure[];
  uncertain: TestInfo[];
  suggestedTestUpdates: TestUpdate[];
  coveragePercent: number;
}

export interface PredictedFailure {
  test: TestInfo;
  assertion?: Assertion;
  reason: string;
  confidence: number;               // 0-100
  suggestedFix?: string;
}

export interface TestUpdate {
  file: string;
  testName: string;
  line: number;
  before: string;
  after: string;
  reason: string;
}

export interface TestCoverage {
  file: string;
  totalTests: number;
  coveredFunctions: string[];
  uncoveredFunctions: string[];
  coveragePercent: number;
}
