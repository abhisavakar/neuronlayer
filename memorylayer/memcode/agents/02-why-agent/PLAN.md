# Why Agent

## Overview

The **Why Agent** is the **gatekeeper of Phase 0 (IMPULSE)**. Its job is to challenge whether a feature should exist at all before any work begins.

## Purpose

Apply Step 1 and Step 2 of the 5-Step Algorithm:
1. **Make the requirements less dumb**
2. **Try to delete the feature**

The Why Agent prevents wasted effort on unnecessary features by asking tough questions upfront.

## Philosophy

> "The best code is no code at all."

Every feature has a cost:
- **Complexity cost** - More code = more bugs
- **Maintenance cost** - Someone has to maintain it
- **Cognitive cost** - Developers must understand it
- **Opportunity cost** - Time spent here vs. elsewhere

The Why Agent ensures we only build features that are worth these costs.

## When It Runs

**Trigger:** New feature request received

**Blocking:** Yes - can reject or require simplification

## MemoryLayer MCP Calls

```typescript
// Search for prior art
search_codebase(query: feature_description)
  → Does something similar already exist?

// Check history
what_happened(since: "3 months")
  → Did we attempt this before?

get_failures(similar_to: feature_description)
  → Did a previous attempt fail? Why?

// Check consistency
check_conflicts(proposed: feature_description)
  → Does this contradict existing architectural decisions?

// Get context
get_context(query: feature_description, max_tokens: 4000)
  → What existing code is relevant?

get_architecture()
  → Current system architecture to fit within
```

## Input/Output

### Input
```typescript
interface WhyAgentInput {
  feature_request: string;
  project_path: string;
  context?: {
    current_focus?: string;
    recent_changes?: string[];
    active_features?: string[];
  };
}
```

### Output
```typescript
interface WhyAgentOutput {
  verdict: "proceed" | "simplify" | "reject" | "merge_with_existing";
  original_request: string;
  simplified_version: string | null;
  existing_code_that_helps: ExistingCode[];
  past_failures: PastFailure[];
  conflicts: DecisionConflict[];
  questions_for_human: string[];
  reasoning: string;
}

interface ExistingCode {
  path: string;
  purpose: string;
  relevance_score: number;  // 0-100
  how_it_helps: string;
}

interface PastFailure {
  id: string;
  feature: string;
  approach: string;
  why_failed: string;
  lesson: string;
  relevance_score: number;
}

interface DecisionConflict {
  decision_id: string;
  title: string;
  conflict_type: "technical" | "architectural" | "business";
  description: string;
  severity: "blocking" | "warning";
}
```

## Agent Logic

```typescript
// src/agents/why/index.ts

export class WhyAgent {
  private engine: MemoryLayerEngine;
  
  constructor(config: AgentConfig) {
    this.engine = config.engine;
  }
  
  async analyze(input: WhyAgentInput): Promise<WhyAgentOutput> {
    // 1. Search for prior art
    const priorArt = await this.findPriorArt(input.feature_request);
    
    // 2. Check for past failures
    const pastFailures = await this.findPastFailures(input.feature_request);
    
    // 3. Check for conflicts
    const conflicts = await this.findConflicts(input.feature_request);
    
    // 4. Analyze necessity
    const necessityAnalysis = await this.analyzeNecessity(
      input.feature_request,
      priorArt
    );
    
    // 5. Suggest simplification
    const simplifiedVersion = await this.suggestSimplification(
      input.feature_request,
      priorArt,
      necessityAnalysis
    );
    
    // 6. Generate questions for human
    const questions = this.generateQuestions(
      input.feature_request,
      priorArt,
      pastFailures,
      conflicts,
      necessityAnalysis
    );
    
    // 7. Determine verdict
    const verdict = this.determineVerdict(
      input.feature_request,
      priorArt,
      pastFailures,
      conflicts,
      necessityAnalysis,
      simplifiedVersion
    );
    
    return {
      verdict,
      original_request: input.feature_request,
      simplified_version: simplifiedVersion,
      existing_code_that_helps: priorArt,
      past_failures: pastFailures,
      conflicts,
      questions_for_human: questions,
      reasoning: this.generateReasoning(
        verdict,
        priorArt,
        pastFailures,
        necessityAnalysis
      )
    };
  }
  
  private async findPriorArt(featureRequest: string): Promise<ExistingCode[]> {
    // Search codebase for similar functionality
    const searchResults = await this.engine.searchCodebase(featureRequest, 10);
    
    // Score relevance of each result
    return searchResults.map(result => ({
      path: result.path,
      purpose: result.summary || "Unknown",
      relevance_score: this.calculateRelevance(result, featureRequest),
      how_it_helps: this.describeHowItHelps(result, featureRequest)
    })).sort((a, b) => b.relevance_score - a.relevance_score);
  }
  
  private async findPastFailures(featureRequest: string): Promise<PastFailure[]> {
    // Get failures similar to this feature
    const failures = await this.engine.getFailures(featureRequest);
    
    return failures.map(failure => ({
      id: failure.id,
      feature: failure.feature,
      approach: failure.approach,
      why_failed: failure.why_failed,
      lesson: failure.lesson,
      relevance_score: this.calculateFailureRelevance(failure, featureRequest)
    })).sort((a, b) => b.relevance_score - a.relevance_score);
  }
  
  private async findConflicts(featureRequest: string): Promise<DecisionConflict[]> {
    // Check for conflicts with existing decisions
    const conflicts = await this.engine.checkConflicts(featureRequest);
    
    return conflicts.map(conflict => ({
      decision_id: conflict.decision_id,
      title: conflict.title,
      conflict_type: this.classifyConflictType(conflict),
      description: conflict.description,
      severity: conflict.severity
    }));
  }
  
  private async analyzeNecessity(
    featureRequest: string,
    priorArt: ExistingCode[]
  ): Promise<NecessityAnalysis> {
    // Analyze if this feature is truly necessary
    const analysis: NecessityAnalysis = {
      similar_exists: priorArt.some(code => code.relevance_score > 80),
      solves_real_problem: false,
      simplest_version: null,
      can_be_workaround: false,
      opportunity_cost: "medium"
    };
    
    // Check if it solves a real problem
    analysis.solves_real_problem = this.solvesRealProblem(featureRequest);
    
    // Identify simplest version
    analysis.simplest_version = this.identifySimplestVersion(featureRequest);
    
    // Check if workaround exists
    analysis.can_be_workaround = this.canBeWorkaround(featureRequest, priorArt);
    
    return analysis;
  }
  
  private async suggestSimplification(
    featureRequest: string,
    priorArt: ExistingCode[],
    necessityAnalysis: NecessityAnalysis
  ): Promise<string | null> {
    // If similar code exists, suggest using it
    if (necessityAnalysis.similar_exists) {
      const bestMatch = priorArt[0];
      return `Reuse existing ${bestMatch.path} with modifications instead of building new feature`;
    }
    
    // Suggest simplest version
    if (necessityAnalysis.simplest_version) {
      return necessityAnalysis.simplest_version;
    }
    
    // Check for workaround
    if (necessityAnalysis.can_be_workaround) {
      return `Use workaround instead of building feature`;
    }
    
    return null;
  }
  
  private generateQuestions(
    featureRequest: string,
    priorArt: ExistingCode[],
    pastFailures: PastFailure[],
    conflicts: DecisionConflict[],
    necessityAnalysis: NecessityAnalysis
  ): string[] {
    const questions: string[] = [];
    
    // Questions about prior art
    if (priorArt.length > 0 && priorArt[0].relevance_score > 70) {
      questions.push(
        `We have similar code at ${priorArt[0].path}. Can we extend it instead of building new?`
      );
    }
    
    // Questions about past failures
    if (pastFailures.length > 0) {
      questions.push(
        `Similar feature '${pastFailures[0].feature}' failed because: ${pastFailures[0].why_failed}. How will we avoid this?`
      );
    }
    
    // Questions about conflicts
    for (const conflict of conflicts) {
      questions.push(
        `This conflicts with decision '${conflict.title}'. How should we resolve this?`
      );
    }
    
    // Core questions
    questions.push(
      "What is the minimum viable version of this feature?",
      "Can we achieve 80% of the value with 20% of the effort?",
      "What happens if we DON'T build this feature?",
      "Is this a 'must have' or 'nice to have'?"
    );
    
    return questions;
  }
  
  private determineVerdict(
    featureRequest: string,
    priorArt: ExistingCode[],
    pastFailures: PastFailure[],
    conflicts: DecisionConflict[],
    necessityAnalysis: NecessityAnalysis,
    simplifiedVersion: string | null
  ): "proceed" | "simplify" | "reject" | "merge_with_existing" {
    // Check for blocking conflicts
    const blockingConflicts = conflicts.filter(c => c.severity === "blocking");
    if (blockingConflicts.length > 0) {
      return "reject";
    }
    
    // Check for repeated failures
    const repeatedFailures = pastFailures.filter(f => f.relevance_score > 90);
    if (repeatedFailures.length >= 2) {
      return "reject";
    }
    
    // Check if exact same feature already exists
    const exactMatch = priorArt.find(code => code.relevance_score > 95);
    if (exactMatch) {
      return "merge_with_existing";
    }
    
    // Suggest simplification if possible
    if (simplifiedVersion && simplifiedVersion !== featureRequest) {
      return "simplify";
    }
    
    // Check if it doesn't solve a real problem
    if (!necessityAnalysis.solves_real_problem) {
      return "reject";
    }
    
    // Default: proceed
    return "proceed";
  }
  
  private generateReasoning(
    verdict: string,
    priorArt: ExistingCode[],
    pastFailures: PastFailure[],
    necessityAnalysis: NecessityAnalysis
  ): string {
    const parts: string[] = [];
    
    parts.push(`Verdict: ${verdict}`);
    
    if (priorArt.length > 0) {
      parts.push(`Found ${priorArt.length} similar code files. Best match: ${priorArt[0].path} (score: ${priorArt[0].relevance_score})`);
    }
    
    if (pastFailures.length > 0) {
      parts.push(`Found ${pastFailures.length} past failures with similar features`);
    }
    
    parts.push(`Solves real problem: ${necessityAnalysis.solves_real_problem}`);
    
    return parts.join("\n");
  }
  
  // Helper methods
  private calculateRelevance(result: SearchResult, featureRequest: string): number {
    // Use semantic similarity + keyword matching
    let score = result.similarity_score * 100;
    
    // Boost for keyword matches
    const keywords = this.extractKeywords(featureRequest);
    for (const keyword of keywords) {
      if (result.content?.toLowerCase().includes(keyword.toLowerCase())) {
        score += 5;
      }
    }
    
    return Math.min(100, score);
  }
  
  private calculateFailureRelevance(failure: Failure, featureRequest: string): number {
    // Compare feature descriptions
    return this.semanticSimilarity(failure.feature, featureRequest) * 100;
  }
  
  private describeHowItHelps(result: SearchResult, featureRequest: string): string {
    if (result.summary) {
      return `Existing ${result.path} implements similar functionality: ${result.summary}`;
    }
    return `Code at ${result.path} may be reusable`;
  }
  
  private classifyConflictType(conflict: Conflict): "technical" | "architectural" | "business" {
    if (conflict.description.includes("architecture") || conflict.description.includes("pattern")) {
      return "architectural";
    }
    if (conflict.description.includes("business") || conflict.description.includes("requirement")) {
      return "business";
    }
    return "technical";
  }
  
  private solvesRealProblem(featureRequest: string): boolean {
    // Check for problem indicators in feature request
    const problemIndicators = [
      "bug", "error", "crash", "slow", "performance",
      "user can't", "user needs", "customer wants",
      "security", "compliance", "broken"
    ];
    
    const requestLower = featureRequest.toLowerCase();
    return problemIndicators.some(indicator => 
      requestLower.includes(indicator)
    );
  }
  
  private identifySimplestVersion(featureRequest: string): string | null {
    // Try to identify the core need
    // Examples:
    // "Add user authentication with OAuth, 2FA, and SSO" → "Add basic email/password auth"
    // "Build real-time chat with WebSockets" → "Add comments that refresh on page load"
    
    // This would use LLM to extract core need
    return null; // Placeholder
  }
  
  private canBeWorkaround(
    featureRequest: string,
    priorArt: ExistingCode[]
  ): boolean {
    // Check if existing manual process could work
    return false; // Placeholder
  }
  
  private extractKeywords(text: string): string[] {
    // Extract key nouns and verbs
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
  }
  
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      "the", "and", "for", "with", "from", "this", "that",
      "have", "will", "should", "would", "could", "might"
    ]);
    return stopWords.has(word);
  }
  
  private semanticSimilarity(text1: string, text2: string): number {
    // Use embeddings to calculate semantic similarity
    // Placeholder - would call MemoryLayer engine
    return 0.5;
  }
}

interface NecessityAnalysis {
  similar_exists: boolean;
  solves_real_problem: boolean;
  simplest_version: string | null;
  can_be_workaround: boolean;
  opportunity_cost: "low" | "medium" | "high";
}
```

## Decision Matrix

| Condition | Verdict |
|-----------|---------|
| Blocking conflicts exist | **reject** |
| 2+ high-relevance past failures | **reject** |
| 95%+ match with existing code | **merge_with_existing** |
| Simplification possible | **simplify** |
| Doesn't solve real problem | **reject** |
| Similar code exists (70-95%) | **simplify** |
| Default | **proceed** |

## Examples

### Example 1: Simple Feature
```
Input: "Add a button to export data as CSV"

Analysis:
- Prior art: Found existing export functionality in src/utils/export.ts (score: 85)
- Past failures: None
- Conflicts: None
- Necessity: Solves real problem (user needs data export)

Output:
{
  verdict: "simplify",
  simplified_version: "Extend existing export utility to support CSV format",
  existing_code_that_helps: [
    { path: "src/utils/export.ts", relevance_score: 85, how_it_helps: "..." }
  ],
  questions_for_human: [
    "We have similar export code at src/utils/export.ts. Can we extend it?",
    "What is the minimum viable version of this feature?"
  ],
  reasoning: "Found existing export code that can be extended"
}
```

### Example 2: Duplicate Feature
```
Input: "Add user authentication with email and password"

Analysis:
- Prior art: Found src/auth/login.ts with 98% relevance
- Past failures: None
- Conflicts: None

Output:
{
  verdict: "merge_with_existing",
  simplified_version: null,
  existing_code_that_helps: [
    { path: "src/auth/login.ts", relevance_score: 98, how_it_helps: "..." }
  ],
  questions_for_human: [
    "Authentication already exists at src/auth/login.ts. What additional functionality is needed?"
  ],
  reasoning: "Exact same feature already implemented"
}
```

### Example 3: Failed Before
```
Input: "Add real-time collaboration with WebSockets"

Analysis:
- Prior art: None
- Past failures: Found 2 failures with WebSocket features
  - "Real-time notifications" failed due to scaling issues
  - "Live cursor tracking" failed due to complexity
- Conflicts: None

Output:
{
  verdict: "reject",
  simplified_version: "Add polling-based updates (refresh every 30s)",
  past_failures: [
    { feature: "Real-time notifications", why_failed: "Scaling issues", relevance_score: 90 },
    { feature: "Live cursor tracking", why_failed: "Too complex", relevance_score: 85 }
  ],
  questions_for_human: [
    "Similar WebSocket features failed due to scaling and complexity. How will this be different?",
    "Can we achieve similar UX with simpler polling approach?"
  ],
  reasoning: "Multiple past failures with WebSocket features. Suggest simpler polling approach."
}
```

### Example 4: Nice-to-Have
```
Input: "Add dark mode to the dashboard"

Analysis:
- Prior art: None
- Past failures: None
- Conflicts: None
- Necessity: Doesn't solve real problem (no bug, no user need stated)

Output:
{
  verdict: "simplify",
  simplified_version: "Use CSS prefers-color-scheme media query (1 line of CSS)",
  questions_for_human: [
    "What happens if we DON'T build this feature?",
    "Is this a 'must have' or 'nice to have'?",
    "Have users requested this?"
  ],
  reasoning: "Doesn't appear to solve a critical problem. Suggest minimal implementation."
}
```

## Test Cases

### Test 1: Rejects Duplicate Feature
```typescript
it("should reject feature that already exists", async () => {
  const agent = new WhyAgent(config);
  
  // Mock engine to return exact match
  jest.spyOn(config.engine, "searchCodebase").mockResolvedValue([{
    path: "src/auth/login.ts",
    content: "User authentication with email/password",
    similarity_score: 0.98
  }]);
  
  const result = await agent.analyze({
    feature_request: "Add user authentication with email and password"
  });
  
  expect(result.verdict).toBe("merge_with_existing");
  expect(result.existing_code_that_helps[0].relevance_score).toBeGreaterThan(95);
});
```

### Test 2: Suggests Simplification
```typescript
it("should suggest simplification when possible", async () => {
  const agent = new WhyAgent(config);
  
  jest.spyOn(config.engine, "searchCodebase").mockResolvedValue([{
    path: "src/utils/export.ts",
    content: "Export utilities",
    similarity_score: 0.75
  }]);
  
  const result = await agent.analyze({
    feature_request: "Add comprehensive data export with CSV, Excel, PDF support"
  });
  
  expect(result.verdict).toBe("simplify");
  expect(result.simplified_version).toBeTruthy();
  expect(result.questions_for_human).toContain(
    expect.stringContaining("existing")
  );
});
```

### Test 3: Rejects Based on Past Failures
```typescript
it("should reject feature with multiple past failures", async () => {
  const agent = new WhyAgent(config);
  
  jest.spyOn(config.engine, "getFailures").mockResolvedValue([
    { id: "1", feature: "WebSocket notifications", why_failed: "Scaling", lesson: "..." },
    { id: "2", feature: "WebSocket chat", why_failed: "Complexity", lesson: "..." }
  ]);
  
  const result = await agent.analyze({
    feature_request: "Add real-time collaboration with WebSockets"
  });
  
  expect(result.verdict).toBe("reject");
  expect(result.past_failures).toHaveLength(2);
  expect(result.reasoning).toContain("failures");
});
```

### Test 4: Detects Conflicts
```typescript
it("should detect decision conflicts", async () => {
  const agent = new WhyAgent(config);
  
  jest.spyOn(config.engine, "checkConflicts").mockResolvedValue([{
    decision_id: "dec-001",
    title: "Use REST, not GraphQL",
    severity: "blocking"
  }]);
  
  const result = await agent.analyze({
    feature_request: "Add GraphQL API for flexible queries"
  });
  
  expect(result.verdict).toBe("reject");
  expect(result.conflicts[0].severity).toBe("blocking");
});
```

### Test 5: Proceeds When Appropriate
```typescript
it("should proceed for valid new feature", async () => {
  const agent = new WhyAgent(config);
  
  jest.spyOn(config.engine, "searchCodebase").mockResolvedValue([]);
  jest.spyOn(config.engine, "getFailures").mockResolvedValue([]);
  jest.spyOn(config.engine, "checkConflicts").mockResolvedValue([]);
  
  const result = await agent.analyze({
    feature_request: "Fix critical security vulnerability in auth middleware"
  });
  
  expect(result.verdict).toBe("proceed");
  expect(result.solves_real_problem).toBe(true);
});
```

## Key Features

1. **Intelligent Prior Art Detection** - Finds similar code with relevance scoring
2. **Failure Learning** - Remembers what didn't work
3. **Conflict Detection** - Catches architectural mismatches early
4. **Necessity Analysis** - Questions whether feature is truly needed
5. **Simplification Suggestions** - Proposes minimum viable versions
6. **Human Questions** - Asks tough questions that make people think

## Success Metrics

- **Rejection Rate**: 20-30% of features should be simplified or rejected
- **False Positive Rate**: <5% (shouldn't reject truly needed features)
- **Human Satisfaction**: Developers feel their time is respected

## Next Steps

1. Implement semantic similarity using embeddings
2. Add keyword extraction for better relevance scoring
3. Create failure database and query system
4. Build decision conflict detection
5. Train on historical feature requests
6. Integrate with LLM for simplification suggestions
