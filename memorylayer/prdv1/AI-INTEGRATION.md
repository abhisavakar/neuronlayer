# MemoryLayer - AI Integration Plan

**Status:** Planning
**Priority:** P0
**Last Updated:** February 2026

---

## Overview

MemoryLayer currently implements **90% local processing**. This document outlines the **10% AI magic** that will transform raw data into human-readable intelligence.

---

## Current State vs Target State

| Feature | Current (No-AI) | Target (With AI) |
|---------|-----------------|------------------|
| **Living Documentation** | AST structure, file lists | Human-readable explanations |
| **Context Rot Prevention** | Token counting, truncation | Intelligent summarization |
| **Change Intelligence** | Git correlation | Root cause analysis |
| **Test Awareness** | Test indexing | Test code generation |
| **Confidence Scoring** | Pattern matching | AI reasoning explanations |

---

## AI Provider Options

### Option 1: Claude API (Recommended)

```typescript
interface ClaudeConfig {
  apiKey: string;
  model: 'claude-3-haiku-20240307' | 'claude-3-sonnet-20240229' | 'claude-3-opus-20240229';
  maxTokens: number;
}
```

**Pros:**
- Best code understanding
- Long context window
- Reliable outputs

**Cons:**
- Requires API key
- Costs money (~$2-5/month for typical usage)

### Option 2: OpenAI API

```typescript
interface OpenAIConfig {
  apiKey: string;
  model: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo';
  maxTokens: number;
}
```

**Pros:**
- Widely available
- Good code understanding

**Cons:**
- Costs money
- Rate limits

### Option 3: Local LLM (Ollama)

```typescript
interface OllamaConfig {
  baseUrl: string;  // default: http://localhost:11434
  model: 'codellama' | 'deepseek-coder' | 'qwen2.5-coder';
}
```

**Pros:**
- 100% free
- No API key needed
- Privacy (runs locally)

**Cons:**
- Requires local setup
- Slower than cloud
- Lower quality than Claude/GPT-4

### Option 4: No AI (Current)

All features work without AI, just with reduced intelligence:
- Structure instead of explanations
- Truncation instead of summarization
- Correlation instead of reasoning

---

## Configuration

### Environment Variables

```bash
# Choose provider: claude | openai | ollama | none
MEMORYLAYER_AI_PROVIDER=claude

# API Keys (only needed for cloud providers)
MEMORYLAYER_CLAUDE_API_KEY=sk-ant-...
MEMORYLAYER_OPENAI_API_KEY=sk-...

# Ollama settings (only for local)
MEMORYLAYER_OLLAMA_URL=http://localhost:11434
MEMORYLAYER_OLLAMA_MODEL=codellama

# Cost controls
MEMORYLAYER_AI_BUDGET_DAILY=1.00      # Max $ per day
MEMORYLAYER_AI_BUDGET_MONTHLY=10.00   # Max $ per month
```

### Config File (memorylayer.config.json)

```json
{
  "ai": {
    "provider": "claude",
    "model": "claude-3-haiku-20240307",
    "enabled": true,
    "budget": {
      "daily": 1.00,
      "monthly": 10.00
    },
    "features": {
      "documentation": true,
      "summarization": true,
      "rootCauseAnalysis": true,
      "testGeneration": true
    }
  }
}
```

---

## Feature: AI-Powered Documentation

### Current Behavior

```typescript
// get_architecture returns:
{
  layers: [
    { name: "src/core", files: ["engine.ts"], purpose: "" }
  ]
}
```

### Target Behavior

```typescript
// get_architecture returns:
{
  layers: [
    {
      name: "Core Engine",
      directory: "src/core",
      files: ["engine.ts", "context.ts", "decisions.ts"],
      purpose: "Central orchestration layer that coordinates all MemoryLayer subsystems",
      explanation: "The core engine handles:\n- Context assembly from semantic search\n- Decision tracking and retrieval\n- Token budget management\n- Coordination between storage tiers",
      keyInsights: [
        "Uses dependency injection for testability",
        "Implements event-driven architecture for file watching",
        "Maintains hot cache for frequently accessed files"
      ]
    }
  ]
}
```

### Implementation

```typescript
// src/core/ai/documentation-ai.ts

export class DocumentationAI {
  private provider: AIProvider;

  async explainArchitecture(structure: ArchitectureDoc): Promise<ArchitectureDoc> {
    const prompt = `Analyze this codebase structure and provide:
1. A clear name for each layer
2. A one-sentence purpose
3. A detailed explanation (2-3 sentences)
4. Key insights about the architecture

Structure:
${JSON.stringify(structure, null, 2)}

Respond in JSON format.`;

    const response = await this.provider.complete(prompt);
    return this.mergeWithStructure(structure, response);
  }

  async explainComponent(component: ComponentDoc): Promise<ComponentDoc> {
    const prompt = `Explain this code component:

File: ${component.file}
Symbols: ${component.publicInterface.map(s => s.name).join(', ')}

Provide:
1. What this component does (plain English)
2. How it fits in the architecture
3. Key patterns used
4. Potential issues or improvements

Respond in JSON format.`;

    const response = await this.provider.complete(prompt);
    return this.mergeWithComponent(component, response);
  }
}
```

### Cost Estimate

| Operation | Tokens | Cost (Claude Haiku) |
|-----------|--------|---------------------|
| Explain architecture | ~2000 | ~$0.005 |
| Explain component | ~1000 | ~$0.002 |
| Generate changelog summary | ~500 | ~$0.001 |

**Monthly estimate:** ~$1-2 for typical usage

---

## Feature: AI-Powered Summarization

### Current Behavior

```typescript
// trigger_compaction just truncates:
{
  strategy: "truncate",
  removed: 50,
  preserved: 10
}
```

### Target Behavior

```typescript
// trigger_compaction intelligently summarizes:
{
  strategy: "summarize",
  summaries: [
    {
      original: "20 messages about authentication implementation",
      summary: "Implemented JWT auth with refresh tokens. Key decisions: 1) Using httpOnly cookies for security, 2) 15min access token expiry, 3) Refresh tokens stored in Redis.",
      tokensReduced: 2500,
      tokensKept: 150
    }
  ],
  criticalPreserved: ["Use JWT not sessions", "Redis for token storage"]
}
```

### Implementation

```typescript
// src/core/ai/summarization-ai.ts

export class SummarizationAI {
  private provider: AIProvider;

  async summarizeConversation(messages: Message[]): Promise<Summary> {
    const prompt = `Summarize this conversation, preserving:
1. All architectural decisions made
2. Key requirements mentioned
3. Important code patterns discussed
4. Any warnings or constraints

Conversation:
${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}

Provide a concise summary that captures ALL important information.`;

    return await this.provider.complete(prompt);
  }

  async detectDrift(original: string, current: string): Promise<DriftAnalysis> {
    const prompt = `Compare the original requirements with current context:

Original:
${original}

Current:
${current}

Identify:
1. Requirements that are being ignored
2. Topics that have drifted from the goal
3. Important context that's been lost
4. Suggested reminders to add`;

    return await this.provider.complete(prompt);
  }
}
```

### Cost Estimate

| Operation | Tokens | Cost |
|-----------|--------|------|
| Summarize 20 messages | ~3000 | ~$0.007 |
| Detect drift | ~2000 | ~$0.005 |

**Monthly estimate:** ~$0.50-1 (only runs when context >70% full)

---

## Feature: AI-Powered Root Cause Analysis

### Current Behavior

```typescript
// why_broke returns correlation:
{
  likely_cause: {
    file: "src/auth.ts",
    commit: "abc123",
    message: "Refactored auth"
  },
  confidence: 60  // Just based on timing
}
```

### Target Behavior

```typescript
// why_broke returns AI analysis:
{
  likely_cause: {
    file: "src/auth.ts",
    commit: "abc123",
    message: "Refactored auth"
  },
  confidence: 95,
  ai_analysis: {
    root_cause: "The refactoring removed the null check on user.email before the validateEmail() call",
    explanation: "In commit abc123, line 45 was changed from 'if (user?.email)' to 'if (user.email)', removing the optional chaining. When user is null (e.g., for anonymous users), this throws 'Cannot read property email of undefined'.",
    fix: "Add back the optional chaining: user?.email",
    prevention: "Consider adding a TypeScript strict null check rule"
  }
}
```

### Implementation

```typescript
// src/core/ai/diagnosis-ai.ts

export class DiagnosisAI {
  private provider: AIProvider;

  async analyzeRootCause(error: string, changes: Change[], context: string): Promise<Diagnosis> {
    const prompt = `Analyze this error and recent changes to find the root cause:

Error:
${error}

Recent Changes:
${changes.map(c => `File: ${c.file}\nDiff:\n${c.diff}`).join('\n\n')}

Context:
${context}

Provide:
1. The most likely root cause (specific line/change)
2. Explanation of WHY this caused the error
3. Exact fix (code if possible)
4. How to prevent similar issues`;

    return await this.provider.complete(prompt);
  }
}
```

### Cost Estimate

| Operation | Tokens | Cost |
|-----------|--------|------|
| Analyze root cause | ~2500 | ~$0.006 |
| Suggest fix | ~1500 | ~$0.004 |

**Monthly estimate:** ~$0.50-1 (on-demand only)

---

## Feature: AI-Powered Test Generation

### Current Behavior

```typescript
// suggest_test_update returns:
{
  file: "tests/auth.test.ts",
  line: 45,
  reason: "Function signature changed"
  // No actual test code
}
```

### Target Behavior

```typescript
// suggest_test_update returns:
{
  file: "tests/auth.test.ts",
  line: 45,
  reason: "Function signature changed from login(email) to login(email, options)",
  suggested_code: `
it('should authenticate with default options', async () => {
  const result = await login('test@example.com');
  expect(result.success).toBe(true);
});

it('should authenticate with remember me option', async () => {
  const result = await login('test@example.com', { rememberMe: true });
  expect(result.success).toBe(true);
  expect(result.tokenExpiry).toBeGreaterThan(DEFAULT_EXPIRY);
});
  `,
  explanation: "Added tests for both default and custom options since the function signature changed"
}
```

### Implementation

```typescript
// src/core/ai/test-generation-ai.ts

export class TestGenerationAI {
  private provider: AIProvider;

  async generateTestUpdate(change: Change, existingTests: TestInfo[]): Promise<TestUpdate> {
    const prompt = `Generate updated tests for this code change:

Change:
${change.diff}

Existing Tests:
${existingTests.map(t => t.code).join('\n\n')}

Test Framework: ${this.framework}

Generate:
1. Updated test code that covers the change
2. New tests if new functionality was added
3. Explanation of what each test verifies`;

    return await this.provider.complete(prompt);
  }

  async generateNewTest(file: string, functionCode: string): Promise<string> {
    const prompt = `Generate a comprehensive test for this function:

${functionCode}

Include:
1. Happy path test
2. Edge cases
3. Error handling tests
4. Use ${this.framework} syntax`;

    return await this.provider.complete(prompt);
  }
}
```

### Cost Estimate

| Operation | Tokens | Cost |
|-----------|--------|------|
| Generate test update | ~2000 | ~$0.005 |
| Generate new test | ~1500 | ~$0.004 |

**Monthly estimate:** ~$0.50-1 (on-demand only)

---

## Architecture

### File Structure

```
src/core/ai/
├── index.ts                    # Barrel export
├── ai-provider.ts              # Provider interface & factory
├── providers/
│   ├── claude-provider.ts      # Claude API implementation
│   ├── openai-provider.ts      # OpenAI API implementation
│   ├── ollama-provider.ts      # Ollama local implementation
│   └── noop-provider.ts        # No-op fallback (no AI)
├── documentation-ai.ts         # Architecture & component explanations
├── summarization-ai.ts         # Context summarization & drift
├── diagnosis-ai.ts             # Root cause analysis
├── test-generation-ai.ts       # Test code generation
└── budget-tracker.ts           # Cost tracking & limits
```

### Provider Interface

```typescript
// src/core/ai/ai-provider.ts

export interface AIProvider {
  name: string;

  complete(prompt: string, options?: CompletionOptions): Promise<string>;

  estimateCost(tokens: number): number;

  isAvailable(): boolean;
}

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export class AIProviderFactory {
  static create(config: AIConfig): AIProvider {
    switch (config.provider) {
      case 'claude':
        return new ClaudeProvider(config);
      case 'openai':
        return new OpenAIProvider(config);
      case 'ollama':
        return new OllamaProvider(config);
      default:
        return new NoopProvider();
    }
  }
}
```

### Budget Tracking

```typescript
// src/core/ai/budget-tracker.ts

export class BudgetTracker {
  private dailySpent: number = 0;
  private monthlySpent: number = 0;
  private dailyLimit: number;
  private monthlyLimit: number;

  canSpend(estimatedCost: number): boolean {
    return (
      this.dailySpent + estimatedCost <= this.dailyLimit &&
      this.monthlySpent + estimatedCost <= this.monthlyLimit
    );
  }

  recordSpend(cost: number): void {
    this.dailySpent += cost;
    this.monthlySpent += cost;
    this.persist();
  }

  getRemainingBudget(): { daily: number; monthly: number } {
    return {
      daily: this.dailyLimit - this.dailySpent,
      monthly: this.monthlyLimit - this.monthlySpent
    };
  }
}
```

---

## MCP Tools Changes

### New Tool: `configure_ai`

```typescript
{
  name: 'configure_ai',
  description: 'Configure AI provider settings',
  inputSchema: {
    type: 'object',
    properties: {
      provider: { type: 'string', enum: ['claude', 'openai', 'ollama', 'none'] },
      apiKey: { type: 'string', description: 'API key (for claude/openai)' },
      model: { type: 'string' },
      budget: {
        type: 'object',
        properties: {
          daily: { type: 'number' },
          monthly: { type: 'number' }
        }
      }
    }
  }
}
```

### New Tool: `get_ai_status`

```typescript
{
  name: 'get_ai_status',
  description: 'Get AI configuration and budget status',
  inputSchema: { type: 'object', properties: {} }
}

// Returns:
{
  provider: "claude",
  model: "claude-3-haiku-20240307",
  enabled: true,
  budget: {
    daily: { limit: 1.00, spent: 0.15, remaining: 0.85 },
    monthly: { limit: 10.00, spent: 2.50, remaining: 7.50 }
  },
  features: {
    documentation: true,
    summarization: true,
    rootCauseAnalysis: true,
    testGeneration: true
  }
}
```

### Enhanced Existing Tools

| Tool | AI Enhancement |
|------|----------------|
| `get_architecture` | Add `include_ai_explanations: boolean` parameter |
| `get_component_doc` | Add `include_ai_explanation: boolean` parameter |
| `why_broke` | Add `use_ai_analysis: boolean` parameter |
| `trigger_compaction` | Add `use_ai_summarization: boolean` parameter |
| `suggest_test_update` | Add `generate_code: boolean` parameter |

---

## Cost Summary

### Per-Operation Costs (Claude Haiku)

| Operation | Est. Tokens | Cost |
|-----------|-------------|------|
| Explain architecture | 2000 | $0.005 |
| Explain component | 1000 | $0.002 |
| Summarize context | 3000 | $0.007 |
| Detect drift | 2000 | $0.005 |
| Analyze root cause | 2500 | $0.006 |
| Generate test | 2000 | $0.005 |

### Monthly Estimates by Usage

| Usage Level | Operations/Day | Monthly Cost |
|-------------|----------------|--------------|
| Light | 5-10 | ~$1-2 |
| Medium | 20-30 | ~$3-5 |
| Heavy | 50+ | ~$8-10 |

### Free Tier (Ollama)

Using local Ollama with codellama or deepseek-coder:
- **Cost:** $0 (runs on your hardware)
- **Quality:** 70-80% of Claude quality
- **Speed:** Slower (depends on GPU)

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

- [ ] Create AI provider interface
- [ ] Implement Claude provider
- [ ] Implement Ollama provider
- [ ] Implement NoOp provider (fallback)
- [ ] Add budget tracking
- [ ] Add configuration system

### Phase 2: Documentation AI (Week 2)

- [ ] Implement architecture explanations
- [ ] Implement component explanations
- [ ] Add `include_ai_explanations` parameter to tools
- [ ] Cache AI-generated explanations

### Phase 3: Summarization AI (Week 3)

- [ ] Implement context summarization
- [ ] Implement drift detection
- [ ] Integrate with trigger_compaction
- [ ] Add smart summarization strategy

### Phase 4: Diagnosis AI (Week 4)

- [ ] Implement root cause analysis
- [ ] Implement fix suggestions
- [ ] Integrate with why_broke
- [ ] Integrate with suggest_fix

### Phase 5: Test Generation AI (Week 5)

- [ ] Implement test update generation
- [ ] Implement new test generation
- [ ] Integrate with suggest_test_update
- [ ] Add test template customization

---

## Questions to Decide

1. **Default Provider:** Should AI be enabled by default (with free Ollama) or disabled?

2. **API Key Storage:** Where to store API keys?
   - Environment variables only
   - Config file (with warning about security)
   - System keychain integration

3. **Caching Strategy:** How long to cache AI-generated content?
   - Per-session only
   - Persist until code changes
   - Time-based expiry

4. **Fallback Behavior:** When AI fails or budget exceeded?
   - Return no-AI version silently
   - Return error with explanation
   - Queue for later processing

5. **Quality vs Cost:** Which model to recommend?
   - Claude Haiku (cheapest, good enough)
   - Claude Sonnet (better, 5x cost)
   - Let user choose

---

## Success Metrics

| Metric | Target |
|--------|--------|
| AI response quality | 4.5/5 user rating |
| Cost per user | < $5/month |
| Fallback graceful | 100% uptime without AI |
| Setup time | < 5 minutes |

---

*Document created: February 2026*
