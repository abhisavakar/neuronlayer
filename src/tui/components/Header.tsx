/**
 * Header Component
 * 
 * Top navigation bar with title and actions
 */

import React from 'react';

interface HeaderProps {
  sessionTitle?: string;
  onCommandPalette: () => void;
  onNewSession: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sessionTitle,
  onCommandPalette,
  onNewSession
}) => {
  return (
    <header style={styles.container}>
      {/* Left: Logo & Title */}
      <div style={styles.left}>
        <div style={styles.logo}>🧠</div>
        <div style={styles.brand}>MemoryLayer</div>
        {sessionTitle && (
          <>
            <span style={styles.divider}>/</span>
            <span style={styles.title}>{sessionTitle}</span>
          </>
        )}
      </div>
      
      {/* Center: Session Info */}
      <div style={styles.center}>
        <span style={styles.badge}>OpenCode UI + 18 Agents</span>
      </div>
      
      {/* Right: Actions */}
      <div style={styles.right}>
        <button style={styles.button} onClick={onNewSession} title="New Session (Ctrl+N)">
          <span>+</span>
          <span>New</span>
        </button>
        <button style={styles.button} onClick={onCommandPalette} title="Command Palette (Ctrl+P)">
          <span>⌘</span>
          <span>Commands</span>
        </button>
        <button style={styles.iconButton} title="Settings">
          ⚙️
        </button>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#161b22',
    borderBottom: '1px solid #30363d',
    height: '60px'
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logo: {
    fontSize: '24px'
  },
  brand: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff'
  },
  divider: {
    color: '#484f58',
    fontWeight: 300
  },
  title: {
    fontSize: '14px',
    color: '#c9d1d9',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  center: {
    display: 'flex',
    alignItems: 'center'
  },
  badge: {
    backgroundColor: '#238636',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#21262d',
    color: '#c9d1d9',
    border: '1px solid #30363d',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  iconButton: {
    padding: '6px 10px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    borderRadius: '6px'
  }
};

export default Header;
