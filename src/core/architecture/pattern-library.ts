import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import type { Pattern, PatternCategory, CodeExample, PatternRule } from '../../types/documentation.js';

export class PatternLibrary {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.ensureTable();
    this.seedDefaultPatterns();
  }

  private ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        examples TEXT,
        anti_patterns TEXT,
        rules TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        usage_count INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns(category);
      CREATE INDEX IF NOT EXISTS idx_patterns_name ON patterns(name);
    `);
  }

  private seedDefaultPatterns(): void {
    // Check if we already have patterns
    const count = this.db.prepare('SELECT COUNT(*) as count FROM patterns').get() as { count: number };
    if (count.count > 0) return;

    // Seed default patterns
    const defaultPatterns: Omit<Pattern, 'id' | 'createdAt' | 'usageCount'>[] = [
      {
        name: 'Error Handling',
        category: 'error_handling',
        description: 'Standard error handling with try-catch, logging, and proper error types',
        examples: [
          {
            code: `try {
  const result = await operation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  throw new Error(\`Operation failed: \${error.message}\`);
}`,
            explanation: 'Uses try-catch, logs error with context, rethrows with message'
          }
        ],
        antiPatterns: [
          {
            code: `try {
  return await operation();
} catch (e) {
  return null;
}`,
            explanation: 'Swallows error silently, returns null instead of handling'
          }
        ],
        rules: [
          { rule: 'Always use try-catch for async operations', severity: 'warning' },
          { rule: 'Log errors with context', severity: 'warning' },
          { rule: 'Never swallow errors silently', severity: 'critical' },
          { rule: 'Rethrow or handle errors explicitly', severity: 'warning' }
        ]
      },
      {
        name: 'API Calls',
        category: 'api_call',
        description: 'Standard API call pattern with error handling and typing',
        examples: [
          {
            code: `const response = await fetch(url, {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
});
if (!response.ok) {
  throw new Error(\`API error: \${response.status}\`);
}
return await response.json();`,
            explanation: 'Includes headers, checks response status, parses JSON'
          }
        ],
        antiPatterns: [
          {
            code: `const data = await fetch(url).then(r => r.json());`,
            explanation: 'No error handling, no status check'
          }
        ],
        rules: [
          { rule: 'Always check response status', severity: 'critical' },
          { rule: 'Include Content-Type header', severity: 'warning' },
          { rule: 'Handle network errors', severity: 'critical' },
          { rule: 'Use typed responses when possible', severity: 'info' }
        ]
      },
      {
        name: 'Component Structure',
        category: 'component',
        description: 'React/Vue component structure with props typing and state management',
        examples: [
          {
            code: `interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function MyComponent({ value, onChange }: Props) {
  return <div>{value}</div>;
}`,
            explanation: 'Props interface, destructured props, typed callback'
          }
        ],
        antiPatterns: [
          {
            code: `export function MyComponent(props) {
  return <div>{props.value}</div>;
}`,
            explanation: 'No prop types, no destructuring'
          }
        ],
        rules: [
          { rule: 'Define Props interface for components', severity: 'warning' },
          { rule: 'Destructure props in function signature', severity: 'info' },
          { rule: 'Export components explicitly', severity: 'info' }
        ]
      },
      {
        name: 'Null Checking',
        category: 'validation',
        description: 'Proper null/undefined checking patterns',
        examples: [
          {
            code: `const value = obj?.property ?? defaultValue;`,
            explanation: 'Uses optional chaining and nullish coalescing'
          },
          {
            code: `if (value != null) {
  // Safe to use value
}`,
            explanation: 'Explicit null check before use'
          }
        ],
        antiPatterns: [
          {
            code: `const value = obj.property || defaultValue;`,
            explanation: 'Using || treats 0, "", false as falsy'
          }
        ],
        rules: [
          { rule: 'Use optional chaining (?.) for nested access', severity: 'warning' },
          { rule: 'Use nullish coalescing (??) instead of ||', severity: 'info' },
          { rule: 'Check for null before accessing properties', severity: 'critical' }
        ]
      },
      {
        name: 'Async/Await',
        category: 'data_fetching',
        description: 'Proper async/await patterns',
        examples: [
          {
            code: `async function fetchData() {
  try {
    const data = await fetch(url);
    return await data.json();
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}`,
            explanation: 'Uses async/await with try-catch'
          }
        ],
        antiPatterns: [
          {
            code: `function fetchData() {
  return fetch(url).then(r => r.json()).catch(console.log);
}`,
            explanation: 'Using .then() instead of async/await, weak error handling'
          }
        ],
        rules: [
          { rule: 'Prefer async/await over .then() chains', severity: 'info' },
          { rule: 'Always await promises', severity: 'warning' },
          { rule: 'Handle promise rejections', severity: 'critical' }
        ]
      }
    ];

    const stmt = this.db.prepare(`
      INSERT INTO patterns (id, name, category, description, examples, anti_patterns, rules)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const pattern of defaultPatterns) {
      stmt.run(
        randomUUID(),
        pattern.name,
        pattern.category,
        pattern.description,
        JSON.stringify(pattern.examples),
        JSON.stringify(pattern.antiPatterns),
        JSON.stringify(pattern.rules)
      );
    }
  }

  // Get all patterns
  getAllPatterns(): Pattern[] {
    const rows = this.db.prepare(`
      SELECT id, name, category, description, examples, anti_patterns, rules, created_at, usage_count
      FROM patterns
      ORDER BY usage_count DESC
    `).all() as Array<{
      id: string;
      name: string;
      category: string;
      description: string;
      examples: string;
      anti_patterns: string;
      rules: string;
      created_at: number;
      usage_count: number;
    }>;

    return rows.map(row => this.rowToPattern(row));
  }

  // Get patterns by category
  getPatternsByCategory(category: PatternCategory): Pattern[] {
    const rows = this.db.prepare(`
      SELECT id, name, category, description, examples, anti_patterns, rules, created_at, usage_count
      FROM patterns
      WHERE category = ?
      ORDER BY usage_count DESC
    `).all(category) as Array<{
      id: string;
      name: string;
      category: string;
      description: string;
      examples: string;
      anti_patterns: string;
      rules: string;
      created_at: number;
      usage_count: number;
    }>;

    return rows.map(row => this.rowToPattern(row));
  }

  // Get pattern by ID
  getPattern(id: string): Pattern | null {
    const row = this.db.prepare(`
      SELECT id, name, category, description, examples, anti_patterns, rules, created_at, usage_count
      FROM patterns
      WHERE id = ?
    `).get(id) as {
      id: string;
      name: string;
      category: string;
      description: string;
      examples: string;
      anti_patterns: string;
      rules: string;
      created_at: number;
      usage_count: number;
    } | undefined;

    return row ? this.rowToPattern(row) : null;
  }

  // Add a new pattern
  addPattern(
    name: string,
    category: PatternCategory,
    description: string,
    examples: CodeExample[] = [],
    antiPatterns: CodeExample[] = [],
    rules: PatternRule[] = []
  ): Pattern {
    const id = randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    this.db.prepare(`
      INSERT INTO patterns (id, name, category, description, examples, anti_patterns, rules, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      category,
      description,
      JSON.stringify(examples),
      JSON.stringify(antiPatterns),
      JSON.stringify(rules)
    );

    return {
      id,
      name,
      category,
      description,
      examples,
      antiPatterns,
      rules,
      createdAt: new Date(timestamp * 1000),
      usageCount: 0
    };
  }

  // Update pattern usage count
  incrementUsage(id: string): void {
    this.db.prepare('UPDATE patterns SET usage_count = usage_count + 1 WHERE id = ?').run(id);
  }

  // Add example to pattern
  addExample(id: string, example: CodeExample, isAntiPattern: boolean = false): boolean {
    const pattern = this.getPattern(id);
    if (!pattern) return false;

    const field = isAntiPattern ? 'anti_patterns' : 'examples';
    const current = isAntiPattern ? pattern.antiPatterns : pattern.examples;
    current.push(example);

    this.db.prepare(`UPDATE patterns SET ${field} = ? WHERE id = ?`).run(
      JSON.stringify(current),
      id
    );

    return true;
  }

  // Add rule to pattern
  addRule(id: string, rule: PatternRule): boolean {
    const pattern = this.getPattern(id);
    if (!pattern) return false;

    pattern.rules.push(rule);
    this.db.prepare('UPDATE patterns SET rules = ? WHERE id = ?').run(
      JSON.stringify(pattern.rules),
      id
    );

    return true;
  }

  // Delete pattern
  deletePattern(id: string): boolean {
    const result = this.db.prepare('DELETE FROM patterns WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Search patterns
  searchPatterns(query: string): Pattern[] {
    const rows = this.db.prepare(`
      SELECT id, name, category, description, examples, anti_patterns, rules, created_at, usage_count
      FROM patterns
      WHERE name LIKE ? OR description LIKE ? OR category LIKE ?
      ORDER BY usage_count DESC
    `).all(`%${query}%`, `%${query}%`, `%${query}%`) as Array<{
      id: string;
      name: string;
      category: string;
      description: string;
      examples: string;
      anti_patterns: string;
      rules: string;
      created_at: number;
      usage_count: number;
    }>;

    return rows.map(row => this.rowToPattern(row));
  }

  private rowToPattern(row: {
    id: string;
    name: string;
    category: string;
    description: string;
    examples: string;
    anti_patterns: string;
    rules: string;
    created_at: number;
    usage_count: number;
  }): Pattern {
    return {
      id: row.id,
      name: row.name,
      category: row.category as PatternCategory,
      description: row.description,
      examples: JSON.parse(row.examples || '[]'),
      antiPatterns: JSON.parse(row.anti_patterns || '[]'),
      rules: JSON.parse(row.rules || '[]'),
      createdAt: new Date(row.created_at * 1000),
      usageCount: row.usage_count
    };
  }
}
