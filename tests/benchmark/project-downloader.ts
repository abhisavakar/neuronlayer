/**
 * Test Project Downloader
 * 
 * Automatically downloads and sets up 3 test projects of different sizes
 * for comprehensive benchmarking.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, statSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

export interface TestProject {
  name: string;
  repo: string;
  branch?: string;
  size: 'small' | 'medium' | 'large';
  expectedLOC: number;
  language: string;
  description: string;
}

export const TEST_PROJECTS: TestProject[] = [
  {
    name: 'express-starter',
    repo: 'https://github.com/expressjs/express.git',
    branch: 'master',
    size: 'small',
    expectedLOC: 15000,
    language: 'JavaScript',
    description: 'Express.js framework - small but real codebase'
  },
  {
    name: 'react-demo',
    repo: 'https://github.com/facebook/react.git',
    branch: 'main',
    size: 'medium',
    expectedLOC: 100000,
    language: 'TypeScript/JavaScript',
    description: 'React library - medium-sized production code'
  },
  {
    name: 'vscode',
    repo: 'https://github.com/microsoft/vscode.git',
    branch: 'main',
    size: 'large',
    expectedLOC: 1000000,
    language: 'TypeScript',
    description: 'VS Code - large production codebase'
  }
];

export interface ProjectStats {
  path: string;
  name: string;
  totalFiles: number;
  totalLines: number;
  languageBreakdown: Record<string, number>;
  indexed: boolean;
}

export class ProjectDownloader {
  private baseDir: string;

  constructor(baseDir: string = './test-projects') {
    this.baseDir = baseDir;
    
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Download all test projects
   */
  async downloadAll(): Promise<ProjectStats[]> {
    console.log('📦 Downloading test projects...\n');
    
    const stats: ProjectStats[] = [];
    
    for (const project of TEST_PROJECTS) {
      try {
        const projectStats = await this.downloadProject(project);
        stats.push(projectStats);
        console.log(`  ✓ ${project.name}: ${projectStats.totalLines.toLocaleString()} LOC\n`);
      } catch (error) {
        console.error(`  ✗ Failed to download ${project.name}: ${error}\n`);
      }
    }
    
    return stats;
  }

  /**
   * Download single project
   */
  async downloadProject(project: TestProject): Promise<ProjectStats> {
    const projectPath = join(this.baseDir, project.name);
    
    console.log(`⬇️  Downloading ${project.name}...`);
    console.log(`   Repository: ${project.repo}`);
    console.log(`   Expected: ~${project.expectedLOC.toLocaleString()} LOC`);
    
    // Check if already exists
    if (existsSync(projectPath)) {
      console.log(`   Project already exists, updating...`);
      try {
        execSync('git pull', {
          cwd: projectPath,
          stdio: 'pipe'
        });
      } catch {
        console.log(`   Using existing copy`);
      }
    } else {
      // Clone repository
      try {
        execSync(`git clone --depth 1 --branch ${project.branch || 'main'} ${project.repo} ${projectPath}`, {
          stdio: 'pipe',
          timeout: 300000 // 5 minutes
        });
      } catch (error) {
        throw new Error(`Failed to clone: ${error}`);
      }
    }
    
    // Analyze project
    const stats = this.analyzeProject(projectPath);
    
    return {
      path: projectPath,
      name: project.name,
      ...stats,
      indexed: existsSync(join(projectPath, '.memorylayer'))
    };
  }

  /**
   * Analyze project statistics
   */
  private analyzeProject(projectPath: string): Omit<ProjectStats, 'path' | 'name' | 'indexed'> {
    let totalFiles = 0;
    let totalLines = 0;
    const languageBreakdown: Record<string, number> = {};
    
    try {
      // Count lines using git (more accurate)
      const output = execSync(
        'git ls-files | xargs wc -l 2>/dev/null | tail -1',
        {
          cwd: projectPath,
          encoding: 'utf-8',
          timeout: 30000
        }
      );
      
      const match = output.match(/(\d+) total/);
      if (match) {
        totalLines = parseInt(match[1]);
      }
      
      // Count files
      const fileOutput = execSync('git ls-files | wc -l', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 10000
      });
      totalFiles = parseInt(fileOutput.trim());
      
      // Language breakdown
      const langOutput = execSync(
        "git ls-files | grep -E '\\.(ts|tsx|js|jsx|py|go|rs|java|cpp|c|h)$' | sed 's/.*\\.//' | sort | uniq -c | sort -rn | head -10",
        {
          cwd: projectPath,
          encoding: 'utf-8',
          timeout: 30000
        }
      );
      
      langOutput.split('\n').forEach(line => {
        const match = line.trim().match(/(\d+)\s+(\w+)/);
        if (match) {
          languageBreakdown[match[2]] = parseInt(match[1]);
        }
      });
      
    } catch {
      // Fallback to rough estimates
      console.log('   Warning: Could not analyze with git, using estimates');
      totalFiles = 100;
      totalLines = 10000;
    }
    
    return {
      totalFiles,
      totalLines,
      languageBreakdown
    };
  }

  /**
   * Get project by size
   */
  getProject(size: 'small' | 'medium' | 'large'): TestProject | undefined {
    return TEST_PROJECTS.find(p => p.size === size);
  }

  /**
   * Get project path
   */
  getProjectPath(projectName: string): string {
    return join(this.baseDir, projectName);
  }

  /**
   * Check if project is downloaded
   */
  isDownloaded(projectName: string): boolean {
    return existsSync(join(this.baseDir, projectName));
  }

  /**
   * List downloaded projects
   */
  listDownloaded(): string[] {
    if (!existsSync(this.baseDir)) return [];
    
    const { readdirSync } = require('fs');
    return readdirSync(this.baseDir, { withFileTypes: true })
      .filter((dirent: any) => dirent.isDirectory())
      .map((dirent: any) => dirent.name);
  }

  /**
   * Clean up downloaded projects
   */
  cleanup(): void {
    const { rmSync } = require('fs');
    if (existsSync(this.baseDir)) {
      rmSync(this.baseDir, { recursive: true, force: true });
      console.log('✓ Cleaned up test projects');
    }
  }

  /**
   * Save project configuration
   */
  saveConfig(): void {
    const config = {
      projects: TEST_PROJECTS,
      baseDir: this.baseDir,
      downloaded: this.listDownloaded()
    };
    
    writeFileSync(
      join(this.baseDir, 'projects.json'),
      JSON.stringify(config, null, 2)
    );
  }

  /**
   * Load project configuration
   */
  loadConfig(): any {
    const configPath = join(this.baseDir, 'projects.json');
    if (existsSync(configPath)) {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    }
    return null;
  }
}

/**
 * Interactive project selector
 */
export async function selectProjects(): Promise<TestProject[]> {
  console.log('\n📋 Available Test Projects:\n');
  
  TEST_PROJECTS.forEach((project, index) => {
    console.log(`${index + 1}. ${project.name}`);
    console.log(`   Size: ${project.size} (~${project.expectedLOC.toLocaleString()} LOC)`);
    console.log(`   Language: ${project.language}`);
    console.log(`   Repo: ${project.repo}\n`);
  });
  
  // For automation, return all projects
  // In interactive mode, you'd prompt user here
  return TEST_PROJECTS;
}

/**
 * Quick download for specific size
 */
export async function downloadProjectBySize(
  size: 'small' | 'medium' | 'large',
  baseDir?: string
): Promise<ProjectStats | null> {
  const downloader = new ProjectDownloader(baseDir);
  const project = downloader.getProject(size);
  
  if (!project) {
    throw new Error(`Unknown project size: ${size}`);
  }
  
  return downloader.downloadProject(project);
}

/**
 * Download all projects with progress
 */
export async function downloadAllProjects(baseDir?: string): Promise<ProjectStats[]> {
  const downloader = new ProjectDownloader(baseDir);
  const stats = await downloader.downloadAll();
  downloader.saveConfig();
  return stats;
}
