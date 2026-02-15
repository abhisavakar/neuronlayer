import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import type Database from 'better-sqlite3';
import type { TestInfo, TestFramework, Assertion } from '../../types/documentation.js';
import { TestParser } from './test-parser.js';
import { glob } from 'glob';

const TEST_PATTERNS: Record<TestFramework, string[]> = {
  jest: ['**/*.test.{js,ts,jsx,tsx}', '**/*.spec.{js,ts,jsx,tsx}', '**/__tests__/**/*.{js,ts,jsx,tsx}'],
  mocha: ['**/*.test.{js,ts}', '**/*.spec.{js,ts}', 'test/**/*.{js,ts}'],
  vitest: ['**/*.test.{js,ts,jsx,tsx}', '**/*.spec.{js,ts,jsx,tsx}'],
  pytest: ['**/test_*.py', '**/*_test.py', '**/tests/**/*.py'],
  unittest: ['**/test_*.py', '**/*_test.py', '**/tests/**/*.py'],
  go: ['**/*_test.go'],
  unknown: ['**/*.test.*', '**/*.spec.*', '**/test_*.*', '**/*_test.*']
};

const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/coverage/**',
  '**/__pycache__/**',
  '**/venv/**',
  '**/.venv/**'
];

export class TestIndexer {
  private projectPath: string;
  private db: Database.Database;
  private parser: TestParser;
  private framework: TestFramework = 'unknown';
  private testCache: Map<string, TestInfo[]> = new Map();

  constructor(projectPath: string, db: Database.Database) {
    this.projectPath = projectPath;
    this.db = db;
    this.parser = new TestParser();
  }

  detectFramework(): TestFramework {
    // Check package.json for test framework
    const packageJsonPath = join(this.projectPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (allDeps['vitest']) return 'vitest';
        if (allDeps['jest']) return 'jest';
        if (allDeps['mocha']) return 'mocha';
      } catch {
        // Ignore parse errors
      }
    }

    // Check for pytest
    const pytestConfigs = ['pytest.ini', 'pyproject.toml', 'setup.cfg', 'conftest.py'];
    for (const config of pytestConfigs) {
      if (existsSync(join(this.projectPath, config))) {
        const content = readFileSync(join(this.projectPath, config), 'utf-8');
        if (content.includes('[pytest]') || content.includes('pytest') || config === 'conftest.py') {
          return 'pytest';
        }
      }
    }

    // Check for Go tests
    const goMod = join(this.projectPath, 'go.mod');
    if (existsSync(goMod)) {
      return 'go';
    }

    // Check vitest config
    const vitestConfigs = ['vitest.config.ts', 'vitest.config.js', 'vite.config.ts', 'vite.config.js'];
    for (const config of vitestConfigs) {
      if (existsSync(join(this.projectPath, config))) {
        const content = readFileSync(join(this.projectPath, config), 'utf-8');
        if (content.includes('vitest') || content.includes('test:')) {
          return 'vitest';
        }
      }
    }

    // Check jest config
    const jestConfigs = ['jest.config.ts', 'jest.config.js', 'jest.config.json'];
    for (const config of jestConfigs) {
      if (existsSync(join(this.projectPath, config))) {
        return 'jest';
      }
    }

    // Default based on file patterns
    const hasJsTests = this.hasFilesMatching(['**/*.test.ts', '**/*.spec.ts']);
    const hasPyTests = this.hasFilesMatching(['**/test_*.py', '**/*_test.py']);
    const hasGoTests = this.hasFilesMatching(['**/*_test.go']);

    if (hasGoTests) return 'go';
    if (hasPyTests) return 'pytest';
    if (hasJsTests) return 'jest';

    return 'unknown';
  }

  private hasFilesMatching(patterns: string[]): boolean {
    for (const pattern of patterns) {
      try {
        const files = glob.sync(pattern, {
          cwd: this.projectPath,
          ignore: IGNORE_PATTERNS,
          nodir: true
        });
        if (files.length > 0) return true;
      } catch {
        // Ignore glob errors
      }
    }
    return false;
  }

  async discoverTests(): Promise<TestInfo[]> {
    this.framework = this.detectFramework();
    const patterns = TEST_PATTERNS[this.framework];
    const allTests: TestInfo[] = [];

    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, {
          cwd: this.projectPath,
          ignore: IGNORE_PATTERNS,
          nodir: true,
          absolute: false
        });

        for (const file of files) {
          const absolutePath = join(this.projectPath, file);
          const tests = this.parseTestFile(absolutePath, file);
          allTests.push(...tests);
        }
      } catch (error) {
        console.error(`Error discovering tests with pattern ${pattern}:`, error);
      }
    }

    return allTests;
  }

  private parseTestFile(absolutePath: string, relativePath: string): TestInfo[] {
    // Check cache first
    const cached = this.testCache.get(relativePath);
    if (cached) return cached;

    try {
      const content = readFileSync(absolutePath, 'utf-8');
      const tests = this.parser.parseFile(content, relativePath, this.framework);

      // Update cache
      this.testCache.set(relativePath, tests);

      return tests;
    } catch (error) {
      console.error(`Error parsing test file ${relativePath}:`, error);
      return [];
    }
  }

  async indexTests(): Promise<{ testsIndexed: number; framework: TestFramework }> {
    const tests = await this.discoverTests();

    // Store framework config
    const upsertConfig = this.db.prepare(`
      INSERT OR REPLACE INTO test_config (id, framework, test_patterns, last_indexed)
      VALUES (1, ?, ?, ?)
    `);
    upsertConfig.run(
      this.framework,
      JSON.stringify(TEST_PATTERNS[this.framework]),
      Date.now()
    );

    // Clear existing tests for re-indexing
    this.db.prepare('DELETE FROM test_index').run();

    // Insert new tests
    const insertTest = this.db.prepare(`
      INSERT OR REPLACE INTO test_index (
        id, file_path, test_name, describes, covers_files, covers_functions,
        assertions, line_start, line_end, last_status, last_run, indexed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((tests: TestInfo[]) => {
      for (const test of tests) {
        insertTest.run(
          test.id,
          test.file,
          test.name,
          test.describes,
          JSON.stringify(test.coversFiles),
          JSON.stringify(test.coversFunctions),
          JSON.stringify(test.assertions),
          test.lineStart,
          test.lineEnd,
          test.lastStatus || null,
          test.lastRun?.getTime() || null,
          Date.now()
        );
      }
    });

    insertMany(tests);

    return { testsIndexed: tests.length, framework: this.framework };
  }

  getTestsForFile(filePath: string): TestInfo[] {
    // Normalize the file path
    const normalizedPath = filePath.replace(/\\/g, '/');

    const rows = this.db.prepare(`
      SELECT * FROM test_index
      WHERE covers_files LIKE ?
    `).all(`%${normalizedPath}%`) as DbTestRow[];

    return rows.map(row => this.rowToTestInfo(row));
  }

  getTestsForFunction(functionName: string): TestInfo[] {
    const rows = this.db.prepare(`
      SELECT * FROM test_index
      WHERE covers_functions LIKE ?
    `).all(`%${functionName}%`) as DbTestRow[];

    return rows.map(row => this.rowToTestInfo(row));
  }

  getTestById(testId: string): TestInfo | null {
    const row = this.db.prepare(`
      SELECT * FROM test_index WHERE id = ?
    `).get(testId) as DbTestRow | undefined;

    return row ? this.rowToTestInfo(row) : null;
  }

  getAllTests(): TestInfo[] {
    const rows = this.db.prepare(`
      SELECT * FROM test_index ORDER BY file_path, line_start
    `).all() as DbTestRow[];

    return rows.map(row => this.rowToTestInfo(row));
  }

  getTestsByFile(filePath: string): TestInfo[] {
    const rows = this.db.prepare(`
      SELECT * FROM test_index WHERE file_path = ?
    `).all(filePath) as DbTestRow[];

    return rows.map(row => this.rowToTestInfo(row));
  }

  getFramework(): TestFramework {
    const row = this.db.prepare(`
      SELECT framework FROM test_config WHERE id = 1
    `).get() as { framework: string } | undefined;

    return (row?.framework as TestFramework) || this.detectFramework();
  }

  getTestCount(): number {
    const row = this.db.prepare(`SELECT COUNT(*) as count FROM test_index`).get() as { count: number };
    return row.count;
  }

  updateTestStatus(testId: string, status: 'pass' | 'fail' | 'skip'): void {
    this.db.prepare(`
      UPDATE test_index SET last_status = ?, last_run = ? WHERE id = ?
    `).run(status, Date.now(), testId);
  }

  refreshIndex(): { testsIndexed: number; framework: TestFramework } {
    this.testCache.clear();
    return this.indexTestsSync();
  }

  private indexTestsSync(): { testsIndexed: number; framework: TestFramework } {
    this.framework = this.detectFramework();
    const patterns = TEST_PATTERNS[this.framework];
    const allTests: TestInfo[] = [];

    for (const pattern of patterns) {
      try {
        const files = glob.sync(pattern, {
          cwd: this.projectPath,
          ignore: IGNORE_PATTERNS,
          nodir: true,
          absolute: false
        });

        for (const file of files) {
          const absolutePath = join(this.projectPath, file);
          const tests = this.parseTestFile(absolutePath, file);
          allTests.push(...tests);
        }
      } catch (error) {
        console.error(`Error discovering tests with pattern ${pattern}:`, error);
      }
    }

    // Store framework config
    const upsertConfig = this.db.prepare(`
      INSERT OR REPLACE INTO test_config (id, framework, test_patterns, last_indexed)
      VALUES (1, ?, ?, ?)
    `);
    upsertConfig.run(
      this.framework,
      JSON.stringify(TEST_PATTERNS[this.framework]),
      Date.now()
    );

    // Clear existing tests for re-indexing
    this.db.prepare('DELETE FROM test_index').run();

    // Insert new tests
    const insertTest = this.db.prepare(`
      INSERT OR REPLACE INTO test_index (
        id, file_path, test_name, describes, covers_files, covers_functions,
        assertions, line_start, line_end, last_status, last_run, indexed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((tests: TestInfo[]) => {
      for (const test of tests) {
        insertTest.run(
          test.id,
          test.file,
          test.name,
          test.describes,
          JSON.stringify(test.coversFiles),
          JSON.stringify(test.coversFunctions),
          JSON.stringify(test.assertions),
          test.lineStart,
          test.lineEnd,
          test.lastStatus || null,
          test.lastRun?.getTime() || null,
          Date.now()
        );
      }
    });

    insertMany(allTests);

    return { testsIndexed: allTests.length, framework: this.framework };
  }

  private rowToTestInfo(row: DbTestRow): TestInfo {
    return {
      id: row.id,
      file: row.file_path,
      name: row.test_name,
      describes: row.describes || '',
      coversFiles: JSON.parse(row.covers_files || '[]'),
      coversFunctions: JSON.parse(row.covers_functions || '[]'),
      assertions: JSON.parse(row.assertions || '[]') as Assertion[],
      lineStart: row.line_start,
      lineEnd: row.line_end,
      lastStatus: row.last_status as 'pass' | 'fail' | 'skip' | undefined,
      lastRun: row.last_run ? new Date(row.last_run) : undefined
    };
  }
}

interface DbTestRow {
  id: string;
  file_path: string;
  test_name: string;
  describes: string | null;
  covers_files: string | null;
  covers_functions: string | null;
  assertions: string | null;
  line_start: number;
  line_end: number;
  last_status: string | null;
  last_run: number | null;
  indexed_at: number;
}
