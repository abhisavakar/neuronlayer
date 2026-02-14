# Phase 1: VS Code Extension Implementation

## MVP Technical Plan and Development Roadmap

**Version**: 1.0  
**Status**: Draft  
**Timeline**: 6 Weeks  
**Target**: Open Source Release

---

## Overview

Phase 1 delivers a functional VS Code extension that implements the core MemoryLayer experience. This MVP validates the sparse hierarchical memory concept with real users while establishing the technical foundation for future phases.

**Scope**: VS Code Extension Only  
**Focus**: Solo developers, local-first  
**Goal**: 1,000 installs in first month  
**Motto**: "Stop explaining, start building"

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    VS Code Extension                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Activation  │  │   Commands   │  │    Views     │          │
│  │  Events      │  │   (15)       │  │   (Tree)     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
│                   ┌────────▼────────┐                          │
│                   │  Core Engine    │                          │
│                   └────────┬────────┘                          │
│                            │                                    │
│         ┌──────────────────┼──────────────────┐                │
│         ▼                  ▼                  ▼                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Tier 1     │  │   Tier 2     │  │   Tier 3     │          │
│  │  (Working)   │  │  (Relevant)  │  │  (Archive)   │          │
│  │  ~1K tokens  │  │  ~5K tokens  │  │ Embeddings   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Local Storage                                │
│  ~/.memorylayer/projects/{project-id}/                          │
│    ├── tier1/working.json                                       │
│    ├── tier2/context.db (sqlite-vss)                           │
│    └── tier3/archive.json                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Core Technologies**:
- **Runtime**: Node.js 18+ / TypeScript 5.0
- **Extension API**: VS Code Extension API v1.85+
- **Database**: SQLite with sqlite-vss (vector extension)
- **Embeddings**: transformers.js (local, free)
- **Parsing**: Tree-sitter (multi-language)
- **Testing**: Vitest + VS Code Test Framework

**Dependencies**:
```json
{
  "dependencies": {
    "sqlite3": "^5.1.6",
    "sqlite-vss": "^0.1.2",
    "@xenova/transformers": "^2.17.2",
    "tree-sitter": "^0.21.0",
    "tree-sitter-javascript": "^0.21.0",
    "tree-sitter-typescript": "^0.21.0",
    "tree-sitter-python": "^0.21.0",
    "chokidar": "^3.6.0",
    "glob": "^10.3.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "esbuild": "^0.20.0",
    "vitest": "^1.2.0"
  }
}
```

---

## Week-by-Week Implementation Plan

### Week 1: Foundation and Infrastructure

**Goals**: Set up project, implement storage layer, file watching

**Day 1-2: Project Setup**
```typescript
// File structure
memorylayer/
├── package.json
├── tsconfig.json
├── esbuild.config.js
├── src/
│   ├── extension.ts          // Entry point
│   ├── core/
│   │   ├── types.ts          // Type definitions
│   │   ├── config.ts         // Configuration
│   │   └── utils.ts          // Utilities
│   ├── storage/
│   │   ├── tier1.ts          // Working context
│   │   ├── tier2.ts          // Vector search
│   │   └── tier3.ts          // Archive
│   └── providers/
│       └── fileWatcher.ts    // File system monitoring
├── test/
└── docs/
```

**Day 3-4: Storage Layer Implementation**
```typescript
// src/storage/tier1.ts
export class Tier1Storage {
  private context: WorkingContext;
  private projectId: string;
  private storagePath: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.storagePath = path.join(
      os.homedir(),
      '.memorylayer',
      'projects',
      projectId,
      'tier1',
      'working.json'
    );
  }

  async load(): Promise<WorkingContext> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return this.initialize();
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
    const tempPath = this.storagePath + '.tmp';
    await fs.writeFile(tempPath, JSON.stringify(this.context, null, 2));
    await fs.rename(tempPath, this.storagePath);
  }

  async updateActiveFile(file: FileContext): Promise<void> {
    this.context.activeFile = file;
    this.context.sessionSummary.filesModified.push(file.path);
    await this.save();
  }

  private initialize(): WorkingContext {
    return {
      activeFile: null,
      recentDecisions: [],
      sessionSummary: {
        startTime: new Date(),
        filesModified: [],
        keyActions: [],
      },
      recentContext: [],
    };
  }
}
```

**Day 5-7: File Watcher and Indexing**
```typescript
// src/providers/fileWatcher.ts
export class FileWatcherProvider {
  private watcher: chokidar.FSWatcher;
  private tier2Storage: Tier2Storage;

  constructor(private workspaceRoot: string) {
    this.tier2Storage = new Tier2Storage(projectId);
  }

  async start(): Promise<void> {
    this.watcher = chokidar.watch(
      path.join(this.workspaceRoot, '**/*.{ts,js,tsx,jsx,py}'),
      {
        ignored: [
          '**/node_modules/**',
          '**/dist/**',
          '**/.git/**',
          '**/*.test.{ts,js}',
        ],
        persistent: true,
        ignoreInitial: false,
      }
    );

    this.watcher
      .on('add', (filePath) => this.onFileAdded(filePath))
      .on('change', (filePath) => this.onFileChanged(filePath))
      .on('unlink', (filePath) => this.onFileRemoved(filePath));
  }

  private async onFileAdded(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    await this.tier2Storage.indexFile(filePath, content);
  }

  private async onFileChanged(filePath: string): Promise<void> {
    // Debounce rapid changes
    clearTimeout(this.changeTimeouts.get(filePath));
    this.changeTimeouts.set(
      filePath,
      setTimeout(async () => {
        const content = await fs.readFile(filePath, 'utf-8');
        await this.tier2Storage.indexFile(filePath, content);
      }, 1000)
    );
  }

  private changeTimeouts = new Map<string, NodeJS.Timeout>();
}
```

**Deliverables**:
- [ ] Project scaffolded and building
- [ ] Tier 1 storage working
- [ ] File watcher indexing files
- [ ] Basic test suite passing

---

### Week 2: Vector Search and Tier 2

**Goals**: Implement semantic search, embeddings, context retrieval

**Day 1-3: Embedding Pipeline**
```typescript
// src/embeddings/embedder.ts
export class LocalEmbedder {
  private pipeline: any;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.pipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      {
        quantized: true, // Use quantized model for speed
      }
    );

    this.initialized = true;
  }

  async embed(text: string): Promise<number[]> {
    await this.initialize();

    const output = await this.pipeline(text, {
      pooling: 'mean',
      normalize: true,
    });

    return Array.from(output.data);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    await this.initialize();
    return Promise.all(texts.map((text) => this.embed(text)));
  }
}
```

**Day 4-5: Vector Database Setup**
```typescript
// src/storage/tier2.ts
export class Tier2Storage {
  private db: Database;
  private embedder: LocalEmbedder;

  async initialize(): Promise<void> {
    const dbPath = path.join(
      os.homedir(),
      '.memorylayer',
      'projects',
      this.projectId,
      'tier2',
      'context.db'
    );

    await fs.mkdir(path.dirname(dbPath), { recursive: true });

    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Load vector extensions
    await this.db.loadExtension('vector0');
    await this.db.loadExtension('vss0');

    // Create tables
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_embeddings (
        id INTEGER PRIMARY KEY,
        file_path TEXT UNIQUE NOT NULL,
        content_hash TEXT NOT NULL,
        content_preview TEXT,
        embedding BLOB NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS vss_files USING vss0(
        embedding(384)
      );
    `);

    this.embedder = new LocalEmbedder();
    await this.embedder.initialize();
  }

  async indexFile(filePath: string, content: string): Promise<void> {
    const relativePath = path.relative(this.workspaceRoot, filePath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    // Check if already indexed with same hash
    const existing = await this.db.get(
      'SELECT content_hash FROM file_embeddings WHERE file_path = ?',
      relativePath
    );

    if (existing && existing.content_hash === hash) {
      return; // Already up to date
    }

    // Generate embedding
    const preview = content.slice(0, 1000); // First 1000 chars
    const embedding = await this.embedder.embed(preview);

    // Insert or update
    await this.db.run(
      `INSERT OR REPLACE INTO file_embeddings 
       (file_path, content_hash, content_preview, embedding)
       VALUES (?, ?, ?, ?)`,
      [
        relativePath,
        hash,
        preview,
        Buffer.from(new Float32Array(embedding).buffer),
      ]
    );
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    const queryEmbedding = await this.embedder.embed(query);

    const results = await this.db.all(
      `SELECT 
        f.file_path,
        f.content_preview,
        v.distance
      FROM vss_files v
      JOIN file_embeddings f ON v.rowid = f.id
      WHERE vss_search(v.embedding, vss_search_params(?))
      ORDER BY v.distance
      LIMIT ?`,
      [JSON.stringify(queryEmbedding), limit]
    );

    return results.map((r) => ({
      file: r.file_path,
      preview: r.content_preview,
      relevance: 1 - r.distance,
    }));
  }
}
```

**Day 6-7: Context Assembly**
```typescript
// src/core/contextAssembler.ts
export class ContextAssembler {
  constructor(
    private tier1: Tier1Storage,
    private tier2: Tier2Storage,
    private tokenCounter: TokenCounter
  ) {}

  async assemble(
    userQuery: string,
    currentFile: string
  ): Promise<ContextPackage> {
    const budget = new TokenBudget(6000);

    // Tier 1: Always include
    const workingContext = await this.tier1.load();
    const workingTokens = this.tokenCounter.count(JSON.stringify(workingContext));
    budget.allocate(workingTokens, 'tier1');

    // Tier 2: Search and rank
    const searchResults = await this.tier2.search(userQuery, 20);
    const ranked = this.rankByRelevance(searchResults, currentFile);

    // Select within budget
    const tier2Context: string[] = [];
    for (const result of ranked) {
      const tokens = this.tokenCounter.count(result.preview);
      if (budget.canAllocate(tokens)) {
        budget.allocate(tokens, 'tier2');
        tier2Context.push(`${result.file}:\n${result.preview}`);
      } else {
        break;
      }
    }

    return {
      system: this.buildSystemPrompt(),
      working: workingContext,
      relevant: tier2Context,
      metadata: {
        totalTokens: budget.used(),
        timestamp: new Date(),
      },
    };
  }

  private rankByRelevance(
    results: SearchResult[],
    currentFile: string
  ): SearchResult[] {
    return results
      .map((r) => ({
        ...r,
        score: this.calculateScore(r, currentFile),
      }))
      .sort((a, b) => b.score - a.score);
  }

  private calculateScore(result: SearchResult, currentFile: string): number {
    let score = result.relevance;

    // Boost same directory
    if (path.dirname(result.file) === path.dirname(currentFile)) {
      score *= 1.5;
    }

    // Boost imports
    if (this.isImportedBy(result.file, currentFile)) {
      score *= 2.0;
    }

    return score;
  }
}
```

**Deliverables**:
- [ ] Local embeddings working
- [ ] Vector database with sqlite-vss
- [ ] Semantic search functional
- [ ] Context assembly pipeline

---

### Week 3: VS Code UI Integration

**Goals**: Sidebar, commands, status bar, webview panels

**Day 1-2: Sidebar Tree View**
```typescript
// src/views/memoryTreeProvider.ts
export class MemoryTreeProvider
  implements vscode.TreeDataProvider<MemoryItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    MemoryItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: MemoryItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MemoryItem): Promise<MemoryItem[]> {
    if (!element) {
      // Root level
      return [
        new MemoryItem(
          'Decisions',
          vscode.TreeItemCollapsibleState.Collapsed,
          'decisions',
          '$(law)'
        ),
        new MemoryItem(
          'Context',
          vscode.TreeItemCollapsibleState.Collapsed,
          'context',
          '$(file-code)'
        ),
        new MemoryItem(
          'Memory',
          vscode.TreeItemCollapsibleState.Collapsed,
          'memory',
          '$(history)'
        ),
      ];
    }

    switch (element.type) {
      case 'decisions':
        return this.getDecisions();
      case 'context':
        return this.getContextFiles();
      case 'memory':
        return this.getMemorySessions();
      default:
        return [];
    }
  }

  private async getDecisions(): Promise<MemoryItem[]> {
    const tier1 = new Tier1Storage(this.getProjectId());
    const working = await tier1.load();

    return working.recentDecisions.map(
      (decision) =>
        new MemoryItem(
          decision.title,
          vscode.TreeItemCollapsibleState.None,
          'decision',
          '$(bookmark)',
          {
            command: 'memorylayer.viewDecision',
            title: 'View Decision',
            arguments: [decision.id],
          }
        )
    );
  }

  // ... similar for context and memory
}

// Register in extension.ts
export function activate(context: vscode.ExtensionContext) {
  const treeProvider = new MemoryTreeProvider(context);

  vscode.window.registerTreeDataProvider('memorylayer', treeProvider);

  // Refresh tree when files change
  vscode.workspace.onDidSaveTextDocument(() => {
    treeProvider.refresh();
  });
}
```

**Day 3-4: Commands Implementation**
```typescript
// src/commands/index.ts
export function registerCommands(context: vscode.ExtensionContext) {
  // Initialize project
  context.subscriptions.push(
    vscode.commands.registerCommand('memorylayer.initialize', async () => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open');
        return;
      }

      const projectId = crypto
        .createHash('md5')
        .update(workspaceRoot)
        .digest('hex');

      // Create storage directories
      const basePath = path.join(
        os.homedir(),
        '.memorylayer',
        'projects',
        projectId
      );
      await fs.mkdir(basePath, { recursive: true });
      await fs.mkdir(path.join(basePath, 'tier1'), { recursive: true });
      await fs.mkdir(path.join(basePath, 'tier2'), { recursive: true });
      await fs.mkdir(path.join(basePath, 'tier3'), { recursive: true });

      // Initialize databases
      const tier2 = new Tier2Storage(projectId);
      await tier2.initialize();

      // Start file watcher
      const watcher = new FileWatcherProvider(workspaceRoot);
      await watcher.start();

      vscode.window.showInformationMessage(
        'MemoryLayer: Project initialized successfully'
      );
    })
  );

  // Add decision
  context.subscriptions.push(
    vscode.commands.registerCommand('memorylayer.addDecision', async () => {
      const title = await vscode.window.showInputBox({
        prompt: 'Decision title',
        placeHolder: 'e.g., Use PostgreSQL over MongoDB',
      });

      if (!title) return;

      const description = await vscode.window.showInputBox({
        prompt: 'Why this decision?',
        placeHolder: 'Context and reasoning...',
      });

      const tier1 = new Tier1Storage(getProjectId());
      await tier1.addDecision({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        title,
        description,
        files: [],
        tags: [],
      });

      vscode.window.showInformationMessage(`Decision recorded: ${title}`);
    })
  );

  // Export context for LLM
  context.subscriptions.push(
    vscode.commands.registerCommand('memorylayer.exportContext', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const assembler = new ContextAssembler(
        new Tier1Storage(getProjectId()),
        new Tier2Storage(getProjectId()),
        new TokenCounter()
      );

      const contextPackage = await assembler.assemble(
        'Current file context',
        editor.document.fileName
      );

      const markdown = formatContextForLLM(contextPackage);

      // Copy to clipboard
      await vscode.env.clipboard.writeText(markdown);

      vscode.window.showInformationMessage(
        'Context copied to clipboard! Paste into your AI chat.'
      );
    })
  );

  // ... 12 more commands
}
```

**Day 5-7: Status Bar and Webview**
```typescript
// src/providers/statusBar.ts
export class StatusBarProvider {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'memorylayer.openDashboard';
    this.update('idle');
    this.statusBarItem.show();
  }

  update(state: 'idle' | 'indexing' | 'error', message?: string): void {
    switch (state) {
      case 'idle':
        this.statusBarItem.text = '$(brain) ML';
        this.statusBarItem.tooltip = 'MemoryLayer: Ready';
        break;
      case 'indexing':
        this.statusBarItem.text = '$(sync~spin) ML';
        this.statusBarItem.tooltip = message || 'MemoryLayer: Indexing...';
        break;
      case 'error':
        this.statusBarItem.text = '$(error) ML';
        this.statusBarItem.tooltip = message || 'MemoryLayer: Error';
        break;
    }
  }
}
```

**Deliverables**:
- [ ] Sidebar tree view with 3 sections
- [ ] 15 commands registered
- [ ] Status bar integration
- [ ] Basic webview panels

---

### Week 4: Smart Features

**Goals**: Git integration, basic compression, import detection

**Day 1-2: Git Integration**
```typescript
// src/providers/gitIntegration.ts
export class GitIntegrationProvider {
  async getRecentCommits(limit: number = 10): Promise<Commit[]> {
    const git = vscode.extensions.getExtension('vscode.git')?.exports;
    if (!git) return [];

    const repo = git.repositories[0];
    if (!repo) return [];

    const commits = await repo.log({ maxEntries: limit });
    return commits.map((c) => ({
      hash: c.hash.slice(0, 7),
      message: c.message,
      author: c.authorName,
      date: c.authorDate,
      files: c.files?.map((f) => f.uri.fsPath) || [],
    }));
  }

  async extractDecisionsFromCommits(): Promise<Decision[]> {
    const commits = await this.getRecentCommits(20);
    const decisions: Decision[] = [];

    for (const commit of commits) {
      // Simple heuristic: Look for keywords
      const decisionKeywords = ['decide', 'choose', 'migrate', 'refactor'];
      const isDecision = decisionKeywords.some((kw) =>
        commit.message.toLowerCase().includes(kw)
      );

      if (isDecision) {
        decisions.push({
          id: commit.hash,
          timestamp: commit.date,
          title: commit.message.split('\n')[0],
          description: commit.message,
          files: commit.files,
          tags: ['git-commit'],
        });
      }
    }

    return decisions;
  }
}
```

**Day 3-4: Import/Dependency Detection**
```typescript
// src/analysis/dependencyGraph.ts
export class DependencyGraphAnalyzer {
  async buildGraph(workspaceRoot: string): Promise<DependencyGraph> {
    const graph: DependencyGraph = new Map();

    const files = await glob('**/*.{ts,js,tsx,jsx}', {
      cwd: workspaceRoot,
      ignore: ['node_modules/**', 'dist/**'],
    });

    for (const file of files) {
      const content = await fs.readFile(
        path.join(workspaceRoot, file),
        'utf-8'
      );
      const imports = this.extractImports(content, file);

      graph.set(file, {
        imports,
        exported: this.extractExports(content),
      });
    }

    return graph;
  }

  private extractImports(content: string, filePath: string): string[] {
    const imports: string[] = [];

    // TypeScript/JavaScript imports
    const importRegex =
      /import\s+(?:(?:\{[^}]*\}|[^'"]*)\s+from\s+)?['"]([^'"]+)['"];?/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];

      // Resolve relative imports
      if (importPath.startsWith('.')) {
        const resolved = path.resolve(path.dirname(filePath), importPath);
        imports.push(resolved);
      }
    }

    return imports;
  }

  getRelatedFiles(filePath: string, graph: DependencyGraph): string[] {
    const related: string[] = [];

    // Files this file imports
    const node = graph.get(filePath);
    if (node) {
      related.push(...node.imports);
    }

    // Files that import this file
    for (const [file, data] of graph) {
      if (data.imports.includes(filePath)) {
        related.push(file);
      }
    }

    return [...new Set(related)]; // Remove duplicates
  }
}
```

**Day 5-7: Smart Compression**
```typescript
// src/compression/codeCompressor.ts
export class CodeCompressor {
  compress(content: string, maxTokens: number): string {
    const lines = content.split('\n');
    const estimatedTokens = lines.length * 3; // Rough estimate

    if (estimatedTokens <= maxTokens) {
      return content;
    }

    // Strategy 1: Remove comments and blank lines
    const withoutComments = this.removeComments(content);
    const withoutBlank = withoutComments
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n');

    if (this.estimateTokens(withoutBlank) <= maxTokens) {
      return withoutBlank;
    }

    // Strategy 2: Extract signatures only
    const signatures = this.extractSignatures(content);
    if (this.estimateTokens(signatures) <= maxTokens) {
      return signatures;
    }

    // Strategy 3: Truncate with ellipsis
    return this.truncateToTokens(content, maxTokens);
  }

  private extractSignatures(code: string): string {
    // Simple regex-based extraction (Phase 1)
    const functionMatches = code.match(
      /(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)(?:\s*:\s*[^{]+)?/g
    );
    const classMatches = code.match(/(?:export\s+)?class\s+\w+(?:\s+extends\s+\w+)?/g);

    const signatures: string[] = [];
    if (functionMatches) signatures.push(...functionMatches);
    if (classMatches) signatures.push(...classMatches);

    return signatures.join('\n');
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 0.75 words
    const words = text.split(/\s+/).length;
    return Math.ceil(words / 0.75);
  }
}
```

**Deliverables**:
- [ ] Git commit analysis
- [ ] Dependency graph building
- [ ] Basic code compression
- [ ] Smart context ranking

---

### Week 5: Testing and Polish

**Goals**: Comprehensive tests, error handling, performance optimization

**Day 1-3: Testing**
```typescript
// test/storage/tier1.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Tier1Storage } from '../../src/storage/tier1';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

describe('Tier1Storage', () => {
  let tempDir: string;
  let storage: Tier1Storage;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'memorylayer-test-'));
    storage = new Tier1Storage('test-project');
    // Mock storage path to use temp dir
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should initialize with empty context', async () => {
    const context = await storage.load();
    expect(context.activeFile).toBeNull();
    expect(context.recentDecisions).toEqual([]);
  });

  it('should save and load active file', async () => {
    const file = {
      path: '/test/file.ts',
      content: 'console.log("hello")',
      cursorPosition: { line: 1, column: 0 },
      language: 'typescript',
      lastModified: new Date(),
    };

    await storage.updateActiveFile(file);
    const loaded = await storage.load();

    expect(loaded.activeFile).toEqual(file);
  });

  it('should maintain max 20 recent decisions', async () => {
    for (let i = 0; i < 25; i++) {
      await storage.addDecision({
        id: `decision-${i}`,
        timestamp: new Date(),
        title: `Decision ${i}`,
        description: 'Test',
        files: [],
        tags: [],
      });
    }

    const context = await storage.load();
    expect(context.recentDecisions.length).toBe(20);
    expect(context.recentDecisions[0].title).toBe('Decision 24'); // Most recent first
  });
});

// Integration test
// test/integration/contextAssembly.test.ts
describe('Context Assembly', () => {
  it('should assemble context within budget', async () => {
    const assembler = new ContextAssembler(
      new Tier1Storage('test'),
      new Tier2Storage('test'),
      new TokenCounter()
    );

    const context = await assembler.assemble(
      'authentication logic',
      '/src/auth/login.ts'
    );

    expect(context.metadata.totalTokens).toBeLessThanOrEqual(6000);
  });
});
```

**Day 4-5: Error Handling**
```typescript
// src/core/errorHandler.ts
export class MemoryLayerError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'MemoryLayerError';
  }
}

export function handleError(error: unknown): void {
  if (error instanceof MemoryLayerError) {
    if (error.recoverable) {
      vscode.window.showWarningMessage(`MemoryLayer: ${error.message}`);
    } else {
      vscode.window.showErrorMessage(`MemoryLayer Error: ${error.message}`);
    }
  } else if (error instanceof Error) {
    vscode.window.showErrorMessage(`Unexpected error: ${error.message}`);
    console.error(error);
  } else {
    vscode.window.showErrorMessage('Unknown error occurred');
  }
}

// Usage in extension
context.subscriptions.push(
  vscode.commands.registerCommand('memorylayer.riskyOperation', async () => {
    try {
      await riskyOperation();
    } catch (error) {
      handleError(error);
    }
  })
);
```

**Day 6-7: Performance Optimization**
```typescript
// src/core/performance.ts
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();

    return fn().finally(() => {
      const duration = performance.now() - start;

      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      this.metrics.get(name)!.push(duration);

      // Log slow operations
      if (duration > 1000) {
        console.warn(`Slow operation: ${name} took ${duration.toFixed(2)}ms`);
      }
    });
  }

  getReport(): string {
    const lines: string[] = ['Performance Report:', '==================='];

    for (const [name, times] of this.metrics) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);

      lines.push(`${name}:`);
      lines.push(`  avg: ${avg.toFixed(2)}ms`);
      lines.push(`  min: ${min.toFixed(2)}ms`);
      lines.push(`  max: ${max.toFixed(2)}ms`);
      lines.push(`  calls: ${times.length}`);
    }

    return lines.join('\n');
  }
}

// Usage
const monitor = new PerformanceMonitor();

const result = await monitor.measure('semantic-search', () =>
  tier2.search(query, 10)
);
```

**Deliverables**:
- [ ] 80%+ test coverage
- [ ] Comprehensive error handling
- [ ] Performance monitoring
- [ ] Memory leak prevention

---

### Week 6: Documentation and Release

**Goals**: README, documentation, packaging, marketplace submission

**Day 1-2: Documentation**
```markdown
<!-- README.md -->
# MemoryLayer

Stop explaining your project to AI. Start building.

## The Problem

Every AI coding session starts from zero. Your AI doesn't remember:
- Why you built things this way
- Your architectural decisions
- Your coding patterns
- Yesterday's work

**Result**: You waste 5-10 minutes per session re-explaining everything.

## The Solution

MemoryLayer gives your AI a **persistent memory** that:
- ✅ Remembers across sessions
- ✅ Understands your entire codebase
- ✅ Learns your patterns
- ✅ Costs $8/month (flat rate)

## Features

### 🧠 Hierarchical Memory
Three-tier system inspired by human memory:
- **Working**: Current file + recent decisions
- **Relevant**: Semantic search results
- **Archive**: Compressed history

### 🔍 Smart Context
Only sends relevant code to AI:
- 6K tokens instead of 200K
- 97% cost reduction
- 10x faster responses

### 📝 Auto-Documentation
- Records decisions automatically
- Tracks file relationships
- Builds project "personality"

## Installation

1. Install from VS Code Marketplace
2. Run `MemoryLayer: Initialize Project` command
3. Start coding with persistent AI memory

## Usage

### Record a Decision
```
Cmd+Shift+P → MemoryLayer: Add Decision
```

### Export Context for AI
```
Cmd+Shift+P → MemoryLayer: Export Context
```
Copies optimized context to clipboard. Paste into Claude/ChatGPT.

### View Project Memory
Open MemoryLayer sidebar to see:
- All decisions
- Documented files
- Session history

## Pricing

- **Free**: Local storage, basic features
- **Pro** ($10/month): Cloud sync, advanced AI
- **Team** ($25/user): Collaboration, admin

## Tech Stack

- Local embeddings (transformers.js)
- Vector search (sqlite-vss)
- Zero cloud dependencies (privacy-first)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT - See [LICENSE](LICENSE)
```

**Day 3-4: Packaging**
```json
// package.json (partial)
{
  "name": "memorylayer",
  "displayName": "MemoryLayer - AI Context Memory",
  "description": "Persistent memory for AI coding assistants",
  "version": "1.0.0",
  "publisher": "memorylayer",
  "license": "MIT",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Machine Learning",
    "Other"
  ],
  "keywords": [
    "ai",
    "context",
    "memory",
    "llm",
    "claude",
    "chatgpt",
    "assistant"
  ],
  "activationEvents": [
    "onCommand:memorylayer.initialize",
    "workspaceContains:**/*.{ts,js,tsx,jsx,py}"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "memorylayer.initialize",
        "title": "Initialize Project",
        "category": "MemoryLayer"
      },
      {
        "command": "memorylayer.addDecision",
        "title": "Add Decision",
        "category": "MemoryLayer"
      },
      {
        "command": "memorylayer.exportContext",
        "title": "Export Context for AI",
        "category": "MemoryLayer"
      }
    ],
    "views": {
      "explorer": [
        {
          "id": "memorylayer",
          "name": "MemoryLayer",
          "when": "memorylayer.enabled"
        }
      ]
    },
    "configuration": {
      "title": "MemoryLayer",
      "properties": {
        "memorylayer.tokenBudget": {
          "type": "number",
          "default": 6000,
          "description": "Maximum tokens to send to LLM"
        },
        "memorylayer.enableAutoDecisions": {
          "type": "boolean",
          "default": true,
          "description": "Automatically extract decisions from git commits"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile && npm run lint",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js",
    "package": "vsce package"
  }
}
```

**Day 5-6: Marketplace Preparation**

**Assets needed**:
- Icon (128x128 PNG)
- Screenshots (5-10)
- Demo GIF
- README
- CHANGELOG

**vsce commands**:
```bash
# Package extension
npx vsce package

# Publish (after testing)
npx vsce publish
```

**Day 7: Launch Checklist**

**Pre-launch**:
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Screenshots taken
- [ ] Demo video recorded
- [ ] Icon designed
- [ ] README polished

**Launch**:
- [ ] Publish to marketplace
- [ ] Post on Hacker News
- [ ] Post on Reddit (r/vscode, r/programming)
- [ ] Tweet announcement
- [ ] Email beta testers

**Post-launch**:
- [ ] Monitor error reports
- [ ] Respond to reviews
- [ ] Track install metrics
- [ ] Gather user feedback

---

## Success Metrics

### Week 6 Targets
- [ ] 1,000 marketplace installs
- [ ] 4.5+ star rating
- [ ] <5% error rate
- [ ] 80%+ test coverage

### Month 1 Targets
- [ ] 10,000 installs
- [ ] 100 active users (use daily)
- [ ] 50 GitHub stars
- [ ] 10 feature requests

---

## Risk Mitigation

### Technical Risks

**Risk**: Local embeddings too slow  
**Mitigation**: Use quantized models, add progress indicators, cache aggressively

**Risk**: sqlite-vss installation fails  
**Mitigation**: Provide fallback to regular SQLite, auto-download binaries

**Risk**: Large projects (10M LOC) cause memory issues  
**Mitigation**: Implement pagination, lazy loading, configurable limits

### Market Risks

**Risk**: Users don't see value  
**Mitigation**: Demo video, free tier, prominent onboarding

**Risk**: VS Code restricts extensions  
**Mitigation**: Build CLI version as backup, stay within API limits

---

## Post-Phase 1 Roadmap

### Phase 2: CLI Tool (Weeks 7-10)
- Universal protocol for any editor
- Work with Cursor, Neovim, Emacs
- Headless mode for CI/CD

### Phase 3: Intelligence (Weeks 11-14)
- ML-based retrieval ranking
- AI-powered compression
- Predictive pre-fetching

### Phase 4: Platform (Weeks 15-18)
- Cloud sync option
- Team collaboration
- Project brain marketplace

---

## Conclusion

Phase 1 delivers a solid VS Code extension that proves the sparse hierarchical memory concept. With 6 weeks of focused development, we'll have:

- ✅ Working three-tier memory system
- ✅ Local semantic search
- ✅ Intuitive VS Code integration
- ✅ 100x cost advantage over alternatives
- ✅ Foundation for universal protocol

This MVP validates the core hypothesis: **developers want persistent AI memory that doesn't break the bank.**

---

*Implementation Plan v1.0 - MemoryLayer Team*

**Estimated Effort**:
- Development: 4 weeks
- Testing/Polish: 1 week
- Documentation/Release: 1 week
- **Total: 6 weeks**

**Team Size**: 1-2 developers

**Success Criteria**: 1,000 installs in first month
