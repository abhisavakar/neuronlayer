/**
 * Terminal UI - Chat Panel Component
 * 
 * Displays chat messages with scrolling
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Static } from 'ink';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agent?: string;
}

interface ChatPanelProps {
  messages: Message[];
  isLoading?: boolean;
  currentAgent?: string;
  height: number;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isLoading,
  currentAgent,
  height
}) => {
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box 
      flexDirection="column" 
      height={height}
      borderStyle="single"
      borderColor="gray"
      paddingLeft={1}
      paddingRight={1}
    >
      {messages.length === 0 ? (
        <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
          <Text color="green" bold>🚀 Welcome to MemoryLayer</Text>
          <Text color="gray">Start typing to begin a conversation</Text>
          <Text color="gray">Press / for commands, Ctrl+C to exit</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {messages.map((message) => (
            <Box key={message.id} flexDirection="column" marginBottom={1}>
              <Box flexDirection="row">
                <Text color={message.role === 'user' ? 'cyan' : 'green'} bold>
                  {message.role === 'user' ? '👤 User' : `🤖 Assistant`}
                </Text>
                {message.agent && (
                  <Text color="yellow"> ({message.agent})</Text>
                )}
                <Text color="gray"> - {formatTime(message.timestamp)}</Text>
              </Box>
              <Box marginLeft={2}>
                <Text>{message.content}</Text>
              </Box>
            </Box>
          ))}
          
          {isLoading && currentAgent && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="yellow">
                🔬 {currentAgent} is thinking...
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ChatPanel;
