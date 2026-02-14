import { describe, it, expect } from 'vitest';
import { estimateTokens, TokenBudget } from '../../src/utils/tokens.js';

describe('estimateTokens', () => {
  it('should return 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('should estimate tokens based on character count', () => {
    // ~4 chars per token
    expect(estimateTokens('hello world')).toBe(3); // 11 chars / 4 = 2.75 -> 3
    expect(estimateTokens('a')).toBe(1);
  });

  it('should handle longer text', () => {
    const text = 'a'.repeat(100);
    expect(estimateTokens(text)).toBe(25); // 100 / 4 = 25
  });
});

describe('TokenBudget', () => {
  it('should track allocations', () => {
    const budget = new TokenBudget(100);

    expect(budget.used()).toBe(0);
    expect(budget.remaining()).toBe(100);
  });

  it('should allocate tokens', () => {
    const budget = new TokenBudget(100);
    const text = 'a'.repeat(40); // 10 tokens

    expect(budget.canFit(text)).toBe(true);
    expect(budget.allocate(text, 'test')).toBe(true);
    expect(budget.used()).toBe(10);
    expect(budget.remaining()).toBe(90);
  });

  it('should reject when over budget', () => {
    const budget = new TokenBudget(10);
    const text = 'a'.repeat(100); // 25 tokens

    expect(budget.canFit(text)).toBe(false);
    expect(budget.allocate(text, 'test')).toBe(false);
    expect(budget.used()).toBe(0);
  });

  it('should track multiple allocations', () => {
    const budget = new TokenBudget(100);

    budget.allocate('a'.repeat(20), 'tier1'); // 5 tokens
    budget.allocate('b'.repeat(20), 'tier2'); // 5 tokens

    const allocations = budget.getAllocations();
    expect(allocations['tier1']).toBe(5);
    expect(allocations['tier2']).toBe(5);
    expect(budget.used()).toBe(10);
  });
});
