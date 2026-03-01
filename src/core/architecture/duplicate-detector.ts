import type { Tier2Storage } from '../../storage/tier2.js';
import type { EmbeddingGenerator } from '../../indexing/embeddings.js';
import type { ExistingFunction, FunctionIndex } from '../../types/documentation.js';

// Common function purpose keywords
const PURPOSE_KEYWORDS: Record<string, string[]> = {
  authentication: ['auth', 'login', 'logout', 'token', 'session', 'jwt', 'credential'],
  validation: ['validate', 'check', 'verify', 'assert', 'ensure', 'is', 'has'],
  formatting: ['format', 'parse', 'stringify', 'serialize', 'convert', 'transform'],
  fetching: ['fetch', 'get', 'load', 'retrieve', 'request', 'api', 'http'],
  storage: ['save', 'store', 'persist', 'cache', 'set', 'put'],
  utility: ['util', 'helper', 'tool', 'common', 'shared'],
  error: ['error', 'exception', 'throw', 'catch', 'handle'],
  logging: ['log', 'logger', 'debug', 'info', 'warn', 'error'],
  date: ['date', 'time', 'moment', 'day', 'month', 'year', 'timestamp']
};

export class DuplicateDetector {
  private tier2: Tier2Storage;
  private embeddingGenerator: EmbeddingGenerator;
  private functionIndex: Map<string, FunctionIndex> = new Map();
  private indexBuilt: boolean = false;

  constructor(tier2: Tier2Storage, embeddingGenerator: EmbeddingGenerator) {
    this.tier2 = tier2;
    this.embeddingGenerator = embeddingGenerator;
    // Do NOT build index synchronously on startup, it blocks the event loop
    // and causes MCP connection timeouts on large codebases.
    // this.buildFunctionIndex();
  }

  // Build index of all functions in codebase
  private buildFunctionIndex(): void {
    if (this.indexBuilt) return;
    
    const files = this.tier2.getAllFiles();

    for (const file of files) {
      const symbols = this.tier2.getSymbolsByFile(file.id);

      for (const symbol of symbols) {
        if (symbol.kind === 'function' || symbol.kind === 'method') {
          const key = `${file.path}:${symbol.name}`;
          const dependents = this.tier2.getFileDependents(file.path);

          this.functionIndex.set(key, {
            name: symbol.name,
            file: file.path,
            line: symbol.lineStart,
            signature: symbol.signature || `${symbol.name}()`,
            exported: symbol.exported,
            usageCount: dependents.length + 1,
            parameters: this.extractParameters(symbol.signature || ''),
            returnType: this.extractReturnType(symbol.signature || ''),
            docstring: symbol.docstring
          });
        }
      }
    }
    
    this.indexBuilt = true;
  }

  // Ensure index is ready before searching
  private ensureIndex(): void {
    if (!this.indexBuilt) {
      this.buildFunctionIndex();
    }
  }

  // Find duplicate or similar functions
  findDuplicates(code: string, threshold: number = 60): Array<FunctionIndex & { similarity: number }> {
    this.ensureIndex();
    
    const duplicates: Array<FunctionIndex & { similarity: number }> = [];

    // Extract function name from code
    const funcNameMatch = code.match(/(?:function|const|let|var)\s+(\w+)/);
    const funcName = funcNameMatch ? funcNameMatch[1] : null;

    // Extract purpose from code
    const purpose = this.detectPurpose(code);

    for (const [_key, func] of this.functionIndex) {
      let similarity = 0;

      // Check name similarity
      if (funcName) {
        const nameSimilarity = this.calculateNameSimilarity(funcName, func.name);
        similarity += nameSimilarity * 0.3;
      }

      // Check purpose similarity
      const funcPurpose = this.detectPurpose(func.signature + ' ' + (func.docstring || ''));
      if (purpose && funcPurpose && purpose === funcPurpose) {
        similarity += 40;
      }

      // Check code structure similarity
      const structureSimilarity = this.calculateStructureSimilarity(code, func.signature);
      similarity += structureSimilarity * 0.3;

      if (similarity >= threshold) {
        duplicates.push({
          ...func,
          similarity: Math.round(similarity)
        });
      }
    }

    // Sort by similarity
    duplicates.sort((a, b) => b.similarity - a.similarity);

    return duplicates.slice(0, 5);
  }

  // Suggest existing functions based on intent
  suggestExisting(intent: string, limit: number = 5): ExistingFunction[] {
    this.ensureIndex();
    
    const suggestions: Array<FunctionIndex & { relevance: number }> = [];
    const intentLower = intent.toLowerCase();
    const intentWords = intentLower.split(/\s+/);

    for (const [_key, func] of this.functionIndex) {
      if (!func.exported) continue;

      let relevance = 0;
      const funcLower = func.name.toLowerCase();
      const docLower = (func.docstring || '').toLowerCase();
      const combined = `${funcLower} ${docLower}`;

      // Check direct name match
      for (const word of intentWords) {
        if (word.length < 3) continue;

        if (funcLower.includes(word)) {
          relevance += 30;
        }
        if (docLower.includes(word)) {
          relevance += 20;
        }
      }

      // Check purpose match
      const purpose = this.detectPurpose(intent);
      const funcPurpose = this.detectPurpose(combined);
      if (purpose && funcPurpose && purpose === funcPurpose) {
        relevance += 25;
      }

      // Boost for commonly used functions
      relevance += Math.min(func.usageCount * 2, 15);

      if (relevance > 20) {
        suggestions.push({ ...func, relevance });
      }
    }

    // Sort by relevance
    suggestions.sort((a, b) => b.relevance - a.relevance);

    return suggestions.slice(0, limit).map(s => ({
      name: s.name,
      file: s.file,
      line: s.line,
      signature: s.signature,
      description: s.docstring,
      usageCount: s.usageCount,
      purpose: this.detectPurpose(s.name + ' ' + (s.docstring || '')) || 'utility',
      similarity: s.relevance
    }));
  }

  // Detect the purpose of code/function
  private detectPurpose(text: string): string | null {
    const lower = text.toLowerCase();

    for (const [purpose, keywords] of Object.entries(PURPOSE_KEYWORDS)) {
      if (keywords.some(k => lower.includes(k))) {
        return purpose;
      }
    }

    return null;
  }

  // Calculate name similarity
  private calculateNameSimilarity(name1: string, name2: string): number {
    const lower1 = name1.toLowerCase();
    const lower2 = name2.toLowerCase();

    // Exact match
    if (lower1 === lower2) return 100;

    // Contains
    if (lower1.includes(lower2) || lower2.includes(lower1)) return 70;

    // Token overlap
    const tokens1 = this.camelCaseToTokens(name1);
    const tokens2 = this.camelCaseToTokens(name2);

    let matches = 0;
    for (const t1 of tokens1) {
      for (const t2 of tokens2) {
        if (t1 === t2) matches++;
      }
    }

    const totalTokens = Math.max(tokens1.length, tokens2.length);
    return totalTokens > 0 ? (matches / totalTokens) * 100 : 0;
  }

  // Calculate structure similarity
  private calculateStructureSimilarity(code1: string, code2: string): number {
    // Extract structural elements
    const struct1 = this.extractStructure(code1);
    const struct2 = this.extractStructure(code2);

    let matches = 0;
    let total = 0;

    for (const key of Object.keys(struct1) as Array<keyof typeof struct1>) {
      total++;
      if (struct1[key] === struct2[key]) matches++;
    }

    return total > 0 ? (matches / total) * 100 : 0;
  }

  // Extract structural features
  private extractStructure(code: string): {
    hasAsync: boolean;
    hasReturn: boolean;
    hasTryCatch: boolean;
    hasLoop: boolean;
    hasConditional: boolean;
    paramCount: number;
  } {
    return {
      hasAsync: /async\s+/.test(code),
      hasReturn: /return\s+/.test(code),
      hasTryCatch: /try\s*\{/.test(code),
      hasLoop: /(?:for|while|do)\s*[\(\{]/.test(code),
      hasConditional: /if\s*\(/.test(code),
      paramCount: (code.match(/\([^)]*\)/)?.[0]?.split(',').length || 0)
    };
  }

  // Split camelCase to tokens
  private camelCaseToTokens(name: string): string[] {
    return name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  // Extract parameters from signature
  private extractParameters(signature: string): string[] {
    const match = signature.match(/\(([^)]*)\)/);
    if (!match) return [];

    return match[1]
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => p.split(':')[0].trim());
  }

  // Extract return type from signature
  private extractReturnType(signature: string): string | undefined {
    const match = signature.match(/\):\s*(.+)$/);
    return match ? match[1].trim() : undefined;
  }

  // Refresh the function index
  refresh(): void {
    this.functionIndex.clear();
    this.indexBuilt = false;
    // We don't rebuild immediately; it will rebuild on next use
  }

  // Get index statistics
  getStats(): {
    totalFunctions: number;
    exportedFunctions: number;
    byPurpose: Record<string, number>;
  } {
    this.ensureIndex();
    
    let exportedFunctions = 0;
    const byPurpose: Record<string, number> = {};

    for (const [_key, func] of this.functionIndex) {
      if (func.exported) exportedFunctions++;

      const purpose = this.detectPurpose(func.name) || 'other';
      byPurpose[purpose] = (byPurpose[purpose] || 0) + 1;
    }

    return {
      totalFunctions: this.functionIndex.size,
      exportedFunctions,
      byPurpose
    };
  }
}
