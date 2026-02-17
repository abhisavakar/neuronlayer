/**
 * Diff Viewer Component
 * 
 * Shows file changes with split/unified view
 */

import React, { useState } from 'react';

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  oldPath: string;
  newPath: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  oldContent,
  newContent,
  oldPath,
  newPath
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  
  // Simple line-by-line diff
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  // Calculate diff
  const diff = calculateDiff(oldLines, newLines);
  
  const addedCount = diff.filter(d => d.type === 'add').length;
  const removedCount = diff.filter(d => d.type === 'remove').length;
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.fileInfo}>
          <span style={styles.filePath}>{newPath}</span>
          <span style={styles.changes}>
            <span style={styles.added}>+{addedCount}</span>
            <span style={styles.removed}>-{removedCount}</span>
          </span>
        </div>
        <div style={styles.viewToggle}>
          <button
            style={{
              ...styles.toggleButton,
              ...(viewMode === 'split' ? styles.toggleButtonActive : {})
            }}
            onClick={() => setViewMode('split')}
          >
            Split
          </button>
          <button
            style={{
              ...styles.toggleButton,
              ...(viewMode === 'unified' ? styles.toggleButtonActive : {})
            }}
            onClick={() => setViewMode('unified')}
          >
            Unified
          </button>
        </div>
      </div>
      
      {/* Diff Content */}
      <div style={styles.content}>
        {viewMode === 'split' ? (
          <div style={styles.splitView}>
            {/* Old Side */}
            <div style={styles.side}>
              <div style={styles.sideHeader}>{oldPath}</div>
              <div style={styles.lines}>
                {oldLines.map((line, idx) => (
                  <div key={`old-${idx}`} style={styles.line}>
                    <span style={styles.lineNumber}>{idx + 1}</span>
                    <span style={styles.lineContent}>{line}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* New Side */}
            <div style={styles.side}>
              <div style={styles.sideHeader}>{newPath}</div>
              <div style={styles.lines}>
                {newLines.map((line, idx) => (
                  <div key={`new-${idx}`} style={styles.line}>
                    <span style={styles.lineNumber}>{idx + 1}</span>
                    <span style={styles.lineContent}>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.unifiedView}>
            {diff.map((item, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.diffLine,
                  ...(item.type === 'add' ? styles.addedLine : {}),
                  ...(item.type === 'remove' ? styles.removedLine : {})
                }}
              >
                <span style={styles.lineMarker}>
                  {item.type === 'add' ? '+' : item.type === 'remove' ? '-' : ' '}
                </span>
                <span style={styles.lineContent}>{item.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Simple diff calculation
function calculateDiff(oldLines: string[], newLines: string[]): Array<{type: 'add' | 'remove' | 'same', content: string}> {
  const diff: Array<{type: 'add' | 'remove' | 'same', content: string}> = [];
  
  // Very simple diff - just compare line by line
  const maxLen = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    
    if (oldLine === undefined) {
      diff.push({ type: 'add', content: newLine });
    } else if (newLine === undefined) {
      diff.push({ type: 'remove', content: oldLine });
    } else if (oldLine !== newLine) {
      diff.push({ type: 'remove', content: oldLine });
      diff.push({ type: 'add', content: newLine });
    } else {
      diff.push({ type: 'same', content: oldLine });
    }
  }
  
  return diff;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: '8px',
    overflow: 'hidden',
    fontFamily: 'monospace',
    fontSize: '13px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #333'
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  filePath: {
    color: '#fff',
    fontWeight: 500
  },
  changes: {
    display: 'flex',
    gap: '8px'
  },
  added: {
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  removed: {
    color: '#F44336',
    fontWeight: 'bold'
  },
  viewToggle: {
    display: 'flex',
    gap: '4px'
  },
  toggleButton: {
    padding: '4px 12px',
    border: '1px solid #444',
    backgroundColor: 'transparent',
    color: '#888',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  toggleButtonActive: {
    backgroundColor: '#1f6feb',
    color: '#fff',
    borderColor: '#1f6feb'
  },
  content: {
    maxHeight: '500px',
    overflow: 'auto'
  },
  splitView: {
    display: 'flex',
    height: '100%'
  },
  side: {
    flex: 1,
    borderRight: '1px solid #333'
  },
  sideHeader: {
    padding: '8px 12px',
    backgroundColor: '#1a1a1a',
    color: '#888',
    fontSize: '12px',
    borderBottom: '1px solid #333'
  },
  lines: {
    padding: '8px 0'
  },
  line: {
    display: 'flex',
    padding: '2px 12px'
  },
  lineNumber: {
    width: '40px',
    color: '#666',
    textAlign: 'right',
    marginRight: '12px',
    userSelect: 'none'
  },
  lineContent: {
    color: '#ccc'
  },
  unifiedView: {
    padding: '8px 0'
  },
  diffLine: {
    display: 'flex',
    padding: '2px 12px'
  },
  addedLine: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)'
  },
  removedLine: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)'
  },
  lineMarker: {
    width: '20px',
    color: '#666',
    userSelect: 'none'
  }
};

export default DiffViewer;
