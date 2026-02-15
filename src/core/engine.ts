import { join, basename } from 'path';
import { existsSync, mkdirSync, readFileSync, statSync } from 'fs';
import { initializeDatabase, closeDatabase } from '../storage/database.js';
import { Tier1Storage } from '../storage/tier1.js';
import { Tier2Storage } from '../storage/tier2.js';
import { Tier3Storage } from '../storage/tier3.js';
import { Indexer } from '../indexing/indexer.js';
import { ContextAssembler } from './context.js';
import { DecisionTracker } from './decisions.js';
import { DecisionExtractor } from './decision-extractor.js';
import { LearningEngine } from './learning.js';
import { FileSummarizer } from './summarizer.js';
import { ProjectManager, type ProjectInfo } from './project-manager.js';
import { ADRExporter, type ADRExportOptions } from './adr-exporter.js';
import { FeatureContextManager } from './feature-context.js';
import { LivingDocumentationEngine } from './living-docs/index.js';
import { ContextRotPrevention } from './context-rot/index.js';
import { ConfidenceScorer } from './confidence/index.js';
import { ChangeIntelligence } from './change-intelligence/index.js';
import { detectLanguage, getPreview, countLines } from '../utils/files.js';
import type { MemoryLayerConfig, AssembledContext, Decision, ProjectSummary, SearchResult, CodeSymbol, SymbolKind, ActiveFeatureContext, HotContext } from '../types/index.js';
import type { ArchitectureDoc, ComponentDoc, DailyChangelog, ChangelogOptions, ValidationResult, ActivityResult, UndocumentedItem, ContextHealth, CompactionResult, CompactionOptions, CriticalContext, DriftResult, ConfidenceResult, ConfidenceLevel, ConfidenceSources, ConflictResult, ChangeQueryResult, ChangeQueryOptions, Diagnosis, PastBug, FixSuggestion, Change } from '../types/documentation.js';
import type Database from 'better-sqlite3';

export class MemoryLayerEngine {
  private config: MemoryLayerConfig;
  private db: Database.Database;
  private tier1: Tier1Storage;
  private tier2: Tier2Storage;
  private tier3: Tier3Storage;
  private indexer: Indexer;
  private contextAssembler: ContextAssembler;
  private decisionTracker: DecisionTracker;
  private learningEngine: LearningEngine;
  private summarizer: FileSummarizer;
  private projectManager: ProjectManager;
  private adrExporter: ADRExporter;
  private featureContextManager: FeatureContextManager;
  private livingDocs: LivingDocumentationEngine;
  private contextRotPrevention: ContextRotPrevention;
  private confidenceScorer: ConfidenceScorer;
  private changeIntelligence: ChangeIntelligence;
  private initialized = false;

  constructor(config: MemoryLayerConfig) {
    this.config = config;

    // Ensure data directory exists
    if (!existsSync(config.dataDir)) {
      mkdirSync(config.dataDir, { recursive: true });
    }

    // Initialize database
    const dbPath = join(config.dataDir, 'memorylayer.db');
    this.db = initializeDatabase(dbPath);

    // Initialize storage tiers
    this.tier1 = new Tier1Storage(config.dataDir);
    this.tier2 = new Tier2Storage(this.db);
    this.tier3 = new Tier3Storage(this.db);

    // Initialize indexer
    this.indexer = new Indexer(config, this.tier2);

    // Initialize context assembler
    this.contextAssembler = new ContextAssembler(
      this.tier1,
      this.tier2,
      this.tier3,
      this.indexer.getEmbeddingGenerator()
    );

    // Initialize decision tracker
    this.decisionTracker = new DecisionTracker(
      this.tier1,
      this.tier2,
      this.indexer.getEmbeddingGenerator()
    );

    // Phase 3: Initialize learning engine and summarizer
    this.learningEngine = new LearningEngine(this.db);
    this.summarizer = new FileSummarizer(this.db);

    // Phase 4: Initialize project manager and ADR exporter
    this.projectManager = new ProjectManager();
    this.adrExporter = new ADRExporter(config.projectPath);

    // Phase 5: Initialize feature context manager
    this.featureContextManager = new FeatureContextManager(config.projectPath, config.dataDir);

    // Wire up feature context manager to context assembler
    this.contextAssembler.setFeatureContextManager(this.featureContextManager);

    // Phase 6: Initialize living documentation engine
    this.livingDocs = new LivingDocumentationEngine(
      config.projectPath,
      config.dataDir,
      this.db,
      this.tier2
    );

    // Phase 7: Initialize context rot prevention
    this.contextRotPrevention = new ContextRotPrevention(this.db, config.maxTokens);

    // Phase 8: Initialize confidence scorer
    this.confidenceScorer = new ConfidenceScorer(
      this.tier2,
      this.indexer.getEmbeddingGenerator()
    );

    // Phase 9: Initialize change intelligence
    this.changeIntelligence = new ChangeIntelligence(
      config.projectPath,
      this.db,
      this.tier2,
      this.indexer.getEmbeddingGenerator()
    );

    // Register this project
    const projectInfo = this.projectManager.registerProject(config.projectPath);
    this.projectManager.setActiveProject(projectInfo.id);

    this.setupIndexerEvents();
  }

  private setupIndexerEvents(): void {
    this.indexer.on('indexingStarted', () => {
      console.error('Indexing started...');
    });

    this.indexer.on('progress', (progress) => {
      if (progress.indexed % 10 === 0 || progress.indexed === progress.total) {
        console.error(`Indexing progress: ${progress.indexed}/${progress.total}`);
      }
    });

    this.indexer.on('indexingComplete', (stats) => {
      console.error(`Indexing complete: ${stats.indexed} files indexed`);
      this.updateProjectSummary();
      this.updateProjectStats();
      // Extract decisions from git and comments
      this.extractDecisions().catch(err => console.error('Decision extraction error:', err));
    });

    this.indexer.on('fileIndexed', (path) => {
      // Track file in feature context
      this.featureContextManager.onFileOpened(path);
    });

    this.indexer.on('error', (error) => {
      console.error('Indexer error:', error);
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.error(`Initializing MemoryLayer for: ${this.config.projectPath}`);

    // Perform initial indexing
    await this.indexer.performInitialIndex();

    // Start watching for changes
    this.indexer.startWatching();

    // Sync change intelligence from git
    const synced = this.changeIntelligence.initialize();
    if (synced > 0) {
      console.error(`Synced ${synced} changes from git history`);
    }

    this.initialized = true;
    console.error('MemoryLayer initialized');
  }

  async getContext(query: string, currentFile?: string, maxTokens?: number): Promise<AssembledContext> {
    // Track the query
    this.learningEngine.trackEvent({ eventType: 'query', query });

    // Get expanded queries for better retrieval
    const expandedQueries = this.learningEngine.expandQuery(query);

    const result = await this.contextAssembler.assemble(query, {
      currentFile,
      maxTokens: maxTokens || this.config.maxTokens
    });

    // Track which files were included in context
    for (const source of result.sources) {
      this.learningEngine.trackEvent({ eventType: 'context_used', filePath: source, query });
    }

    // Track query pattern for future predictions
    this.learningEngine.trackQuery(query, result.sources);

    // Track in feature context
    this.featureContextManager.onQuery(query, result.sources);

    return result;
  }

  async searchCodebase(query: string, limit: number = 10): Promise<SearchResult[]> {
    const embedding = await this.indexer.getEmbeddingGenerator().embed(query);
    let results = this.tier2.search(embedding, limit * 2); // Get more for re-ranking

    // Apply personalized ranking
    results = this.learningEngine.applyPersonalizedRanking(results);

    return results.slice(0, limit);
  }

  async recordDecision(
    title: string,
    description: string,
    files?: string[],
    tags?: string[]
  ): Promise<Decision> {
    return this.decisionTracker.recordDecision(title, description, files || [], tags || []);
  }

  getRecentDecisions(limit: number = 10): Decision[] {
    return this.decisionTracker.getRecentDecisions(limit);
  }

  async getFileContext(filePath: string): Promise<{ content: string; language: string; lines: number } | null> {
    const absolutePath = join(this.config.projectPath, filePath);

    if (!existsSync(absolutePath)) {
      return null;
    }

    try {
      // Check hot cache first
      let content = this.learningEngine.getFromHotCache(filePath);

      if (!content) {
        content = readFileSync(absolutePath, 'utf-8');
        // Add to hot cache for faster future access
        this.learningEngine.addToHotCache(filePath, content);
      }

      const language = detectLanguage(filePath);
      const lines = countLines(content);

      // Track file view
      this.learningEngine.trackEvent({ eventType: 'file_view', filePath });

      // Track in feature context
      this.featureContextManager.onFileOpened(filePath);

      // Update Tier 1 with this as the active file
      this.tier1.setActiveFile({
        path: filePath,
        content: getPreview(content, 2000),
        language
      });

      return { content, language, lines };
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  getProjectSummary(): ProjectSummary {
    const savedSummary = this.tier2.getProjectSummary();
    const languages = this.tier2.getLanguages();
    const totalFiles = this.tier2.getFileCount();
    const totalLines = this.tier2.getTotalLines();
    const recentDecisions = this.decisionTracker.getRecentDecisions(5);

    // Try to detect dependencies from package.json or similar
    const dependencies = this.detectDependencies();

    return {
      name: savedSummary?.name || basename(this.config.projectPath),
      description: savedSummary?.description || 'No description available',
      languages,
      totalFiles,
      totalLines,
      keyDirectories: savedSummary?.keyDirectories || this.detectKeyDirectories(),
      recentDecisions,
      dependencies,
      architectureNotes: savedSummary?.architectureNotes || ''
    };
  }

  private updateProjectSummary(): void {
    const languages = this.tier2.getLanguages();
    const keyDirs = this.detectKeyDirectories();

    this.tier2.updateProjectSummary(
      basename(this.config.projectPath),
      '',
      languages,
      keyDirs,
      ''
    );
  }

  // Phase 2: Auto-extract decisions from git commits and code comments
  private async extractDecisions(): Promise<void> {
    try {
      const extractor = new DecisionExtractor(this.config.projectPath);
      const extracted = await extractor.extractAll();

      if (extracted.length === 0) {
        return;
      }

      console.error(`Found ${extracted.length} potential decisions from git/comments`);

      // Convert and store decisions (limit to avoid flooding)
      const decisions = extractor.toDecisions(extracted.slice(0, 10));

      for (const decision of decisions) {
        // Check if we already have a similar decision
        const existing = this.tier2.getRecentDecisions(50);
        const isDuplicate = existing.some(d =>
          d.title.toLowerCase() === decision.title.toLowerCase() ||
          d.description.includes(decision.description.slice(0, 50))
        );

        if (!isDuplicate) {
          // Generate embedding and store
          const textToEmbed = `${decision.title}\n${decision.description}`;
          const embedding = await this.indexer.getEmbeddingGenerator().embed(textToEmbed);
          this.tier2.upsertDecision(decision, embedding);
          this.tier1.addDecision(decision);
        }
      }

      console.error('Decision extraction complete');
    } catch (error) {
      console.error('Error extracting decisions:', error);
    }
  }

  private detectKeyDirectories(): string[] {
    const commonDirs = ['src', 'lib', 'app', 'pages', 'components', 'api', 'server', 'client', 'core'];
    const found: string[] = [];

    for (const dir of commonDirs) {
      if (existsSync(join(this.config.projectPath, dir))) {
        found.push(dir);
      }
    }

    return found;
  }

  private detectDependencies(): string[] {
    const deps: string[] = [];

    // Check package.json
    const packageJsonPath = join(this.config.projectPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies
        };
        deps.push(...Object.keys(allDeps).slice(0, 20)); // Limit to 20
      } catch {
        // Ignore parse errors
      }
    }

    // Check requirements.txt
    const requirementsPath = join(this.config.projectPath, 'requirements.txt');
    if (existsSync(requirementsPath)) {
      try {
        const content = readFileSync(requirementsPath, 'utf-8');
        const lines = content.split('\n')
          .map(l => l.trim())
          .filter(l => l && !l.startsWith('#'))
          .map(l => l.split(/[=<>]/)[0]?.trim())
          .filter((l): l is string => !!l);
        deps.push(...lines.slice(0, 20));
      } catch {
        // Ignore
      }
    }

    return deps;
  }

  setCurrentGoal(goal: string): void {
    this.tier1.setCurrentGoal(goal);
  }

  // Phase 2: Symbol search
  async searchSymbols(name: string, kind?: string, limit: number = 10): Promise<CodeSymbol[]> {
    return this.tier2.searchSymbols(name, kind as SymbolKind | undefined, limit);
  }

  // Phase 2: Get file dependencies
  getFileDependencies(filePath: string): {
    imports: Array<{ file: string; symbols: string[] }>;
    importedBy: Array<{ file: string; symbols: string[] }>;
    symbols: Array<{ name: string; kind: string; line: number; exported: boolean }>;
  } {
    const file = this.tier2.getFile(filePath);

    if (!file) {
      return { imports: [], importedBy: [], symbols: [] };
    }

    // Get what this file imports
    const fileImports = this.tier2.getImportsByFile(file.id);
    const imports = fileImports.map(i => ({
      file: i.importedFrom,
      symbols: i.importedSymbols
    }));

    // Get files that import this file
    const dependents = this.tier2.getFileDependents(filePath);
    const importedBy = dependents.map(d => ({
      file: d.file,
      symbols: d.imports
    }));

    // Get symbols defined in this file
    const fileSymbols = this.tier2.getSymbolsByFile(file.id);
    const symbols = fileSymbols.map(s => ({
      name: s.name,
      kind: s.kind,
      line: s.lineStart,
      exported: s.exported
    }));

    return { imports, importedBy, symbols };
  }

  // Phase 2: Get symbol count
  getSymbolCount(): number {
    return this.tier2.getSymbolCount();
  }

  // Phase 3: Get predicted files for pre-fetching
  getPredictedFiles(currentFile: string, query: string): string[] {
    return this.learningEngine.predictNeededFiles(currentFile, query);
  }

  // Phase 3: Pre-fetch predicted files into hot cache
  async preFetchFiles(currentFile: string, query: string): Promise<number> {
    const predicted = this.learningEngine.predictNeededFiles(currentFile, query);
    let fetched = 0;

    for (const filePath of predicted) {
      if (!this.learningEngine.isInHotCache(filePath)) {
        const absolutePath = join(this.config.projectPath, filePath);
        if (existsSync(absolutePath)) {
          try {
            const content = readFileSync(absolutePath, 'utf-8');
            this.learningEngine.addToHotCache(filePath, content);
            fetched++;
          } catch {
            // Skip files that can't be read
          }
        }
      }
    }

    return fetched;
  }

  // Phase 3: Get file summary (compressed representation)
  getFileSummary(filePath: string): string | null {
    const file = this.tier2.getFile(filePath);
    if (!file) return null;

    // Check if we have a cached summary
    const cached = this.summarizer.getSummary(file.id);
    if (cached && !this.summarizer.needsRegeneration(file.id, file.lastModified)) {
      return cached.summary;
    }

    // Generate new summary
    const symbols = this.tier2.getSymbolsByFile(file.id);
    const imports = this.tier2.getImportsByFile(file.id);
    const exports = this.tier2.getExportsByFile(file.id);

    const summary = this.summarizer.generateSummary(
      filePath,
      file.preview,
      symbols,
      imports.map(i => ({ importedFrom: i.importedFrom, importedSymbols: i.importedSymbols })),
      exports.map(e => ({ exportedName: e.exportedName }))
    );

    // Store for future use
    this.summarizer.storeSummary(file.id, summary);

    return summary;
  }

  // Phase 3: Get summaries for multiple files (for compressed context)
  getFileSummaries(filePaths: string[]): Map<string, string> {
    const result = new Map<string, string>();

    for (const filePath of filePaths) {
      const summary = this.getFileSummary(filePath);
      if (summary) {
        result.set(filePath, summary);
      }
    }

    return result;
  }

  // Phase 3: Get learning/usage statistics
  getLearningStats(): {
    usageStats: ReturnType<LearningEngine['getUsageStats']>;
    compressionStats: ReturnType<FileSummarizer['getCompressionStats']>;
    hotCacheStats: ReturnType<LearningEngine['getHotCacheStats']>;
  } {
    return {
      usageStats: this.learningEngine.getUsageStats(),
      compressionStats: this.summarizer.getCompressionStats(),
      hotCacheStats: this.learningEngine.getHotCacheStats()
    };
  }

  // Phase 3: Mark context as useful/not useful for learning
  markContextUsefulness(query: string, wasUseful: boolean): void {
    this.learningEngine.updateQueryUsefulness(query, wasUseful);
  }

  // Phase 3: Get frequently accessed files
  getFrequentFiles(limit: number = 20): string[] {
    return this.learningEngine.getFrequentFiles(limit);
  }

  // Phase 3: Expand query for better search
  expandQuery(query: string): string[] {
    return this.learningEngine.expandQuery(query);
  }

  // ========== Phase 4: Multi-Project & Team Features ==========

  // Get all registered projects
  listProjects(): ProjectInfo[] {
    return this.projectManager.listProjects();
  }

  // Get current active project
  getActiveProject(): ProjectInfo | null {
    return this.projectManager.getActiveProject();
  }

  // Get project by ID
  getProject(projectId: string): ProjectInfo | null {
    return this.projectManager.getProject(projectId);
  }

  // Switch to a different project
  switchProject(projectId: string): boolean {
    return this.projectManager.setActiveProject(projectId);
  }

  // Discover projects in common locations
  discoverProjects(): string[] {
    return this.projectManager.discoverProjects();
  }

  // Cross-project search - search across all registered projects
  async searchAllProjects(query: string, limit: number = 10): Promise<Array<{
    project: string;
    projectId: string;
    results: SearchResult[];
  }>> {
    const allResults: Array<{
      project: string;
      projectId: string;
      results: SearchResult[];
    }> = [];

    const projectDbs = this.projectManager.getProjectDatabases();

    try {
      // Generate embedding for query
      const embedding = await this.indexer.getEmbeddingGenerator().embed(query);

      for (const { project, db } of projectDbs) {
        try {
          // Search each project's database
          const tempTier2 = new Tier2Storage(db);
          const results = tempTier2.search(embedding, limit);

          if (results.length > 0) {
            allResults.push({
              project: project.name,
              projectId: project.id,
              results
            });
          }
        } catch (err) {
          console.error(`Error searching project ${project.name}:`, err);
        }
      }
    } finally {
      // Close all database connections
      this.projectManager.closeAllDatabases(projectDbs);
    }

    // Sort by best match across projects
    allResults.sort((a, b) => {
      const maxA = Math.max(...a.results.map(r => r.similarity));
      const maxB = Math.max(...b.results.map(r => r.similarity));
      return maxB - maxA;
    });

    return allResults;
  }

  // Cross-project decision search
  async searchAllDecisions(query: string, limit: number = 10): Promise<Array<{
    project: string;
    projectId: string;
    decisions: Decision[];
  }>> {
    const allResults: Array<{
      project: string;
      projectId: string;
      decisions: Decision[];
    }> = [];

    const projectDbs = this.projectManager.getProjectDatabases();

    try {
      // Generate embedding for query
      const embedding = await this.indexer.getEmbeddingGenerator().embed(query);

      for (const { project, db } of projectDbs) {
        try {
          const tempTier2 = new Tier2Storage(db);
          const decisions = tempTier2.searchDecisions(embedding, limit);

          if (decisions.length > 0) {
            allResults.push({
              project: project.name,
              projectId: project.id,
              decisions
            });
          }
        } catch (err) {
          console.error(`Error searching decisions in ${project.name}:`, err);
        }
      }
    } finally {
      this.projectManager.closeAllDatabases(projectDbs);
    }

    return allResults;
  }

  // Record decision with author attribution
  async recordDecisionWithAuthor(
    title: string,
    description: string,
    author: string,
    files?: string[],
    tags?: string[],
    status: 'proposed' | 'accepted' | 'deprecated' | 'superseded' = 'accepted'
  ): Promise<Decision> {
    const decision: Decision = {
      id: crypto.randomUUID(),
      title,
      description,
      files: files || [],
      tags: tags || [],
      createdAt: new Date(),
      author,
      status
    };

    // Generate embedding
    const textToEmbed = `${title}\n${description}`;
    const embedding = await this.indexer.getEmbeddingGenerator().embed(textToEmbed);

    // Store in tier2
    this.tier2.upsertDecision(decision, embedding);

    // Add to tier1 for recent decisions
    this.tier1.addDecision(decision);

    return decision;
  }

  // Update decision status
  updateDecisionStatus(
    decisionId: string,
    status: 'proposed' | 'accepted' | 'deprecated' | 'superseded',
    supersededBy?: string
  ): boolean {
    return this.tier2.updateDecisionStatus(decisionId, status, supersededBy);
  }

  // Get all decisions (for export)
  getAllDecisions(): Decision[] {
    return this.tier2.getAllDecisions();
  }

  // Export single decision to ADR file
  exportDecisionToADR(decisionId: string, options?: ADRExportOptions): string | null {
    const decisions = this.getAllDecisions();
    const decision = decisions.find(d => d.id === decisionId);

    if (!decision) {
      return null;
    }

    return this.adrExporter.exportDecision(decision, options);
  }

  // Export all decisions to ADR files
  exportAllDecisionsToADR(options?: ADRExportOptions): string[] {
    const decisions = this.getAllDecisions();
    return this.adrExporter.exportAllDecisions(decisions, options);
  }

  // Update project stats (called after indexing)
  private updateProjectStats(): void {
    const project = this.projectManager.getActiveProject();
    if (project) {
      this.projectManager.updateProjectStats(project.id, {
        totalFiles: this.tier2.getFileCount(),
        totalDecisions: this.getAllDecisions().length,
        languages: this.tier2.getLanguages()
      });
    }
  }

  // ========== Phase 5: Active Feature Context ==========

  // Get the hot context for current feature
  getHotContext(): HotContext {
    return this.featureContextManager.getHotContext();
  }

  // Get current active feature context
  getActiveFeatureContext(): ActiveFeatureContext | null {
    return this.featureContextManager.getCurrentContext();
  }

  // Get summary of current feature context
  getActiveContextSummary(): { name: string; files: number; changes: number; duration: number } | null {
    return this.featureContextManager.getCurrentSummary();
  }

  // Start a new feature context
  startFeatureContext(name?: string): ActiveFeatureContext {
    return this.featureContextManager.startNewContext(name);
  }

  // Set feature context name
  setFeatureContextName(name: string): boolean {
    return this.featureContextManager.setContextName(name);
  }

  // Get recent feature contexts
  getRecentFeatureContexts(): ActiveFeatureContext[] {
    return this.featureContextManager.getRecentContexts();
  }

  // Switch to a previous feature context
  switchFeatureContext(contextId: string): boolean {
    return this.featureContextManager.switchToRecent(contextId);
  }

  // Complete current feature context
  completeFeatureContext(): boolean {
    return this.featureContextManager.completeContext();
  }

  // Track a file being opened (for external triggers)
  trackFileOpened(filePath: string): void {
    this.featureContextManager.onFileOpened(filePath);
  }

  // Track a file being edited
  trackFileEdited(filePath: string, diff: string, linesChanged?: number[]): void {
    this.featureContextManager.onFileEdited(filePath, diff, linesChanged || []);
  }

  // Track a query with files used
  trackQuery(query: string, filesUsed: string[]): void {
    this.featureContextManager.onQuery(query, filesUsed);
  }

  // Get feature context manager for direct access
  getFeatureContextManager(): FeatureContextManager {
    return this.featureContextManager;
  }

  // ========== Phase 6: Living Documentation ==========

  // Get project architecture overview
  async getArchitecture(): Promise<ArchitectureDoc> {
    return this.livingDocs.generateArchitectureDocs();
  }

  // Get detailed documentation for a component/file
  async getComponentDoc(path: string): Promise<ComponentDoc> {
    return this.livingDocs.generateComponentDoc(path);
  }

  // Get changelog of recent changes
  async getChangelog(options?: ChangelogOptions): Promise<DailyChangelog[]> {
    return this.livingDocs.generateChangelog(options || {});
  }

  // Validate documentation status
  async validateDocs(): Promise<ValidationResult> {
    return this.livingDocs.validateDocs();
  }

  // Query recent project activity
  async whatHappened(since: string, scope?: string): Promise<ActivityResult> {
    return this.livingDocs.whatHappened(since, scope);
  }

  // Find undocumented code
  async findUndocumented(options?: {
    importance?: 'low' | 'medium' | 'high' | 'all';
    type?: 'file' | 'function' | 'class' | 'interface' | 'all';
  }): Promise<UndocumentedItem[]> {
    return this.livingDocs.findUndocumented(options);
  }

  // ========== Phase 7: Context Rot Prevention ==========

  // Get context health status
  getContextHealth(): ContextHealth {
    return this.contextRotPrevention.getContextHealth();
  }

  // Set current token count (for external tracking)
  setContextTokens(tokens: number): void {
    this.contextRotPrevention.setCurrentTokens(tokens);
  }

  // Detect drift from initial requirements
  detectDrift(): DriftResult {
    return this.contextRotPrevention.detectDrift();
  }

  // Mark content as critical (never compress)
  markCritical(
    content: string,
    options?: {
      type?: CriticalContext['type'];
      reason?: string;
      source?: string;
    }
  ): CriticalContext {
    return this.contextRotPrevention.markCritical(content, options);
  }

  // Get all critical context
  getCriticalContext(type?: CriticalContext['type']): CriticalContext[] {
    return this.contextRotPrevention.getCriticalContext(type);
  }

  // Remove a critical context item
  removeCriticalContext(id: string): boolean {
    return this.contextRotPrevention.removeCritical(id);
  }

  // Trigger context compaction
  triggerCompaction(options: CompactionOptions): CompactionResult {
    return this.contextRotPrevention.triggerCompaction(options);
  }

  // Auto-compact based on current health
  autoCompact(): CompactionResult {
    return this.contextRotPrevention.autoCompact();
  }

  // Add a message to conversation tracking
  addConversationMessage(role: 'user' | 'assistant' | 'system', content: string): void {
    this.contextRotPrevention.addMessage({ role, content });
  }

  // Clear conversation history
  clearConversation(): void {
    this.contextRotPrevention.clearConversation();
  }

  // Get context summary for AI (includes critical context and drift warnings)
  getContextSummaryForAI(): string {
    return this.contextRotPrevention.getContextSummaryForAI();
  }

  // ========== Phase 8: Confidence Scoring ==========

  // Get confidence score for code
  async getConfidence(code: string, context?: string): Promise<ConfidenceResult> {
    return this.confidenceScorer.getConfidence(code, context);
  }

  // List sources for code suggestion
  async listConfidenceSources(code: string, context?: string, includeSnippets?: boolean): Promise<ConfidenceSources> {
    return this.confidenceScorer.listSources(code, context, includeSnippets);
  }

  // Check for conflicts with past decisions
  async checkCodeConflicts(code: string): Promise<ConflictResult> {
    return this.confidenceScorer.checkConflicts(code);
  }

  // Get confidence level indicator emoji
  getConfidenceIndicator(level: ConfidenceLevel): string {
    return ConfidenceScorer.getIndicator(level);
  }

  // Format confidence result for display
  formatConfidenceResult(result: ConfidenceResult): string {
    return ConfidenceScorer.formatResult(result);
  }

  // ========== Phase 9: Change Intelligence ==========

  // Query what changed
  whatChanged(options: ChangeQueryOptions = {}): ChangeQueryResult {
    return this.changeIntelligence.whatChanged(options);
  }

  // Get changes for a specific file
  whatChangedIn(file: string, limit?: number): Change[] {
    return this.changeIntelligence.whatChangedIn(file, limit);
  }

  // Diagnose why something broke
  whyBroke(error: string, options?: { file?: string; line?: number }): Diagnosis {
    return this.changeIntelligence.whyBroke(error, options);
  }

  // Find similar bugs from history
  findSimilarBugs(error: string, limit?: number): PastBug[] {
    return this.changeIntelligence.findSimilarBugs(error, limit);
  }

  // Suggest fixes for an error
  suggestFix(error: string, context?: string): FixSuggestion[] {
    return this.changeIntelligence.suggestFix(error, context);
  }

  // Get recent changes
  getRecentChanges(hours: number = 24): Change[] {
    return this.changeIntelligence.getRecentChanges(hours);
  }

  // Format changes for display
  formatChanges(result: ChangeQueryResult): string {
    return ChangeIntelligence.formatChanges(result);
  }

  // Format diagnosis for display
  formatDiagnosis(diagnosis: Diagnosis): string {
    return ChangeIntelligence.formatDiagnosis(diagnosis);
  }

  // Format fix suggestions for display
  formatFixSuggestions(suggestions: FixSuggestion[]): string {
    return ChangeIntelligence.formatFixSuggestions(suggestions);
  }

  shutdown(): void {
    console.error('Shutting down MemoryLayer...');
    this.indexer.stopWatching();
    this.tier1.save();
    this.featureContextManager.shutdown();
    closeDatabase(this.db);
  }
}
