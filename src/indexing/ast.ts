import Parser from 'web-tree-sitter';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { CodeSymbol, Import, Export, SymbolKind } from '../types/index.js';

// Language configurations for parsing
interface LanguageConfig {
  wasmFile: string;
  extensions: string[];
  queries: {
    functions?: string;
    classes?: string;
    interfaces?: string;
    types?: string;
    imports?: string;
    exports?: string;
  };
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  typescript: {
    wasmFile: 'tree-sitter-typescript.wasm',
    extensions: ['.ts', '.tsx'],
    queries: {
      functions: `
        (function_declaration name: (identifier) @name) @func
        (arrow_function) @func
        (method_definition name: (property_identifier) @name) @func
      `,
      classes: `
        (class_declaration name: (type_identifier) @name) @class
      `,
      interfaces: `
        (interface_declaration name: (type_identifier) @name) @interface
      `,
      types: `
        (type_alias_declaration name: (type_identifier) @name) @type
      `,
      imports: `
        (import_statement) @import
      `,
      exports: `
        (export_statement) @export
      `
    }
  },
  javascript: {
    wasmFile: 'tree-sitter-javascript.wasm',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    queries: {
      functions: `
        (function_declaration name: (identifier) @name) @func
        (arrow_function) @func
        (method_definition name: (property_identifier) @name) @func
      `,
      classes: `
        (class_declaration name: (identifier) @name) @class
      `,
      imports: `
        (import_statement) @import
      `,
      exports: `
        (export_statement) @export
      `
    }
  },
  python: {
    wasmFile: 'tree-sitter-python.wasm',
    extensions: ['.py'],
    queries: {
      functions: `
        (function_definition name: (identifier) @name) @func
      `,
      classes: `
        (class_definition name: (identifier) @name) @class
      `,
      imports: `
        (import_statement) @import
        (import_from_statement) @import
      `
    }
  }
};

export class ASTParser {
  private parser: Parser | null = null;
  private languages: Map<string, Parser.Language> = new Map();
  private initialized = false;
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await Parser.init();
      this.parser = new Parser();
      this.initialized = true;
      console.error('AST Parser initialized');
    } catch (error) {
      console.error('Failed to initialize AST parser:', error);
      throw error;
    }
  }

  private async loadLanguage(langName: string): Promise<Parser.Language | null> {
    if (this.languages.has(langName)) {
      return this.languages.get(langName)!;
    }

    const config = LANGUAGE_CONFIGS[langName];
    if (!config) {
      return null;
    }

    try {
      // Try to load from node_modules or bundled location
      const wasmDir = join(this.dataDir, 'wasm');
      const wasmPath = join(wasmDir, config.wasmFile);

      // For now, we'll use a simplified approach without external WASM files
      // In production, you'd download these from tree-sitter releases
      console.error(`Language ${langName} WASM not available yet`);
      return null;
    } catch (error) {
      console.error(`Failed to load language ${langName}:`, error);
      return null;
    }
  }

  getLanguageForFile(filePath: string): string | null {
    const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();

    for (const [lang, config] of Object.entries(LANGUAGE_CONFIGS)) {
      if (config.extensions.includes(ext)) {
        return lang;
      }
    }
    return null;
  }

  async parseFile(filePath: string, content: string): Promise<{
    symbols: CodeSymbol[];
    imports: Import[];
    exports: Export[];
  } | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Use regex-based parsing as fallback since WASM loading is complex
    return this.parseWithRegex(filePath, content);
  }

  // Regex-based parsing fallback (works without WASM)
  private parseWithRegex(filePath: string, content: string): {
    symbols: CodeSymbol[];
    imports: Import[];
    exports: Export[];
  } {
    const symbols: CodeSymbol[] = [];
    const imports: Import[] = [];
    const exports: Export[] = [];
    const lines = content.split('\n');
    const lang = this.getLanguageForFile(filePath);

    if (lang === 'typescript' || lang === 'javascript') {
      this.parseTypeScriptJS(filePath, content, lines, symbols, imports, exports);
    } else if (lang === 'python') {
      this.parsePython(filePath, content, lines, symbols, imports, exports);
    }

    return { symbols, imports, exports };
  }

  private parseTypeScriptJS(
    filePath: string,
    content: string,
    lines: string[],
    symbols: CodeSymbol[],
    imports: Import[],
    exports: Export[]
  ): void {
    // Patterns for TypeScript/JavaScript
    const patterns = {
      // Functions: function name(), const name = () =>, const name = function()
      function: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
      arrowFunc: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>/,
      // Classes
      class: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/,
      // Interfaces (TS only)
      interface: /^(?:export\s+)?interface\s+(\w+)/,
      // Types (TS only)
      type: /^(?:export\s+)?type\s+(\w+)\s*=/,
      // Imports
      import: /^import\s+(?:(\w+)(?:\s*,\s*)?)?(?:\{([^}]+)\})?\s*from\s*['"]([^'"]+)['"]/,
      importAll: /^import\s+\*\s+as\s+(\w+)\s+from\s*['"]([^'"]+)['"]/,
      importSideEffect: /^import\s*['"]([^'"]+)['"]/,
      // Exports
      exportNamed: /^export\s+\{([^}]+)\}/,
      exportDefault: /^export\s+default\s+(?:class|function|const|let|var)?\s*(\w+)?/,
      exportDirect: /^export\s+(?:const|let|var|function|class|interface|type|enum|async\s+function)\s+(\w+)/,
      // Enums (TS)
      enum: /^(?:export\s+)?(?:const\s+)?enum\s+(\w+)/,
      // Methods inside classes (simplified)
      method: /^\s+(?:async\s+)?(?:static\s+)?(?:private\s+|public\s+|protected\s+)?(\w+)\s*\([^)]*\)\s*[:{]/,
    };

    let currentClass: { name: string; startLine: number } | null = null;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || '';
      const trimmed = line.trim();
      const lineNum = i + 1;

      // Track brace depth for class scope
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;

      if (currentClass && braceDepth === 0) {
        // Class ended
        const existingSymbol = symbols.find(s => s.name === currentClass!.name && s.kind === 'class');
        if (existingSymbol) {
          existingSymbol.lineEnd = lineNum;
        }
        currentClass = null;
      }

      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        continue;
      }

      // Functions
      let match = trimmed.match(patterns.function);
      if (match && match[1]) {
        symbols.push({
          fileId: 0,
          filePath,
          kind: 'function',
          name: match[1],
          lineStart: lineNum,
          lineEnd: this.findBlockEnd(lines, i),
          exported: trimmed.startsWith('export'),
          signature: this.extractSignature(trimmed)
        });
        continue;
      }

      // Arrow functions
      match = trimmed.match(patterns.arrowFunc);
      if (match && match[1]) {
        symbols.push({
          fileId: 0,
          filePath,
          kind: 'function',
          name: match[1],
          lineStart: lineNum,
          lineEnd: this.findBlockEnd(lines, i),
          exported: trimmed.startsWith('export'),
          signature: this.extractSignature(trimmed)
        });
        continue;
      }

      // Classes
      match = trimmed.match(patterns.class);
      if (match && match[1]) {
        currentClass = { name: match[1], startLine: lineNum };
        braceDepth = 1; // Reset for class tracking
        symbols.push({
          fileId: 0,
          filePath,
          kind: 'class',
          name: match[1],
          lineStart: lineNum,
          lineEnd: lineNum, // Will be updated when class ends
          exported: trimmed.startsWith('export')
        });
        continue;
      }

      // Interfaces
      match = trimmed.match(patterns.interface);
      if (match && match[1]) {
        symbols.push({
          fileId: 0,
          filePath,
          kind: 'interface',
          name: match[1],
          lineStart: lineNum,
          lineEnd: this.findBlockEnd(lines, i),
          exported: trimmed.startsWith('export')
        });
        continue;
      }

      // Types
      match = trimmed.match(patterns.type);
      if (match && match[1]) {
        symbols.push({
          fileId: 0,
          filePath,
          kind: 'type',
          name: match[1],
          lineStart: lineNum,
          lineEnd: this.findStatementEnd(lines, i),
          exported: trimmed.startsWith('export')
        });
        continue;
      }

      // Enums
      match = trimmed.match(patterns.enum);
      if (match && match[1]) {
        symbols.push({
          fileId: 0,
          filePath,
          kind: 'enum',
          name: match[1],
          lineStart: lineNum,
          lineEnd: this.findBlockEnd(lines, i),
          exported: trimmed.startsWith('export')
        });
        continue;
      }

      // Methods (when inside a class)
      if (currentClass) {
        match = trimmed.match(patterns.method);
        if (match && match[1] && !['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(match[1])) {
          symbols.push({
            fileId: 0,
            filePath,
            kind: 'method',
            name: `${currentClass.name}.${match[1]}`,
            lineStart: lineNum,
            lineEnd: this.findBlockEnd(lines, i),
            exported: false // Methods inherit class export status
          });
        }
      }

      // Imports
      match = trimmed.match(patterns.import);
      if (match) {
        const defaultImport = match[1];
        const namedImports = match[2]?.split(',').map(s => s.trim().split(/\s+as\s+/)[0]?.trim()).filter((s): s is string => !!s) || [];
        const from = match[3] || '';

        imports.push({
          fileId: 0,
          filePath,
          importedFrom: from,
          importedSymbols: defaultImport ? [defaultImport, ...namedImports] : namedImports,
          isDefault: !!defaultImport,
          isNamespace: false,
          lineNumber: lineNum
        });
        continue;
      }

      match = trimmed.match(patterns.importAll);
      if (match) {
        imports.push({
          fileId: 0,
          filePath,
          importedFrom: match[2] || '',
          importedSymbols: ['*'],
          isDefault: false,
          isNamespace: true,
          lineNumber: lineNum
        });
        continue;
      }

      // Exports
      match = trimmed.match(patterns.exportDirect);
      if (match && match[1]) {
        exports.push({
          fileId: 0,
          filePath,
          exportedName: match[1],
          isDefault: false,
          lineNumber: lineNum
        });
        continue;
      }

      match = trimmed.match(patterns.exportDefault);
      if (match) {
        exports.push({
          fileId: 0,
          filePath,
          exportedName: match[1] || 'default',
          isDefault: true,
          lineNumber: lineNum
        });
        continue;
      }

      match = trimmed.match(patterns.exportNamed);
      if (match && match[1]) {
        const names = match[1].split(',').map(s => {
          const parts = s.trim().split(/\s+as\s+/);
          return parts[parts.length - 1]?.trim();
        }).filter((n): n is string => !!n);

        for (const name of names) {
          exports.push({
            fileId: 0,
            filePath,
            exportedName: name,
            isDefault: false,
            lineNumber: lineNum
          });
        }
      }
    }
  }

  private parsePython(
    filePath: string,
    content: string,
    lines: string[],
    symbols: CodeSymbol[],
    imports: Import[],
    exports: Export[]
  ): void {
    const patterns = {
      function: /^(?:async\s+)?def\s+(\w+)\s*\(/,
      class: /^class\s+(\w+)/,
      import: /^import\s+(\w+(?:\.\w+)*)/,
      fromImport: /^from\s+(\w+(?:\.\w+)*)\s+import\s+(.+)/,
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || '';
      const trimmed = line.trim();
      const lineNum = i + 1;
      const indent = line.length - line.trimStart().length;

      // Skip comments
      if (trimmed.startsWith('#')) continue;

      // Functions
      let match = trimmed.match(patterns.function);
      if (match && match[1]) {
        symbols.push({
          fileId: 0,
          filePath,
          kind: 'function',
          name: match[1],
          lineStart: lineNum,
          lineEnd: this.findPythonBlockEnd(lines, i, indent),
          exported: !match[1].startsWith('_'),
          signature: trimmed.split(':')[0]
        });
        continue;
      }

      // Classes
      match = trimmed.match(patterns.class);
      if (match && match[1]) {
        symbols.push({
          fileId: 0,
          filePath,
          kind: 'class',
          name: match[1],
          lineStart: lineNum,
          lineEnd: this.findPythonBlockEnd(lines, i, indent),
          exported: !match[1].startsWith('_')
        });
        continue;
      }

      // Imports
      match = trimmed.match(patterns.import);
      if (match && match[1]) {
        imports.push({
          fileId: 0,
          filePath,
          importedFrom: match[1],
          importedSymbols: [match[1].split('.').pop() || match[1]],
          isDefault: false,
          isNamespace: true,
          lineNumber: lineNum
        });
        continue;
      }

      match = trimmed.match(patterns.fromImport);
      if (match) {
        const from = match[1] || '';
        const imported = match[2]?.split(',').map(s => s.trim().split(/\s+as\s+/)[0]?.trim()).filter((s): s is string => !!s) || [];
        imports.push({
          fileId: 0,
          filePath,
          importedFrom: from,
          importedSymbols: imported,
          isDefault: false,
          isNamespace: imported.includes('*'),
          lineNumber: lineNum
        });
      }
    }
  }

  private findBlockEnd(lines: string[], startIndex: number): number {
    let braceCount = 0;
    let started = false;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i] || '';
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
          if (started && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }
    return startIndex + 1;
  }

  private findStatementEnd(lines: string[], startIndex: number): number {
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i] || '';
      if (line.includes(';') || (i > startIndex && !line.trim().startsWith('|') && !line.trim().startsWith('&'))) {
        return i + 1;
      }
    }
    return startIndex + 1;
  }

  private findPythonBlockEnd(lines: string[], startIndex: number, baseIndent: number): number {
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i] || '';
      if (line.trim() === '') continue;

      const indent = line.length - line.trimStart().length;
      if (indent <= baseIndent) {
        return i;
      }
    }
    return lines.length;
  }

  private extractSignature(line: string): string {
    // Extract function signature from line
    const match = line.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?)\s*(\([^)]*\))/);
    return match?.[1] || '';
  }
}
