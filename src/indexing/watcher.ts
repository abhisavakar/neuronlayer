import chokidar, { type FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { relative } from 'path';

export interface FileEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  relativePath: string;
}

export class FileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private projectPath: string;
  private ignorePatterns: string[];

  constructor(projectPath: string, ignorePatterns: string[] = []) {
    super();
    this.projectPath = projectPath;
    this.ignorePatterns = ignorePatterns;
  }

  start(): void {
    if (this.watcher) {
      return;
    }

    this.watcher = chokidar.watch(this.projectPath, {
      ignored: [
        /(^|[\/\\])\../, // dotfiles
        ...this.ignorePatterns
      ],
      persistent: true,
      ignoreInitial: false, // We want initial add events for indexing
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      },
      usePolling: false, // Use native events when possible
      depth: 20 // Limit recursion depth
    });

    this.watcher
      .on('add', (path) => this.handleEvent('add', path))
      .on('change', (path) => this.handleEvent('change', path))
      .on('unlink', (path) => this.handleEvent('unlink', path))
      .on('error', (error) => {
        console.error('File watcher error:', error);
        this.emit('error', error);
      })
      .on('ready', () => {
        console.error('File watcher ready');
        this.emit('ready');
      });
  }

  private handleEvent(type: 'add' | 'change' | 'unlink', path: string): void {
    const relativePath = relative(this.projectPath, path);

    const event: FileEvent = {
      type,
      path,
      relativePath
    };

    this.emit('file', event);
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  isRunning(): boolean {
    return this.watcher !== null;
  }
}
