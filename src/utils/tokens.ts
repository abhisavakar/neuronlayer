// Simple token estimation
// For more accurate counting, consider using tiktoken or similar
// This approximation is sufficient for budget management

const AVG_CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Rough approximation: 1 token ≈ 4 characters for English/code
  // This is a simplification but works well enough for budgeting
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN);
}

export class TokenBudget {
  private total: number;
  private allocations: Map<string, number> = new Map();

  constructor(total: number) {
    this.total = total;
  }

  used(): number {
    let sum = 0;
    for (const tokens of this.allocations.values()) {
      sum += tokens;
    }
    return sum;
  }

  remaining(): number {
    return this.total - this.used();
  }

  canFit(text: string): boolean {
    return estimateTokens(text) <= this.remaining();
  }

  allocate(text: string, category: string): boolean {
    const tokens = estimateTokens(text);
    if (tokens > this.remaining()) {
      return false;
    }

    const current = this.allocations.get(category) || 0;
    this.allocations.set(category, current + tokens);
    return true;
  }

  getAllocations(): Record<string, number> {
    return Object.fromEntries(this.allocations);
  }
}
