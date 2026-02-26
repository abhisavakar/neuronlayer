import { execSync } from 'child_process';

/**
 * GitStalenessChecker - Cheap HEAD caching and change detection
 *
 * Instead of running expensive `git log` operations, we cache the HEAD commit
 * and only run full syncs when HEAD has changed. This reduces polling overhead
 * from ~100ms+ to ~5ms per check.
 */
export class GitStalenessChecker {
  private cachedHead: string | null = null;
  private lastCheckTime: number = 0;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Get the current HEAD commit hash
   * This is a cheap operation (~5ms)
   */
  getCurrentHead(): string | null {
    try {
      const head = execSync('git rev-parse HEAD', {
        cwd: this.projectPath,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      return head;
    } catch {
      return null;
    }
  }

  /**
   * Check if there are new commits since the last check
   * Returns true if HEAD has changed (meaning we need to sync)
   */
  hasNewCommits(): boolean {
    const current = this.getCurrentHead();
    this.lastCheckTime = Date.now();

    if (current === null) {
      return false; // Not a git repo or git command failed
    }

    if (this.cachedHead === null) {
      // First check - cache the current HEAD
      this.cachedHead = current;
      return false; // No need to sync on first check (assume we synced on init)
    }

    if (current !== this.cachedHead) {
      // HEAD has changed - update cache and signal sync needed
      this.cachedHead = current;
      return true;
    }

    return false;
  }

  /**
   * Force update the cached HEAD (call after successful sync)
   */
  updateCachedHead(): void {
    this.cachedHead = this.getCurrentHead();
    this.lastCheckTime = Date.now();
  }

  /**
   * Get the cached HEAD without checking git
   */
  getCachedHead(): string | null {
    return this.cachedHead;
  }

  /**
   * Get the time of the last check
   */
  getLastCheckTime(): number {
    return this.lastCheckTime;
  }

  /**
   * Get time since last check in milliseconds
   */
  getTimeSinceLastCheck(): number {
    return Date.now() - this.lastCheckTime;
  }

  /**
   * Check if enough time has passed since last check
   * Default threshold is 30 seconds
   */
  shouldCheck(thresholdMs: number = 30_000): boolean {
    return this.getTimeSinceLastCheck() > thresholdMs;
  }

  /**
   * Reset the checker state (useful for testing)
   */
  reset(): void {
    this.cachedHead = null;
    this.lastCheckTime = 0;
  }
}
