import type Database from 'better-sqlite3';
import type { FixSuggestion, PastBug, Change } from '../../types/documentation.js';
import type { BugCorrelator } from './bug-correlator.js';
import type { ChangeTracker } from './change-tracker.js';

// Common fix patterns
const FIX_PATTERNS = [
  {
    errorPattern: /cannot read (?:property |properties of )['"]?(\w+)['"]? of (?:undefined|null)/i,
    suggestions: [
      {
        fix: 'Add optional chaining (?.) before accessing the property',
        diff: '+ obj?.property instead of obj.property',
        confidence: 85
      },
      {
        fix: 'Add null/undefined check before accessing',
        diff: '+ if (obj && obj.property) { ... }',
        confidence: 80
      }
    ]
  },
  {
    errorPattern: /(\w+) is not defined/i,
    suggestions: [
      {
        fix: 'Add missing import statement',
        diff: '+ import { $1 } from "module"',
        confidence: 75
      },
      {
        fix: 'Declare the variable before use',
        diff: '+ const $1 = ...',
        confidence: 70
      }
    ]
  },
  {
    errorPattern: /(\w+) is not a function/i,
    suggestions: [
      {
        fix: 'Check if the method exists on the object',
        diff: '+ if (typeof obj.method === "function") { obj.method() }',
        confidence: 70
      },
      {
        fix: 'Verify the import is correct',
        diff: 'Check that the function is exported from the source module',
        confidence: 65
      }
    ]
  },
  {
    errorPattern: /unexpected token/i,
    suggestions: [
      {
        fix: 'Check for JSON.parse on invalid JSON',
        diff: '+ try { JSON.parse(data) } catch { ... }',
        confidence: 70
      },
      {
        fix: 'Validate data before parsing',
        diff: '+ if (typeof data === "string" && data.startsWith("{")) { ... }',
        confidence: 65
      }
    ]
  },
  {
    errorPattern: /timeout|timed out/i,
    suggestions: [
      {
        fix: 'Increase timeout value',
        diff: '+ timeout: 30000 // Increase from default',
        confidence: 60
      },
      {
        fix: 'Add retry logic',
        diff: '+ for (let i = 0; i < 3; i++) { try { ... } catch { await delay(1000) } }',
        confidence: 55
      }
    ]
  },
  {
    errorPattern: /ECONNREFUSED|connection refused/i,
    suggestions: [
      {
        fix: 'Verify the service is running',
        diff: 'Check that the database/API server is started',
        confidence: 80
      },
      {
        fix: 'Check port and host configuration',
        diff: 'Verify PORT and HOST environment variables',
        confidence: 75
      }
    ]
  },
  {
    errorPattern: /out of memory|heap/i,
    suggestions: [
      {
        fix: 'Process data in chunks',
        diff: '+ for (const chunk of chunks(data, 1000)) { process(chunk) }',
        confidence: 70
      },
      {
        fix: 'Increase Node.js memory limit',
        diff: '+ node --max-old-space-size=4096 app.js',
        confidence: 60
      }
    ]
  },
  {
    errorPattern: /module not found|cannot find module/i,
    suggestions: [
      {
        fix: 'Install missing package',
        diff: '+ npm install <package-name>',
        confidence: 85
      },
      {
        fix: 'Check import path is correct',
        diff: 'Verify relative path (./module vs ../module)',
        confidence: 75
      }
    ]
  },
  {
    errorPattern: /type.*is not assignable/i,
    suggestions: [
      {
        fix: 'Add type assertion',
        diff: '+ value as ExpectedType',
        confidence: 60
      },
      {
        fix: 'Fix the type definition',
        diff: 'Update interface/type to match actual data',
        confidence: 70
      }
    ]
  },
  {
    errorPattern: /async|await|promise/i,
    suggestions: [
      {
        fix: 'Add await keyword',
        diff: '+ const result = await asyncFunction()',
        confidence: 75
      },
      {
        fix: 'Handle promise rejection',
        diff: '+ .catch(err => console.error(err))',
        confidence: 70
      }
    ]
  }
];

export class FixSuggester {
  private db: Database.Database;
  private bugCorrelator: BugCorrelator;
  private changeTracker: ChangeTracker;

  constructor(
    db: Database.Database,
    bugCorrelator: BugCorrelator,
    changeTracker: ChangeTracker
  ) {
    this.db = db;
    this.bugCorrelator = bugCorrelator;
    this.changeTracker = changeTracker;
  }

  suggestFix(error: string, context?: string): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // 1. Check for similar bugs with fixes
    const pastBugs = this.bugCorrelator.findSimilarBugs(error, 5);
    for (const bug of pastBugs) {
      if (bug.fix || bug.fixDiff) {
        suggestions.push({
          confidence: bug.similarity,
          fix: bug.fix || 'Apply similar fix',
          reason: `Fixed similar issue on ${bug.date.toLocaleDateString()}`,
          diff: bug.fixDiff,
          pastFix: {
            date: bug.date,
            file: bug.file || 'unknown',
            bugId: bug.id
          },
          source: 'history'
        });
      }
    }

    // 2. Check for pattern-based suggestions
    for (const { errorPattern, suggestions: patternSuggestions } of FIX_PATTERNS) {
      const match = error.match(errorPattern);
      if (match) {
        for (const suggestion of patternSuggestions) {
          // Replace $1 with captured group if present
          let fix = suggestion.fix;
          let diff = suggestion.diff;
          if (match[1]) {
            fix = fix.replace('$1', match[1]);
            diff = diff.replace('$1', match[1]);
          }

          suggestions.push({
            confidence: suggestion.confidence,
            fix,
            reason: 'Common fix for this error type',
            diff,
            source: 'pattern'
          });
        }
        break; // Only use first matching pattern
      }
    }

    // 3. Check if recent changes can be reverted
    if (suggestions.length < 3) {
      const revertSuggestion = this.checkRevertOption(error);
      if (revertSuggestion) {
        suggestions.push(revertSuggestion);
      }
    }

    // 4. Add general suggestions based on context
    if (context) {
      const contextSuggestion = this.getContextBasedSuggestion(error, context);
      if (contextSuggestion) {
        suggestions.push(contextSuggestion);
      }
    }

    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);

    // Return top 5
    return suggestions.slice(0, 5);
  }

  private checkRevertOption(error: string): FixSuggestion | null {
    // Check if a recent change might have caused this
    const keywords = error.split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 5);

    const recentChanges = this.changeTracker.getRecentChanges(24);

    for (const change of recentChanges) {
      const changeText = `${change.file} ${change.diff}`.toLowerCase();
      const matchCount = keywords.filter(k => changeText.includes(k.toLowerCase())).length;

      if (matchCount >= 2 && change.linesRemoved > 0) {
        return {
          confidence: 50,
          fix: `Consider reverting recent change in ${change.file}`,
          reason: `This file was modified ${Math.round((Date.now() - change.timestamp.getTime()) / (1000 * 60 * 60))}h ago and may have introduced the issue`,
          diff: `git revert ${change.commitHash}`,
          pastFix: {
            date: change.timestamp,
            file: change.file
          },
          source: 'history'
        };
      }
    }

    return null;
  }

  private getContextBasedSuggestion(error: string, context: string): FixSuggestion | null {
    const contextLower = context.toLowerCase();
    const errorLower = error.toLowerCase();

    // Database-related
    if (contextLower.includes('database') || contextLower.includes('query')) {
      if (errorLower.includes('timeout')) {
        return {
          confidence: 55,
          fix: 'Add database index or optimize query',
          reason: 'Database timeouts often indicate missing indexes',
          diff: 'CREATE INDEX idx_column ON table(column)',
          source: 'general'
        };
      }
    }

    // API-related
    if (contextLower.includes('api') || contextLower.includes('fetch')) {
      if (errorLower.includes('undefined') || errorLower.includes('null')) {
        return {
          confidence: 55,
          fix: 'Add response validation before accessing data',
          reason: 'API responses should be validated before use',
          diff: 'if (response?.data) { ... }',
          source: 'general'
        };
      }
    }

    // React/Component-related
    if (contextLower.includes('component') || contextLower.includes('react')) {
      if (errorLower.includes('undefined') || errorLower.includes('null')) {
        return {
          confidence: 55,
          fix: 'Add null check or default value for props',
          reason: 'Component props may be undefined initially',
          diff: 'const value = props.value ?? defaultValue',
          source: 'general'
        };
      }
    }

    return null;
  }

  // Get fix statistics
  getFixStats(): {
    totalFixes: number;
    successRate: number;
    avgConfidence: number;
    topPatterns: Array<{ pattern: string; count: number }>;
  } {
    // This would ideally track actual fix success over time
    // For now, return pattern-based stats
    return {
      totalFixes: FIX_PATTERNS.length * 2, // Each pattern has ~2 suggestions
      successRate: 75, // Estimated
      avgConfidence: 70,
      topPatterns: FIX_PATTERNS.slice(0, 5).map((p, i) => ({
        pattern: p.errorPattern.source.slice(0, 30),
        count: 10 - i // Placeholder counts
      }))
    };
  }
}
