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
