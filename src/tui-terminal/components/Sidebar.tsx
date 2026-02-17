/**
 * Terminal UI - Sidebar Component
 * 
 * Shows session list and quick actions
 */

import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

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
  width: number;
  height: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  width,
  height
}) => {
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  const items = sessions.map(session => ({
    label: `${session.title} (${session.messageCount})`,
    value: session.id
  }));

  const handleSelect = (item: { label: string; value: string }) => {
    onSelectSession(item.value);
  };

  return (
    <Box 
      width={width} 
      height={height}
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingLeft={1}
    >
      <Box marginBottom={1}>
        <Text color="cyan" bold>Conversations ({sessions.length})</Text>
      </Box>
      
      {sessions.length === 0 ? (
        <Text color="gray">No conversations yet</Text>
      ) : (
        <SelectInput
          items={items}
          onSelect={handleSelect}
        />
      )}
      
      <Box marginTop={2}>
        <Text color="cyan" bold>Quick Actions</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text color="blue">🔍 Search Code</Text>
        <Text color="blue">💡 Find Patterns</Text>
        <Text color="blue">📋 View Decisions</Text>
      </Box>
      
      <Box marginTop={1} marginBottom={1}>
        <Box flexDirection="column">
          <Text color="green">⚡ 18 Agents Active</Text>
          <Text color="magenta">🧠 MemoryLayer Connected</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default Sidebar;
