/**
 * Terminal UI - Status Bar Component
 * 
 * Shows current state and progress at bottom
 */

import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  currentAgent?: string;
  currentPhase?: string;
  cost: number;
  tokensUsed: number;
  model?: string;
  columns: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  currentAgent,
  currentPhase,
  cost,
  tokensUsed,
  model,
  columns
}) => {
  const agentDisplay = currentAgent 
    ? `Agent: ${currentAgent}` 
    : 'Agent: idle';
  const phaseDisplay = currentPhase 
    ? `| Phase: ${currentPhase}` 
    : '';
  const costDisplay = `Cost: $${cost.toFixed(4)}`;
  const tokensDisplay = `Tokens: ${tokensUsed}`;
  
  return (
    <Box 
      height={3}
      borderStyle="single"
      borderColor="blue"
      paddingLeft={1}
      paddingRight={1}
    >
      <Box width="40%">
        <Text color="cyan">
          {agentDisplay} {phaseDisplay}
        </Text>
      </Box>
      
      <Box flexGrow={1} justifyContent="center">
        {model && (
          <Text color="gray">{model}</Text>
        )}
      </Box>
      
      <Box width="30%" justifyContent="flex-end">
        <Text color="yellow">{costDisplay}</Text>
        <Text> | </Text>
        <Text color="green">{tokensDisplay}</Text>
      </Box>
    </Box>
  );
};

export default StatusBar;
