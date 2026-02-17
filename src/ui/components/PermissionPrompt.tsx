/**
 * Permission Prompt UI Component
 * 
 * React component for displaying permission requests
 */

import React, { useState } from 'react';
import type { PermissionRequest, PermissionResponse } from '../types.js';

interface PermissionPromptProps {
  request: PermissionRequest;
  onResponse: (response: PermissionResponse) => void;
}

export const PermissionPrompt: React.FC<PermissionPromptProps> = ({
  request,
  onResponse
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const getIcon = (type: string): string => {
    const icons: Record<string, string> = {
      edit: '✏️',
      write: '📝',
      delete: '🗑️',
      bash: '🖥️',
      task: '🤖',
      git: '📦',
      read: '👓',
      glob: '📁',
      grep: '🔍',
      webfetch: '🌐',
      websearch: '🔎',
      todo: '✅'
    };
    return icons[type] || '🔒';
  };
  
  const getTitle = (type: string): string => {
    const titles: Record<string, string> = {
      edit: 'Edit File',
      write: 'Create File',
      delete: 'Delete File',
      bash: 'Run Command',
      task: 'Delegate Task',
      git: 'Git Operation',
      read: 'Read File',
      glob: 'Find Files',
      grep: 'Search Content',
      webfetch: 'Fetch URL',
      websearch: 'Web Search',
      todo: 'Manage Todos'
    };
    return titles[type] || 'Permission Required';
  };
  
  return (
    <div className="permission-prompt" style={styles.container}>
      <div style={styles.header}>
        <span style={styles.icon}>{getIcon(request.type)}</span>
        <span style={styles.title}>{getTitle(request.type)}</span>
      </div>
      
      <div style={styles.content}>
        <p style={styles.description}>{request.description}</p>
        
        {request.metadata?.filePath && (
          <div style={styles.file}>
            <code style={styles.code}>{request.metadata.filePath}</code>
          </div>
        )}
        
        {request.metadata?.command && (
          <div style={styles.command}>
            <span style={styles.prompt}>$</span>
            <code style={styles.code}>{request.metadata.command}</code>
          </div>
        )}
        
        {request.metadata?.diff && (
          <div style={styles.diffSection}>
            <button 
              onClick={() => setShowDetails(!showDetails)}
              style={styles.toggleButton}
            >
              {showDetails ? 'Hide' : 'View'} Diff
            </button>
            {showDetails && (
              <pre style={styles.diff}>{request.metadata.diff}</pre>
            )}
          </div>
        )}
      </div>
      
      <div style={styles.actions}>
        <button 
          onClick={() => onResponse('once')}
          style={{ ...styles.button, ...styles.primaryButton }}
        >
          Allow Once
        </button>
        <button 
          onClick={() => onResponse('always')}
          style={{ ...styles.button, ...styles.secondaryButton }}
        >
          Allow Always
        </button>
        <button 
          onClick={() => onResponse('reject')}
          style={{ ...styles.button, ...styles.dangerButton }}
        >
          Reject
        </button>
      </div>
    </div>
  );
};

// Simple inline styles for now
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '16px',
    maxWidth: '600px',
    margin: '16px auto',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #333'
  },
  icon: {
    fontSize: '20px'
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff'
  },
  content: {
    marginBottom: '16px'
  },
  description: {
    margin: '0 0 12px 0',
    color: '#ccc',
    fontSize: '14px'
  },
  file: {
    backgroundColor: '#2d2d2d',
    padding: '8px',
    borderRadius: '4px',
    marginBottom: '8px'
  },
  command: {
    backgroundColor: '#2d2d2d',
    padding: '8px',
    borderRadius: '4px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  prompt: {
    color: '#666'
  },
  code: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#fff'
  },
  diffSection: {
    marginTop: '12px'
  },
  toggleButton: {
    backgroundColor: 'transparent',
    border: '1px solid #666',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  diff: {
    backgroundColor: '#2d2d2d',
    padding: '12px',
    borderRadius: '4px',
    marginTop: '8px',
    fontFamily: 'monospace',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '300px',
    color: '#fff'
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  },
  button: {
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500
  },
  primaryButton: {
    backgroundColor: '#0066CC',
    color: '#fff'
  },
  secondaryButton: {
    backgroundColor: '#666',
    color: '#fff'
  },
  dangerButton: {
    backgroundColor: '#DC3545',
    color: '#fff'
  }
};

export default PermissionPrompt;
