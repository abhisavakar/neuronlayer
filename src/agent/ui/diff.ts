// Diff viewer for memcode agent - Shows changes before file operations

import { c } from './cli.js';

export interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  lineNumber?: { old?: number; new?: number };
}

export interface FileDiff {
  path: string;
  operation: 'create' | 'modify' | 'delete';
  oldContent?: string;
  newContent?: string;
  diff: DiffLine[];
  stats: { additions: number; deletions: number };
}

/**
 * Generate a simple line-by-line diff between two strings
 */
export function generateDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const diff: DiffLine[] = [];

  // Simple LCS-based diff for small files, line-by-line comparison for larger ones
  if (oldLines.length + newLines.length < 1000) {
    return lcsBasedDiff(oldLines, newLines);
  }

  // For larger files, use a simpler approach
  return simpleLineDiff(oldLines, newLines);
}

/**
 * LCS-based diff for accurate change detection
 */
function lcsBasedDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const diff: DiffLine[] = [];

  // Build LCS table
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  let i = m, j = n;
  const result: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({
        type: 'context',
        content: oldLines[i - 1],
        lineNumber: { old: i, new: j }
      });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({
        type: 'add',
        content: newLines[j - 1],
        lineNumber: { new: j }
      });
      j--;
    } else {
      result.unshift({
        type: 'remove',
        content: oldLines[i - 1],
        lineNumber: { old: i }
      });
      i--;
    }
  }

  return result;
}

/**
 * Simple line diff for large files
 */
function simpleLineDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const diff: DiffLine[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      if (oldLine !== undefined) {
        diff.push({
          type: 'context',
          content: oldLine,
          lineNumber: { old: i + 1, new: i + 1 }
        });
      }
    } else {
      if (oldLine !== undefined) {
        diff.push({
          type: 'remove',
          content: oldLine,
          lineNumber: { old: i + 1 }
        });
      }
      if (newLine !== undefined) {
        diff.push({
          type: 'add',
          content: newLine,
          lineNumber: { new: i + 1 }
        });
      }
    }
  }

  return diff;
}

/**
 * Create a FileDiff object from old and new content
 */
export function createFileDiff(
  path: string,
  oldContent: string | null,
  newContent: string
): FileDiff {
  const operation = oldContent === null ? 'create' : 'modify';
  const diff = oldContent === null
    ? newContent.split('\n').map((line, i) => ({
        type: 'add' as const,
        content: line,
        lineNumber: { new: i + 1 }
      }))
    : generateDiff(oldContent, newContent);

  const stats = {
    additions: diff.filter(d => d.type === 'add').length,
    deletions: diff.filter(d => d.type === 'remove').length
  };

  return {
    path,
    operation,
    oldContent: oldContent ?? undefined,
    newContent,
    diff,
    stats
  };
}

/**
 * Format diff for terminal display
 */
export function formatDiff(fileDiff: FileDiff, options: {
  contextLines?: number;
  maxLines?: number;
  wrapMode?: 'word' | 'none';
  width?: number;
} = {}): string {
  const {
    contextLines = 3,
    maxLines = 50,
    wrapMode = 'none',
    width = process.stdout.columns || 80
  } = options;

  const lines: string[] = [];

  // Header
  const opColor = fileDiff.operation === 'create' ? c.green
    : fileDiff.operation === 'delete' ? c.red
    : c.yellow;
  const opLabel = fileDiff.operation === 'create' ? 'CREATE'
    : fileDiff.operation === 'delete' ? 'DELETE'
    : 'MODIFY';

  lines.push(`${c.dim}┌─ ${opColor}${opLabel}${c.reset} ${c.bold}${fileDiff.path}${c.reset}`);
  lines.push(`${c.dim}│${c.reset} ${c.green}+${fileDiff.stats.additions}${c.reset} ${c.red}-${fileDiff.stats.deletions}${c.reset}`);
  lines.push(`${c.dim}├${'─'.repeat(width - 2)}${c.reset}`);

  // Show diff with context collapse
  let displayedLines = 0;
  let lastShownIndex = -1;
  let skippedContext = 0;

  for (let i = 0; i < fileDiff.diff.length && displayedLines < maxLines; i++) {
    const line = fileDiff.diff[i];

    // For context lines, check if we should show them
    if (line.type === 'context') {
      // Look ahead to see if there's a change nearby
      const hasChangeNear = fileDiff.diff.slice(Math.max(0, i - contextLines), i + contextLines + 1)
        .some(d => d.type !== 'context');

      if (!hasChangeNear) {
        skippedContext++;
        continue;
      }

      // Show skipped context indicator
      if (skippedContext > 0 && lastShownIndex >= 0) {
        lines.push(`${c.dim}│ ... ${skippedContext} lines ...${c.reset}`);
        skippedContext = 0;
      }
    } else if (skippedContext > 0) {
      lines.push(`${c.dim}│ ... ${skippedContext} lines ...${c.reset}`);
      skippedContext = 0;
    }

    // Format the line
    const lineNum = line.lineNumber?.new || line.lineNumber?.old || '';
    const lineNumStr = `${lineNum}`.padStart(4);

    let prefix: string;
    let contentColor: string;

    switch (line.type) {
      case 'add':
        prefix = `${c.green}+${c.reset}`;
        contentColor = c.green;
        break;
      case 'remove':
        prefix = `${c.red}-${c.reset}`;
        contentColor = c.red;
        break;
      default:
        prefix = `${c.dim} ${c.reset}`;
        contentColor = c.dim;
        break;
    }

    // Truncate long lines
    let content = line.content;
    const maxContentWidth = width - 10;
    if (content.length > maxContentWidth && wrapMode === 'none') {
      content = content.slice(0, maxContentWidth - 3) + '...';
    }

    lines.push(`${c.dim}│${c.reset}${c.gray}${lineNumStr}${c.reset} ${prefix} ${contentColor}${content}${c.reset}`);
    displayedLines++;
    lastShownIndex = i;
  }

  // Show remaining skipped
  if (skippedContext > 0) {
    lines.push(`${c.dim}│ ... ${skippedContext} lines ...${c.reset}`);
  }

  // Show truncation notice
  const remainingChanges = fileDiff.diff.slice(lastShownIndex + 1).filter(d => d.type !== 'context').length;
  if (remainingChanges > 0) {
    lines.push(`${c.dim}│ ... ${remainingChanges} more changes ...${c.reset}`);
  }

  lines.push(`${c.dim}└${'─'.repeat(width - 2)}${c.reset}`);

  return lines.join('\n');
}

/**
 * Format a unified diff string (from git diff)
 */
export function formatUnifiedDiff(diffString: string, options: {
  maxLines?: number;
  width?: number;
} = {}): string {
  const { maxLines = 100, width = process.stdout.columns || 80 } = options;

  const lines = diffString.split('\n');
  const result: string[] = [];
  let displayedLines = 0;

  for (const line of lines) {
    if (displayedLines >= maxLines) {
      result.push(`${c.dim}... ${lines.length - displayedLines} more lines ...${c.reset}`);
      break;
    }

    if (line.startsWith('+++') || line.startsWith('---')) {
      result.push(`${c.bold}${c.cyan}${line}${c.reset}`);
    } else if (line.startsWith('@@')) {
      result.push(`${c.magenta}${line}${c.reset}`);
    } else if (line.startsWith('+')) {
      result.push(`${c.green}${line}${c.reset}`);
    } else if (line.startsWith('-')) {
      result.push(`${c.red}${line}${c.reset}`);
    } else if (line.startsWith('diff --git')) {
      result.push(`${c.bold}${c.yellow}${line}${c.reset}`);
    } else {
      result.push(`${c.dim}${line}${c.reset}`);
    }

    displayedLines++;
  }

  return result.join('\n');
}

/**
 * Create a search/replace diff preview
 */
export function formatSearchReplaceDiff(
  path: string,
  originalContent: string,
  search: string,
  replace: string,
  options: { width?: number } = {}
): string {
  const { width = process.stdout.columns || 80 } = options;

  const lines: string[] = [];
  lines.push(`${c.dim}┌─ ${c.yellow}EDIT${c.reset} ${c.bold}${path}${c.reset}`);
  lines.push(`${c.dim}├${'─'.repeat(width - 2)}${c.reset}`);

  // Find the location of the search string
  const index = originalContent.indexOf(search);
  if (index === -1) {
    lines.push(`${c.dim}│${c.reset} ${c.red}Search string not found${c.reset}`);
    lines.push(`${c.dim}└${'─'.repeat(width - 2)}${c.reset}`);
    return lines.join('\n');
  }

  // Get line numbers
  const beforeSearch = originalContent.slice(0, index);
  const startLine = beforeSearch.split('\n').length;

  // Show search (what will be removed)
  lines.push(`${c.dim}│${c.reset} ${c.gray}Line ${startLine}:${c.reset}`);
  const searchLines = search.split('\n');
  for (const line of searchLines.slice(0, 10)) {
    const truncated = line.length > width - 10 ? line.slice(0, width - 13) + '...' : line;
    lines.push(`${c.dim}│${c.reset} ${c.red}- ${truncated}${c.reset}`);
  }
  if (searchLines.length > 10) {
    lines.push(`${c.dim}│${c.reset} ${c.red}... ${searchLines.length - 10} more lines${c.reset}`);
  }

  // Show replacement (what will be added)
  const replaceLines = replace.split('\n');
  for (const line of replaceLines.slice(0, 10)) {
    const truncated = line.length > width - 10 ? line.slice(0, width - 13) + '...' : line;
    lines.push(`${c.dim}│${c.reset} ${c.green}+ ${truncated}${c.reset}`);
  }
  if (replaceLines.length > 10) {
    lines.push(`${c.dim}│${c.reset} ${c.green}... ${replaceLines.length - 10} more lines${c.reset}`);
  }

  lines.push(`${c.dim}└${'─'.repeat(width - 2)}${c.reset}`);

  return lines.join('\n');
}
