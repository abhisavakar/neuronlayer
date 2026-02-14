import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeatureContextManager } from '../../src/core/feature-context.js';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FeatureContextManager', () => {
  let manager: FeatureContextManager;
  let testDir: string;
  let dataDir: string;

  beforeEach(() => {
    // Create temp directories
    testDir = join(tmpdir(), `memorylayer-test-${Date.now()}`);
    dataDir = join(testDir, 'data');
    mkdirSync(dataDir, { recursive: true });

    // Create a test file
    writeFileSync(join(testDir, 'test.ts'), 'console.log("test");');

    manager = new FeatureContextManager(testDir, dataDir);
  });

  afterEach(() => {
    manager.shutdown();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('File Tracking', () => {
    it('should track file opens', () => {
      manager.onFileOpened('test.ts');

      const context = manager.getCurrentContext();
      expect(context).not.toBeNull();
      expect(context!.files).toHaveLength(1);
      expect(context!.files[0].path).toBe('test.ts');
      expect(context!.files[0].touchCount).toBe(1);
    });

    it('should increment touchCount on repeated opens', () => {
      manager.onFileOpened('test.ts');
      manager.onFileOpened('test.ts');
      manager.onFileOpened('test.ts');

      const context = manager.getCurrentContext();
      expect(context!.files[0].touchCount).toBe(3);
    });

    it('should track multiple files', () => {
      manager.onFileOpened('file1.ts');
      manager.onFileOpened('file2.ts');
      manager.onFileOpened('file3.ts');

      const context = manager.getCurrentContext();
      expect(context!.files).toHaveLength(3);
    });
  });

  describe('Change Tracking', () => {
    it('should record file edits', () => {
      manager.onFileEdited('test.ts', 'Added function', [10, 11, 12]);

      const context = manager.getCurrentContext();
      expect(context!.changes).toHaveLength(1);
      expect(context!.changes[0].file).toBe('test.ts');
      expect(context!.changes[0].diff).toBe('Added function');
      expect(context!.changes[0].linesChanged).toEqual([10, 11, 12]);
    });

    it('should limit changes to max (50)', () => {
      for (let i = 0; i < 60; i++) {
        manager.onFileEdited('test.ts', `Change ${i}`, [i]);
      }

      const context = manager.getCurrentContext();
      expect(context!.changes.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Query Tracking', () => {
    it('should track queries', () => {
      manager.onQuery('how does auth work?', ['auth.ts', 'login.ts']);

      const context = manager.getCurrentContext();
      expect(context!.queries).toHaveLength(1);
      expect(context!.queries[0].query).toBe('how does auth work?');
      expect(context!.queries[0].filesUsed).toEqual(['auth.ts', 'login.ts']);
    });

    it('should touch files used in queries', () => {
      manager.onQuery('test query', ['file1.ts', 'file2.ts']);

      const context = manager.getCurrentContext();
      expect(context!.files).toHaveLength(2);
    });
  });

  describe('Hot Context', () => {
    it('should return empty hot context when no activity', () => {
      const hot = manager.getHotContext();
      expect(hot.files).toHaveLength(0);
      expect(hot.changes).toHaveLength(0);
      expect(hot.queries).toHaveLength(0);
    });

    it('should return hot context with tracked files', () => {
      manager.onFileOpened('test.ts');
      manager.onFileEdited('test.ts', 'change', [1]);

      const hot = manager.getHotContext();
      expect(hot.files.length).toBeGreaterThan(0);
      expect(hot.changes.length).toBeGreaterThan(0);
      expect(hot.summary).toContain('test.ts');
    });

    it('should rank files by touchCount', () => {
      manager.onFileOpened('less.ts');
      manager.onFileOpened('more.ts');
      manager.onFileOpened('more.ts');
      manager.onFileOpened('more.ts');

      const hot = manager.getHotContext();
      expect(hot.files[0].path).toBe('more.ts');
      expect(hot.files[0].touchCount).toBe(3);
    });
  });

  describe('Context Management', () => {
    it('should start new context with name', () => {
      const context = manager.startNewContext('payment feature');

      expect(context.name).toBe('payment feature');
      expect(context.status).toBe('active');
      expect(context.files).toHaveLength(0);
    });

    it('should save previous context to recent when starting new', () => {
      manager.onFileOpened('old.ts');
      const oldContext = manager.getCurrentContext();

      manager.startNewContext('new feature');

      const recent = manager.getRecentContexts();
      expect(recent).toHaveLength(1);
      expect(recent[0].id).toBe(oldContext!.id);
      expect(recent[0].status).toBe('paused');
    });

    it('should switch to recent context', () => {
      manager.onFileOpened('first.ts');
      const firstId = manager.getCurrentContext()!.id;

      manager.startNewContext('second');
      manager.onFileOpened('second.ts');

      const switched = manager.switchToRecent(firstId);
      expect(switched).toBe(true);

      const current = manager.getCurrentContext();
      expect(current!.id).toBe(firstId);
      expect(current!.files[0].path).toBe('first.ts');
    });

    it('should return false for invalid context switch', () => {
      const switched = manager.switchToRecent('invalid-id');
      expect(switched).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should persist context to file', () => {
      manager.onFileOpened('persist.ts');
      manager.onFileEdited('persist.ts', 'test', [1]);
      manager.shutdown();

      // Create new manager with same dirs
      const newManager = new FeatureContextManager(testDir, dataDir);
      const context = newManager.getCurrentContext();

      expect(context).not.toBeNull();
      expect(context!.files[0].path).toBe('persist.ts');

      newManager.shutdown();
    });
  });

  describe('Summary Generation', () => {
    it('should generate summary with file names', () => {
      manager.onFileOpened('auth.ts');
      manager.onFileOpened('login.ts');
      manager.onFileEdited('auth.ts', 'change', [1]);

      const summary = manager.getCurrentSummary();
      expect(summary).not.toBeNull();
      expect(summary!.files).toBe(2);
      expect(summary!.changes).toBe(1);
    });
  });
});
