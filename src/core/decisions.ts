import { randomUUID } from 'crypto';
import { Tier1Storage } from '../storage/tier1.js';
import { Tier2Storage } from '../storage/tier2.js';
import { EmbeddingGenerator } from '../indexing/embeddings.js';
import type { Decision } from '../types/index.js';

export class DecisionTracker {
  private tier1: Tier1Storage;
  private tier2: Tier2Storage;
  private embeddingGenerator: EmbeddingGenerator;

  constructor(
    tier1: Tier1Storage,
    tier2: Tier2Storage,
    embeddingGenerator: EmbeddingGenerator
  ) {
    this.tier1 = tier1;
    this.tier2 = tier2;
    this.embeddingGenerator = embeddingGenerator;
  }

  async recordDecision(
    title: string,
    description: string,
    files: string[] = [],
    tags: string[] = []
  ): Promise<Decision> {
    const decision: Decision = {
      id: randomUUID(),
      title,
      description,
      files,
      tags,
      createdAt: new Date()
    };

    // Store in Tier 1 for immediate access
    this.tier1.addDecision(decision);

    // Generate embedding for semantic search
    const textToEmbed = `${title}\n${description}\n${tags.join(' ')}`;
    const embedding = await this.embeddingGenerator.embed(textToEmbed);

    // Store in Tier 2 for persistence
    this.tier2.upsertDecision(decision, embedding);

    return decision;
  }

  getRecentDecisions(limit: number = 10): Decision[] {
    // First try Tier 1 (faster)
    const tier1Decisions = this.tier1.getRecentDecisions(limit);
    if (tier1Decisions.length >= limit) {
      return tier1Decisions;
    }

    // Fall back to Tier 2 for more
    return this.tier2.getRecentDecisions(limit);
  }

  getDecision(id: string): Decision | null {
    return this.tier2.getDecision(id);
  }

  async searchDecisions(query: string, limit: number = 5): Promise<Decision[]> {
    const queryEmbedding = await this.embeddingGenerator.embed(query);
    return this.tier2.searchDecisions(queryEmbedding, limit);
  }
}
