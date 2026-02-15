import type Database from 'better-sqlite3';
import type { Tier2Storage } from '../../storage/tier2.js';
import type {
  TestInfo,
  TestFramework,
  TestValidationResult,
  TestUpdate,
  TestCoverage,
  PredictedFailure
} from '../../types/documentation.js';
import { TestIndexer } from './test-indexer.js';
import { TestParser } from './test-parser.js';
import { ChangeValidator } from './change-validator.js';
import { TestSuggester } from './test-suggester.js';

export class TestAwareness {
  private projectPath: string;
  private db: Database.Database;
  private tier2: Tier2Storage;
  private testIndexer: TestIndexer;
  private testParser: TestParser;
  private changeValidator: ChangeValidator;
  private testSuggester: TestSuggester;
  private initialized = false;

  constructor(projectPath: string, db: Database.Database, tier2: Tier2Storage) {
    this.projectPath = projectPath;
    this.db = db;
    this.tier2 = tier2;

    // Initialize components
    this.testIndexer = new TestIndexer(projectPath, db);
    this.testParser = new TestParser();
    this.changeValidator = new ChangeValidator(this.testIndexer, tier2);
    this.testSuggester = new TestSuggester(this.testIndexer, tier2);
  }

  initialize(): { testsIndexed: number; framework: TestFramework } {
    if (this.initialized) {
      return {
        testsIndexed: this.testIndexer.getTestCount(),
        framework: this.testIndexer.getFramework()
      };
    }

    const result = this.testIndexer.refreshIndex();
    this.initialized = true;

    return result;
  }

  // ========== Query Tests ==========

  getRelatedTests(file: string, functionName?: string): TestInfo[] {
    if (functionName) {
      // Get tests that specifically cover this function
      const fnTests = this.testIndexer.getTestsForFunction(functionName);
      if (fnTests.length > 0) {
        return fnTests;
      }
    }

    // Fall back to tests that cover the file
    return this.testIndexer.getTestsForFile(file);
  }

  getTestsForFile(file: string): TestInfo[] {
    return this.testIndexer.getTestsForFile(file);
  }

  getTestsForFunction(functionName: string): TestInfo[] {
    return this.testIndexer.getTestsForFunction(functionName);
  }

  getTestById(testId: string): TestInfo | null {
    return this.testIndexer.getTestById(testId);
  }

  getAllTests(): TestInfo[] {
    return this.testIndexer.getAllTests();
  }

  getTestsByTestFile(testFilePath: string): TestInfo[] {
    return this.testIndexer.getTestsByFile(testFilePath);
  }

  getFramework(): TestFramework {
    return this.testIndexer.getFramework();
  }

  getTestCount(): number {
    return this.testIndexer.getTestCount();
  }

  // ========== Validate Changes ==========

  checkTests(code: string, file: string): TestValidationResult {
    return this.changeValidator.validateChange(code, file);
  }

  validateChange(code: string, file: string): TestValidationResult {
    return this.changeValidator.validateChange(code, file);
  }

  predictFailures(code: string, file: string): PredictedFailure[] {
    const analysis = this.changeValidator.analyzeChange(code, file);
    return this.changeValidator.predictFailures(analysis, code);
  }

  // ========== Suggest Updates ==========

  suggestTestUpdate(change: string, failingTests?: string[]): TestUpdate[] {
    // If specific failing tests are provided, get their info
    let failures: PredictedFailure[] = [];

    if (failingTests && failingTests.length > 0) {
      for (const testId of failingTests) {
        const testInfo = this.testIndexer.getTestById(testId);
        if (testInfo) {
          failures.push({
            test: testInfo,
            reason: 'Test marked as failing',
            confidence: 100
          });
        }
      }
    }

    // If no specific tests, analyze the change to predict failures
    if (failures.length === 0) {
      // Try to extract file from the change content
      const fileMatch = change.match(/(?:file|in|from)\s+['"`]?([^'"`\s]+\.[tj]sx?|[^'"`\s]+\.py|[^'"`\s]+\.go)/i);
      if (fileMatch && fileMatch[1]) {
        const file = fileMatch[1];
        const analysis = this.changeValidator.analyzeChange(change, file);
        failures = this.changeValidator.predictFailures(analysis, change);
      }
    }

    return this.testSuggester.suggestTestUpdates(failures);
  }

  suggestNewTests(file: string): Array<{ function: string; template: string; priority: 'high' | 'medium' | 'low' }> {
    return this.testSuggester.suggestNewTests(file);
  }

  generateTestTemplate(file: string, functionName: string): string {
    return this.testSuggester.generateTestTemplate(file, functionName);
  }

  // ========== Coverage ==========

  getCoverage(file: string): TestCoverage {
    return this.testSuggester.getCoverage(file);
  }

  // ========== Refresh ==========

  refreshIndex(): { testsIndexed: number; framework: TestFramework } {
    return this.testIndexer.refreshIndex();
  }

  // ========== Formatting ==========

  formatValidationResult(result: TestValidationResult): string {
    const lines: string[] = [];

    // Overall status
    if (result.safe) {
      lines.push('Change is SAFE');
    } else {
      lines.push('Change may cause test failures');
    }

    lines.push(`Coverage: ${result.coveragePercent}%`);
    lines.push('');

    // Related tests
    if (result.relatedTests.length > 0) {
      lines.push(`Related Tests (${result.relatedTests.length}):`);
      for (const test of result.relatedTests.slice(0, 10)) {
        lines.push(`  - ${test.name} (${test.file}:${test.lineStart})`);
      }
      if (result.relatedTests.length > 10) {
        lines.push(`  ... and ${result.relatedTests.length - 10} more`);
      }
      lines.push('');
    }

    // Would pass
    if (result.wouldPass.length > 0) {
      lines.push(`Tests that would pass (${result.wouldPass.length}):`);
      for (const test of result.wouldPass.slice(0, 5)) {
        lines.push(`  - ${test.name}`);
      }
      if (result.wouldPass.length > 5) {
        lines.push(`  ... and ${result.wouldPass.length - 5} more`);
      }
      lines.push('');
    }

    // Would fail
    if (result.wouldFail.length > 0) {
      lines.push(`Tests that would FAIL (${result.wouldFail.length}):`);
      for (const failure of result.wouldFail) {
        lines.push(`  - ${failure.test.name}`);
        lines.push(`    Reason: ${failure.reason}`);
        lines.push(`    Confidence: ${failure.confidence}%`);
        if (failure.suggestedFix) {
          lines.push(`    Fix: ${failure.suggestedFix}`);
        }
      }
      lines.push('');
    }

    // Uncertain
    if (result.uncertain.length > 0) {
      lines.push(`Uncertain tests (${result.uncertain.length}):`);
      for (const test of result.uncertain.slice(0, 5)) {
        lines.push(`  - ${test.name}`);
      }
      if (result.uncertain.length > 5) {
        lines.push(`  ... and ${result.uncertain.length - 5} more`);
      }
      lines.push('');
    }

    // Suggested updates
    if (result.suggestedTestUpdates.length > 0) {
      lines.push(`Suggested Test Updates (${result.suggestedTestUpdates.length}):`);
      for (const update of result.suggestedTestUpdates) {
        lines.push(`  ${update.testName} at ${update.file}:${update.line}`);
        lines.push(`    Reason: ${update.reason}`);
      }
    }

    return lines.join('\n');
  }

  formatCoverage(coverage: TestCoverage): string {
    return this.testSuggester.formatCoverage(coverage);
  }

  formatTestList(tests: TestInfo[]): string {
    if (tests.length === 0) {
      return 'No tests found.';
    }

    const lines: string[] = [`Found ${tests.length} tests:`, ''];

    // Group by file
    const byFile = new Map<string, TestInfo[]>();
    for (const test of tests) {
      if (!byFile.has(test.file)) {
        byFile.set(test.file, []);
      }
      byFile.get(test.file)!.push(test);
    }

    for (const [file, fileTests] of byFile) {
      lines.push(`${file}:`);
      for (const test of fileTests) {
        const status = test.lastStatus ? ` [${test.lastStatus}]` : '';
        const describes = test.describes ? `${test.describes} > ` : '';
        lines.push(`  - ${describes}${test.name}${status} (line ${test.lineStart})`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // ========== Static formatting ==========

  static formatValidationResult(result: TestValidationResult): string {
    const lines: string[] = [];

    if (result.safe) {
      lines.push('SAFE: Change is safe to make');
    } else {
      lines.push('WARNING: Change may break tests');
    }

    lines.push(`Coverage: ${result.coveragePercent}%`);
    lines.push(`Related tests: ${result.relatedTests.length}`);
    lines.push(`Would pass: ${result.wouldPass.length}`);
    lines.push(`Would fail: ${result.wouldFail.length}`);
    lines.push(`Uncertain: ${result.uncertain.length}`);

    if (result.wouldFail.length > 0) {
      lines.push('');
      lines.push('Predicted failures:');
      for (const f of result.wouldFail) {
        lines.push(`  - ${f.test.name}: ${f.reason} (${f.confidence}% confidence)`);
      }
    }

    return lines.join('\n');
  }

  static formatCoverage(coverage: TestCoverage): string {
    return [
      `File: ${coverage.file}`,
      `Tests: ${coverage.totalTests}`,
      `Coverage: ${coverage.coveragePercent}%`,
      `Covered: ${coverage.coveredFunctions.join(', ') || 'none'}`,
      `Uncovered: ${coverage.uncoveredFunctions.join(', ') || 'none'}`
    ].join('\n');
  }
}
