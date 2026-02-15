import type { TestInfo, TestUpdate, TestCoverage, PredictedFailure, TestFramework } from '../../types/documentation.js';
import type { TestIndexer } from './test-indexer.js';
import type { Tier2Storage } from '../../storage/tier2.js';
import type { CodeSymbol } from '../../types/index.js';

export class TestSuggester {
  private testIndexer: TestIndexer;
  private tier2: Tier2Storage;

  constructor(testIndexer: TestIndexer, tier2: Tier2Storage) {
    this.testIndexer = testIndexer;
    this.tier2 = tier2;
  }

  suggestTestUpdates(failures: PredictedFailure[]): TestUpdate[] {
    const updates: TestUpdate[] = [];

    for (const failure of failures) {
      if (failure.assertion) {
        const update = this.generateAssertionUpdate(failure);
        if (update) {
          updates.push(update);
        }
      } else {
        // General test update suggestion
        const update = this.generateGeneralUpdate(failure);
        if (update) {
          updates.push(update);
        }
      }
    }

    return updates;
  }

  private generateAssertionUpdate(failure: PredictedFailure): TestUpdate | null {
    if (!failure.assertion) return null;

    const assertion = failure.assertion;
    let after = assertion.code;
    let reason = failure.reason;

    // Generate specific update based on failure type
    if (failure.reason.includes('removed or renamed')) {
      // Suggest commenting out for manual review
      after = `// FIXME: ${failure.reason}\n// ${assertion.code}`;
      reason = `Function may have been removed - test needs manual review`;
    } else if (failure.reason.includes('expected value')) {
      // Suggest updating expected value
      after = `// TODO: Update expected value\n${assertion.code}`;
      reason = `Expected value may have changed`;
    } else if (failure.reason.includes('modified')) {
      // Suggest reviewing the assertion
      after = `// TODO: Review after code change\n${assertion.code}`;
      reason = `Code under test has been modified`;
    }

    return {
      file: failure.test.file,
      testName: failure.test.name,
      line: assertion.line,
      before: assertion.code,
      after,
      reason
    };
  }

  private generateGeneralUpdate(failure: PredictedFailure): TestUpdate | null {
    let after = '';
    const reason = failure.reason;

    if (failure.reason.includes('removed or renamed')) {
      after = `// FIXME: Test may be broken - ${failure.reason}`;
    } else {
      after = `// TODO: Review test - ${failure.reason}`;
    }

    return {
      file: failure.test.file,
      testName: failure.test.name,
      line: failure.test.lineStart,
      before: `// Test: ${failure.test.name}`,
      after,
      reason
    };
  }

  generateTestTemplate(file: string, functionName: string): string {
    const framework = this.testIndexer.getFramework();
    const fileInfo = this.tier2.getFile(file);
    const symbols = fileInfo ? this.tier2.getSymbolsByFile(fileInfo.id) : [];

    // Find the specific function
    const funcSymbol = symbols.find(s => s.name === functionName && (s.kind === 'function' || s.kind === 'method'));

    switch (framework) {
      case 'jest':
      case 'vitest':
        return this.generateJestTemplate(file, functionName, funcSymbol);
      case 'mocha':
        return this.generateMochaTemplate(file, functionName, funcSymbol);
      case 'pytest':
        return this.generatePytestTemplate(file, functionName, funcSymbol);
      case 'go':
        return this.generateGoTemplate(file, functionName, funcSymbol);
      default:
        return this.generateJestTemplate(file, functionName, funcSymbol);
    }
  }

  private generateJestTemplate(file: string, functionName: string, symbol?: CodeSymbol): string {
    const importPath = this.getImportPath(file);
    const signature = symbol?.signature || `${functionName}()`;

    // Parse parameters from signature
    const params = this.parseParameters(signature);
    const paramExamples = params.map(p => this.getExampleValue(p)).join(', ');

    return `import { ${functionName} } from '${importPath}';

describe('${functionName}', () => {
  it('should work with valid input', () => {
    const result = ${functionName}(${paramExamples});
    expect(result).toBeDefined();
  });

  it('should handle edge cases', () => {
    // TODO: Add edge case tests
  });

  it('should throw on invalid input', () => {
    expect(() => ${functionName}(null)).toThrow();
  });
});
`;
  }

  private generateMochaTemplate(file: string, functionName: string, symbol?: CodeSymbol): string {
    const importPath = this.getImportPath(file);
    const signature = symbol?.signature || `${functionName}()`;

    const params = this.parseParameters(signature);
    const paramExamples = params.map(p => this.getExampleValue(p)).join(', ');

    return `const { expect } = require('chai');
const { ${functionName} } = require('${importPath}');

describe('${functionName}', function() {
  it('should work with valid input', function() {
    const result = ${functionName}(${paramExamples});
    expect(result).to.exist;
  });

  it('should handle edge cases', function() {
    // TODO: Add edge case tests
  });

  it('should throw on invalid input', function() {
    expect(() => ${functionName}(null)).to.throw();
  });
});
`;
  }

  private generatePytestTemplate(file: string, functionName: string, symbol?: CodeSymbol): string {
    const importPath = file.replace(/\.py$/, '').replace(/\//g, '.').replace(/\\/g, '.');
    const signature = symbol?.signature || `${functionName}()`;

    const params = this.parseParameters(signature);
    const paramExamples = params.map(p => this.getPythonExampleValue(p)).join(', ');

    return `import pytest
from ${importPath} import ${functionName}


def test_${functionName}_valid_input():
    """Test ${functionName} with valid input."""
    result = ${functionName}(${paramExamples})
    assert result is not None


def test_${functionName}_edge_cases():
    """Test ${functionName} edge cases."""
    # TODO: Add edge case tests
    pass


def test_${functionName}_invalid_input():
    """Test ${functionName} with invalid input."""
    with pytest.raises(Exception):
        ${functionName}(None)
`;
  }

  private generateGoTemplate(file: string, functionName: string, symbol?: CodeSymbol): string {
    const packageName = file.split('/').pop()?.replace(/_test\.go$/, '') || 'main';
    const signature = symbol?.signature || `${functionName}()`;

    const params = this.parseParameters(signature);
    const paramExamples = params.map(p => this.getGoExampleValue(p)).join(', ');

    return `package ${packageName}

import (
    "testing"
)

func Test${functionName}(t *testing.T) {
    t.Run("valid input", func(t *testing.T) {
        result := ${functionName}(${paramExamples})
        if result == nil {
            t.Error("expected non-nil result")
        }
    })

    t.Run("edge cases", func(t *testing.T) {
        // TODO: Add edge case tests
    })

    t.Run("invalid input", func(t *testing.T) {
        defer func() {
            if r := recover(); r == nil {
                t.Error("expected panic on invalid input")
            }
        }()
        ${functionName}(nil)
    })
}
`;
  }

  getCoverage(file: string): TestCoverage {
    // Get tests that cover this file
    const tests = this.testIndexer.getTestsForFile(file);

    // Get all functions in the file
    const fileInfo = this.tier2.getFile(file);
    const allFunctions: string[] = [];

    if (fileInfo) {
      const symbols = this.tier2.getSymbolsByFile(fileInfo.id);
      for (const symbol of symbols) {
        if (symbol.kind === 'function' || symbol.kind === 'method') {
          allFunctions.push(symbol.name);
        }
      }
    }

    // Determine which functions are covered
    const coveredFunctions = new Set<string>();
    for (const test of tests) {
      for (const fn of test.coversFunctions) {
        if (allFunctions.includes(fn)) {
          coveredFunctions.add(fn);
        }
      }
    }

    // Also consider functions that are implicitly covered by file imports
    for (const test of tests) {
      for (const coveredFile of test.coversFiles) {
        if (file.includes(coveredFile) || coveredFile.includes(file.replace(/\.[^.]+$/, ''))) {
          // This test imports the file, might cover its functions
          // Mark exported functions as potentially covered
          if (fileInfo) {
            const exports = this.tier2.getExportsByFile(fileInfo.id);
            for (const exp of exports) {
              if (allFunctions.includes(exp.exportedName)) {
                coveredFunctions.add(exp.exportedName);
              }
            }
          }
        }
      }
    }

    const coveredFunctionsList = Array.from(coveredFunctions);
    const uncoveredFunctions = allFunctions.filter(f => !coveredFunctions.has(f));

    const coveragePercent = allFunctions.length > 0
      ? Math.round((coveredFunctionsList.length / allFunctions.length) * 100)
      : (tests.length > 0 ? 100 : 0);

    return {
      file,
      totalTests: tests.length,
      coveredFunctions: coveredFunctionsList,
      uncoveredFunctions,
      coveragePercent
    };
  }

  suggestNewTests(file: string): Array<{ function: string; template: string; priority: 'high' | 'medium' | 'low' }> {
    const coverage = this.getCoverage(file);
    const suggestions: Array<{ function: string; template: string; priority: 'high' | 'medium' | 'low' }> = [];

    // Get file info for export information
    const fileInfo = this.tier2.getFile(file);
    const exportedSymbols = new Set<string>();

    if (fileInfo) {
      const exports = this.tier2.getExportsByFile(fileInfo.id);
      for (const exp of exports) {
        exportedSymbols.add(exp.exportedName);
      }
    }

    for (const fn of coverage.uncoveredFunctions) {
      // Higher priority for exported functions
      const priority = exportedSymbols.has(fn) ? 'high' : 'medium';

      suggestions.push({
        function: fn,
        template: this.generateTestTemplate(file, fn),
        priority
      });
    }

    // Sort by priority
    suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return suggestions;
  }

  private getImportPath(file: string): string {
    // Convert file path to import path
    let importPath = file
      .replace(/\.[^.]+$/, '') // Remove extension
      .replace(/\\/g, '/');    // Normalize slashes

    // Add relative prefix if not already present
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      importPath = './' + importPath;
    }

    return importPath;
  }

  private parseParameters(signature: string): string[] {
    const match = signature.match(/\(([^)]*)\)/);
    if (!match || !match[1]?.trim()) return [];

    return match[1]
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => {
        // Extract just the parameter name or type
        const parts = p.split(/[:\s]+/);
        const firstPart = parts[0];
        return firstPart ? firstPart.replace(/[?*&]/, '') : '';
      })
      .filter(Boolean);
  }

  private getExampleValue(param: string): string {
    // Generate example values based on parameter name hints
    const lower = param.toLowerCase();

    if (lower.includes('name') || lower.includes('str') || lower.includes('text')) return "'test'";
    if (lower.includes('id')) return "'123'";
    if (lower.includes('num') || lower.includes('count') || lower.includes('index')) return '1';
    if (lower.includes('flag') || lower.includes('is') || lower.includes('has')) return 'true';
    if (lower.includes('list') || lower.includes('array') || lower.includes('items')) return '[]';
    if (lower.includes('obj') || lower.includes('data') || lower.includes('options')) return '{}';
    if (lower.includes('fn') || lower.includes('callback') || lower.includes('handler')) return '() => {}';

    return '/* TODO */';
  }

  private getPythonExampleValue(param: string): string {
    const lower = param.toLowerCase();

    if (lower.includes('name') || lower.includes('str') || lower.includes('text')) return '"test"';
    if (lower.includes('id')) return '"123"';
    if (lower.includes('num') || lower.includes('count') || lower.includes('index')) return '1';
    if (lower.includes('flag') || lower.includes('is') || lower.includes('has')) return 'True';
    if (lower.includes('list') || lower.includes('array') || lower.includes('items')) return '[]';
    if (lower.includes('obj') || lower.includes('data') || lower.includes('dict')) return '{}';

    return 'None  # TODO';
  }

  private getGoExampleValue(param: string): string {
    const lower = param.toLowerCase();

    if (lower.includes('name') || lower.includes('str') || lower.includes('text')) return '"test"';
    if (lower.includes('id')) return '"123"';
    if (lower.includes('num') || lower.includes('count') || lower.includes('index')) return '1';
    if (lower.includes('flag') || lower.includes('is') || lower.includes('has')) return 'true';

    return 'nil /* TODO */';
  }

  formatTestUpdates(updates: TestUpdate[]): string {
    if (updates.length === 0) {
      return 'No test updates needed.';
    }

    const lines: string[] = ['Suggested Test Updates:', ''];

    for (const update of updates) {
      lines.push(`File: ${update.file}`);
      lines.push(`Test: ${update.testName}`);
      lines.push(`Line: ${update.line}`);
      lines.push(`Reason: ${update.reason}`);
      lines.push('');
      lines.push('Before:');
      lines.push('```');
      lines.push(update.before);
      lines.push('```');
      lines.push('');
      lines.push('After:');
      lines.push('```');
      lines.push(update.after);
      lines.push('```');
      lines.push('---');
    }

    return lines.join('\n');
  }

  formatCoverage(coverage: TestCoverage): string {
    const lines: string[] = [
      `Test Coverage for ${coverage.file}:`,
      '',
      `Total Tests: ${coverage.totalTests}`,
      `Coverage: ${coverage.coveragePercent}%`,
      ''
    ];

    if (coverage.coveredFunctions.length > 0) {
      lines.push('Covered Functions:');
      for (const fn of coverage.coveredFunctions) {
        lines.push(`  - ${fn}`);
      }
      lines.push('');
    }

    if (coverage.uncoveredFunctions.length > 0) {
      lines.push('Uncovered Functions:');
      for (const fn of coverage.uncoveredFunctions) {
        lines.push(`  - ${fn}`);
      }
    }

    return lines.join('\n');
  }
}
