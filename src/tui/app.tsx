/**
 * Main TUI Application
 * 
 * Root component that orchestrates the entire UI
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { ChatPanel } from './components/ChatPanel.js';
import { StatusBar } from '../ui/components/StatusBar.js';
import { CommandPalette } from '../ui/components/CommandPalette.js';
import type { ToolCall } from '../tools/types.js';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
  agent?: string;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export const App: React.FC = () => {
  // State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | undefined>();
  const [currentPhase, setCurrentPhase] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [cost, setCost] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(0);
  
  // Get current session
  const currentSession = sessions.find(s => s.id === currentSessionId);
  
  // Load sessions from storage on mount
  useEffect(() => {
    const stored = localStorage.getItem('memcode-sessions');
    if (stored) {
      const parsed = JSON.parse(stored);
      setSessions(parsed.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        messages: s.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      })));
    }
  }, []);
  
  // Save sessions when they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('memcode-sessions', JSON.stringify(sessions));
    }
  }, [sessions]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette: Ctrl+P or Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      
      // New session: Ctrl+N
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewSession();
      }
      
      // Close command palette: Escape
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const createNewSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
  };
  
  const handleSendMessage = async (content: string) => {
    if (!currentSession) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId
        ? { ...s, messages: [...s.messages, userMessage] }
        : s
    ));
    
    // Simulate agent response (in real app, this would call the orchestrator)
    setIsLoading(true);
    setCurrentAgent('research');
    setCurrentPhase('investigating');
    
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I received: "${content}"\n\nThis is where the agent response would appear.`,
        timestamp: new Date(),
        agent: 'research'
      };
      
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId
          ? { ...s, messages: [...s.messages, assistantMessage] }
          : s
      ));
      
      setIsLoading(false);
      setCurrentAgent(undefined);
      setCurrentPhase(undefined);
      setTokensUsed(prev => prev + 150);
      setCost(prev => prev + 0.002);
    }, 2000);
  };
  
  const handleCommand = (command: string) => {
    switch (command) {
      case 'new':
        createNewSession();
        break;
      case 'clear':
        if (currentSession) {
          setSessions(prev => prev.map(s => 
            s.id === currentSessionId
              ? { ...s, messages: [] }
              : s
          ));
        }
        break;
      case 'exit':
        // Handle exit
        break;
    }
    setIsCommandPaletteOpen(false);
  };
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <Header 
        onCommandPalette={() => setIsCommandPaletteOpen(true)}
        onNewSession={createNewSession}
        sessionTitle={currentSession?.title}
      />
      
      {/* Main Content */}
      <div style={styles.main}>
        {/* Sidebar */}
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onDeleteSession={(id) => {
            setSessions(prev => prev.filter(s => s.id !== id));
            if (currentSessionId === id) {
              setCurrentSessionId(null);
            }
          }}
        />
        
        {/* Chat Area */}
        <div style={styles.chatArea}>
          {currentSession ? (
            <ChatPanel
              messages={currentSession.messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              currentAgent={currentAgent}
            />
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🚀</div>
              <div style={styles.emptyTitle}>Welcome to MemoryLayer</div>
              <div style={styles.emptySubtitle}>
                Start a new conversation or select an existing one
              </div>
              <button style={styles.emptyButton} onClick={createNewSession}>
                New Conversation
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <StatusBar
        currentAgent={currentAgent}
        currentPhase={currentPhase}
        cost={cost}
        tokensUsed={tokensUsed}
        model="claude-3.5-sonnet"
      />
      
      {/* Command Palette */}
      {isCommandPaletteOpen && (
        <CommandPalette
          onClose={() => setIsCommandPaletteOpen(false)}
          onExecute={handleCommand}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#0d1117',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#c9d1d9'
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px'
  },
  emptyIcon: {
    fontSize: '48px'
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#fff'
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#8b949e'
  },
  emptyButton: {
    padding: '12px 24px',
    backgroundColor: '#238636',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '8px'
  }
};

export default App;
