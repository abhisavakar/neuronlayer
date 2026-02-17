/**
 * Terminal UI - Header Component
 * 
 * Top navigation bar with title and branding
 */

import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  sessionTitle?: string;
  columns: number;
}

export const Header: React.FC<HeaderProps> = ({ sessionTitle, columns }) => {
  const leftContent = '🧠 MemoryLayer';
  const rightContent = '18 Agents ⚡';
  const middleContent = sessionTitle || '';
  
  // Calculate spacing
  const leftWidth = leftContent.length;
  const rightWidth = rightContent.length;
  const middleWidth = middleContent.length;
  const availableSpace = columns - leftWidth - rightWidth - 4; // 4 for padding
  const leftPadding = Math.floor((availableSpace - middleWidth) / 2);
  
  return (
    <Box 
      height={3} 
      borderStyle="single" 
      borderColor="green"
      paddingLeft={1}
      paddingRight={1}
    >
      <Box width={leftWidth}>
        <Text color="green" bold>{leftContent}</Text>
      </Box>
      
      <Box flexGrow={1} justifyContent="center">
        {middleContent && (
          <Text color="cyan">{middleContent}</Text>
        )}
      </Box>
      
      <Box width={rightWidth}>
        <Text color="yellow">{rightContent}</Text>
      </Box>
    </Box>
  );
};

export default Header;
