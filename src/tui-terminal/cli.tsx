#!/usr/bin/env node
/**
 * Terminal UI Entry Point
 * 
 * Renders the Ink-based terminal application
 */

import React from 'react';
import { render } from 'ink';
import App from './App.js';

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Render the terminal UI
render(<App />);
