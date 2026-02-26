import { ProjectManager, type ProjectInfo } from '../core/project-manager.js';
import { ADRExporter } from '../core/adr-exporter.js';
import { initializeDatabase } from '../storage/database.js';
import { Tier2Storage } from '../storage/tier2.js';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';

const projectManager = new ProjectManager();

interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// List all projects
export function listProjects(): CommandResult {
  const projects = projectManager.listProjects();
  const activeProject = projectManager.getActiveProject();

  if (projects.length === 0) {
    return {
      success: true,
      message: 'No projects registered. Use "memorylayer projects add <path>" to add one.'
    };
  }

  const lines = ['Registered Projects:', ''];
  for (const project of projects) {
    const isActive = activeProject?.id === project.id ? ' (active)' : '';
    lines.push(`  ${project.name}${isActive}`);
    lines.push(`    ID: ${project.id}`);
    lines.push(`    Path: ${project.path}`);
    lines.push(`    Files: ${project.totalFiles}, Decisions: ${project.totalDecisions}`);
    lines.push(`    Languages: ${project.languages.join(', ') || 'N/A'}`);
    lines.push('');
  }

  return {
    success: true,
    message: lines.join('\n'),
    data: projects
  };
}

// Add a project
export function addProject(projectPath: string): CommandResult {
  try {
    const projectInfo = projectManager.registerProject(projectPath);
    projectManager.setActiveProject(projectInfo.id);

    return {
      success: true,
      message: `Project "${projectInfo.name}" registered and set as active.\nID: ${projectInfo.id}\nData directory: ${projectInfo.dataDir}`,
      data: projectInfo
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to add project: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Remove a project
export function removeProject(projectId: string): CommandResult {
  const project = projectManager.getProject(projectId);

  if (!project) {
    return {
      success: false,
      message: `Project not found: ${projectId}`
    };
  }

  const removed = projectManager.removeProject(projectId);

  return {
    success: removed,
    message: removed
      ? `Project "${project.name}" removed from registry.`
      : `Failed to remove project.`
  };
}

// Switch to a project
export function switchProject(projectId: string): CommandResult {
  const project = projectManager.getProject(projectId);

  if (!project) {
    return {
      success: false,
      message: `Project not found: ${projectId}`
    };
  }

  const switched = projectManager.setActiveProject(projectId);

  return {
    success: switched,
    message: switched
      ? `Switched to project: ${project.name}`
      : `Failed to switch project.`
  };
}

// Discover projects
export function discoverProjects(): CommandResult {
  const discovered = projectManager.discoverProjects();

  if (discovered.length === 0) {
    return {
      success: true,
      message: 'No projects discovered in common locations.'
    };
  }

  const lines = [`Discovered ${discovered.length} potential projects:`, ''];
  for (const path of discovered) {
    const name = path.split(/[/\\]/).pop();
    lines.push(`  ${name}`);
    lines.push(`    ${path}`);
    lines.push('');
  }
  lines.push('Use "memorylayer projects add <path>" to register a project.');

  return {
    success: true,
    message: lines.join('\n'),
    data: discovered
  };
}

// Export decisions to ADR
export function exportDecisions(
  projectPath?: string,
  options: { outputDir?: string; format?: 'madr' | 'nygard' | 'simple' } = {}
): CommandResult {
  // Determine project path
  let targetPath = projectPath;
  if (!targetPath) {
    const activeProject = projectManager.getActiveProject();
    if (!activeProject) {
      return {
        success: false,
        message: 'No project specified and no active project. Use "memorylayer projects switch <id>" first.'
      };
    }
    targetPath = activeProject.path;
  }

  // Get project info
  const projectInfo = projectManager.getProjectByPath(targetPath);
  if (!projectInfo) {
    return {
      success: false,
      message: `Project not registered: ${targetPath}. Use "memorylayer projects add ${targetPath}" first.`
    };
  }

  // Open database and get decisions
  const dbPath = join(projectInfo.dataDir, 'memorylayer.db');
  if (!existsSync(dbPath)) {
    return {
      success: false,
      message: `Project database not found. Has the project been indexed?`
    };
  }

  const db = initializeDatabase(dbPath);
  const tier2 = new Tier2Storage(db);
  const decisions = tier2.getAllDecisions();
  db.close();

  if (decisions.length === 0) {
    return {
      success: true,
      message: 'No decisions to export.'
    };
  }

  // Export
  const exporter = new ADRExporter(targetPath);
  const exportedFiles = exporter.exportAllDecisions(decisions, {
    outputDir: options.outputDir,
    format: options.format,
    includeIndex: true
  });

  return {
    success: true,
    message: `Exported ${exportedFiles.length} ADR files to ${options.outputDir || join(targetPath, 'docs', 'decisions')}`,
    data: exportedFiles
  };
}

// Show project info
export function showProject(projectId?: string): CommandResult {
  let project: ProjectInfo | null;

  if (projectId) {
    project = projectManager.getProject(projectId);
  } else {
    project = projectManager.getActiveProject();
  }

  if (!project) {
    return {
      success: false,
      message: projectId
        ? `Project not found: ${projectId}`
        : 'No active project. Use "memorylayer projects switch <id>" first.'
    };
  }

  const lines = [
    `Project: ${project.name}`,
    `ID: ${project.id}`,
    `Path: ${project.path}`,
    `Data Directory: ${project.dataDir}`,
    `Files Indexed: ${project.totalFiles}`,
    `Decisions: ${project.totalDecisions}`,
    `Languages: ${project.languages.join(', ') || 'N/A'}`,
    `Last Accessed: ${new Date(project.lastAccessed).toLocaleString()}`
  ];

  return {
    success: true,
    message: lines.join('\n'),
    data: project
  };
}

// Initialize neuronlayer for current project + auto-configure Claude Desktop
export function initProject(projectPath?: string): CommandResult {
  const targetPath = projectPath || process.cwd();

  // 1. Register the project
  const addResult = addProject(targetPath);
  if (!addResult.success) {
    return addResult;
  }

  const projectInfo = addResult.data as ProjectInfo;

  // 2. Find Claude Desktop config
  const platform = process.platform;
  let configPath: string;

  if (platform === 'win32') {
    configPath = join(homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'darwin') {
    configPath = join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else {
    configPath = join(homedir(), '.config', 'claude', 'claude_desktop_config.json');
  }

  // 3. Read or create config
  let config: { mcpServers?: Record<string, unknown> } = { mcpServers: {} };

  try {
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8');
      config = JSON.parse(content);
    } else {
      // Create directory if needed
      const configDir = configPath.substring(0, configPath.lastIndexOf(platform === 'win32' ? '\\' : '/'));
      mkdirSync(configDir, { recursive: true });
    }
  } catch {
    // Config doesn't exist or is invalid, start fresh
  }

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // 4. Add neuronlayer server for this project
  const serverName = `neuronlayer-${projectInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  config.mcpServers[serverName] = {
    command: 'npx',
    args: ['-y', 'neuronlayer', '--project', targetPath]
  };

  // 5. Write config
  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (err) {
    return {
      success: false,
      message: `Failed to write Claude Desktop config: ${err instanceof Error ? err.message : String(err)}`
    };
  }

  return {
    success: true,
    message: `
NeuronLayer initialized!

Project: ${projectInfo.name}
Path: ${targetPath}
Data: ${projectInfo.dataDir}

Claude Desktop configured:
  Config: ${configPath}
  Server: ${serverName}

Restart Claude Desktop to activate.
`.trim(),
    data: { projectInfo, configPath, serverName }
  };
}

// Print help
export function printHelp(): void {
  console.log(`
MemoryLayer CLI - Persistent Memory for AI Coding Assistants

USAGE:
  memorylayer [command] [options]

COMMANDS:
  init [path]               Initialize project + auto-configure Claude Desktop
  (no command)              Start MCP server for Claude Desktop
  projects list             List all registered projects
  projects add <path>       Add a project to the registry
  projects remove <id>      Remove a project from the registry
  projects switch <id>      Set a project as active
  projects show [id]        Show project details
  projects discover         Discover projects in common locations
  export [options]          Export decisions to ADR files
  help                      Show this help message

OPTIONS:
  --project, -p <path>      Path to the project directory
  --output, -o <dir>        Output directory for exports
  --format <type>           ADR format: madr, nygard, simple

EXAMPLES:
  # Quick setup (auto-configures Claude Desktop)
  cd /path/to/project
  neuronlayer init

  # Start MCP server
  neuronlayer --project /path/to/project

  # List all projects
  memorylayer projects list

  # Add a new project
  memorylayer projects add /path/to/my-project

  # Switch active project
  memorylayer projects switch abc123

  # Export decisions to ADR files
  memorylayer export --format madr

  # Discover projects
  memorylayer projects discover

For more information, visit: https://github.com/your-org/memorylayer
`);
}

// Parse and execute CLI commands
export function executeCLI(args: string[]): void {
  const command = args[0];
  const subcommand = args[1];

  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;

    case 'init': {
      const path = args[1];
      const result = initProject(path);
      console.log(result.message);
      if (!result.success) process.exit(1);
      break;
    }

    case 'projects': {
      switch (subcommand) {
        case 'list':
          console.log(listProjects().message);
          break;
        case 'add': {
          const path = args[2];
          if (!path) {
            console.error('Error: Project path required.');
            console.error('Usage: memorylayer projects add <path>');
            process.exit(1);
          }
          const result = addProject(path);
          console.log(result.message);
          if (!result.success) process.exit(1);
          break;
        }
        case 'remove': {
          const id = args[2];
          if (!id) {
            console.error('Error: Project ID required.');
            console.error('Usage: memorylayer projects remove <id>');
            process.exit(1);
          }
          const result = removeProject(id);
          console.log(result.message);
          if (!result.success) process.exit(1);
          break;
        }
        case 'switch': {
          const id = args[2];
          if (!id) {
            console.error('Error: Project ID required.');
            console.error('Usage: memorylayer projects switch <id>');
            process.exit(1);
          }
          const result = switchProject(id);
          console.log(result.message);
          if (!result.success) process.exit(1);
          break;
        }
        case 'show': {
          const id = args[2];
          const result = showProject(id);
          console.log(result.message);
          if (!result.success) process.exit(1);
          break;
        }
        case 'discover':
          console.log(discoverProjects().message);
          break;
        default:
          console.error(`Unknown subcommand: ${subcommand}`);
          console.error('Available: list, add, remove, switch, show, discover');
          process.exit(1);
      }
      break;
    }

    case 'export': {
      // Parse export options
      let outputDir: string | undefined;
      let format: 'madr' | 'nygard' | 'simple' | undefined;

      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];
        if ((arg === '--output' || arg === '-o') && nextArg) {
          outputDir = nextArg;
          i++;
        } else if (arg === '--format' && nextArg) {
          format = nextArg as 'madr' | 'nygard' | 'simple';
          i++;
        }
      }

      const result = exportDecisions(undefined, { outputDir, format });
      console.log(result.message);
      if (!result.success) process.exit(1);
      break;
    }

    default:
      // If no command matches, it might be the default MCP server mode
      // Return without handling - let main() handle it
      return;
  }

  process.exit(0);
}
