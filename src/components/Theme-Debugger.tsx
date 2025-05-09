'use client';

import React from 'react';
import { useTheme } from 'next-themes';

export function ThemeDebugger() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border p-4 rounded-lg shadow-lg z-50">
      <p className="mb-2 text-card-foreground">
        Current theme: <strong>{theme}</strong>
      </p>
      <div className="flex gap-2">
        <button 
          onClick={() => setTheme('light')}
          className="px-3 py-1 bg-primary text-primary-foreground rounded"
        >
          Light
        </button>
        <button 
          onClick={() => setTheme('dark')}
          className="px-3 py-1 bg-primary text-primary-foreground rounded"
        >
          Dark
        </button>
        <button 
          onClick={() => setTheme('system')}
          className="px-3 py-1 bg-muted text-foreground rounded"
        >
          System
        </button>
      </div>
    </div>
  );
}