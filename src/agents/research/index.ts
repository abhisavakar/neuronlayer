/**
 * Research Agent - Phase 1: Deep Investigation
 * 
 * Super-intelligent implementation with:
 * - Multi-query parallel search
 * - Advanced pattern matching
 * - Past failure analysis
 * - Approach synthesis with LLM
 * - Risk assessment
 */

import type {
  ResearchAgentInput,
  ResearchAgentOutput,
  ResearchExistingCode,
  ReusableComponent,
  ApplicablePattern,
  ResearchFailure,
  Lesson,
  RelevantDecision,
  Approach,
  AgentConfig,
  RiskLevel,
  WhyAgentOutput
} from "../types/index.js";

export interface ResearchAgentConfig extends AgentConfig {
  llmProvider?: any;
  maxSearchQueries?: number;
  minRelevanceThreshold?: number;
  enableWebResearch?: boolean;
}

export class ResearchAgent {
  private config: ResearchAgentConfig;
  private engine: any;
  
  constructor(config: ResearchAgentConfig) {
    this.config = config;
    this.engine = config.engine;
  }
  
  /**
   * Main research method
   */
  async research(input: ResearchAgentInput): Promise<ResearchAgentOutput> {
    console.log(`🔬 Research Agent investigating: "${input.feature_request.substring(0, 50)}..."`);
    
    // Phase 1: Deep codebase investigation (parallel)
    const [
      existingCode,
      reusableComponents,
      applicablePatterns
    ] = await Promise.all([
      this.findExistingCode(input.feature_request),
      this.findReusableComponents(input.feature_request),
      this.findApplicablePatterns(input.feature_request)
    ]);
    
    // Phase 2: Historical learning (parallel)
    const [
      pastFailures,
      lessons,
      decisions
    ] = await Promise.all([
      this.findPastFailures(input.feature_request),
      this.findLessons(input.feature_request),
      this.getArchitecturalDecisions()
    ]);
    
    // Phase 3: Context gathering
    const projectContext = await this.getProjectContext();
    
    // Phase 4: Web research (if enabled and needed)
    let webResearch = null;
    if (this.config.enableWebResearch && this.needsExternalResearch(input.feature_request)) {
      webResearch = await this.conductWebResearch(input.feature_request);
    }
    
    // Phase 5: Approach synthesis
    const approaches = await this.synthesizeApproaches(
      input.feature_request,
      existingCode,
      reusableComponents,
      applicablePatterns,
      pastFailures,
      decisions,
      webResearch
    );
    
    // Phase 6: Unknown identification
    const unknowns = this.identifyUnknowns(
      input.feature_request,
      existingCode,
      approaches
    );
    
    // Build output
    const output: ResearchAgentOutput = {
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
        security_requirements: this.extractSecurityRequirements(decisions, input.feature_request)
      },
      options: approaches,
      unknowns,
      project_context: projectContext
    };
    
    console.log(`✅ Research complete: Found ${existingCode.length} code files, ${applicablePatterns.length} patterns, ${pastFailures.length} past failures`);
    
    return output;
  }
  
  /**
   * Find existing code with multi-query search
   */
  private async findExistingCode(featureRequest: string): Promise<ResearchExistingCode[]> {
    // Generate multiple search queries
    const queries = this.generateSearchQueries(featureRequest);
    
    console.log(`  Searching with ${queries.length} queries...`);
    
    // Search in parallel
    const allResults: any[] = [];
    await Promise.all(
      queries.map(async (query) => {
        const results = await this.engine.searchCodebase(query, 10);
        allResults.push(...results);
      })
    );
    
    // Deduplicate
    const uniqueResults = this.deduplicateByPath(allResults);
    
    // Score and enrich
    const enriched = await Promise.all(
      uniqueResults.map(async (result) => {
        const relevanceScore = this.calculateRelevance(result, featureRequest);
        const dependencies = result.dependencies || [];
        
        return {
          path: result.path,
          summary: result.summary || await this.summarizeFile(result.path),
          relevance_score: relevanceScore,
          how_to_use: this.describeUsage(result, featureRequest),
          dependencies
        };
      })
    );
    
    return enriched
      .filter(code => code.relevance_score >= (this.config.minRelevanceThreshold || 50))
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 10);
  }
  
  /**
   * Find reusable components
   */
  private async findReusableComponents(featureRequest: string): Promise<ReusableComponent[]> {
    const suggestions = await this.engine.suggestExisting(featureRequest);
    
    return suggestions.map(suggestion => {
      const reusability = this.assessReusability(suggestion);
      
      return {
        name: suggestion.name,
        path: suggestion.path,
        description: suggestion.description,
        interface: suggestion.interface || "N/A",
        reusability,
        modification_needed: reusability !== "high" 
          ? this.identifyModifications(suggestion, featureRequest)
          : null
      };
    }).slice(0, 5);
  }
  
  /**
   * Find applicable patterns
   */
  private async findApplicablePatterns(featureRequest: string): Promise<ApplicablePattern[]> {
    const categories = this.identifyCategories(featureRequest);
    
    const allPatterns: ApplicablePattern[] = [];
    
    for (const category of categories) {
      const patterns = await this.engine.listPatterns(category);
      
      for (const pattern of patterns) {
        const confidence = this.calculatePatternConfidence(pattern, featureRequest);
        
        allPatterns.push({
          id: pattern.id,
          name: pattern.name,
          category,
          description: pattern.description,
          examples: pattern.examples || [],
          confidence
        });
      }
    }
    
    return allPatterns
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }
  
  /**
   * Find past failures
   */
  private async findPastFailures(featureRequest: string): Promise<ResearchFailure[]> {
    const failures = await this.engine.getFailures(featureRequest);
    
    return failures
      .map(failure => ({
        id: failure.id,
        feature: failure.feature,
        approach: failure.approach,
        why_failed: failure.why_failed,
        lesson: failure.lesson,
        how_to_avoid: this.suggestHowToAvoid(failure),
        relevance: this.calculateFailureRelevance(failure, featureRequest)
      }))
      .filter(f => f.relevance >= 40)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  }
  
  /**
   * Find lessons from retrospectives
   */
  private async findLessons(featureRequest: string): Promise<Lesson[]> {
    const retrospectives = await this.engine.getRetrospectives(featureRequest);
    
    return retrospectives.map(retro => ({
      feature: retro.feature,
      surprise: retro.surprises,
      would_change: retro.would_change,
      recommendation: this.extractRecommendation(retro)
    })).slice(0, 3);
  }
  
  /**
   * Get architectural decisions
   */
  private async getArchitecturalDecisions(): Promise<RelevantDecision[]> {
    const sources = await this.engine.listSources();
    
    return sources
      .filter((source: any) => source.type === "decision")
      .map((source: any) => ({
        id: source.id,
        title: source.title,
        description: source.description,
        status: source.status as "active" | "deprecated",
        impact: source.impact || "Unknown"
      }))
      .slice(0, 10);
  }
  
  /**
   * Get current project context
   */
  private async getProjectContext() {
    const recentChanges = await this.engine.whatChanged("last feature completion");
    const changelog = await this.engine.getChangelog("this week");
    
    return {
      recent_changes: recentChanges.map((c: any) => c.description).slice(0, 5),
      active_features: changelog.filter((c: any) => c.in_progress).map((c: any) => c.feature).slice(0, 3),
      current_momentum: this.assessMomentum(recentChanges)
    };
  }
  
  /**
   * Conduct web research for external libraries/approaches
   */
  private async conductWebResearch(featureRequest: string): Promise<any> {
    if (!this.config.llmProvider) return null;
    
    // Extract library names from feature request
    const libraries = this.extractLibraryNames(featureRequest);
    
    const research: any = {
      libraries: [],
      best_practices: [],
      common_pitfalls: []
    };
    
    // Would use webfetch here if available
    // For now, return structure for LLM to fill
    
    return research;
  }
  
  /**
   * Synthesize multiple approaches
   */
  private async synthesizeApproaches(
    featureRequest: string,
    existingCode: ResearchExistingCode[],
    reusableComponents: ReusableComponent[],
    patterns: ApplicablePattern[],
    failures: ResearchFailure[],
    decisions: RelevantDecision[],
    webResearch: any
  ): Promise<{ approach_a: Approach; approach_b: Approach; recommended: "a" | "b" }> {
    // Approach A: Conservative (use existing patterns and components)
    const approachA: Approach = {
      description: this.describeConservativeApproach(
        featureRequest,
        existingCode,
        reusableComponents,
        patterns
      ),
      pros: [
        "Uses established patterns and components",
        "Lower risk due to prior art",
        "Faster implementation",
        "Easier to maintain",
        "Team already familiar with patterns"
      ],
      cons: [
        "May not be optimal for unique requirements",
        "Could inherit technical debt from existing code",
        "Less opportunity for innovation"
      ],
      risk_level: failures.length > 0 ? "medium" : "low",
      estimated_effort: existingCode.length > 0 ? "low" : "medium",
      fits_patterns: true,
      alignment_score: Math.min(95, 70 + (existingCode.length * 5))
    };
    
    // Approach B: Innovative (new solution optimized for feature)
    const hasHighRiskFailures = failures.filter(f => f.relevance > 70).length > 0;
    
    const approachB: Approach = {
      description: this.describeInnovativeApproach(
        featureRequest,
        failures,
        decisions,
        webResearch
      ),
      pros: [
        "Optimized specifically for this feature",
        "Cleaner architecture without legacy constraints",
        "Potential for better performance",
        "Opportunity to improve patterns"
      ],
      cons: [
        "Higher risk - less proven",
        "Longer implementation time",
        "May conflict with existing patterns",
        "More testing required",
        "Team learning curve"
      ],
      risk_level: hasHighRiskFailures ? "high" : "medium",
      estimated_effort: "high",
      fits_patterns: false,
      alignment_score: hasHighRiskFailures ? 50 : 70
    };
    
    // Recommendation logic
    const recommended: "a" | "b" = this.recommendApproach(
      approachA,
      approachB,
      existingCode,
      failures
    );
    
    return { approach_a: approachA, approach_b: approachB, recommended };
  }
  
  /**
   * Identify unknowns and risks
   */
  private identifyUnknowns(
    featureRequest: string,
    existingCode: ResearchExistingCode[],
    approaches: { approach_a: Approach; approach_b: Approach }
  ): string[] {
    const unknowns: string[] = [];
    
    // Technology unknowns
    const techPatterns: Record<string, string> = {
      "websocket": "Scaling WebSocket connections under load",
      "oauth": "Integration complexity with OAuth providers",
      "graphql": "Query complexity and N+1 problem",
      "microservice": "Inter-service communication and eventual consistency",
      "blockchain": "Performance and cost implications",
      "ml": "Model training, versioning, and drift",
      "ai": "API costs and rate limiting"
    };
    
    const requestLower = featureRequest.toLowerCase();
    for (const [tech, risk] of Object.entries(techPatterns)) {
      if (requestLower.includes(tech)) {
        unknowns.push(risk);
      }
    }
    
    // Architectural unknowns
    if (!existingCode.some(code => code.relevance_score > 50)) {
      unknowns.push("No prior art in codebase - unknown integration points");
    }
    
    // Performance unknowns
    if (approaches.approach_b.risk_level === "high") {
      unknowns.push("Performance characteristics of new approach");
    }
    
    // Scale unknowns
    if (requestLower.includes("scale") || requestLower.includes("million")) {
      unknowns.push("Scalability under production load");
    }
    
    return unknowns;
  }
  
  // ============================================================================
  // Helper Methods
  // ============================================================================
  
  private generateSearchQueries(featureRequest: string): string[] {
    const queries = [featureRequest];
    
    // Extract keywords
    const keywords = this.extractKeywords(featureRequest);
    
    // Generate combinations
    for (let i = 0; i < Math.min(keywords.length - 1, 3); i++) {
      queries.push(`${keywords[i]} ${keywords[i + 1]}`);
    }
    
    // Category-specific queries
    const categories: Record<string, string[]> = {
      "auth": ["authentication", "login", "session"],
      "api": ["endpoint", "route", "controller", "handler"],
      "database": ["model", "entity", "repository", "table"],
      "ui": ["component", "page", "view", "template"],
      "test": ["test", "spec", "mock", "fixture"]
    };
    
    const requestLower = featureRequest.toLowerCase();
    for (const [category, terms] of Object.entries(categories)) {
      if (requestLower.includes(category) || terms.some(t => requestLower.includes(t))) {
        queries.push(...terms.slice(0, 2));
      }
    }
    
    return [...new Set(queries)].slice(0, this.config.maxSearchQueries || 5);
  }
  
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
  }
  
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      "this", "that", "with", "from", "have", "will", "should",
      "would", "could", "might", "than", "them", "their", "they"
    ]);
    return stopWords.has(word);
  }
  
  private deduplicateByPath(results: any[]): any[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.path)) return false;
      seen.add(result.path);
      return true;
    });
  }
  
  private calculateRelevance(result: any, query: string): number {
    let score = (result.similarity_score || 0.5) * 100;
    
    // Keyword matching
    const keywords = this.extractKeywords(query);
    const content = (result.content || result.summary || "").toLowerCase();
    
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        score += 3;
      }
    }
    
    // Filename matching
    const filename = result.path.split('/').pop()?.toLowerCase() || '';
    for (const keyword of keywords) {
      if (filename.includes(keyword)) {
        score += 5;
      }
    }
    
    return Math.min(100, Math.round(score));
  }
  
  private async summarizeFile(path: string): Promise<string> {
    // Would use LLM to summarize
    return "File summary not available";
  }
  
  private describeUsage(result: any, featureRequest: string): string {
    if (result.summary) {
      return `Existing ${result.path} implements: ${result.summary}`;
    }
    return `Code at ${result.path} may provide reusable logic`;
  }
  
  private assessReusability(component: any): "high" | "medium" | "low" {
    if (component.exact_match) return "high";
    if (component.similarity_score > 0.8) return "medium";
    return "low";
  }
  
  private identifyModifications(component: any, featureRequest: string): string {
    return `May need to extend ${component.name} to support additional functionality`;
  }
  
  private identifyCategories(featureRequest: string): string[] {
    const categories: string[] = [];
    const requestLower = featureRequest.toLowerCase();
    
    const categoryMap: Record<string, string[]> = {
      "database": ["database", "sql", "table", "migration", "schema"],
      "api": ["api", "endpoint", "route", "controller", "graphql", "rest"],
      "component": ["component", "ui", "page", "view", "react", "vue"],
      "authentication": ["auth", "login", "session", "jwt", "oauth"],
      "testing": ["test", "spec", "jest", "vitest", "cypress"],
      "infrastructure": ["docker", "terraform", "nginx", "deploy"]
    };
    
    for (const [category, terms] of Object.entries(categoryMap)) {
      if (terms.some(term => requestLower.includes(term))) {
        categories.push(category);
      }
    }
    
    return categories.length > 0 ? categories : ["general"];
  }
  
  private calculatePatternConfidence(pattern: any, featureRequest: string): number {
    let confidence = 70;
    
    // Boost for high usage
    if (pattern.usage_count > 10) confidence += 15;
    else if (pattern.usage_count > 5) confidence += 10;
    
    // Boost for keyword match
    const patternWords = new Set(pattern.description.toLowerCase().split(/\s+/));
    const requestWords = new Set(featureRequest.toLowerCase().split(/\s+/));
    const intersection = [...patternWords].filter(w => requestWords.has(w));
    confidence += intersection.length * 2;
    
    return Math.min(100, confidence);
  }
  
  private calculateFailureRelevance(failure: any, featureRequest: string): number {
    const featureWords = new Set(this.extractKeywords(failure.feature));
    const requestWords = new Set(this.extractKeywords(featureRequest));
    
    const intersection = [...featureWords].filter(w => requestWords.has(w));
    const union = new Set([...featureWords, ...requestWords]);
    
    return Math.round((intersection.length / union.size) * 100);
  }
  
  private suggestHowToAvoid(failure: any): string {
    return `Avoid: ${failure.approach}. Instead: ${failure.lesson}`;
  }
  
  private extractRecommendation(retro: any): string {
    return retro.would_change || "No specific recommendation";
  }
  
  private assessMomentum(changes: any[]): string {
    if (changes.length > 10) return "High";
    if (changes.length > 5) return "Medium";
    return "Low";
  }
  
  private needsExternalResearch(featureRequest: string): boolean {
    const externalIndicators = [
      "library", "package", "framework", "npm", "pip",
      "oauth", "stripe", "aws", "google", "api"
    ];
    
    const requestLower = featureRequest.toLowerCase();
    return externalIndicators.some(indicator => requestLower.includes(indicator));
  }
  
  private extractLibraryNames(featureRequest: string): string[] {
    // Simple extraction - would be more sophisticated with NLP
    const commonLibraries = [
      "react", "vue", "angular", "express", "fastapi", "django",
      "stripe", "oauth", "firebase", "aws", "google"
    ];
    
    const requestLower = featureRequest.toLowerCase();
    return commonLibraries.filter(lib => requestLower.includes(lib));
  }
  
  private extractSecurityRequirements(decisions: RelevantDecision[], featureRequest: string): string[] {
    const requirements: string[] = [];
    
    const requestLower = featureRequest.toLowerCase();
    
    if (requestLower.includes("auth")) {
      requirements.push("Authentication required");
      requirements.push("Session management");
    }
    
    if (requestLower.includes("user data") || requestLower.includes("pii")) {
      requirements.push("Data encryption at rest");
      requirements.push("PII handling compliance");
    }
    
    if (requestLower.includes("api")) {
      requirements.push("Rate limiting");
      requirements.push("Input validation");
    }
    
    return requirements;
  }
  
  private describeConservativeApproach(
    featureRequest: string,
    existingCode: ResearchExistingCode[],
    reusableComponents: ReusableComponent[],
    patterns: ApplicablePattern[]
  ): string {
    const parts: string[] = [];
    
    parts.push("Build feature by extending existing codebase:");
    
    if (existingCode.length > 0) {
      parts.push(`- Leverage ${existingCode[0].path} as foundation`);
    }
    
    if (reusableComponents.length > 0) {
      parts.push(`- Reuse ${reusableComponents[0].name} component`);
    }
    
    if (patterns.length > 0) {
      parts.push(`- Follow ${patterns[0].name} pattern`);
    }
    
    return parts.join("\n");
  }
  
  private describeInnovativeApproach(
    featureRequest: string,
    failures: ResearchFailure[],
    decisions: RelevantDecision[],
    webResearch: any
  ): string {
    const parts: string[] = [];
    
    parts.push("Build feature with optimized architecture:");
    parts.push("- Design specifically for this use case");
    parts.push("- Avoid legacy constraints");
    
    if (failures.length > 0) {
      parts.push(`- Learn from ${failures[0].feature} failure`);
    }
    
    return parts.join("\n");
  }
  
  private recommendApproach(
    approachA: Approach,
    approachB: Approach,
    existingCode: ResearchExistingCode[],
    failures: ResearchFailure[]
  ): "a" | "b" {
    // Strong preference for conservative if good prior art exists
    if (existingCode.some(c => c.relevance_score > 80) && approachA.risk_level === "low") {
      return "a";
    }
    
    // Avoid high risk if there are past failures
    const highRiskFailures = failures.filter(f => f.relevance > 70);
    if (approachB.risk_level === "high" && highRiskFailures.length > 0) {
      return "a";
    }
    
    // Prefer approach A for medium risk or better
    if (approachA.risk_level !== "high") {
      return "a";
    }
    
    return "b";
  }
}

export default ResearchAgent;
