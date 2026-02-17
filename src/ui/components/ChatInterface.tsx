/**
 * Chat Interface Component
 * 
 * Main chat UI with messages, tool calls, and input
 */

import React, { useState, useRef, useEffect } from 'react';
import type { ToolCall } from '../../tools/types.js';
import { ToolCallCard } from './ToolCallCard.js';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
  agent?: string; // Which agent sent this (for assistant messages)
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  currentAgent?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading = false,
  currentAgent
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
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
  
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div style={styles.container}>
      {/* Messages Area */}
      <div style={styles.messages}>
        {messages.map((message) => (
          <div 
            key={message.id} 
            style={{
              ...styles.message,
              ...(message.role === 'user' ? styles.userMessage : {}),
              ...(message.role === 'assistant' ? styles.assistantMessage : {}),
              ...(message.role === 'system' ? styles.systemMessage : {})
            }}
          >
            {/* Message Header */}
            <div style={styles.messageHeader}>
              <span style={styles.messageIcon}>
                {message.role === 'user' && '👤'}
                {message.role === 'assistant' && getAgentIcon(message.agent)}
                {message.role === 'system' && 'ℹ️'}
              </span>
              <span style={styles.messageRole}>
                {message.role === 'user' && 'You'}
                {message.role === 'assistant' && (message.agent || 'Assistant')}
                {message.role === 'system' && 'System'}
              </span>
              <span style={styles.messageTime}>{formatTime(message.timestamp)}</span>
            </div>
            
            {/* Message Content */}
            <div style={styles.messageContent}>{message.content}</div>
            
            {/* Tool Calls */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div style={styles.toolCalls}>
                {message.toolCalls.map((toolCall) => (
                  <ToolCallCard key={toolCall.id} toolCall={toolCall} />
                ))}
              </div>
            )}
          </div>
        ))}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div style={styles.loadingMessage}>
            <div style={styles.messageHeader}>
              <span style={styles.messageIcon}>{getAgentIcon(currentAgent)}</span>
              <span style={styles.messageRole}>{currentAgent || 'Assistant'}</span>
            </div>
            <div style={styles.typingIndicator}>
              <span style={styles.dot}></span>
              <span style={styles.dot}></span>
              <span style={styles.dot}></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div style={styles.inputArea}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Shift+Enter for new line)"
          style={styles.input}
          rows={3}
          disabled={isLoading}
        />
        <button 
          onClick={handleSend} 
          disabled={!input.trim() || isLoading}
          style={{
            ...styles.sendButton,
            ...(input.trim() && !isLoading ? styles.sendButtonActive : {})
          }}
        >
          Send
        </button>
      </div>
      
      {/* Footer Info */}
      <div style={styles.footer}>
        <span style={styles.footerHint}>Press Enter to send, Shift+Enter for new line</span>
        {currentAgent && (
          <span style={styles.currentAgent}>
            {getAgentIcon(currentAgent)} {currentAgent}
          </span>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#0d1117',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  messages: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  message: {
    maxWidth: '85%',
    padding: '12px 16px',
    borderRadius: '12px',
    backgroundColor: '#21262d'
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#1f6feb',
    color: '#fff'
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#21262d',
    color: '#c9d1d9'
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: '#161b22',
    color: '#8b949e',
    fontSize: '12px',
    fontStyle: 'italic'
  },
  messageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px'
  },
  messageIcon: {
    fontSize: '14px'
  },
  messageRole: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'capitalize'
  },
  messageTime: {
    fontSize: '11px',
    color: '#8b949e',
    marginLeft: 'auto'
  },
  messageContent: {
    fontSize: '14px',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap'
  },
  toolCalls: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  loadingMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#21262d',
    padding: '12px 16px',
    borderRadius: '12px',
    maxWidth: '85%'
  },
  typingIndicator: {
    display: 'flex',
    gap: '4px',
    padding: '8px 0'
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#8b949e',
    animation: 'bounce 1.4s infinite ease-in-out both'
  },
  inputArea: {
    padding: '16px',
    borderTop: '1px solid #30363d',
    backgroundColor: '#161b22'
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #30363d',
    backgroundColor: '#0d1117',
    color: '#c9d1d9',
    fontSize: '14px',
    resize: 'none',
    fontFamily: 'inherit',
    marginBottom: '8px'
  },
  sendButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#21262d',
    color: '#8b949e',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'not-allowed',
    float: 'right'
  },
  sendButtonActive: {
    backgroundColor: '#238636',
    color: '#fff',
    cursor: 'pointer'
  },
  footer: {
    padding: '8px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderTop: '1px solid #21262d'
  },
  footerHint: {
    fontSize: '11px',
    color: '#6e7681'
  },
  currentAgent: {
    fontSize: '12px',
    color: '#8b949e',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }
};

export default ChatInterface;
