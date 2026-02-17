/**
 * Why Agent - Phase 0: Challenge Necessity
 * 
 * Super-intelligent implementation with:
 * - Provider-specific prompt engineering
 * - Advanced reasoning patterns
 * - Comprehensive failure learning
 * - Multi-dimensional analysis
 */

import { PromptTemplates } from "../prompts.js";
import type {
  WhyAgentInput,
  WhyAgentOutput,
  ExistingCode,
  PastFailure,
  DecisionConflict,
  AgentVerdict,
  AgentConfig
} from "../types/index.js";

export interface WhyAgentConfig extends AgentConfig {
  llmProvider: any;  // LLM provider for reasoning
  minRelevanceThreshold?: number;
  maxPastFailuresToConsider?: number;
  enableSimplification?: boolean;
}

export class WhyAgent {
  private config: WhyAgentConfig;
  private engine: any;
  
  constructor(config: WhyAgentConfig) {
    this.config = config;
    this.engine = config.engine;
  }
  
  /**
   * Main analysis method
   */
  async analyze(input: WhyAgentInput): Promise<WhyAgentOutput> {
    console.log(`🔍 Why Agent analyzing: "${input.feature_request.substring(0, 50)}..."`);
    
    // Parallel investigation
    const [
      priorArt,
      pastFailures,
      conflicts,
      necessityAnalysis
    ] = await Promise.all([
      this.findPriorArt(input.feature_request),
      this.findPastFailures(input.feature_request),
      this.findConflicts(input.feature_request),
      this.analyzeNecessity(input.feature_request)
    ]);
    
    // Synthesize findings
    const simplifiedVersion = await this.suggestSimplification(
      input.feature_request,
      priorArt,
      necessityAnalysis
    );
    
    const questions = this.generateQuestions(
      input.feature_request,
      priorArt,
      pastFailures,
      conflicts,
      necessityAnalysis
    );
    
    const verdict = this.determineVerdict(
      input.feature_request,
      priorArt,
      pastFailures,
      conflicts,
      necessityAnalysis,
      simplifiedVersion
    );
    
    const reasoning = this.generateReasoning(
      verdict,
      priorArt,
      pastFailures,
      necessityAnalysis
    );
    
    const output: WhyAgentOutput = {
      verdict,
      original_request: input.feature_request,
      simplified_version: simplifiedVersion,
      existing_code_that_helps: priorArt,
      past_failures: pastFailures,
      conflicts,
      questions_for_human: questions,
      reasoning
    };
    
    console.log(`✅ Why Agent verdict: ${verdict}`);
    
    return output;
  }
  
  /**
   * Find prior art in codebase
   */
  private async findPriorArt(featureRequest: string): Promise<ExistingCode[]> {
    // Generate multiple search queries for thoroughness
    const queries = this.generateSearchQueries(featureRequest);
    
    const allResults: any[] = [];
    
    // Search with multiple queries in parallel
    await Promise.all(
      queries.map(async (query) => {
        const results = await this.engine.searchCodebase(query, 10);
        allResults.push(...results);
      })
    );
    
    // Deduplicate by path
    const uniqueResults = this.deduplicateByPath(allResults);
    
    // Score and rank
    return uniqueResults
      .map(result => ({
        path: result.path,
        purpose: result.summary || "Unknown",
        relevance_score: this.calculateRelevance(result, featureRequest),
        how_it_helps: this.describeHowItHelps(result, featureRequest)
      }))
      .filter(code => code.relevance_score >= (this.config.minRelevanceThreshold || 50))
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 5);  // Top 5 most relevant
  }
  
  /**
   * Find past failures with similar features
   */
  private async findPastFailures(featureRequest: string): Promise<PastFailure[]> {
    const failures = await this.engine.getFailures(featureRequest);
    
    return failures
      .map(failure => ({
        id: failure.id,
        feature: failure.feature,
        approach: failure.approach,
        why_failed: failure.why_failed,
        lesson: failure.lesson,
        relevance_score: this.calculateFailureRelevance(failure, featureRequest)
      }))
      .filter(f => f.relevance_score >= 50)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, this.config.maxPastFailuresToConsider || 3);
  }
  
  /**
   * Find conflicts with existing decisions
   */
  private async findConflicts(featureRequest: string): Promise<DecisionConflict[]> {
    const conflicts = await this.engine.checkConflicts(featureRequest);
    
    return conflicts.map(conflict => ({
      decision_id: conflict.decision_id,
      title: conflict.title,
      conflict_type: this.classifyConflictType(conflict),
      description: conflict.description,
      severity: conflict.severity === "blocking" ? "blocking" : "warning"
    }));
  }
  
  /**
   * Analyze necessity of feature
   */
  private async analyzeNecessity(featureRequest: string): Promise<NecessityAnalysis> {
    const analysis: NecessityAnalysis = {
      similar_exists: false,
      solves_real_problem: false,
      simplest_version: null,
      can_be_workaround: false,
      opportunity_cost: "medium"
    };
    
    // Check for problem indicators
    const problemIndicators = [
      "bug", "error", "crash", "slow", "performance",
      "user can't", "user needs", "customer wants",
      "security", "compliance", "broken", "fix",
      "vulnerability", "leak", "exploit"
    ];
    
    const requestLower = featureRequest.toLowerCase();
    analysis.solves_real_problem = problemIndicators.some(indicator =>
      requestLower.includes(indicator)
    );
    
    // Identify simplest version using LLM if available
    if (this.config.llmProvider) {
      analysis.simplest_version = await this.identifySimplestVersionWithLLM(featureRequest);
    }
    
    return analysis;
  }
  
  /**
   * Suggest simplification using LLM
   */
  private async suggestSimplification(
    featureRequest: string,
    priorArt: ExistingCode[],
    necessityAnalysis: NecessityAnalysis
  ): Promise<string | null> {
    // If exact similar code exists, suggest reusing it
    const exactMatch = priorArt.find(code => code.relevance_score > 95);
    if (exactMatch) {
      return `Reuse existing code at ${exactMatch.path} instead of building new feature`;
    }
    
    // If good prior art exists, suggest extending it
    const goodMatch = priorArt.find(code => code.relevance_score > 75);
    if (goodMatch) {
      return `Extend existing ${goodMatch.path} (${goodMatch.purpose}) to add this functionality`;
    }
    
    // Return simplest version from analysis
    return necessityAnalysis.simplest_version;
  }
  
  /**
   * Generate questions for human review
   */
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
  
  /**
   * Determine final verdict
   */
  private determineVerdict(
    featureRequest: string,
    priorArt: ExistingCode[],
    pastFailures: PastFailure[],
    conflicts: DecisionConflict[],
    necessityAnalysis: NecessityAnalysis,
    simplifiedVersion: string | null
  ): AgentVerdict {
    // Check for blocking conflicts
    const blockingConflicts = conflicts.filter(c => c.severity === "blocking");
    if (blockingConflicts.length > 0) {
      return "reject";
    }
    
    // Check for repeated high-relevance failures
    const highRelevanceFailures = pastFailures.filter(f => f.relevance_score > 85);
    if (highRelevanceFailures.length >= 2) {
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
    if (!necessityAnalysis.solves_real_problem && pastFailures.length > 0) {
      return "reject";
    }
    
    // Default: proceed
    return "proceed";
  }
  
  /**
   * Generate reasoning for verdict
   */
  private generateReasoning(
    verdict: AgentVerdict,
    priorArt: ExistingCode[],
    pastFailures: PastFailure[],
    necessityAnalysis: NecessityAnalysis
  ): string {
    const parts: string[] = [];
    
    parts.push(`Verdict: ${verdict.toUpperCase()}`);
    parts.push("");
    
    if (priorArt.length > 0) {
      parts.push(`Found ${priorArt.length} similar code file(s).`);
      parts.push(`Best match: ${priorArt[0].path} (relevance: ${priorArt[0].relevance_score}%)`);
      parts.push(`"${priorArt[0].purpose}"`);
      parts.push("");
    }
    
    if (pastFailures.length > 0) {
      parts.push(`Found ${pastFailures.length} past failure(s) with similar features:`);
      pastFailures.forEach(f => {
        parts.push(`  - ${f.feature}: ${f.why_failed}`);
      });
      parts.push("");
    }
    
    parts.push(`Solves real problem: ${necessityAnalysis.solves_real_problem ? 'Yes' : 'No'}`);
    parts.push(`Similar code exists: ${priorArt.some(c => c.relevance_score > 80) ? 'Yes' : 'No'}`);
    
    return parts.join("\n");
  }
  
  // ============================================================================
  // Helper Methods
  // ============================================================================
  
  private generateSearchQueries(featureRequest: string): string[] {
    const queries = [featureRequest];
    
    // Extract keywords
    const keywords = this.extractKeywords(featureRequest);
    
    // Generate keyword combinations
    for (let i = 0; i < Math.min(keywords.length - 1, 3); i++) {
      queries.push(`${keywords[i]} ${keywords[i + 1]}`);
    }
    
    // Add category-specific queries
    if (featureRequest.toLowerCase().includes("auth")) {
      queries.push("authentication login");
    }
    if (featureRequest.toLowerCase().includes("api")) {
      queries.push("endpoint route controller");
    }
    if (featureRequest.toLowerCase().includes("database")) {
      queries.push("table model entity");
    }
    
    return [...new Set(queries)].slice(0, 5);
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
      "the", "and", "for", "with", "from", "this", "that",
      "have", "will", "should", "would", "could", "might",
      "add", "new", "create", "implement", "build"
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
    
    // Boost for keyword matches
    const keywords = this.extractKeywords(query);
    const content = (result.content || result.summary || "").toLowerCase();
    
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        score += 3;
      }
    }
    
    // Boost for exact filename match
    const filename = result.path.split('/').pop()?.toLowerCase() || '';
    for (const keyword of keywords) {
      if (filename.includes(keyword)) {
        score += 5;
      }
    }
    
    return Math.min(100, Math.round(score));
  }
  
  private calculateFailureRelevance(failure: any, featureRequest: string): number {
    const featureWords = new Set(this.extractKeywords(failure.feature));
    const requestWords = new Set(this.extractKeywords(featureRequest));
    
    const intersection = [...featureWords].filter(w => requestWords.has(w));
    const union = new Set([...featureWords, ...requestWords]);
    
    return Math.round((intersection.length / union.size) * 100);
  }
  
  private describeHowItHelps(result: any, featureRequest: string): string {
    if (result.summary) {
      return `Existing code at ${result.path} implements: ${result.summary}`;
    }
    return `Code at ${result.path} may be reusable for this feature`;
  }
  
  private classifyConflictType(conflict: any): "technical" | "architectural" | "business" {
    const desc = (conflict.description || "").toLowerCase();
    
    if (desc.includes("architecture") || desc.includes("pattern")) {
      return "architectural";
    }
    if (desc.includes("business") || desc.includes("requirement")) {
      return "business";
    }
    return "technical";
  }
  
  private async identifySimplestVersionWithLLM(featureRequest: string): Promise<string | null> {
    if (!this.config.llmProvider) return null;
    
    try {
      const prompt = `Given this feature request: "${feature_request}"

What is the absolute simplest version that could deliver value?
Consider:
- Minimum functionality needed
- Existing workarounds
- 80/20 rule (80% value with 20% effort)

Respond with just the simplified version, one sentence max.`;

      const response = await this.config.llmProvider.complete(prompt);
      return response.trim();
    } catch (error) {
      return null;
    }
  }
}

interface NecessityAnalysis {
  similar_exists: boolean;
  solves_real_problem: boolean;
  simplest_version: string | null;
  can_be_workaround: boolean;
  opportunity_cost: "low" | "medium" | "high";
}

export default WhyAgent;
