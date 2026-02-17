/**
 * Terminal Size Hook
 * 
 * Tracks terminal dimensions for responsive layout
 */

import { useState, useEffect } from 'react';

interface TerminalSize {
  columns: number;
  rows: number;
}

export const useTerminalSize = (): TerminalSize => {
  const [size, setSize] = useState<TerminalSize>({
    columns: 80,
    rows: 24
  });

  useEffect(() => {
    const updateSize = () => {
      if (process.stdout && !process.stdout.isTTY) {
        setSize({ columns: 100, rows: 30 });
        return;
      }
      
      const cols = process.stdout?.columns || 80;
      const rows = process.stdout?.rows || 24;
      setSize({ columns: cols, rows: rows });
    };

    updateSize();

    if (process.stdout) {
      process.stdout.on('resize', updateSize);
    }

    return () => {
      if (process.stdout) {
        process.stdout.off('resize', updateSize);
      }
    };
  }, []);

  return size;
};

export default useTerminalSize;
