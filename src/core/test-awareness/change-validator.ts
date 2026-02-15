import type { TestInfo, ChangeAnalysis, TestValidationResult, PredictedFailure, Assertion } from '../../types/documentation.js';
import type { TestIndexer } from './test-indexer.js';
import type { Tier2Storage } from '../../storage/tier2.js';

interface FunctionChange {
  name: string;
  changeType: 'added' | 'removed' | 'modified' | 'signature_changed';
  oldSignature?: string;
  newSignature?: string;
}

interface ParsedChange {
  addedLines: string[];
  removedLines: string[];
  modifiedFunctions: FunctionChange[];
  exportChanges: { added: string[]; removed: string[] };
}

export class ChangeValidator {
  private testIndexer: TestIndexer;
  private tier2: Tier2Storage;

  constructor(testIndexer: TestIndexer, tier2: Tier2Storage) {
    this.testIndexer = testIndexer;
    this.tier2 = tier2;
  }

  analyzeChange(code: string, file: string): ChangeAnalysis {
    // Get existing file content from tier2
    const existingFile = this.tier2.getFile(file);
    const existingContent = existingFile?.preview || '';

    // Parse changes
    const parsed = this.parseCodeChange(existingContent, code);

    // Find affected functions
    const functions = parsed.modifiedFunctions.map(f => f.name);

    // Get tests that cover this file
    const testsForFile = this.testIndexer.getTestsForFile(file);

    // Get tests that cover any of the modified functions
    const testsForFunctions = functions.flatMap(fn => this.testIndexer.getTestsForFunction(fn));

    // Combine and dedupe affected tests
    const affectedTestIds = new Set<string>();
    const affectedTests: TestInfo[] = [];

    for (const test of [...testsForFile, ...testsForFunctions]) {
      if (!affectedTestIds.has(test.id)) {
        affectedTestIds.add(test.id);
        affectedTests.push(test);
      }
    }

    // Determine change type
    const changeType = this.determineChangeType(parsed);

    // Calculate risk level
    const risk = this.calculateRisk(parsed, affectedTests);

    // Calculate test coverage percentage
    const coveredFunctions = new Set<string>();
    for (const test of affectedTests) {
      for (const fn of test.coversFunctions) {
        coveredFunctions.add(fn);
      }
    }
    const testCoverage = functions.length > 0
      ? Math.round((coveredFunctions.size / functions.length) * 100)
      : affectedTests.length > 0 ? 100 : 0;

    // Generate reasoning
    const reasoning = this.generateReasoning(parsed, affectedTests, risk);

    return {
      file,
      functions,
      type: changeType,
      affectedTests,
      testCoverage,
      risk,
      reasoning
    };
  }

  predictFailures(analysis: ChangeAnalysis, newCode: string): PredictedFailure[] {
    const failures: PredictedFailure[] = [];

    for (const test of analysis.affectedTests) {
      // Check each assertion in the test
      for (const assertion of test.assertions) {
        const prediction = this.predictAssertionFailure(assertion, newCode, analysis);
        if (prediction) {
          failures.push(prediction);
        }
      }

      // If no specific assertion failures, check for general issues
      if (!failures.some(f => f.test.id === test.id)) {
        const generalPrediction = this.predictGeneralFailure(test, analysis, newCode);
        if (generalPrediction) {
          failures.push(generalPrediction);
        }
      }
    }

    return failures;
  }

  validateChange(code: string, file: string): TestValidationResult {
    const analysis = this.analyzeChange(code, file);
    const predictedFailures = this.predictFailures(analysis, code);

    // Categorize tests
    const wouldPass: TestInfo[] = [];
    const wouldFail: PredictedFailure[] = predictedFailures;
    const uncertain: TestInfo[] = [];

    const failingTestIds = new Set(predictedFailures.map(f => f.test.id));

    for (const test of analysis.affectedTests) {
      if (failingTestIds.has(test.id)) {
        continue; // Already in wouldFail
      }

      // Determine if test would likely pass or is uncertain
      const coverage = this.assessTestCoverage(test, code, file);
      if (coverage.confident) {
        wouldPass.push(test);
      } else {
        uncertain.push(test);
      }
    }

    // Generate suggested test updates
    const suggestedTestUpdates = this.generateTestUpdates(predictedFailures, analysis);

    // Determine if change is safe
    const safe = predictedFailures.length === 0 &&
                 analysis.risk !== 'high' &&
                 (analysis.testCoverage >= 50 || analysis.affectedTests.length === 0);

    return {
      safe,
      relatedTests: analysis.affectedTests,
      wouldPass,
      wouldFail: predictedFailures,
      uncertain,
      suggestedTestUpdates,
      coveragePercent: analysis.testCoverage
    };
  }

  private parseCodeChange(oldCode: string, newCode: string): ParsedChange {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');

    const addedLines: string[] = [];
    const removedLines: string[] = [];

    // Simple diff: lines in new but not in old
    const oldSet = new Set(oldLines.map(l => l.trim()));
    const newSet = new Set(newLines.map(l => l.trim()));

    for (const line of newLines) {
      if (!oldSet.has(line.trim()) && line.trim()) {
        addedLines.push(line);
      }
    }

    for (const line of oldLines) {
      if (!newSet.has(line.trim()) && line.trim()) {
        removedLines.push(line);
      }
    }

    // Detect function changes
    const oldFunctions = this.extractFunctions(oldCode);
    const newFunctions = this.extractFunctions(newCode);
    const modifiedFunctions: FunctionChange[] = [];

    const oldFuncMap = new Map(oldFunctions.map(f => [f.name, f]));
    const newFuncMap = new Map(newFunctions.map(f => [f.name, f]));

    // Find removed functions
    for (const [name, func] of oldFuncMap) {
      if (!newFuncMap.has(name)) {
        modifiedFunctions.push({
          name,
          changeType: 'removed',
          oldSignature: func.signature
        });
      }
    }

    // Find added and modified functions
    for (const [name, func] of newFuncMap) {
      const oldFunc = oldFuncMap.get(name);
      if (!oldFunc) {
        modifiedFunctions.push({
          name,
          changeType: 'added',
          newSignature: func.signature
        });
      } else if (oldFunc.signature !== func.signature) {
        modifiedFunctions.push({
          name,
          changeType: 'signature_changed',
          oldSignature: oldFunc.signature,
          newSignature: func.signature
        });
      } else if (oldFunc.body !== func.body) {
        modifiedFunctions.push({
          name,
          changeType: 'modified',
          oldSignature: oldFunc.signature,
          newSignature: func.signature
        });
      }
    }

    // Detect export changes
    const oldExports = this.extractExports(oldCode);
    const newExports = this.extractExports(newCode);

    const addedExports = newExports.filter(e => !oldExports.includes(e));
    const removedExports = oldExports.filter(e => !newExports.includes(e));

    return {
      addedLines,
      removedLines,
      modifiedFunctions,
      exportChanges: { added: addedExports, removed: removedExports }
    };
  }

  private extractFunctions(code: string): Array<{ name: string; signature: string; body: string }> {
    const functions: Array<{ name: string; signature: string; body: string }> = [];

    // JavaScript/TypeScript function patterns
    const patterns = [
      // Function declaration
      /function\s+(\w+)\s*\(([^)]*)\)[^{]*\{/g,
      // Arrow function
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*(?::\s*\w+)?\s*=>/g,
      // Method
      /(\w+)\s*\(([^)]*)\)\s*(?::\s*\w+)?\s*\{/g,
      // Python function
      /def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*\w+)?\s*:/g,
      // Go function
      /func\s+(\w+)\s*\(([^)]*)\)/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const name = match[1];
        const params = match[2];
        const signature = `${name}(${params})`;

        // Extract a simple body representation (first 200 chars after signature)
        const bodyStart = match.index + match[0].length;
        const body = code.slice(bodyStart, bodyStart + 200);

        functions.push({ name: name ?? '', signature, body });
      }
    }

    return functions;
  }

  private extractExports(code: string): string[] {
    const exports: string[] = [];

    // ES6 exports
    const exportPatterns = [
      /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g,
      /export\s*\{\s*([^}]+)\s*\}/g,
      /module\.exports\s*=\s*\{\s*([^}]+)\s*\}/g,
      /module\.exports\.(\w+)\s*=/g
    ];

    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const captured = match[1];
        if (!captured) continue;
        if (captured.includes(',')) {
          // Multiple exports
          const names = captured.split(',').map(s => {
            const parts = s.trim().split(/\s+as\s+/);
            return parts[0] ?? '';
          }).filter(Boolean);
          exports.push(...names);
        } else {
          exports.push(captured.trim());
        }
      }
    }

    return exports;
  }

  private determineChangeType(parsed: ParsedChange): 'refactor' | 'add' | 'delete' | 'modify' {
    const hasAdditions = parsed.addedLines.length > 0 || parsed.modifiedFunctions.some(f => f.changeType === 'added');
    const hasDeletions = parsed.removedLines.length > 0 || parsed.modifiedFunctions.some(f => f.changeType === 'removed');
    const hasModifications = parsed.modifiedFunctions.some(f => f.changeType === 'modified' || f.changeType === 'signature_changed');

    if (hasDeletions && !hasAdditions) return 'delete';
    if (hasAdditions && !hasDeletions && !hasModifications) return 'add';
    if (hasModifications || (hasAdditions && hasDeletions)) return 'modify';

    return 'refactor';
  }

  private calculateRisk(parsed: ParsedChange, affectedTests: TestInfo[]): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Removed exports are high risk
    if (parsed.exportChanges.removed.length > 0) {
      riskScore += 30;
    }

    // Signature changes are medium-high risk
    const signatureChanges = parsed.modifiedFunctions.filter(f => f.changeType === 'signature_changed');
    riskScore += signatureChanges.length * 20;

    // Removed functions are high risk
    const removedFunctions = parsed.modifiedFunctions.filter(f => f.changeType === 'removed');
    riskScore += removedFunctions.length * 25;

    // No test coverage is risky
    if (affectedTests.length === 0 && parsed.modifiedFunctions.length > 0) {
      riskScore += 20;
    }

    // Many affected tests might indicate broad impact
    if (affectedTests.length > 10) {
      riskScore += 15;
    }

    if (riskScore >= 50) return 'high';
    if (riskScore >= 25) return 'medium';
    return 'low';
  }

  private generateReasoning(parsed: ParsedChange, affectedTests: TestInfo[], risk: 'low' | 'medium' | 'high'): string {
    const reasons: string[] = [];

    if (parsed.modifiedFunctions.length > 0) {
      const types = parsed.modifiedFunctions.map(f => f.changeType);
      if (types.includes('removed')) {
        reasons.push(`${types.filter(t => t === 'removed').length} function(s) removed`);
      }
      if (types.includes('signature_changed')) {
        reasons.push(`${types.filter(t => t === 'signature_changed').length} function signature(s) changed`);
      }
      if (types.includes('modified')) {
        reasons.push(`${types.filter(t => t === 'modified').length} function body(ies) modified`);
      }
      if (types.includes('added')) {
        reasons.push(`${types.filter(t => t === 'added').length} function(s) added`);
      }
    }

    if (parsed.exportChanges.removed.length > 0) {
      reasons.push(`${parsed.exportChanges.removed.length} export(s) removed: ${parsed.exportChanges.removed.join(', ')}`);
    }

    if (affectedTests.length > 0) {
      reasons.push(`${affectedTests.length} test(s) may be affected`);
    } else {
      reasons.push('No tests cover this code');
    }

    return reasons.join('. ') + '.';
  }

  private predictAssertionFailure(
    assertion: Assertion,
    newCode: string,
    analysis: ChangeAnalysis
  ): PredictedFailure | null {
    // Check if the assertion subject is affected by the change
    const subject = assertion.subject;

    // Check if subject function was removed or signature changed
    for (const func of analysis.functions) {
      if (subject.includes(func)) {
        // Check if this function had breaking changes
        const funcInfo = this.tier2.searchSymbols(func, undefined, 1);
        if (funcInfo.length === 0) {
          // Function might have been removed
          return {
            test: analysis.affectedTests.find(t => t.assertions.some(a => a.code === assertion.code))!,
            assertion,
            reason: `Function '${func}' appears to be removed or renamed`,
            confidence: 80,
            suggestedFix: `Update test to use the new function name or remove the test if functionality is removed`
          };
        }
      }
    }

    // Check if expected value might have changed
    if (assertion.expected) {
      // Look for the expected value in the old code but not in new
      const expectedInCode = newCode.includes(assertion.expected);
      if (!expectedInCode && assertion.type === 'equality') {
        return {
          test: analysis.affectedTests.find(t => t.assertions.some(a => a.code === assertion.code))!,
          assertion,
          reason: `Expected value '${assertion.expected}' may have changed`,
          confidence: 60,
          suggestedFix: `Review and update the expected value in the assertion`
        };
      }
    }

    return null;
  }

  private predictGeneralFailure(
    test: TestInfo,
    analysis: ChangeAnalysis,
    newCode: string
  ): PredictedFailure | null {
    // Check if any covered functions were removed
    for (const fn of test.coversFunctions) {
      const inNewCode = newCode.includes(fn);
      if (!inNewCode) {
        return {
          test,
          reason: `Test calls '${fn}' which may have been removed or renamed`,
          confidence: 70,
          suggestedFix: `Update test to use the new function name or remove the test`
        };
      }
    }

    // Check for signature changes affecting this test
    for (const fn of test.coversFunctions) {
      if (analysis.functions.includes(fn)) {
        // Function was modified
        return {
          test,
          reason: `Test uses '${fn}' which has been modified`,
          confidence: 40,
          suggestedFix: `Review test assertions after code changes`
        };
      }
    }

    return null;
  }

  private assessTestCoverage(test: TestInfo, newCode: string, file: string): { confident: boolean } {
    // Check if all covered functions still exist
    let allFunctionsExist = true;
    for (const fn of test.coversFunctions) {
      if (!newCode.includes(fn)) {
        allFunctionsExist = false;
        break;
      }
    }

    // Check if file is still covered
    const coversFile = test.coversFiles.some(f =>
      file.includes(f) || f.includes(file.replace(/\.[^.]+$/, ''))
    );

    return {
      confident: allFunctionsExist && coversFile
    };
  }

  private generateTestUpdates(
    failures: PredictedFailure[],
    analysis: ChangeAnalysis
  ): Array<{ file: string; testName: string; line: number; before: string; after: string; reason: string }> {
    const updates: Array<{ file: string; testName: string; line: number; before: string; after: string; reason: string }> = [];

    for (const failure of failures) {
      if (failure.assertion && failure.suggestedFix) {
        updates.push({
          file: failure.test.file,
          testName: failure.test.name,
          line: failure.assertion.line,
          before: failure.assertion.code,
          after: `// TODO: ${failure.suggestedFix}\n${failure.assertion.code}`,
          reason: failure.reason
        });
      }
    }

    return updates;
  }
}
