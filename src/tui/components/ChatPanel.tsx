/**
 * Chat Panel Component
 * 
 * Wrapper around ChatInterface for the TUI layout
 */

import React from 'react';
import { ChatInterface } from '../../ui/components/ChatInterface.js';
import type { ToolCall } from '../../tools/types.js';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
  agent?: string;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  currentAgent?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  isLoading,
  currentAgent
}) => {
  return (
    <div style={styles.container}>
      <ChatInterface
        messages={messages}
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        currentAgent={currentAgent}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden'
  }
};

export default ChatPanel;
