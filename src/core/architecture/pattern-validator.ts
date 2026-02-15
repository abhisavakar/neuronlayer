import type { Tier2Storage } from '../../storage/tier2.js';
import type {
  Pattern,
  PatternCategory,
  PatternValidationResult,
  PatternViolation,
  PatternSuggestion,
  ExistingFunction
} from '../../types/documentation.js';
import type { PatternLibrary } from './pattern-library.js';
import type { DuplicateDetector } from './duplicate-detector.js';

// Validation rules
const VALIDATION_RULES: Array<{
  name: string;
  category: PatternCategory | 'all';
  check: RegExp;
  isViolation: boolean;  // true = finding it is bad, false = NOT finding it is bad
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestion: string;
}> = [
  // Error Handling
  {
    name: 'empty_catch',
    category: 'error_handling',
    check: /catch\s*\([^)]*\)\s*\{\s*\}/,
    isViolation: true,
    severity: 'critical',
    message: 'Empty catch block swallows errors silently',
    suggestion: 'Log the error or rethrow it'
  },
  {
    name: 'console_log_in_catch',
    category: 'error_handling',
    check: /catch\s*\([^)]*\)\s*\{[\s\S]*console\.log[\s\S]*\}/,
    isViolation: true,
    severity: 'warning',
    message: 'Using console.log for errors instead of console.error or logger',
    suggestion: 'Use console.error() or a proper logger'
  },
  {
    name: 'no_error_handling',
    category: 'api_call',
    check: /(?:fetch|axios)\s*\([^)]*\)(?![\s\S]*\.catch|[\s\S]*try)/,
    isViolation: true,
    severity: 'critical',
    message: 'API call without error handling',
    suggestion: 'Wrap in try-catch or add .catch()'
  },
  // API Calls
  {
    name: 'no_response_check',
    category: 'api_call',
    check: /fetch\s*\([^)]*\)[\s\S]*\.json\(\)(?![\s\S]*\.ok|[\s\S]*response\.status)/,
    isViolation: true,
    severity: 'warning',
    message: 'Parsing JSON without checking response status',
    suggestion: 'Check response.ok before parsing'
  },
  // Components
  {
    name: 'no_props_type',
    category: 'component',
    check: /(?:function|const)\s+\w+\s*\(\s*props\s*\)/,
    isViolation: true,
    severity: 'warning',
    message: 'Component props not typed',
    suggestion: 'Define Props interface and destructure: ({ prop1, prop2 }: Props)'
  },
  // Validation
  {
    name: 'direct_property_access',
    category: 'validation',
    check: /\w+\.\w+\.\w+(?!\s*\?\.)(?!\s*&&)/,
    isViolation: true,
    severity: 'warning',
    message: 'Deep property access without null checking',
    suggestion: 'Use optional chaining: obj?.prop?.nested'
  },
  // General
  {
    name: 'var_usage',
    category: 'all',
    check: /\bvar\s+\w+/,
    isViolation: true,
    severity: 'info',
    message: 'Using var instead of const/let',
    suggestion: 'Use const for constants, let for variables'
  },
  {
    name: 'any_type',
    category: 'all',
    check: /:\s*any\b/,
    isViolation: true,
    severity: 'info',
    message: 'Using any type reduces type safety',
    suggestion: 'Define proper types or use unknown'
  }
];

export class PatternValidator {
  private patternLibrary: PatternLibrary;
  private duplicateDetector: DuplicateDetector;
  private tier2: Tier2Storage;

  constructor(
    patternLibrary: PatternLibrary,
    duplicateDetector: DuplicateDetector,
    tier2: Tier2Storage
  ) {
    this.patternLibrary = patternLibrary;
    this.duplicateDetector = duplicateDetector;
    this.tier2 = tier2;
  }

  // Validate code against patterns
  validate(code: string, type?: PatternCategory | 'auto'): PatternValidationResult {
    const violations: PatternViolation[] = [];
    const suggestions: PatternSuggestion[] = [];
    let score = 100;

    // 1. Detect code type if auto
    const category = type === 'auto' || !type ? this.detectCategory(code) : type;

    // 2. Find matching pattern
    const patterns = category ? this.patternLibrary.getPatternsByCategory(category) : this.patternLibrary.getAllPatterns();
    const matchedPattern = this.findBestMatch(code, patterns);

    // 3. Check validation rules
    for (const rule of VALIDATION_RULES) {
      if (rule.category !== 'all' && rule.category !== category) continue;

      const matches = rule.check.test(code);
      if (rule.isViolation && matches) {
        violations.push({
          rule: rule.name,
          message: rule.message,
          severity: rule.severity,
          suggestion: rule.suggestion
        });

        // Deduct score based on severity
        score -= rule.severity === 'critical' ? 20 : rule.severity === 'warning' ? 10 : 5;
      }
    }

    // 4. Check against pattern rules if matched
    if (matchedPattern) {
      this.patternLibrary.incrementUsage(matchedPattern.id);

      for (const patternRule of matchedPattern.rules) {
        // Check if code follows this rule (simple keyword check)
        if (patternRule.check) {
          const regex = new RegExp(patternRule.check, 'i');
          if (!regex.test(code)) {
            violations.push({
              rule: patternRule.rule,
              message: `Does not follow pattern rule: ${patternRule.rule}`,
              severity: patternRule.severity
            });
            score -= patternRule.severity === 'critical' ? 15 : patternRule.severity === 'warning' ? 8 : 3;
          }
        }
      }

      // Check against anti-patterns
      for (const antiPattern of matchedPattern.antiPatterns) {
        if (this.matchesAntiPattern(code, antiPattern.code)) {
          violations.push({
            rule: 'anti_pattern',
            message: `Code matches anti-pattern: ${antiPattern.explanation}`,
            severity: 'warning',
            suggestion: 'See pattern examples for correct approach'
          });
          score -= 15;
        }
      }
    }

    // 5. Check for duplicates/existing functions
    const duplicates = this.duplicateDetector.findDuplicates(code);
    const existingAlternatives: ExistingFunction[] = duplicates.map(d => ({
      name: d.name,
      file: d.file,
      line: d.line,
      signature: d.signature,
      usageCount: d.usageCount,
      purpose: d.name,
      similarity: d.similarity
    }));

    if (existingAlternatives.length > 0) {
      const topMatch = existingAlternatives[0];
      violations.push({
        rule: 'duplicate_function',
        message: `Similar function already exists: ${topMatch.name} in ${topMatch.file}`,
        severity: 'critical',
        suggestion: `Use existing ${topMatch.name}() instead of creating new function`
      });
      score -= 25;

      suggestions.push({
        description: `Use existing function ${topMatch.name}() from ${topMatch.file}`,
        code: `import { ${topMatch.name} } from '${topMatch.file}';`,
        priority: 'high'
      });
    }

    // 6. Generate suggestions based on violations
    for (const violation of violations) {
      if (violation.suggestion && !suggestions.some(s => s.description === violation.suggestion)) {
        suggestions.push({
          description: violation.suggestion,
          priority: violation.severity === 'critical' ? 'high' : violation.severity === 'warning' ? 'medium' : 'low'
        });
      }
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return {
      valid: violations.filter(v => v.severity === 'critical').length === 0,
      score,
      matchedPattern: matchedPattern?.name,
      violations,
      suggestions,
      existingAlternatives
    };
  }

  // Detect what category of code this is
  private detectCategory(code: string): PatternCategory | null {
    if (/try\s*\{[\s\S]*catch/.test(code)) return 'error_handling';
    if (/fetch\s*\(|axios\.|api\./.test(code)) return 'api_call';
    if (/function\s+\w+.*\{[\s\S]*return\s*[(<]/.test(code)) return 'component';
    if (/if\s*\(\s*!?\w+\s*(?:===?|!==?)/.test(code)) return 'validation';
    if (/async\s+function|await\s+/.test(code)) return 'data_fetching';
    if (/console\.|logger\./.test(code)) return 'logging';
    return null;
  }

  // Find the best matching pattern
  private findBestMatch(code: string, patterns: Pattern[]): Pattern | null {
    let bestMatch: Pattern | null = null;
    let bestScore = 0;

    for (const pattern of patterns) {
      let score = 0;

      // Check examples
      for (const example of pattern.examples) {
        const similarity = this.calculateSimilarity(code, example.code);
        score += similarity;
      }

      // Check if follows rules
      for (const rule of pattern.rules) {
        if (rule.check) {
          const regex = new RegExp(rule.check, 'i');
          if (regex.test(code)) {
            score += 10;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = pattern;
      }
    }

    return bestScore > 20 ? bestMatch : null;
  }

  // Check if code matches an anti-pattern
  private matchesAntiPattern(code: string, antiPattern: string): boolean {
    // Normalize both and check similarity
    const similarity = this.calculateSimilarity(code, antiPattern);
    return similarity > 60;
  }

  // Calculate code similarity (simple token-based)
  private calculateSimilarity(code1: string, code2: string): number {
    const tokens1 = this.tokenize(code1);
    const tokens2 = this.tokenize(code2);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    let matches = 0;
    for (const token of set1) {
      if (set2.has(token)) matches++;
    }

    return (matches / Math.max(set1.size, set2.size)) * 100;
  }

  // Tokenize code
  private tokenize(code: string): string[] {
    return code
      .replace(/[^\w\s]/g, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  // Get validation statistics
  getValidationStats(): {
    totalValidations: number;
    avgScore: number;
    commonViolations: Array<{ rule: string; count: number }>;
  } {
    // This would track stats over time
    return {
      totalValidations: 0,
      avgScore: 0,
      commonViolations: []
    };
  }
}
