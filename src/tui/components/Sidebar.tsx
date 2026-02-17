/**
 * Sidebar Component
 * 
 * Shows session list and file tree
 */

import React from 'react';

interface Session {
  id: string;
  title: string;
  createdAt: Date;
  messageCount: number;
}

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession
}) => {
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };
  
  return (
    <aside style={styles.container}>
      {/* Section: Sessions */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>Conversations</span>
          <span style={styles.count}>{sessions.length}</span>
        </div>
        
        <div style={styles.sessionList}>
          {sessions.length === 0 ? (
            <div style={styles.empty}>No conversations yet</div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                style={{
                  ...styles.session,
                  ...(session.id === currentSessionId ? styles.sessionActive : {})
                }}
                onClick={() => onSelectSession(session.id)}
              >
                <div style={styles.sessionIcon}>💬</div>
                <div style={styles.sessionInfo}>
                  <div style={styles.sessionTitle}>{session.title}</div>
                  <div style={styles.sessionMeta}>
                    {formatDate(session.createdAt)} • {session.messageCount} messages
                  </div>
                </div>
                <button
                  style={styles.deleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Section: Quick Actions */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>Quick Actions</span>
        </div>
        
        <div style={styles.actions}>
          <button style={styles.actionButton}>
            <span>🔍</span>
            <span>Search Code</span>
          </button>
          <button style={styles.actionButton}>
            <span>💡</span>
            <span>Find Patterns</span>
          </button>
          <button style={styles.actionButton}>
            <span>📋</span>
            <span>View Decisions</span>
          </button>
        </div>
      </div>
      
      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerItem}>
          <span style={styles.footerIcon}>⚡</span>
          <span>18 Agents Active</span>
        </div>
        <div style={styles.footerItem}>
          <span style={styles.footerIcon}>🧠</span>
          <span>MemoryLayer Connected</span>
        </div>
      </div>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '280px',
    backgroundColor: '#0d1117',
    borderRight: '1px solid #30363d',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  section: {
    padding: '16px',
    borderBottom: '1px solid #21262d'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  count: {
    fontSize: '11px',
    color: '#6e7681',
    backgroundColor: '#21262d',
    padding: '2px 6px',
    borderRadius: '10px'
  },
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  empty: {
    fontSize: '13px',
    color: '#6e7681',
    fontStyle: 'italic',
    padding: '12px 0'
  },
  session: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    position: 'relative'
  },
  sessionActive: {
    backgroundColor: '#1f6feb'
  },
  sessionIcon: {
    fontSize: '16px'
  },
  sessionInfo: {
    flex: 1,
    minWidth: 0
  },
  sessionTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#c9d1d9',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  sessionMeta: {
    fontSize: '11px',
    color: '#6e7681',
    marginTop: '2px'
  },
  deleteButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6e7681',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    opacity: 0,
    transition: 'opacity 0.2s'
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#c9d1d9',
    fontSize: '13px',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'background-color 0.2s',
    textAlign: 'left'
  },
  footer: {
    marginTop: 'auto',
    padding: '16px',
    borderTop: '1px solid #21262d'
  },
  footerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#6e7681',
    marginBottom: '6px'
  },
  footerIcon: {
    fontSize: '14px'
  }
};

// Show delete button on hover
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  [data-session]:hover button {
    opacity: 1 !important;
  }
`;
document.head.appendChild(styleSheet);

export default Sidebar;
