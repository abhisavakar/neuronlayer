/**
 * Tool Call Card Component
 * 
 * Displays tool executions with real-time status updates
 * Shows which MemoryLayer tools were used
 */

import React, { useState } from 'react';
import type { ToolCall } from '../../tools/types';

interface ToolCallCardProps {
  toolCall: ToolCall;
  defaultExpanded?: boolean;
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({
  toolCall,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const getToolIcon = (name: string): string => {
    const icons: Record<string, string> = {
      read: '👓',
      write: '📝',
      edit: '✏️',
      delete: '🗑️',
      search: '🔍',
      suggest: '💡',
      build: '🔨',
      context: '📚',
      decisions: '📋',
      patterns: '🧩',
      bash: '🖥️',
      ask: '❓',
      todo: '✅',
      webfetch: '🌐',
      websearch: '🔎'
    };
    return icons[name] || '🔧';
  };
  
  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'success': return '✓';
      case 'error': return '✗';
      default: return '○';
    }
  };
  
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return '#FFC107';
      case 'running': return '#2196F3';
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };
  
  const formatDuration = (ms?: number): string => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };
  
  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  return (
    <div className="tool-call-card" style={styles.card}>
      {/* Header - Always visible */}
      <div 
        className="tool-call-header" 
        style={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={styles.headerLeft}>
          <span style={styles.icon}>{getToolIcon(toolCall.name)}</span>
          <span style={styles.name}>{toolCall.name}</span>
          <span 
            style={{...styles.status, color: getStatusColor(toolCall.status)}}
          >
            {getStatusIcon(toolCall.status)}
          </span>
        </div>
        
        <div style={styles.headerRight}>
          {toolCall.duration && (
            <span style={styles.duration}>{formatDuration(toolCall.duration)}</span>
          )}
          <span style={styles.timestamp}>{formatTimestamp(toolCall.timestamp)}</span>
          <span style={styles.toggle}>{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="tool-call-content" style={styles.content}>
          {/* Arguments */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Arguments</div>
            <pre style={styles.code}>
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>
          
          {/* Output */}
          {toolCall.output && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Output</div>
              <pre style={styles.output}>{toolCall.output}</pre>
            </div>
          )}
          
          {/* Error */}
          {toolCall.error && (
            <div style={styles.section}>
              <div style={{...styles.sectionTitle, color: '#F44336'}}>Error</div>
              <pre style={{...styles.code, color: '#F44336'}}>{toolCall.error}</pre>
            </div>
          )}
          
          {/* MemoryLayer Tools Used */}
          {toolCall.memoryLayerCalls && toolCall.memoryLayerCalls.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>MemoryLayer Tools</div>
              <div style={styles.tagList}>
                {toolCall.memoryLayerCalls.map((call, idx) => (
                  <span key={idx} style={styles.tag}>{call}</span>
                ))}
              </div>
            </div>
          )}
          
          {/* Agents Invoked */}
          {toolCall.agentsInvoked && toolCall.agentsInvoked.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Agents</div>
              <div style={styles.tagList}>
                {toolCall.agentsInvoked.map((agent, idx) => (
                  <span key={idx} style={{...styles.tag, backgroundColor: '#4CAF50'}}>
                    {agent}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Inline styles for simplicity (in real app, use CSS modules)
const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: '6px',
    margin: '8px 0',
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    cursor: 'pointer',
    backgroundColor: '#252526',
    transition: 'background-color 0.2s'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  icon: {
    fontSize: '16px'
  },
  name: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    textTransform: 'capitalize'
  },
  status: {
    fontSize: '12px',
    fontWeight: 'bold'
  },
  duration: {
    fontSize: '12px',
    color: '#888'
  },
  timestamp: {
    fontSize: '11px',
    color: '#666'
  },
  toggle: {
    fontSize: '10px',
    color: '#666',
    marginLeft: '4px'
  },
  content: {
    padding: '12px',
    borderTop: '1px solid #333'
  },
  section: {
    marginBottom: '12px'
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: '6px',
    letterSpacing: '0.5px'
  },
  code: {
    backgroundColor: '#1a1a1a',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    overflow: 'auto',
    color: '#ccc',
    margin: 0
  },
  output: {
    backgroundColor: '#1a1a1a',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    overflow: 'auto',
    color: '#4CAF50',
    margin: 0,
    whiteSpace: 'pre-wrap'
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  tag: {
    backgroundColor: '#2196F3',
    color: '#fff',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500
  }
};

export default ToolCallCard;
