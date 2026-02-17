/**
 * Agent Test Framework
 * 
 * Comprehensive testing framework for all agents with:
 * - Mock MemoryLayer engine
 * - Output validation
 * - Performance metrics
 * - Regression testing
 */

import type {
  PipelineState,
  WhyAgentOutput,
  ResearchAgentOutput,
  ModeratorOutput,
  AgentConfig,
  AgentVerdict,
  RiskLevel
} from "../types/index.js";

// ============================================================================
// Mock MemoryLayer Engine
// ============================================================================

export interface MockSearchResult {
  path: string;
  content?: string;
  similarity_score: number;
  summary?: string;
  dependencies?: string[];
}

export interface MockFailure {
  id: string;
  feature: string;
  approach: string;
  why_failed: string;
  lesson: string;
}

export interface MockDecision {
  id: string;
  title: string;
  description: string;
  status: "active" | "deprecated";
}

export interface MockPattern {
  id: string;
  name: string;
  category: string;
  description: string;
  examples?: string[];
  usage_count?: number;
}

export class MockMemoryLayerEngine {
  private searchResults: MockSearchResult[] = [];
  private failures: MockFailure[] = [];
  private decisions: MockDecision[] = [];
  private patterns: MockPattern[] = [];
  private retrospectives: any[] = [];
  
  // Configuration for test scenarios
  configure(options: {
    searchResults?: MockSearchResult[];
    failures?: MockFailure[];
    decisions?: MockDecision[];
    patterns?: MockPattern[];
    retrospectives?: any[];
  }) {
    this.searchResults = options.searchResults || [];
    this.failures = options.failures || [];
    this.decisions = options.decisions || [];
    this.patterns = options.patterns || [];
    this.retrospectives = options.retrospectives || [];
  }
  
  // Mock implementations
  async searchCodebase(query: string, limit: number = 10): Promise<MockSearchResult[]> {
    return this.searchResults
      .filter(r => this.matchesQuery(r, query))
      .slice(0, limit);
  }
  
  async getFailures(featureRequest: string): Promise<MockFailure[]> {
    return this.failures.filter(f => 
      this.semanticSimilarity(f.feature, featureRequest) > 0.5
    );
  }
  
  async checkConflicts(proposed: string): Promise<Array<{decision_id: string; title: string; description: string; severity: string}>> {
    return this.decisions
      .filter(d => d.status === "active")
      .filter(d => this.detectConflict(d, proposed))
      .map(d => ({
        decision_id: d.id,
        title: d.title,
        description: d.description,
        severity: "warning"
      }));
  }
  
  async listPatterns(category: string): Promise<MockPattern[]> {
    return this.patterns.filter(p => p.category === category);
  }
  
  async suggestExisting(intent: string): Promise<Array<{
    name: string;
    path: string;
    description: string;
    similarity_score: number;
    exact_match?: boolean;
  }>> {
    return this.searchResults.map(r => ({
      name: r.path.split('/').pop() || '',
      path: r.path,
      description: r.summary || '',
      similarity_score: r.similarity_score,
      exact_match: r.similarity_score > 0.95
    }));
  }
  
  async getRetrospectives(featureType: string): Promise<any[]> {
    return this.retrospectives;
  }
  
  async recordDecision(title: string, description: string, files: string[], tags: string[]): Promise<void> {
    this.decisions.push({
      id: `dec-${Date.now()}`,
      title,
      description,
      status: "active"
    });
  }
  
  async learnPattern(name: string, category: string, examples: string): Promise<void> {
    this.patterns.push({
      id: `pat-${Date.now()}`,
      name,
      category,
      description: examples,
      usage_count: 1
    });
  }
  
  async logRetrospective(
    feature: string,
    surprises: string,
    wouldChange: string,
    newPatterns: string,
    spikeAccuracy: number | null
  ): Promise<void> {
    this.retrospectives.push({
      feature,
      surprises,
      would_change: wouldChange,
      new_patterns: newPatterns,
      spike_accuracy: spikeAccuracy,
      timestamp: new Date()
    });
  }
  
  // Helper methods
  private matchesQuery(result: MockSearchResult, query: string): boolean {
    const queryLower = query.toLowerCase();
    const pathLower = result.path.toLowerCase();
    const contentLower = (result.content || '').toLowerCase();
    
    return pathLower.includes(queryLower) || contentLower.includes(queryLower);
  }
  
  private semanticSimilarity(text1: string, text2: string): number {
    // Simple keyword overlap for mocking
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = [...words1].filter(w => words2.has(w));
    const union = new Set([...words1, ...words2]);
    
    return intersection.length / union.size;
  }
  
  private detectConflict(decision: MockDecision, proposed: string): boolean {
    // Simple conflict detection
    const decisionKeywords = decision.description.toLowerCase().split(/\s+/);
    const proposedKeywords = proposed.toLowerCase().split(/\s+/);
    
    // Check for opposing keywords
    const opposites: Record<string, string> = {
      "rest": "graphql",
      "graphql": "rest",
      "sql": "nosql",
      "nosql": "sql",
      "monolith": "microservices",
      "microservices": "monolith"
    };
    
    for (const keyword of decisionKeywords) {
      const opposite = opposites[keyword];
      if (opposite && proposedKeywords.includes(opposite)) {
        return true;
      }
    }
    
    return false;
  }
}

// ============================================================================
// Test Assertions
// ============================================================================

export class AgentTestAssertions {
  static assertVerdict(output: WhyAgentOutput, expected: AgentVerdict): void {
    if (output.verdict !== expected) {
      throw new Error(`Expected verdict "${expected}" but got "${output.verdict}"`);
    }
  }
  
  static assertReasoning(output: WhyAgentOutput): void {
    if (!output.reasoning || output.reasoning.length < 10) {
      throw new Error("Reasoning is too short or missing");
    }
  }
  
  static assertQuestions(output: WhyAgentOutput, minCount: number = 1): void {
    if (!output.questions_for_human || output.questions_for_human.length < minCount) {
      throw new Error(`Expected at least ${minCount} questions for human`);
    }
  }
  
  static assertResearchQuality(output: ResearchAgentOutput): void {
    // Should have prior art OR unknowns
    const hasPriorArt = output.prior_art.existing_code.length > 0 ||
                       output.prior_art.reusable_components.length > 0;
    const hasUnknowns = output.unknowns.length > 0;
    
    if (!hasPriorArt && !hasUnknowns) {
      throw new Error("Research should find prior art or identify unknowns");
    }
  }
  
  static assertApproaches(output: ResearchAgentOutput): void {
    if (!output.options.approach_a || !output.options.approach_b) {
      throw new Error("Should provide at least 2 approaches");
    }
    
    if (!output.options.recommended) {
      throw new Error("Should recommend one approach");
    }
  }
  
  static assertRiskAssessment(output: ResearchAgentOutput): void {
    const validRiskLevels: RiskLevel[] = ["low", "medium", "high"];
    
    if (!validRiskLevels.includes(output.options.approach_a.risk_level)) {
      throw new Error(`Invalid risk level: ${output.options.approach_a.risk_level}`);
    }
  }
  
  static assertNoCriticalIssues(output: ModeratorOutput): void {
    const criticalIssues = output.issues.filter(i => i.severity === "critical");
    if (criticalIssues.length > 0) {
      throw new Error(`Found ${criticalIssues.length} critical issues: ${criticalIssues.map(i => i.message).join(', ')}`);
    }
  }
}

// ============================================================================
// Test Scenarios
// ============================================================================

export interface TestScenario {
  name: string;
  description: string;
  input: any;
  mockConfig: {
    searchResults?: MockSearchResult[];
    failures?: MockFailure[];
    decisions?: MockDecision[];
    patterns?: MockPattern[];
    retrospectives?: any[];
  };
  expected: {
    verdict?: AgentVerdict;
    minQuestions?: number;
    shouldFindPriorArt?: boolean;
    shouldWarnAboutFailures?: boolean;
    maxRiskLevel?: RiskLevel;
  };
}

export const WhyAgentTestScenarios: TestScenario[] = [
  {
    name: "Duplicate Feature",
    description: "Feature that already exists in codebase",
    input: { feature_request: "Add user authentication with email and password" },
    mockConfig: {
      searchResults: [
        {
          path: "src/auth/login.ts",
          content: "User authentication with email/password implementation",
          similarity_score: 0.98,
          summary: "User authentication system"
        }
      ],
      failures: [],
      decisions: []
    },
    expected: {
      verdict: "merge_with_existing",
      minQuestions: 1
    }
  },
  {
    name: "Feature with Prior Art",
    description: "Feature with existing similar code",
    input: { feature_request: "Add CSV export for user data" },
    mockConfig: {
      searchResults: [
        {
          path: "src/utils/export.ts",
          content: "Export utilities including JSON export",
          similarity_score: 0.85,
          summary: "Export functionality"
        }
      ],
      failures: [],
      decisions: []
    },
    expected: {
      verdict: "simplify",
      minQuestions: 1,
      shouldFindPriorArt: true
    }
  },
  {
    name: "Feature with Past Failures",
    description: "Similar features failed before",
    input: { feature_request: "Add real-time chat with WebSockets" },
    mockConfig: {
      searchResults: [],
      failures: [
        {
          id: "1",
          feature: "WebSocket notifications",
          approach: "Native WebSockets",
          why_failed: "Scaling issues with concurrent connections",
          lesson: "Use Redis pub/sub for scaling"
        },
        {
          id: "2",
          feature: "Live cursor tracking",
          approach: "WebSocket broadcast",
          why_failed: "Too complex for requirement",
          lesson: "Consider polling for simple use cases"
        }
      ],
      decisions: []
    },
    expected: {
      verdict: "reject",
      shouldWarnAboutFailures: true
    }
  },
  {
    name: "Feature with Conflicts",
    description: "Feature conflicts with architectural decisions",
    input: { feature_request: "Add GraphQL API for flexible queries" },
    mockConfig: {
      searchResults: [],
      failures: [],
      decisions: [
        {
          id: "dec-001",
          title: "Use REST API",
          description: "REST over GraphQL for simplicity and caching",
          status: "active"
        }
      ]
    },
    expected: {
      verdict: "reject",
      minQuestions: 1
    }
  },
  {
    name: "Valid New Feature",
    description: "Truly new feature that should proceed",
    input: { feature_request: "Fix critical security vulnerability in auth middleware" },
    mockConfig: {
      searchResults: [],
      failures: [],
      decisions: []
    },
    expected: {
      verdict: "proceed"
    }
  }
];

export const ResearchAgentTestScenarios: TestScenario[] = [
  {
    name: "Feature with Rich Prior Art",
    description: "Feature with lots of existing code to learn from",
    input: { feature_request: "Add user profile management" },
    mockConfig: {
      searchResults: [
        { path: "src/users/types.ts", similarity_score: 0.9, summary: "User types" },
        { path: "src/users/service.ts", similarity_score: 0.85, summary: "User service" },
        { path: "src/auth/validation.ts", similarity_score: 0.7, summary: "Validation" }
      ],
      patterns: [
        { id: "1", name: "Repository Pattern", category: "database", description: "Data access layer" },
        { id: "2", name: "Service Layer", category: "architecture", description: "Business logic" }
      ]
    },
    expected: {
      shouldFindPriorArt: true
    }
  },
  {
    name: "Feature with Unknowns",
    description: "Feature with no prior art and unknown challenges",
    input: { feature_request: "Add blockchain-based audit trail" },
    mockConfig: {
      searchResults: [],
      patterns: []
    },
    expected: {
      maxRiskLevel: "high"
    }
  }
];

// ============================================================================
// Test Runner
// ============================================================================

export interface TestResult {
  scenario: string;
  passed: boolean;
  duration: number;
  error?: string;
  output?: any;
}

export class AgentTestRunner {
  private results: TestResult[] = [];
  
  async runScenario<TInput, TOutput>(
    scenario: TestScenario,
    agent: { execute: (input: TInput) => Promise<TOutput> },
    assertions: (output: TOutput, expected: TestScenario['expected']) => void
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Configure mock engine
      const mockEngine = new MockMemoryLayerEngine();
      mockEngine.configure(scenario.mockConfig);
      
      // Execute agent
      const output = await agent.execute(scenario.input as TInput);
      
      // Run assertions
      assertions(output, scenario.expected);
      
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        scenario: scenario.name,
        passed: true,
        duration,
        output
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        scenario: scenario.name,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.results.push(result);
      return result;
    }
  }
  
  getResults(): TestResult[] {
    return this.results;
  }
  
  getSummary(): { total: number; passed: number; failed: number; avgDuration: number } {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total;
    
    return {
      total,
      passed,
      failed: total - passed,
      avgDuration
    };
  }
  
  printReport(): void {
    const summary = this.getSummary();
    
    console.log("\n" + "=".repeat(80));
    console.log("AGENT TEST REPORT");
    console.log("=".repeat(80));
    
    for (const result of this.results) {
      const status = result.passed ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} - ${result.scenario} (${result.duration}ms)`);
      
      if (!result.passed && result.error) {
        console.log(`    Error: ${result.error}`);
      }
    }
    
    console.log("-".repeat(80));
    console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
    console.log(`Average Duration: ${summary.avgDuration.toFixed(2)}ms`);
    console.log("=".repeat(80) + "\n");
  }
}

// ============================================================================
// Performance Metrics
// ============================================================================

export interface PerformanceMetrics {
  agentName: string;
  callCount: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
}

export class PerformanceTracker {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  
  track<T>(agentName: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    return fn()
      .then(result => {
        this.recordSuccess(agentName, Date.now() - startTime);
        return result;
      })
      .catch(error => {
        this.recordFailure(agentName, Date.now() - startTime);
        throw error;
      });
  }
  
  private recordSuccess(agentName: string, duration: number): void {
    const current = this.metrics.get(agentName) || this.createEmptyMetrics(agentName);
    
    current.callCount++;
    current.totalDuration += duration;
    current.avgDuration = current.totalDuration / current.callCount;
    current.minDuration = Math.min(current.minDuration, duration);
    current.maxDuration = Math.max(current.maxDuration, duration);
    current.successRate = (current.callCount - (current.callCount - current.callCount)) / current.callCount;
    
    this.metrics.set(agentName, current);
  }
  
  private recordFailure(agentName: string, duration: number): void {
    const current = this.metrics.get(agentName) || this.createEmptyMetrics(agentName);
    
    current.callCount++;
    current.totalDuration += duration;
    current.avgDuration = current.totalDuration / current.callCount;
    current.maxDuration = Math.max(current.maxDuration, duration);
    // Success rate calculation would track failures separately
    
    this.metrics.set(agentName, current);
  }
  
  private createEmptyMetrics(agentName: string): PerformanceMetrics {
    return {
      agentName,
      callCount: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      successRate: 1
    };
  }
  
  getMetrics(agentName?: string): PerformanceMetrics | PerformanceMetrics[] {
    if (agentName) {
      return this.metrics.get(agentName) || this.createEmptyMetrics(agentName);
    }
    return Array.from(this.metrics.values());
  }
}

export default {
  MockMemoryLayerEngine,
  AgentTestAssertions,
  AgentTestRunner,
  PerformanceTracker,
  WhyAgentTestScenarios,
  ResearchAgentTestScenarios
};
