import type { Tier2Storage } from '../../storage/tier2.js';
import type {
  ConfidenceSources,
  ConfidenceWarning,
  WarningType
} from '../../types/documentation.js';

// Security patterns to detect
const SECURITY_PATTERNS = [
  { pattern: /eval\s*\(/, issue: 'eval() usage', suggestion: 'Avoid eval() - use safer alternatives' },
  { pattern: /innerHTML\s*=/, issue: 'innerHTML assignment', suggestion: 'Use textContent or sanitize input to prevent XSS' },
  { pattern: /document\.write\s*\(/, issue: 'document.write() usage', suggestion: 'Use DOM manipulation methods instead' },
  { pattern: /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE)/i, issue: 'SQL injection risk', suggestion: 'Use parameterized queries' },
  { pattern: /exec\s*\(.*\$\{/, issue: 'Command injection risk', suggestion: 'Sanitize user input before shell execution' },
  { pattern: /password\s*[:=]\s*['"`][^'"`]+['"`]/, issue: 'Hardcoded password', suggestion: 'Use environment variables or secure vaults' },
  { pattern: /api[_-]?key\s*[:=]\s*['"`][^'"`]+['"`]/i, issue: 'Hardcoded API key', suggestion: 'Use environment variables' },
  { pattern: /\bhttp:\/\//, issue: 'Insecure HTTP', suggestion: 'Use HTTPS for secure communication' },
  { pattern: /dangerouslySetInnerHTML/, issue: 'React XSS risk', suggestion: 'Sanitize content before using dangerouslySetInnerHTML' }
];

// Deprecated patterns to detect
const DEPRECATED_PATTERNS = [
  { pattern: /var\s+\w+\s*=/, suggestion: 'Use const or let instead of var' },
  { pattern: /new\s+Buffer\s*\(/, suggestion: 'Use Buffer.from() or Buffer.alloc() instead' },
  { pattern: /\.substr\s*\(/, suggestion: 'Use .slice() or .substring() instead of .substr()' },
  { pattern: /__proto__/, suggestion: 'Use Object.getPrototypeOf() instead of __proto__' },
  { pattern: /arguments\s*\[/, suggestion: 'Use rest parameters (...args) instead of arguments' },
  { pattern: /\.bind\s*\(this\)/, suggestion: 'Consider using arrow functions instead of .bind(this)' }
];

// Complexity indicators
const COMPLEXITY_INDICATORS = [
  { pattern: /if\s*\([^)]*\)\s*{[^}]*if\s*\([^)]*\)\s*{[^}]*if/s, level: 'high' as const },
  { pattern: /\?\s*[^:]+\s*:\s*[^:]+\s*\?\s*[^:]+\s*:/s, level: 'high' as const },
  { pattern: /for\s*\([^)]*\)\s*{[^}]*for\s*\([^)]*\)\s*{/s, level: 'medium' as const },
  { pattern: /&&.*&&.*&&||\|\|.*\|\|.*\|\|/s, level: 'medium' as const }
];

const WARNING_DEFINITIONS: Record<WarningType, { defaultMessage: string; defaultSeverity: 'info' | 'warning' | 'critical' }> = {
  'no_similar_pattern': {
    defaultMessage: 'No similar pattern found in your codebase',
    defaultSeverity: 'warning'
  },
  'conflicts_with_decision': {
    defaultMessage: 'This conflicts with a past decision',
    defaultSeverity: 'critical'
  },
  'untested_approach': {
    defaultMessage: 'This approach has no tests in your codebase',
    defaultSeverity: 'info'
  },
  'high_complexity': {
    defaultMessage: 'This is complex code',
    defaultSeverity: 'warning'
  },
  'potential_security_issue': {
    defaultMessage: 'Potential security concern detected',
    defaultSeverity: 'critical'
  },
  'deprecated_approach': {
    defaultMessage: 'This uses deprecated patterns',
    defaultSeverity: 'warning'
  }
};

export class WarningDetector {
  private tier2: Tier2Storage;

  constructor(tier2: Tier2Storage) {
    this.tier2 = tier2;
  }

  async detectWarnings(code: string, sources: ConfidenceSources): Promise<ConfidenceWarning[]> {
    const warnings: ConfidenceWarning[] = [];

    // 1. Check for no similar patterns
    if (sources.codebase.length === 0 && sources.patterns.length === 0) {
      warnings.push(this.createWarning(
        'no_similar_pattern',
        'No similar code or patterns found in your codebase',
        'warning',
        'Review carefully - this is new for your project'
      ));
    }

    // 2. Check for security issues
    const securityWarnings = this.detectSecurityIssues(code);
    warnings.push(...securityWarnings);

    // 3. Check for deprecated patterns
    const deprecationWarnings = this.detectDeprecatedPatterns(code);
    warnings.push(...deprecationWarnings);

    // 4. Check complexity
    const complexityWarning = this.detectComplexity(code);
    if (complexityWarning) {
      warnings.push(complexityWarning);
    }

    // 5. Check for untested approach
    const untestedWarning = await this.checkForTests(code, sources);
    if (untestedWarning) {
      warnings.push(untestedWarning);
    }

    // Sort by severity (critical first)
    warnings.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return warnings;
  }

  private detectSecurityIssues(code: string): ConfidenceWarning[] {
    const warnings: ConfidenceWarning[] = [];

    for (const { pattern, issue, suggestion } of SECURITY_PATTERNS) {
      if (pattern.test(code)) {
        warnings.push(this.createWarning(
          'potential_security_issue',
          `Security concern: ${issue}`,
          'critical',
          suggestion
        ));
      }
    }

    return warnings;
  }

  private detectDeprecatedPatterns(code: string): ConfidenceWarning[] {
    const warnings: ConfidenceWarning[] = [];

    for (const { pattern, suggestion } of DEPRECATED_PATTERNS) {
      if (pattern.test(code)) {
        warnings.push(this.createWarning(
          'deprecated_approach',
          'Uses deprecated pattern',
          'warning',
          suggestion
        ));
      }
    }

    return warnings;
  }

  private detectComplexity(code: string): ConfidenceWarning | null {
    for (const { pattern, level } of COMPLEXITY_INDICATORS) {
      if (pattern.test(code)) {
        const severity = level === 'high' ? 'warning' : 'info';
        return this.createWarning(
          'high_complexity',
          `${level.charAt(0).toUpperCase() + level.slice(1)} complexity detected`,
          severity,
          'Consider breaking this into smaller functions'
        );
      }
    }

    // Check line count and nesting
    const lines = code.split('\n');
    if (lines.length > 50) {
      return this.createWarning(
        'high_complexity',
        'Long code block (>50 lines)',
        'info',
        'Consider splitting into multiple functions'
      );
    }

    return null;
  }

  private async checkForTests(code: string, sources: ConfidenceSources): Promise<ConfidenceWarning | null> {
    // Check if any of the matched files have corresponding tests
    const hasTests = sources.codebase.some(match => {
      const testPath = match.file.replace(/\.ts$/, '.test.ts').replace(/\.js$/, '.test.js');
      const specPath = match.file.replace(/\.ts$/, '.spec.ts').replace(/\.js$/, '.spec.js');

      return this.tier2.getFile(testPath) !== null ||
             this.tier2.getFile(specPath) !== null ||
             match.file.includes('.test.') ||
             match.file.includes('.spec.') ||
             match.file.includes('__tests__');
    });

    if (!hasTests && sources.codebase.length > 0) {
      return this.createWarning(
        'untested_approach',
        'Similar code has no tests',
        'info',
        'Consider adding tests before using this approach'
      );
    }

    // Check if the code itself looks like test code
    const isTestCode = /describe\s*\(|it\s*\(|test\s*\(|expect\s*\(|assert\./i.test(code);
    if (!isTestCode && code.includes('function') && sources.codebase.length === 0) {
      return this.createWarning(
        'untested_approach',
        'New function without matching tests',
        'info',
        'Consider writing tests for this functionality'
      );
    }

    return null;
  }

  private createWarning(
    type: WarningType,
    message?: string,
    severity?: 'info' | 'warning' | 'critical',
    suggestion?: string
  ): ConfidenceWarning {
    const defaults = WARNING_DEFINITIONS[type];
    return {
      type,
      message: message || defaults.defaultMessage,
      severity: severity || defaults.defaultSeverity,
      suggestion
    };
  }

  // Check for specific warning types
  hasSecurityWarnings(code: string): boolean {
    return SECURITY_PATTERNS.some(({ pattern }) => pattern.test(code));
  }

  hasDeprecatedPatterns(code: string): boolean {
    return DEPRECATED_PATTERNS.some(({ pattern }) => pattern.test(code));
  }

  isHighComplexity(code: string): boolean {
    return COMPLEXITY_INDICATORS.some(({ pattern, level }) =>
      level === 'high' && pattern.test(code)
    );
  }
}
