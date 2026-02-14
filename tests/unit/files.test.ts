import { describe, it, expect } from 'vitest';
import { detectLanguage, isCodeFile, hashContent, getPreview, countLines } from '../../src/utils/files.js';

describe('detectLanguage', () => {
  it('should detect TypeScript files', () => {
    expect(detectLanguage('test.ts')).toBe('typescript');
    expect(detectLanguage('component.tsx')).toBe('typescript');
  });

  it('should detect JavaScript files', () => {
    expect(detectLanguage('index.js')).toBe('javascript');
    expect(detectLanguage('app.jsx')).toBe('javascript');
    expect(detectLanguage('config.mjs')).toBe('javascript');
  });

  it('should detect Python files', () => {
    expect(detectLanguage('main.py')).toBe('python');
  });

  it('should detect special filenames', () => {
    expect(detectLanguage('Dockerfile')).toBe('dockerfile');
  });

  it('should return plaintext for unknown extensions', () => {
    expect(detectLanguage('file.xyz')).toBe('plaintext');
  });
});

describe('isCodeFile', () => {
  it('should identify code files', () => {
    expect(isCodeFile('test.ts')).toBe(true);
    expect(isCodeFile('main.py')).toBe(true);
    expect(isCodeFile('index.js')).toBe(true);
  });

  it('should identify special files', () => {
    expect(isCodeFile('Dockerfile')).toBe(true);
    expect(isCodeFile('Makefile')).toBe(true);
  });

  it('should reject non-code files', () => {
    expect(isCodeFile('image.png')).toBe(false);
    expect(isCodeFile('document.pdf')).toBe(false);
  });
});

describe('hashContent', () => {
  it('should generate consistent hashes', () => {
    const hash1 = hashContent('hello world');
    const hash2 = hashContent('hello world');
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different content', () => {
    const hash1 = hashContent('hello');
    const hash2 = hashContent('world');
    expect(hash1).not.toBe(hash2);
  });
});

describe('getPreview', () => {
  it('should return full content if under limit', () => {
    const content = 'short content';
    expect(getPreview(content, 100)).toBe(content);
  });

  it('should truncate long content', () => {
    const content = 'a'.repeat(200);
    const preview = getPreview(content, 100);
    expect(preview.length).toBeLessThan(content.length);
    expect(preview.endsWith('... [truncated]')).toBe(true);
  });
});

describe('countLines', () => {
  it('should count lines correctly', () => {
    expect(countLines('line1\nline2\nline3')).toBe(3);
    expect(countLines('')).toBe(0);
    expect(countLines('single line')).toBe(1);
  });
});
