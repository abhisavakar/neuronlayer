/**
 * Terminal UI - Input Box Component
 * 
 * Text input for user messages
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface InputBoxProps {
  onSubmit: (value: string) => void;
  isLoading?: boolean;
}

export const InputBox: React.FC<InputBoxProps> = ({ onSubmit, isLoading }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (submittedValue: string) => {
    if (submittedValue.trim() && !isLoading) {
      onSubmit(submittedValue);
      setValue('');
    }
  };

  return (
    <Box 
      height={3}
      borderStyle="single"
      borderColor="blue"
      paddingLeft={1}
      paddingRight={1}
    >
      <Box flexDirection="row" alignItems="center">
        <Text color="green" bold>{'> '}</Text>
        <Box flexGrow={1}>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder={isLoading ? 'Waiting for response...' : 'Type message or / for commands'}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default InputBox;
