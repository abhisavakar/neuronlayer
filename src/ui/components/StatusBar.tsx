/**
 * Status Bar Component
 * 
 * Shows current state: agent, progress, cost, etc.
 */

import React from 'react';

interface StatusBarProps {
  currentAgent?: string;
  currentPhase?: string;
  progress?: number;
  cost?: number;
  tokensUsed?: number;
  tokensLimit?: number;
  model?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  currentAgent,
  currentPhase,
  progress,
  cost,
  tokensUsed,
  tokensLimit,
  model
}) => {
  const getAgentIcon = (agent?: string): string => {
    const icons: Record<string, string> = {
      why: '❓',
      research: '🔬',
      planner: '📋',
      architect: '🏗️',
      security: '🛡️',
      estimator: '📊',
      designer: '🎨',
      builder: '🔨',
      tester: '🧪',
      reviewer: '👁️',
      moderator: '🎛️'
    };
    return icons[agent || ''] || '🤖';
  };
  
  const formatCost = (cents?: number): string => {
    if (!cents) return '$0.0000';
    return `$${(cents / 100).toFixed(4)}`;
  };
  
  const formatTokens = (used?: number, limit?: number): string => {
    if (!used) return '0';
    if (!limit) return used.toLocaleString();
    return `${used.toLocaleString()} / ${limit.toLocaleString()}`;
  };
  
  return (
    <div style={styles.container}>
      {/* Left: Current Agent/Phase */}
      <div style={styles.section}>
        {currentAgent && (
          <div style={styles.item}>
            <span style={styles.icon}>{getAgentIcon(currentAgent)}</span>
            <span style={styles.label}>{currentAgent}</span>
          </div>
        )}
        {currentPhase && (
          <div style={styles.item}>
            <span style={styles.phase}>{currentPhase}</span>
          </div>
        )}
        {progress !== undefined && progress > 0 && (
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div 
                style={{...styles.progressFill, width: `${progress}%`}}
              />
            </div>
            <span style={styles.progressText}>{Math.round(progress)}%</span>
          </div>
        )}
      </div>
      
      {/* Center: Model */}
      {model && (
        <div style={styles.section}>
          <span style={styles.model}>{model}</span>
        </div>
      )}
      
      {/* Right: Cost & Tokens */}
      <div style={styles.section}>
        {cost !== undefined && (
          <div style={styles.item}>
            <span style={styles.cost}>{formatCost(cost)}</span>
          </div>
        )}
        {tokensUsed !== undefined && (
          <div style={styles.item}>
            <span style={styles.tokens}>
              {formatTokens(tokensUsed, tokensLimit)} tokens
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#161b22',
    borderTop: '1px solid #30363d',
    fontSize: '12px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  section: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  icon: {
    fontSize: '14px'
  },
  label: {
    color: '#c9d1d9',
    fontWeight: 500,
    textTransform: 'capitalize'
  },
  phase: {
    color: '#8b949e',
    textTransform: 'capitalize'
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  progressBar: {
    width: '100px',
    height: '4px',
    backgroundColor: '#21262d',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#238636',
    transition: 'width 0.3s ease'
  },
  progressText: {
    color: '#8b949e',
    fontSize: '11px',
    minWidth: '30px'
  },
  model: {
    color: '#6e7681',
    fontSize: '11px'
  },
  cost: {
    color: '#f0883e',
    fontWeight: 500,
    fontFamily: 'monospace'
  },
  tokens: {
    color: '#8b949e',
    fontFamily: 'monospace'
  }
};

export default StatusBar;
