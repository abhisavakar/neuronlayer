import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { basename, dirname, join } from 'path';
import type { Tier2Storage } from '../../storage/tier2.js';
import type {
  ArchitectureDoc,
  ArchitectureLayer,
  DataFlowStep,
  ComponentReference,
  DependencyInfo
} from '../../types/documentation.js';

export class ArchitectureGenerator {
  private projectPath: string;
  private tier2: Tier2Storage;

  // Layer name mappings (NO-AI)
  private static LAYER_MAPPING: Record<string, string> = {
    'server': 'API Layer',
    'api': 'API Layer',
    'routes': 'API Layer',
    'controllers': 'API Layer',
    'core': 'Business Logic',
    'services': 'Business Logic',
    'domain': 'Business Logic',
    'storage': 'Data Layer',
    'db': 'Data Layer',
    'database': 'Data Layer',
    'repositories': 'Data Layer',
    'models': 'Data Layer',
    'utils': 'Utilities',
    'helpers': 'Utilities',
    'lib': 'Utilities',
    'types': 'Type Definitions',
    'interfaces': 'Type Definitions',
    'indexing': 'Indexing Layer',
    'search': 'Indexing Layer',
    'components': 'UI Components',
    'views': 'UI Components',
    'pages': 'UI Components',
    'hooks': 'React Hooks',
    'context': 'State Management',
    'store': 'State Management',
    'config': 'Configuration',
    'cli': 'CLI Interface',
    'commands': 'CLI Interface',
    'test': 'Testing',
    'tests': 'Testing',
    '__tests__': 'Testing',
    'spec': 'Testing'
  };

  // Layer purpose descriptions
  private static LAYER_PURPOSES: Record<string, string> = {
    'API Layer': 'Handles external requests and responses, routing, and protocol handling',
    'Business Logic': 'Core application logic, domain rules, and orchestration',
    'Data Layer': 'Data persistence, database access, and storage management',
    'Utilities': 'Shared utility functions and helper modules',
    'Type Definitions': 'TypeScript interfaces, types, and shared contracts',
    'Indexing Layer': 'Content indexing, search, and retrieval functionality',
    'UI Components': 'User interface components and presentation logic',
    'React Hooks': 'Custom React hooks for state and side effects',
    'State Management': 'Application state management and data flow',
    'Configuration': 'Application configuration and environment setup',
    'CLI Interface': 'Command-line interface and commands',
    'Testing': 'Test files and testing utilities'
  };

  constructor(projectPath: string, tier2: Tier2Storage) {
    this.projectPath = projectPath;
    this.tier2 = tier2;
  }

  async generate(): Promise<ArchitectureDoc> {
    const layers = this.detectLayers();
    const keyComponents = this.extractKeyComponents(layers);
    const dataFlow = this.inferDataFlow(layers);
    const diagram = this.generateASCIIDiagram(layers, dataFlow);
    const dependencies = this.getProjectDependencies();

    return {
      name: basename(this.projectPath),
      description: this.inferDescription(layers, keyComponents),
      diagram,
      layers,
      dataFlow,
      keyComponents,
      dependencies,
      generatedAt: new Date()
    };
  }

  private detectLayers(): ArchitectureLayer[] {
    const layers: ArchitectureLayer[] = [];
    const layerMap = new Map<string, ArchitectureLayer>();

    // Find src directory or use project root
    const srcDir = existsSync(join(this.projectPath, 'src'))
      ? join(this.projectPath, 'src')
      : this.projectPath;

    // Scan top-level directories
    try {
      const entries = readdirSync(srcDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const dirName = entry.name.toLowerCase();
        const layerName = ArchitectureGenerator.LAYER_MAPPING[dirName];

        if (layerName) {
          const dirPath = join(srcDir, entry.name);
          const relativePath = dirPath.replace(this.projectPath, '').replace(/^[/\\]/, '');
          const files = this.getFilesInDirectory(relativePath);

          if (files.length > 0) {
            // Group by layer name
            if (layerMap.has(layerName)) {
              const existing = layerMap.get(layerName)!;
              existing.files.push(...files);
            } else {
              layerMap.set(layerName, {
                name: layerName,
                directory: relativePath,
                files,
                purpose: ArchitectureGenerator.LAYER_PURPOSES[layerName] || ''
              });
            }
          }
        }
      }
    } catch {
      // Directory scan failed
    }

    // Sort layers by typical architecture order
    const layerOrder = [
      'CLI Interface',
      'API Layer',
      'UI Components',
      'React Hooks',
      'State Management',
      'Business Logic',
      'Indexing Layer',
      'Data Layer',
      'Configuration',
      'Type Definitions',
      'Utilities',
      'Testing'
    ];

    for (const layerName of layerOrder) {
      if (layerMap.has(layerName)) {
        layers.push(layerMap.get(layerName)!);
      }
    }

    return layers;
  }

  private getFilesInDirectory(relativePath: string): string[] {
    const files: string[] = [];
    const absolutePath = join(this.projectPath, relativePath);

    try {
      const entries = readdirSync(absolutePath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && this.isCodeFile(entry.name)) {
          files.push(join(relativePath, entry.name));
        }
      }
    } catch {
      // Directory read failed
    }

    return files;
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java'];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }

  private extractKeyComponents(layers: ArchitectureLayer[]): ComponentReference[] {
    const components: ComponentReference[] = [];

    for (const layer of layers) {
      for (const filePath of layer.files.slice(0, 5)) { // Limit per layer
        const file = this.tier2.getFile(filePath);
        if (!file) continue;

        const symbols = this.tier2.getSymbolsByFile(file.id);
        const exports = symbols.filter(s => s.exported);

        if (exports.length > 0) {
          const mainExport = exports.find(s => s.kind === 'class') || exports[0];

          components.push({
            name: mainExport?.name || basename(filePath, '.ts'),
            file: filePath,
            purpose: this.inferComponentPurpose(filePath, symbols),
            exports: exports.map(s => s.name)
          });
        }
      }
    }

    return components;
  }

  private inferComponentPurpose(filePath: string, symbols: Array<{ name: string; kind: string }>): string {
    const name = basename(filePath, '.ts').toLowerCase();
    const mainExport = symbols.find(s => s.kind === 'class' || s.kind === 'function');

    if (name.includes('engine')) return 'Main orchestration engine';
    if (name.includes('server')) return 'Server implementation';
    if (name.includes('storage')) return 'Data storage management';
    if (name.includes('indexer')) return 'Content indexing';
    if (name.includes('context')) return 'Context management';
    if (name.includes('config')) return 'Configuration handling';

    if (mainExport) {
      return `Provides ${mainExport.name}`;
    }

    return 'Module';
  }

  private inferDataFlow(layers: ArchitectureLayer[]): DataFlowStep[] {
    const flow: DataFlowStep[] = [];
    const layerNames = layers.map(l => l.name);

    // Infer common data flows based on detected layers
    if (layerNames.includes('API Layer') && layerNames.includes('Business Logic')) {
      flow.push({
        from: 'API Layer',
        to: 'Business Logic',
        description: 'Request handling and routing'
      });
    }

    if (layerNames.includes('Business Logic') && layerNames.includes('Data Layer')) {
      flow.push({
        from: 'Business Logic',
        to: 'Data Layer',
        description: 'Data persistence and retrieval'
      });
    }

    if (layerNames.includes('Business Logic') && layerNames.includes('Indexing Layer')) {
      flow.push({
        from: 'Business Logic',
        to: 'Indexing Layer',
        description: 'Content indexing and search'
      });
    }

    if (layerNames.includes('CLI Interface') && layerNames.includes('Business Logic')) {
      flow.push({
        from: 'CLI Interface',
        to: 'Business Logic',
        description: 'Command execution'
      });
    }

    if (layerNames.includes('UI Components') && layerNames.includes('State Management')) {
      flow.push({
        from: 'UI Components',
        to: 'State Management',
        description: 'UI state updates'
      });
    }

    return flow;
  }

  private generateASCIIDiagram(layers: ArchitectureLayer[], dataFlow: DataFlowStep[]): string {
    const maxWidth = 45;
    const lines: string[] = [];

    // Header
    lines.push('┌' + '─'.repeat(maxWidth) + '┐');
    lines.push('│' + this.centerText('PROJECT ARCHITECTURE', maxWidth) + '│');
    lines.push('├' + '─'.repeat(maxWidth) + '┤');

    // Each layer
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]!;
      const layerName = layer.name;
      const fileCount = `(${layer.files.length} files)`;

      // Layer name line
      lines.push('│  ' + layerName.padEnd(maxWidth - 4) + '  │');

      // Directory line
      lines.push('│  └── ' + layer.directory.padEnd(maxWidth - 8) + '  │');

      // Add connector if there's a next layer with data flow
      if (i < layers.length - 1) {
        const flowToNext = dataFlow.find(f =>
          f.from === layer.name && f.to === layers[i + 1]?.name
        );

        if (flowToNext) {
          lines.push('│' + this.centerText('│', maxWidth) + '│');
          lines.push('│' + this.centerText('▼', maxWidth) + '│');
        } else {
          lines.push('│' + ' '.repeat(maxWidth) + '│');
        }
      }
    }

    // Footer
    lines.push('└' + '─'.repeat(maxWidth) + '┘');

    // Add legend if there are data flows
    if (dataFlow.length > 0) {
      lines.push('');
      lines.push('Data Flow:');
      for (const flow of dataFlow) {
        lines.push(`  ${flow.from} → ${flow.to}`);
        lines.push(`    ${flow.description}`);
      }
    }

    return lines.join('\n');
  }

  private centerText(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  }

  private getProjectDependencies(): DependencyInfo[] {
    const deps: DependencyInfo[] = [];

    // Check package.json
    const packageJsonPath = join(this.projectPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

        // Runtime dependencies
        if (pkg.dependencies) {
          for (const [name, version] of Object.entries(pkg.dependencies)) {
            deps.push({
              name,
              version: String(version),
              type: 'runtime'
            });
          }
        }

        // Dev dependencies (limit to important ones)
        if (pkg.devDependencies) {
          const importantDevDeps = ['typescript', 'vitest', 'jest', 'eslint', 'prettier', 'esbuild', 'webpack', 'vite'];
          for (const [name, version] of Object.entries(pkg.devDependencies)) {
            if (importantDevDeps.some(d => name.includes(d))) {
              deps.push({
                name,
                version: String(version),
                type: 'dev'
              });
            }
          }
        }
      } catch {
        // Parse error
      }
    }

    // Check requirements.txt for Python
    const requirementsPath = join(this.projectPath, 'requirements.txt');
    if (existsSync(requirementsPath)) {
      try {
        const content = readFileSync(requirementsPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

        for (const line of lines.slice(0, 20)) {
          const match = line.match(/^([a-zA-Z0-9_-]+)(?:[=<>~!]+(.+))?/);
          if (match) {
            deps.push({
              name: match[1]!,
              version: match[2],
              type: 'runtime'
            });
          }
        }
      } catch {
        // Read error
      }
    }

    return deps;
  }

  private inferDescription(layers: ArchitectureLayer[], components: ComponentReference[]): string {
    const parts: string[] = [];

    // Describe the project type based on layers
    const layerNames = layers.map(l => l.name);

    if (layerNames.includes('API Layer') && layerNames.includes('Data Layer')) {
      parts.push('Backend application');
    } else if (layerNames.includes('UI Components')) {
      parts.push('Frontend application');
    } else if (layerNames.includes('CLI Interface')) {
      parts.push('CLI tool');
    }

    // Describe key capabilities
    if (layerNames.includes('Indexing Layer')) {
      parts.push('with search/indexing capabilities');
    }
    if (layerNames.includes('State Management')) {
      parts.push('with centralized state management');
    }

    // File count
    const totalFiles = layers.reduce((sum, l) => sum + l.files.length, 0);
    parts.push(`(${totalFiles} source files across ${layers.length} layers)`);

    return parts.join(' ');
  }
}
