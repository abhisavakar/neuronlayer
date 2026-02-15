import type { TestInfo, Assertion, TestFramework } from '../../types/documentation.js';
import { createHash } from 'crypto';

interface ParsedImport {
  source: string;
  symbols: string[];
  isRelative: boolean;
}

export class TestParser {
  parseFile(content: string, filePath: string, framework: TestFramework): TestInfo[] {
    switch (framework) {
      case 'jest':
      case 'vitest':
      case 'mocha':
        return this.parseJsTestFile(content, filePath, framework);
      case 'pytest':
      case 'unittest':
        return this.parsePytestFile(content, filePath);
      case 'go':
        return this.parseGoTestFile(content, filePath);
      default:
        return this.parseJsTestFile(content, filePath, 'jest');
    }
  }

  private parseJsTestFile(content: string, filePath: string, _framework: TestFramework): TestInfo[] {
    const tests: TestInfo[] = [];
    const lines = content.split('\n');

    // Extract imports first
    const imports = this.extractJsImports(content);
    const coveredFiles = this.getCoveredFilesFromImports(imports);

    // Track describe blocks
    const describeStack: string[] = [];
    let currentDescribe = '';

    // Regex for describe/it/test blocks
    const describeRegex = /^\s*(describe|suite)\s*\(\s*['"`](.+?)['"`]/;
    const testRegex = /^\s*(it|test|specify)\s*\(\s*['"`](.+?)['"`]/;
    const endBlockRegex = /^\s*\}\s*\)/;

    let braceCount = 0;
    let testStartLine = -1;
    let currentTestName = '';
    let inTest = false;
    let testContent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const lineNum = i + 1;

      // Check for describe blocks
      const describeMatch = line.match(describeRegex);
      if (describeMatch && describeMatch[2]) {
        describeStack.push(describeMatch[2]);
        currentDescribe = describeStack.join(' > ');
        braceCount++;
        continue;
      }

      // Check for test blocks
      const testMatch = line.match(testRegex);
      if (testMatch && testMatch[2] && !inTest) {
        currentTestName = testMatch[2];
        testStartLine = lineNum;
        inTest = true;
        testContent = line;
        braceCount = 1;
        continue;
      }

      if (inTest) {
        testContent += '\n' + line;

        // Count braces to track block end
        for (const char of line) {
          if (char === '{' || char === '(') braceCount++;
          if (char === '}' || char === ')') braceCount--;
        }

        // Test block ended
        if (braceCount <= 0) {
          const assertions = this.extractJsAssertions(testContent, testStartLine);
          const coversFunctions = this.extractCalledFunctions(testContent, imports);

          const testId = this.generateTestId(filePath, currentTestName);
          tests.push({
            id: testId,
            file: filePath,
            name: currentTestName,
            describes: currentDescribe,
            coversFiles: coveredFiles,
            coversFunctions,
            assertions,
            lineStart: testStartLine,
            lineEnd: lineNum
          });

          inTest = false;
          testContent = '';
          currentTestName = '';
        }
      }

      // Check for describe block end
      if (endBlockRegex.test(line) && describeStack.length > 0 && !inTest) {
        describeStack.pop();
        currentDescribe = describeStack.join(' > ');
      }
    }

    return tests;
  }

  private parsePytestFile(content: string, filePath: string): TestInfo[] {
    const tests: TestInfo[] = [];
    const lines = content.split('\n');

    // Extract imports
    const imports = this.extractPythonImports(content);
    const coveredFiles = this.getCoveredFilesFromImports(imports);

    // Regex for test functions and classes
    const testFuncRegex = /^def\s+(test_\w+)\s*\(/;
    const testClassRegex = /^class\s+(Test\w+)/;

    let currentClass = '';
    let testStartLine = -1;
    let currentTestName = '';
    let inTest = false;
    let testContent = '';
    let indentLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const lineNum = i + 1;
      const currentIndent = (line.match(/^(\s*)/)?.[1]?.length) ?? 0;

      // Check for test class
      const classMatch = line.match(testClassRegex);
      if (classMatch && classMatch[1]) {
        currentClass = classMatch[1];
        continue;
      }

      // Check for test function
      const funcMatch = line.match(testFuncRegex);
      if (funcMatch && funcMatch[1] && !inTest) {
        currentTestName = funcMatch[1];
        testStartLine = lineNum;
        inTest = true;
        testContent = line;
        indentLevel = currentIndent;
        continue;
      }

      if (inTest) {
        // Check if we've exited the function (less indentation or new function/class)
        const isNewBlock = testFuncRegex.test(line) || testClassRegex.test(line) || /^def\s+/.test(line) || /^class\s+/.test(line);
        const isEndOfFunc = (currentIndent <= indentLevel && line.trim() !== '') || isNewBlock;

        if (isEndOfFunc) {
          const assertions = this.extractPythonAssertions(testContent, testStartLine);
          const coversFunctions = this.extractPythonCalledFunctions(testContent, imports);

          const fullName = currentClass ? `${currentClass}::${currentTestName}` : currentTestName;
          const testId = this.generateTestId(filePath, fullName);

          tests.push({
            id: testId,
            file: filePath,
            name: fullName,
            describes: currentClass,
            coversFiles: coveredFiles,
            coversFunctions,
            assertions,
            lineStart: testStartLine,
            lineEnd: lineNum - 1
          });

          inTest = false;
          testContent = '';
          currentTestName = '';

          // If this line starts a new test, process it
          if (funcMatch && funcMatch[1]) {
            i--; // Re-process this line
          }
        } else {
          testContent += '\n' + line;
        }
      }
    }

    // Handle last test if file ends
    if (inTest) {
      const assertions = this.extractPythonAssertions(testContent, testStartLine);
      const coversFunctions = this.extractPythonCalledFunctions(testContent, imports);

      const fullName = currentClass ? `${currentClass}::${currentTestName}` : currentTestName;
      const testId = this.generateTestId(filePath, fullName);

      tests.push({
        id: testId,
        file: filePath,
        name: fullName,
        describes: currentClass,
        coversFiles: coveredFiles,
        coversFunctions,
        assertions,
        lineStart: testStartLine,
        lineEnd: lines.length
      });
    }

    return tests;
  }

  private parseGoTestFile(content: string, filePath: string): TestInfo[] {
    const tests: TestInfo[] = [];
    const lines = content.split('\n');

    // Extract imports
    const imports = this.extractGoImports(content);
    const coveredFiles = this.getCoveredFilesFromImports(imports);

    // Regex for Go test functions
    const testFuncRegex = /^func\s+(Test\w+)\s*\(\s*t\s+\*testing\.T\s*\)/;

    let testStartLine = -1;
    let currentTestName = '';
    let inTest = false;
    let testContent = '';
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const lineNum = i + 1;

      // Check for test function
      const funcMatch = line.match(testFuncRegex);
      if (funcMatch && funcMatch[1] && !inTest) {
        currentTestName = funcMatch[1];
        testStartLine = lineNum;
        inTest = true;
        testContent = line;
        braceCount = 0;
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }
        continue;
      }

      if (inTest) {
        testContent += '\n' + line;
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }

        if (braceCount <= 0) {
          const assertions = this.extractGoAssertions(testContent, testStartLine);
          const coversFunctions = this.extractGoCalledFunctions(testContent);

          const testId = this.generateTestId(filePath, currentTestName);
          tests.push({
            id: testId,
            file: filePath,
            name: currentTestName,
            describes: '',
            coversFiles: coveredFiles,
            coversFunctions,
            assertions,
            lineStart: testStartLine,
            lineEnd: lineNum
          });

          inTest = false;
          testContent = '';
          currentTestName = '';
        }
      }
    }

    return tests;
  }

  private extractJsImports(content: string): ParsedImport[] {
    const imports: ParsedImport[] = [];

    // ES6 imports
    const importRegex = /import\s+(?:(?:\{([^}]*)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const namedImportsStr = match[1];
      const namedImports = namedImportsStr
        ? namedImportsStr.split(',').map(s => {
            const trimmed = s.trim();
            const parts = trimmed.split(/\s+as\s+/);
            return parts[0] ?? trimmed;
          }).filter(Boolean)
        : [];
      const namespaceImport = match[2];
      const defaultImport = match[3];
      const source = match[4];

      if (!source) continue;

      const symbols = [...namedImports];
      if (namespaceImport) symbols.push(`* as ${namespaceImport}`);
      if (defaultImport) symbols.push(defaultImport);

      imports.push({
        source,
        symbols,
        isRelative: source.startsWith('.') || source.startsWith('/')
      });
    }

    // CommonJS require
    const requireRegex = /(?:const|let|var)\s+(?:\{([^}]*)\}|(\w+))\s*=\s*require\s*\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const destructuredStr = match[1];
      const destructured = destructuredStr
        ? destructuredStr.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const variable = match[2];
      const source = match[3];

      if (!source) continue;

      const symbols = destructured.length > 0 ? destructured : variable ? [variable] : [];

      imports.push({
        source,
        symbols,
        isRelative: source.startsWith('.') || source.startsWith('/')
      });
    }

    return imports;
  }

  private extractPythonImports(content: string): ParsedImport[] {
    const imports: ParsedImport[] = [];

    // from ... import ...
    const fromImportRegex = /from\s+([\w.]+)\s+import\s+([^#\n]+)/g;
    let match;

    while ((match = fromImportRegex.exec(content)) !== null) {
      const source = match[1];
      const importedItemsStr = match[2];
      if (!source || !importedItemsStr) continue;

      const importedItems = importedItemsStr.split(',').map(s => {
        const trimmed = s.trim();
        const parts = trimmed.split(/\s+as\s+/);
        return parts[0] ?? trimmed;
      }).filter(Boolean);

      imports.push({
        source,
        symbols: importedItems,
        isRelative: source.startsWith('.')
      });
    }

    // import ...
    const importRegex = /^import\s+([\w.]+)(?:\s+as\s+(\w+))?/gm;
    while ((match = importRegex.exec(content)) !== null) {
      const source = match[1];
      if (!source) continue;

      const sourceParts = source.split('.');
      const alias = match[2] ?? sourceParts[sourceParts.length - 1] ?? source;

      imports.push({
        source,
        symbols: [alias],
        isRelative: false
      });
    }

    return imports;
  }

  private extractGoImports(content: string): ParsedImport[] {
    const imports: ParsedImport[] = [];

    // Single import
    const singleImportRegex = /import\s+"([^"]+)"/g;
    let match;

    while ((match = singleImportRegex.exec(content)) !== null) {
      const source = match[1];
      if (!source) continue;

      const sourceParts = source.split('/');
      const pkg = sourceParts[sourceParts.length - 1] ?? source;

      imports.push({
        source,
        symbols: [pkg],
        isRelative: !source.includes('/')
      });
    }

    // Import block
    const importBlockRegex = /import\s*\(\s*([\s\S]*?)\s*\)/g;
    while ((match = importBlockRegex.exec(content)) !== null) {
      const block = match[1];
      if (!block) continue;

      const lineRegex = /(?:(\w+)\s+)?"([^"]+)"/g;
      let lineMatch;

      while ((lineMatch = lineRegex.exec(block)) !== null) {
        const alias = lineMatch[1];
        const source = lineMatch[2];
        if (!source) continue;

        const sourceParts = source.split('/');
        const pkg = alias ?? sourceParts[sourceParts.length - 1] ?? source;

        imports.push({
          source,
          symbols: [pkg],
          isRelative: !source.includes('/')
        });
      }
    }

    return imports;
  }

  private getCoveredFilesFromImports(imports: ParsedImport[]): string[] {
    return imports
      .filter(imp => imp.isRelative)
      .map(imp => {
        // Normalize the import path
        let path = imp.source;
        // Remove leading ./
        if (path.startsWith('./')) path = path.slice(2);
        // Add common extensions if missing
        if (!path.match(/\.[jt]sx?$|\.py$|\.go$/)) {
          return path; // Return without extension, will be matched later
        }
        return path;
      });
  }

  private extractJsAssertions(content: string, startLine: number): Assertion[] {
    const assertions: Assertion[] = [];
    const lines = content.split('\n');

    // Common assertion patterns
    const patterns = [
      // expect().toBe(), etc.
      { regex: /expect\s*\(\s*([^)]+)\s*\)\s*\.(\w+)\s*\(\s*([^)]*)\s*\)/, type: 'equality' as const },
      // expect().toEqual()
      { regex: /expect\s*\(\s*([^)]+)\s*\)\s*\.toEqual\s*\(\s*([^)]*)\s*\)/, type: 'equality' as const },
      // expect().toBeTruthy()/toBeFalsy()
      { regex: /expect\s*\(\s*([^)]+)\s*\)\s*\.(toBeTruthy|toBeFalsy|toBeDefined|toBeUndefined|toBeNull)\s*\(\s*\)/, type: 'truthiness' as const },
      // expect().toThrow()
      { regex: /expect\s*\(\s*([^)]+)\s*\)\s*\.toThrow\s*\(([^)]*)\)/, type: 'error' as const },
      // expect().toMatchSnapshot()
      { regex: /expect\s*\(\s*([^)]+)\s*\)\s*\.toMatchSnapshot\s*\(\s*\)/, type: 'snapshot' as const },
      // jest.mock() / vi.mock()
      { regex: /(jest|vi)\s*\.mock\s*\(\s*['"]([^'"]+)['"]/, type: 'mock' as const },
      // assert.*
      { regex: /assert\s*\.\s*(\w+)\s*\(\s*([^,)]+)/, type: 'equality' as const },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const lineNum = startLine + i;

      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          assertions.push({
            type: pattern.type,
            subject: match[1]?.trim() ?? '',
            expected: match[2]?.trim() ?? match[3]?.trim(),
            code: line.trim(),
            line: lineNum
          });
        }
      }
    }

    return assertions;
  }

  private extractPythonAssertions(content: string, startLine: number): Assertion[] {
    const assertions: Assertion[] = [];
    const lines = content.split('\n');

    const patterns = [
      // assert x == y
      { regex: /assert\s+([^=<>!]+)\s*==\s*(.+)/, type: 'equality' as const },
      // assert x is y
      { regex: /assert\s+([^=<>!]+)\s+is\s+(.+)/, type: 'equality' as const },
      // assert x
      { regex: /assert\s+([^,]+)(?:,|$)/, type: 'truthiness' as const },
      // self.assertEqual
      { regex: /self\.(assertEqual|assertEquals)\s*\(\s*([^,]+),\s*([^)]+)\)/, type: 'equality' as const },
      // self.assertTrue/assertFalse
      { regex: /self\.(assertTrue|assertFalse)\s*\(\s*([^)]+)\)/, type: 'truthiness' as const },
      // self.assertRaises
      { regex: /self\.assertRaises\s*\(\s*(\w+)/, type: 'error' as const },
      // pytest.raises
      { regex: /pytest\.raises\s*\(\s*(\w+)/, type: 'error' as const },
      // mock.patch
      { regex: /@?mock\.patch\s*\(\s*['"]([^'"]+)['"]/, type: 'mock' as const },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const lineNum = startLine + i;

      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          assertions.push({
            type: pattern.type,
            subject: match[2]?.trim() ?? match[1]?.trim() ?? '',
            expected: match[3]?.trim(),
            code: line.trim(),
            line: lineNum
          });
        }
      }
    }

    return assertions;
  }

  private extractGoAssertions(content: string, startLine: number): Assertion[] {
    const assertions: Assertion[] = [];
    const lines = content.split('\n');

    const patterns = [
      // t.Error/t.Errorf
      { regex: /t\.(Error|Errorf)\s*\(/, type: 'error' as const },
      // t.Fatal/t.Fatalf
      { regex: /t\.(Fatal|Fatalf)\s*\(/, type: 'error' as const },
      // if ... != ... { t.Error }
      { regex: /if\s+([^{]+)\s*!=\s*([^{]+)\s*\{/, type: 'equality' as const },
      // if ... == ... { t.Error }
      { regex: /if\s+([^{]+)\s*==\s*([^{]+)\s*\{/, type: 'equality' as const },
      // assert.Equal (testify)
      { regex: /assert\.(\w+)\s*\(\s*t\s*,\s*([^,]+),\s*([^)]+)\)/, type: 'equality' as const },
      // require.Equal (testify)
      { regex: /require\.(\w+)\s*\(\s*t\s*,\s*([^,]+),\s*([^)]+)\)/, type: 'equality' as const },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const lineNum = startLine + i;

      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          assertions.push({
            type: pattern.type,
            subject: match[2]?.trim() ?? match[1]?.trim() ?? '',
            expected: match[3]?.trim(),
            code: line.trim(),
            line: lineNum
          });
        }
      }
    }

    return assertions;
  }

  private extractCalledFunctions(content: string, imports: ParsedImport[]): string[] {
    const functions: Set<string> = new Set();

    // Get all imported symbols
    const importedSymbols = new Set<string>();
    for (const imp of imports) {
      for (const sym of imp.symbols) {
        if (!sym.startsWith('* as')) {
          importedSymbols.add(sym);
        }
      }
    }

    // Find function calls that match imported symbols
    const callRegex = /(\w+)\s*\(/g;
    let match;

    while ((match = callRegex.exec(content)) !== null) {
      const funcName = match[1];
      if (funcName && importedSymbols.has(funcName)) {
        functions.add(funcName);
      }
    }

    // Find method calls on imported objects
    const methodCallRegex = /(\w+)\s*\.\s*(\w+)\s*\(/g;
    while ((match = methodCallRegex.exec(content)) !== null) {
      const objName = match[1];
      const methodName = match[2];
      if (objName && methodName && importedSymbols.has(objName)) {
        functions.add(`${objName}.${methodName}`);
      }
    }

    return Array.from(functions);
  }

  private extractPythonCalledFunctions(content: string, imports: ParsedImport[]): string[] {
    const functions: Set<string> = new Set();

    // Get all imported symbols
    const importedSymbols = new Set<string>();
    for (const imp of imports) {
      for (const sym of imp.symbols) {
        importedSymbols.add(sym);
      }
    }

    // Find function calls
    const callRegex = /(\w+)\s*\(/g;
    let match;

    while ((match = callRegex.exec(content)) !== null) {
      const funcName = match[1];
      if (funcName && importedSymbols.has(funcName)) {
        functions.add(funcName);
      }
    }

    // Find method calls
    const methodCallRegex = /(\w+)\s*\.\s*(\w+)\s*\(/g;
    while ((match = methodCallRegex.exec(content)) !== null) {
      const objName = match[1];
      const methodName = match[2];
      if (objName && methodName && importedSymbols.has(objName)) {
        functions.add(`${objName}.${methodName}`);
      }
    }

    return Array.from(functions);
  }

  private extractGoCalledFunctions(content: string): string[] {
    const functions: Set<string> = new Set();

    // Find package.Function() calls
    const callRegex = /(\w+)\s*\.\s*(\w+)\s*\(/g;
    let match;

    while ((match = callRegex.exec(content)) !== null) {
      const pkg = match[1];
      const func = match[2];
      // Skip testing.T methods and common test helpers
      if (pkg && func && pkg !== 't' && pkg !== 'testing') {
        functions.add(`${pkg}.${func}`);
      }
    }

    return Array.from(functions);
  }

  private generateTestId(filePath: string, testName: string): string {
    const hash = createHash('md5')
      .update(`${filePath}:${testName}`)
      .digest('hex')
      .slice(0, 12);
    return hash;
  }
}
