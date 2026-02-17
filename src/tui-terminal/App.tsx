/**
 * Terminal UI - Main Application
 * 
 * Root component that orchestrates the entire terminal UI
 */

import React, { useState, useEffect } from 'react';
import { Box, useApp, useInput } from 'ink';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { ChatPanel } from './components/ChatPanel.js';
import { InputBox } from './components/InputBox.js';
import { StatusBar } from './components/StatusBar.js';
import { CommandPalette } from './components/CommandPalette.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agent?: string;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const App: React.FC = () => {
  const { exit } = useApp();
  const size = useTerminalSize();
  const columns = size.columns || 80;
  const rows = size.rows || 24;
  
  // State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | undefined>();
  const [currentPhase, setCurrentPhase] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [cost, setCost] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [activePanel, setActivePanel] = useState<'sidebar' | 'chat'>('chat');
  
  // Get current session
  const currentSession = sessions.find(s => s.id === currentSessionId);
  
  // Load sessions from storage on mount
  useEffect(() => {
    try {
      const stored = typeof process !== 'undefined' && process.env.HOME 
        ? require('fs').readFileSync(`${process.env.HOME}/.memcode-sessions.json`, 'utf8')
        : null;
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
    } catch {
      // No existing sessions
    }
  }, []);
  
  // Save sessions when they change
  useEffect(() => {
    if (sessions.length > 0 && typeof process !== 'undefined' && process.env.HOME) {
      try {
        require('fs').writeFileSync(
          `${process.env.HOME}/.memcode-sessions.json`,
          JSON.stringify(sessions, null, 2)
        );
      } catch {
        // Failed to save
      }
    }
  }, [sessions]);
  
  // Keyboard shortcuts
  useInput((input, key) => {
    // Command palette: Ctrl+P or /
    if ((key.ctrl && input === 'p') || input === '/') {
      setIsCommandPaletteOpen(true);
      return;
    }
    
    // New session: Ctrl+N
    if (key.ctrl && input === 'n') {
      createNewSession();
      return;
    }
    
    // Exit: Ctrl+C or q
    if ((key.ctrl && input === 'c') || input === 'q') {
      exit();
      return;
    }
    
    // Switch panel: Tab
    if (key.tab) {
      setActivePanel(prev => prev === 'sidebar' ? 'chat' : 'sidebar');
      return;
    }
    
    // Close command palette: Escape
    if (key.escape) {
      setIsCommandPaletteOpen(false);
      return;
    }
  });
  
  const createNewSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setActivePanel('chat');
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
        content: `I received: "${content}"\n\nThis is where the 18-agent orchestration would process your request.`,
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
      case 'sessions':
        setActivePanel('sidebar');
        break;
      case 'exit':
        exit();
        break;
    }
    setIsCommandPaletteOpen(false);
  };
  
  // Calculate layout dimensions
  const sidebarWidth = 35;
  const headerHeight = 3;
  const statusHeight = 3;
  const inputHeight = 3;
  const chatHeight = rows - headerHeight - statusHeight - inputHeight - 1;
  const chatWidth = columns - (activePanel === 'sidebar' ? sidebarWidth : 0);
  
  return (
    <Box flexDirection="column" height={rows}>
      {/* Header */}
      <Header 
        sessionTitle={currentSession?.title}
        columns={columns}
      />
      
      {/* Main Content */}
      <Box flexDirection="row" height={chatHeight + inputHeight}>
        {/* Sidebar */}
        {activePanel === 'sidebar' && (
          <Sidebar
            sessions={sessions.map(s => ({
              id: s.id,
              title: s.title,
              createdAt: s.createdAt,
              messageCount: s.messages.length
            }))}
            currentSessionId={currentSessionId}
            onSelectSession={(id) => {
              setCurrentSessionId(id);
              setActivePanel('chat');
            }}
            onDeleteSession={(id) => {
              setSessions(prev => prev.filter(s => s.id !== id));
              if (currentSessionId === id) {
                setCurrentSessionId(null);
              }
            }}
            width={sidebarWidth}
            height={chatHeight + inputHeight}
          />
        )}
        
        {/* Chat Area */}
        <Box flexDirection="column" width={chatWidth}>
          <ChatPanel
            messages={currentSession?.messages || []}
            isLoading={isLoading}
            currentAgent={currentAgent}
            height={chatHeight}
          />
          <InputBox 
            onSubmit={handleSendMessage}
            isLoading={isLoading}
          />
        </Box>
      </Box>
      
      {/* Status Bar */}
      <StatusBar
        currentAgent={currentAgent}
        currentPhase={currentPhase}
        cost={cost}
        tokensUsed={tokensUsed}
        model="claude-3.5-sonnet"
        columns={columns}
      />
      
      {/* Command Palette */}
      {isCommandPaletteOpen && (
        <CommandPalette
          onClose={() => setIsCommandPaletteOpen(false)}
          onExecute={handleCommand}
        />
      )}
    </Box>
  );
};

export default App;
