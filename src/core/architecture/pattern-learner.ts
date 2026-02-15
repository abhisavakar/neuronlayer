import type { Tier2Storage } from '../../storage/tier2.js';
import type { PatternCategory, CodeExample, PatternRule } from '../../types/documentation.js';
import type { PatternLibrary } from './pattern-library.js';

// Pattern detection rules
const PATTERN_DETECTORS: Array<{
  category: PatternCategory;
  name: string;
  detect: RegExp;
  extractExample: (code: string) => string | null;
  rules: PatternRule[];
}> = [
  {
    category: 'error_handling',
    name: 'Try-Catch Pattern',
    detect: /try\s*\{[\s\S]*?\}\s*catch\s*\(/,
    extractExample: (code: string) => {
      const match = code.match(/try\s*\{[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?\}/);
      return match ? match[0] : null;
    },
    rules: [
      { rule: 'Use try-catch for error-prone operations', severity: 'warning' },
      { rule: 'Log errors with context', severity: 'warning' }
    ]
  },
  {
    category: 'api_call',
    name: 'Fetch API Pattern',
    detect: /fetch\s*\(|axios\.|api\./,
    extractExample: (code: string) => {
      const match = code.match(/(?:await\s+)?(?:fetch|axios\.\w+|api\.\w+)\s*\([^)]*\)[\s\S]*?(?:\.json\(\)|;)/);
      return match ? match[0] : null;
    },
    rules: [
      { rule: 'Check response status', severity: 'critical' },
      { rule: 'Handle network errors', severity: 'critical' }
    ]
  },
  {
    category: 'component',
    name: 'React Component Pattern',
    detect: /(?:function|const)\s+\w+\s*(?::\s*React\.FC|\([^)]*\))\s*(?:=>|{)/,
    extractExample: (code: string) => {
      const match = code.match(/(?:interface|type)\s+\w*Props[\s\S]*?}[\s\S]*?(?:function|const)\s+\w+[\s\S]*?(?:return\s*\([\s\S]*?\);|\))/);
      return match ? match[0] : null;
    },
    rules: [
      { rule: 'Define Props interface', severity: 'warning' },
      { rule: 'Use functional components', severity: 'info' }
    ]
  },
  {
    category: 'validation',
    name: 'Input Validation Pattern',
    detect: /if\s*\(\s*!?\w+\s*(?:===?|!==?)\s*(?:null|undefined|''|""|0)\s*\)/,
    extractExample: (code: string) => {
      const match = code.match(/if\s*\([^)]*(?:null|undefined)[^)]*\)\s*\{[^}]*\}/);
      return match ? match[0] : null;
    },
    rules: [
      { rule: 'Validate inputs before use', severity: 'warning' },
      { rule: 'Use optional chaining for nested access', severity: 'info' }
    ]
  },
  {
    category: 'data_fetching',
    name: 'Async/Await Pattern',
    detect: /async\s+(?:function|\([^)]*\)\s*=>)/,
    extractExample: (code: string) => {
      const match = code.match(/async\s+(?:function\s+\w+)?\s*\([^)]*\)\s*(?::\s*Promise<[^>]+>)?\s*\{[\s\S]*?await[\s\S]*?\}/);
      return match ? match[0] : null;
    },
    rules: [
      { rule: 'Use async/await for asynchronous code', severity: 'info' },
      { rule: 'Always await promises', severity: 'warning' }
    ]
  },
  {
    category: 'logging',
    name: 'Logging Pattern',
    detect: /console\.(log|error|warn|info)|logger\./,
    extractExample: (code: string) => {
      const match = code.match(/(?:console|logger)\.\w+\s*\([^)]*\)/);
      return match ? match[0] : null;
    },
    rules: [
      { rule: 'Use structured logging', severity: 'info' },
      { rule: 'Include context in log messages', severity: 'info' }
    ]
  }
];

export class PatternLearner {
  private tier2: Tier2Storage;
  private patternLibrary: PatternLibrary;

  constructor(tier2: Tier2Storage, patternLibrary: PatternLibrary) {
    this.tier2 = tier2;
    this.patternLibrary = patternLibrary;
  }

  // Learn patterns from the entire codebase
  learnFromCodebase(): {
    patternsLearned: number;
    examplesAdded: number;
    categories: Record<string, number>;
  } {
    const files = this.tier2.getAllFiles();
    const categories: Record<string, number> = {};
    let patternsLearned = 0;
    let examplesAdded = 0;

    for (const file of files) {
      if (!file.preview) continue;

      const filePatterns = this.detectPatterns(file.preview);

      for (const detected of filePatterns) {
        categories[detected.category] = (categories[detected.category] || 0) + 1;

        // Check if we already have this pattern
        const existingPatterns = this.patternLibrary.getPatternsByCategory(detected.category);
        const existing = existingPatterns.find(p => p.name === detected.name);

        if (existing) {
          // Add as example if different enough
          if (detected.example && !this.isDuplicate(existing.examples, detected.example)) {
            this.patternLibrary.addExample(existing.id, {
              code: detected.example,
              explanation: `Extracted from ${file.path}`,
              file: file.path
            });
            examplesAdded++;
          }
        } else {
          // Create new pattern
          this.patternLibrary.addPattern(
            detected.name,
            detected.category,
            `${detected.name} detected in codebase`,
            detected.example ? [{
              code: detected.example,
              explanation: `Extracted from ${file.path}`,
              file: file.path
            }] : [],
            [],
            detected.rules
          );
          patternsLearned++;
        }
      }
    }

    return { patternsLearned, examplesAdded, categories };
  }

  // Detect patterns in a code snippet
  detectPatterns(code: string): Array<{
    category: PatternCategory;
    name: string;
    example: string | null;
    rules: PatternRule[];
  }> {
    const detected: Array<{
      category: PatternCategory;
      name: string;
      example: string | null;
      rules: PatternRule[];
    }> = [];

    for (const detector of PATTERN_DETECTORS) {
      if (detector.detect.test(code)) {
        detected.push({
          category: detector.category,
          name: detector.name,
          example: detector.extractExample(code),
          rules: detector.rules
        });
      }
    }

    return detected;
  }

  // Learn a specific pattern from user input
  learnPattern(
    code: string,
    name: string,
    description?: string,
    category?: PatternCategory
  ): { success: boolean; patternId?: string; message: string } {
    // Auto-detect category if not provided
    const detectedCategory = category || this.inferCategory(code);

    // Check for existing similar pattern
    const existingPatterns = this.patternLibrary.searchPatterns(name);
    if (existingPatterns.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      return {
        success: false,
        message: `Pattern "${name}" already exists. Use add_example to add to existing pattern.`
      };
    }

    // Extract rules from code
    const rules = this.extractRules(code);

    // Create the pattern
    const pattern = this.patternLibrary.addPattern(
      name,
      detectedCategory,
      description || `User-defined pattern: ${name}`,
      [{
        code,
        explanation: 'User-provided example'
      }],
      [],
      rules
    );

    return {
      success: true,
      patternId: pattern.id,
      message: `Pattern "${name}" created successfully`
    };
  }

  // Infer category from code
  private inferCategory(code: string): PatternCategory {
    for (const detector of PATTERN_DETECTORS) {
      if (detector.detect.test(code)) {
        return detector.category;
      }
    }
    return 'custom';
  }

  // Extract rules from code patterns
  private extractRules(code: string): PatternRule[] {
    const rules: PatternRule[] = [];

    // Detect common patterns and generate rules
    if (/try\s*\{/.test(code)) {
      rules.push({ rule: 'Use try-catch for error handling', severity: 'warning' });
    }
    if (/catch\s*\([^)]*\)\s*\{[\s\S]*console\.error/.test(code)) {
      rules.push({ rule: 'Log errors in catch blocks', severity: 'info' });
    }
    if (/async\s+/.test(code)) {
      rules.push({ rule: 'Use async functions for asynchronous operations', severity: 'info' });
    }
    if (/await\s+/.test(code)) {
      rules.push({ rule: 'Await all promises', severity: 'warning' });
    }
    if (/interface\s+\w+Props/.test(code)) {
      rules.push({ rule: 'Define Props interfaces for components', severity: 'warning' });
    }
    if (/\?\.\w+/.test(code)) {
      rules.push({ rule: 'Use optional chaining for safe property access', severity: 'info' });
    }
    if (/\?\?/.test(code)) {
      rules.push({ rule: 'Use nullish coalescing for default values', severity: 'info' });
    }

    return rules;
  }

  // Check if example is duplicate
  private isDuplicate(examples: CodeExample[], newExample: string): boolean {
    const normalized = this.normalizeCode(newExample);
    return examples.some(e => this.normalizeCode(e.code) === normalized);
  }

  // Normalize code for comparison
  private normalizeCode(code: string): string {
    return code
      .replace(/\s+/g, ' ')
      .replace(/['"`]/g, '"')
      .trim()
      .toLowerCase();
  }

  // Get learning statistics
  getStats(): {
    totalPatterns: number;
    byCategory: Record<string, number>;
    topPatterns: Array<{ name: string; usageCount: number }>;
  } {
    const patterns = this.patternLibrary.getAllPatterns();
    const byCategory: Record<string, number> = {};

    for (const pattern of patterns) {
      byCategory[pattern.category] = (byCategory[pattern.category] || 0) + 1;
    }

    const topPatterns = patterns
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(p => ({ name: p.name, usageCount: p.usageCount }));

    return {
      totalPatterns: patterns.length,
      byCategory,
      topPatterns
    };
  }
}
