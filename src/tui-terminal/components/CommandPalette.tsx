/**
 * Terminal UI - Command Palette Component
 * 
 * Modal for executing commands
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';

interface CommandPaletteProps {
  onClose: () => void;
  onExecute: (command: string) => void;
}

const commands = [
  { label: '/new - Start new conversation', value: 'new' },
  { label: '/sessions - List all sessions', value: 'sessions' },
  { label: '/clear - Clear current session', value: 'clear' },
  { label: '/cost - View token usage', value: 'cost' },
  { label: '/exit - Exit application', value: 'exit' }
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onClose,
  onExecute
}) => {
  useInput((input, key) => {
    if (key.escape) {
      onClose();
    }
  });

  const handleSelect = (item: { label: string; value: string }) => {
    onExecute(item.value);
  };

  return (
    <Box 
      borderStyle="double"
      borderColor="yellow"
      padding={1}
      flexDirection="column"
      marginLeft={10}
      marginRight={10}
    >
      <Box marginBottom={1}>
        <Text color="yellow" bold>Command Palette</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="gray">Select a command or press Esc to close</Text>
      </Box>

      <SelectInput
        items={commands}
        onSelect={handleSelect}
      />
    </Box>
  );
};

export default CommandPalette;
