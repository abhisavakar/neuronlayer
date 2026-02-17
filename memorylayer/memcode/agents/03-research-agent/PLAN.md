# Research Agent

## Overview

The **Research Agent** operates in **Phase 1 (RESEARCH)**. Its job is to gather all available knowledge before designing — just like a senior engineer would do.

## Purpose

> "Weeks of coding can save you hours of research."

The Research Agent prevents:
- **Reinventing the wheel** - Finding existing solutions
- **Making the same mistakes** - Learning from past failures
- **Going against the grain** - Understanding existing patterns and decisions
- **Underestimating complexity** - Identifying hidden challenges

## When It Runs

**Trigger:** Why Agent verdict is "proceed" or "simplify", human approved

**Blocking:** No - provides input but doesn't block

## MemoryLayer MCP Calls

```typescript
// Deep search for related code
search_codebase(query: approved_feature, limit: 20)
  → All related code in the project

// Find reusable components
suggest_existing(intent: feature_description)
  → Reusable components and functions

// Find established patterns
list_patterns(category: relevant_category)
  → Established patterns to follow

// Understand architecture
get_architecture()
  → Current system architecture

// Know all sources
list_sources()
  → All knowledge sources

// Learn from past
get_retrospectives(feature_type: similar_type)
  → What did we learn from building similar features?

get_failures(similar_to: feature_description)
  → What approaches failed before and why?

// Get context
get_context(query: approved_feature, current_file: entry_point, max_tokens: 6000)
  → Full context for planning

what_changed(since: "last feature completion")
  → Current project momentum and state

get_changelog(since: "this week")
  → What's in flight right now
```

## Input/Output

### Input
```typescript
interface ResearchAgentInput {
  feature_request: string;
  why_output: WhyAgentOutput;
  project_path: string;
  selected_approach?: "a" | "b";  // If human already chose
}
```

### Output
```typescript
interface ResearchAgentOutput {
  prior_art: {
    existing_code: ExistingCode[];
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

interface ExistingCode {
  path: string;
  summary: string;
  relevance_score: number;
  how_to_use: string;
  dependencies: string[];
}

interface ReusableComponent {
  name: string;
  path: string;
  description: string;
  interface: string;
  reusability: "high" | "medium" | "low";
  modification_needed: string | null;
}

interface ApplicablePattern {
  id: string;
  name: string;
  category: string;
  description: string;
  examples: string[];
  confidence: number;
}

interface ResearchFailure {
  id: string;
  feature: string;
  approach: string;
  why_failed: string;
  lesson: string;
  how_to_avoid: string;
  relevance: number;
}

interface Lesson {
  feature: string;
  surprise: string;
  would_change: string;
  recommendation: string;
}

interface RelevantDecision {
  id: string;
  title: string;
  description: string;
  status: "active" | "deprecated";
  impact: string;
}

interface Approach {
  description: string;
  pros: string[];
  cons: string[];
  risk_level: "low" | "medium" | "high";
  estimated_effort: "low" | "medium" | "high";
  fits_patterns: boolean;
  alignment_score: number;  // 0-100
}
```

## Agent Logic

```typescript
// src/agents/research/index.ts

export class ResearchAgent {
  private engine: MemoryLayerEngine;
  
  constructor(config: AgentConfig) {
    this.engine = config.engine;
  }
  
  async research(input: ResearchAgentInput): Promise<ResearchAgentOutput> {
    // 1. Deep search for related code
    const existingCode = await this.findExistingCode(input.feature_request);
    
    // 2. Find reusable components
    const reusableComponents = await this.findReusableComponents(input.feature_request);
    
    // 3. Find applicable patterns
    const applicablePatterns = await this.findApplicablePatterns(input.feature_request);
    
    // 4. Read past failures
    const pastFailures = await this.findPastFailures(input.feature_request);
    
    // 5. Read retrospectives
    const lessons = await this.findLessons(input.feature_request);
    
    // 6. Get architectural decisions
    const decisions = await this.getArchitecturalDecisions();
    
    // 7. Get project context
    const projectContext = await this.getProjectContext();
    
    // 8. Synthesize approaches
    const approaches = await this.synthesizeApproaches(
      input.feature_request,
      existingCode,
      reusableComponents,
      applicablePatterns,
      pastFailures,
      decisions
    );
    
    // 9. Identify unknowns
    const unknowns = this.identifyUnknowns(
      input.feature_request,
      existingCode,
      approaches
    );
    
    return {
      prior_art: {
        existing_code: existingCode,
        reusable_components: reusableComponents,
        applicable_patterns: applicablePatterns
      },
      warnings: {
        past_failures: pastFailures,
        lessons_from_retrospectives: lessons
      },
      constraints: {
        architectural_decisions: decisions,
        patterns_to_follow: applicablePatterns.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description
        })),
        security_requirements: this.extractSecurityRequirements(decisions)
      },
      options: approaches,
      unknowns,
      project_context: projectContext
    };
  }
  
  private async findExistingCode(featureRequest: string): Promise<ExistingCode[]> {
    // Do multiple searches with different queries
    const queries = this.generateSearchQueries(featureRequest);
    const allResults: SearchResult[] = [];
    
    for (const query of queries) {
      const results = await this.engine.searchCodebase(query, 10);
      allResults.push(...results);
    }
    
    // Deduplicate and score
    const uniqueResults = this.deduplicateResults(allResults);
    
    return uniqueResults.map(result => ({
      path: result.path,
      summary: result.summary || await this.summarizeFile(result.path),
      relevance_score: this.calculateRelevance(result, featureRequest),
      how_to_use: this.describeUsage(result, featureRequest),
      dependencies: result.dependencies || []
    })).sort((a, b) => b.relevance_score - a.relevance_score);
  }
  
  private async findReusableComponents(
    featureRequest: string
  ): Promise<ReusableComponent[]> {
    // Use suggest_existing to find reusable components
    const suggestions = await this.engine.suggestExisting(featureRequest);
    
    return suggestions.map(suggestion => ({
      name: suggestion.name,
      path: suggestion.path,
      description: suggestion.description,
      interface: suggestion.interface || "N/A",
      reusability: this.assessReusability(suggestion),
      modification_needed: this.identifyModifications(suggestion, featureRequest)
    }));
  }
  
  private async findApplicablePatterns(
    featureRequest: string
  ): Promise<ApplicablePattern[]> {
    // Determine relevant categories
    const categories = this.identifyCategories(featureRequest);
    
    const allPatterns: ApplicablePattern[] = [];
    
    for (const category of categories) {
      const patterns = await this.engine.listPatterns(category);
      for (const pattern of patterns) {
        allPatterns.push({
          id: pattern.id,
          name: pattern.name,
          category,
          description: pattern.description,
          examples: pattern.examples || [],
          confidence: this.calculatePatternConfidence(pattern, featureRequest)
        });
      }
    }
    
    return allPatterns
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);  // Top 5 patterns
  }
  
  private async findPastFailures(
    featureRequest: string
  ): Promise<ResearchFailure[]> {
    const failures = await this.engine.getFailures(featureRequest);
    
    return failures.map(failure => ({
      id: failure.id,
      feature: failure.feature,
      approach: failure.approach,
      why_failed: failure.why_failed,
      lesson: failure.lesson,
      how_to_avoid: this.suggestHowToAvoid(failure),
      relevance: this.calculateFailureRelevance(failure, featureRequest)
    })).sort((a, b) => b.relevance - a.relevance);
  }
  
  private async findLessons(featureRequest: string): Promise<Lesson[]> {
    // Get retrospectives for similar features
    const retrospectives = await this.engine.getRetrospectives(featureRequest);
    
    return retrospectives.map(retro => ({
      feature: retro.feature,
      surprise: retro.surprises,
      would_change: retro.would_change,
      recommendation: this.extractRecommendation(retro)
    }));
  }
  
  private async getArchitecturalDecisions(): Promise<RelevantDecision[]> {
    const sources = await this.engine.listSources();
    
    return sources
      .filter(source => source.type === "decision")
      .map(source => ({
        id: source.id,
        title: source.title,
        description: source.description,
        status: source.status as "active" | "deprecated",
        impact: source.impact || "Unknown"
      }));
  }
  
  private async getProjectContext() {
    const recentChanges = await this.engine.whatChanged("last feature completion");
    const changelog = await this.engine.getChangelog("this week");
    
    return {
      recent_changes: recentChanges.map(c => c.description),
      active_features: changelog.filter(c => c.in_progress).map(c => c.feature),
      current_momentum: this.assessMomentum(recentChanges)
    };
  }
  
  private async synthesizeApproaches(
    featureRequest: string,
    existingCode: ExistingCode[],
    reusableComponents: ReusableComponent[],
    patterns: ApplicablePattern[],
    failures: ResearchFailure[],
    decisions: RelevantDecision[]
  ): Promise<{ approach_a: Approach; approach_b: Approach; recommended: "a" | "b" }> {
    // Generate two different approaches
    
    // Approach A: Conservative - use existing patterns and components
    const approachA: Approach = {
      description: this.describeApproachA(
        featureRequest,
        existingCode,
        reusableComponents,
        patterns
      ),
      pros: [
        "Uses established patterns and components",
        "Lower risk due to prior art",
        "Faster implementation",
        "Easier to maintain"
      ],
      cons: [
        "May not be optimal for unique requirements",
        "Could inherit technical debt from existing code"
      ],
      risk_level: "low",
      estimated_effort: "low",
      fits_patterns: true,
      alignment_score: 85
    };
    
    // Approach B: Innovative - new solution optimized for this feature
    const approachB: Approach = {
      description: this.describeApproachB(
        featureRequest,
        failures,
        decisions
      ),
      pros: [
        "Optimized specifically for this feature",
        "Cleaner architecture without legacy constraints",
        "Potential for better performance"
      ],
      cons: [
        "Higher risk - less proven",
        "Longer implementation time",
        "May conflict with existing patterns",
        "More testing required"
      ],
      risk_level: failures.length > 0 ? "high" : "medium",
      estimated_effort: "high",
      fits_patterns: false,
      alignment_score: 60
    };
    
    // Recommend based on risk and alignment
    const recommended: "a" | "b" = 
      approachA.risk_level === "low" && approachA.alignment_score > 75
        ? "a"
        : "b";
    
    return { approach_a: approachA, approach_b: approachB, recommended };
  }
  
  private identifyUnknowns(
    featureRequest: string,
    existingCode: ExistingCode[],
    approaches: { approach_a: Approach; approach_b: Approach }
  ): string[] {
    const unknowns: string[] = [];
    
    // Check for technology unknowns
    if (featureRequest.toLowerCase().includes("websocket")) {
      unknowns.push("Scaling WebSocket connections under load");
    }
    
    if (featureRequest.toLowerCase().includes("oauth")) {
      unknowns.push("Integration complexity with OAuth providers");
    }
    
    // Check for architectural unknowns
    if (!existingCode.some(code => code.relevance_score > 50)) {
      unknowns.push("No prior art in codebase - unknown integration points");
    }
    
    // Check for performance unknowns
    if (approaches.approach_b.risk_level === "high") {
      unknowns.push("Performance characteristics of new approach");
    }
    
    return unknowns;
  }
  
  // Helper methods
  private generateSearchQueries(featureRequest: string): string[] {
    // Generate multiple search queries from feature request
    const queries = [featureRequest];
    
    // Add keyword-based queries
    const keywords = this.extractKeywords(featureRequest);
    for (let i = 0; i < keywords.length - 1; i++) {
      queries.push(`${keywords[i]} ${keywords[i + 1]}`);
    }
    
    return queries.slice(0, 5);  // Max 5 queries
  }
  
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.path)) return false;
      seen.add(result.path);
      return true;
    });
  }
  
  private calculateRelevance(result: SearchResult, query: string): number {
    let score = (result.similarity_score || 0.5) * 100;
    
    // Boost for file type relevance
    if (query.toLowerCase().includes("api") && result.path.includes("api")) {
      score += 10;
    }
    
    return Math.min(100, score);
  }
  
  private assessReusability(component: SuggestedComponent): "high" | "medium" | "low" {
    if (component.exact_match) return "high";
    if (component.similarity_score > 0.8) return "medium";
    return "low";
  }
  
  private identifyCategories(featureRequest: string): string[] {
    const categories: string[] = [];
    const requestLower = featureRequest.toLowerCase();
    
    if (requestLower.includes("api") || requestLower.includes("endpoint")) {
      categories.push("api");
    }
    if (requestLower.includes("database") || requestLower.includes("sql")) {
      categories.push("database");
    }
    if (requestLower.includes("ui") || requestLower.includes("component")) {
      categories.push("component");
    }
    if (requestLower.includes("auth") || requestLower.includes("login")) {
      categories.push("authentication");
    }
    
    return categories.length > 0 ? categories : ["general"];
  }
  
  private calculatePatternConfidence(pattern: Pattern, featureRequest: string): number {
    // Calculate how confident we are that this pattern applies
    return pattern.usage_count > 5 ? 90 : 70;
  }
  
  private calculateFailureRelevance(failure: Failure, featureRequest: string): number {
    return this.semanticSimilarity(failure.feature, featureRequest) * 100;
  }
  
  private suggestHowToAvoid(failure: Failure): string {
    return `Avoid: ${failure.approach}. Instead: ${failure.lesson}`;
  }
  
  private extractRecommendation(retro: Retrospective): string {
    return retro.would_change || "No specific recommendation";
  }
  
  private assessMomentum(changes: Change[]): string {
    if (changes.length > 10) return "High";
    if (changes.length > 5) return "Medium";
    return "Low";
  }
  
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
  }
  
  private isStopWord(word: string): boolean {
    const stopWords = new Set(["this", "that", "with", "from", "have", "will"]);
    return stopWords.has(word);
  }
  
  private semanticSimilarity(text1: string, text2: string): number {
    // Would use embeddings
    return 0.5;
  }
}
```

## Examples

### Example 1: Adding User Profiles
```
Input: "Add user profile pages with avatar upload"

Research Results:
- Prior art: Found src/users/types.ts (relevance: 90)
- Reusable: UserAvatar component (reusability: high)
- Patterns: File upload pattern (confidence: 95)
- Past failures: Image resizing crashed server (relevance: 80)
- Lessons: Use client-side compression first

Approaches:
A: Extend existing user system with avatar (low risk)
B: Build new profile service with microservices (high risk)

Recommended: A
```

### Example 2: Complex Feature
```
Input: "Add real-time chat with WebSockets"

Research Results:
- Prior art: None in codebase
- Reusable: None
- Patterns: Observer pattern could apply
- Past failures: 3 WebSocket failures (scaling issues)
- Unknowns: Scaling, browser compatibility

Approaches:
A: Use polling with long-polling fallback (low risk, proven)
B: Native WebSockets with Redis pub/sub (high risk)

Recommended: A (with spike for B)
```

## Test Cases

### Test 1: Finds Prior Art
```typescript
it("should find existing code for similar feature", async () => {
  const agent = new ResearchAgent(config);
  
  jest.spyOn(config.engine, "searchCodebase").mockResolvedValue([
    { path: "src/auth/login.ts", similarity_score: 0.85, summary: "Auth system" },
    { path: "src/users/profile.ts", similarity_score: 0.70, summary: "User profiles" }
  ]);
  
  const result = await agent.research({
    feature_request: "Add user authentication with OAuth",
    why_output: { verdict: "proceed" } as WhyAgentOutput
  });
  
  expect(result.prior_art.existing_code).toHaveLength(2);
  expect(result.prior_art.existing_code[0].relevance_score).toBeGreaterThan(80);
});
```

### Test 2: Identifies Patterns
```typescript
it("should find applicable patterns", async () => {
  const agent = new ResearchAgent(config);
  
  jest.spyOn(config.engine, "listPatterns").mockResolvedValue([
    { id: "1", name: "Repository Pattern", description: "Data access", examples: [] }
  ]);
  
  const result = await agent.research({
    feature_request: "Add database access layer",
    why_output: { verdict: "proceed" } as WhyAgentOutput
  });
  
  expect(result.constraints.patterns_to_follow).toHaveLength(1);
  expect(result.constraints.patterns_to_follow[0].name).toBe("Repository Pattern");
});
```

### Test 3: Warns About Past Failures
```typescript
it("should warn about similar past failures", async () => {
  const agent = new ResearchAgent(config);
  
  jest.spyOn(config.engine, "getFailures").mockResolvedValue([
    { id: "1", feature: "WebSocket chat", why_failed: "Scaling", lesson: "Use Redis" }
  ]);
  
  const result = await agent.research({
    feature_request: "Add real-time notifications",
    why_output: { verdict: "proceed" } as WhyAgentOutput
  });
  
  expect(result.warnings.past_failures).toHaveLength(1);
  expect(result.warnings.past_failures[0].how_to_avoid).toContain("Redis");
});
```

## Key Features

1. **Deep Search** - Multiple queries to find all relevant code
2. **Pattern Matching** - Identifies applicable design patterns
3. **Failure Learning** - Surfaces past mistakes
4. **Option Generation** - Provides multiple approaches
5. **Risk Assessment** - Clearly marks risk levels
6. **Unknown Identification** - Flags what we don't know

## Next Steps

1. Implement multi-query search
2. Build pattern matching with confidence scoring
3. Create failure database queries
4. Add retrospective analysis
5. Build approach synthesizer
6. Integrate with LLM for descriptions
