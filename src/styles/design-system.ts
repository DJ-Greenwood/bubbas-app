// src/styles/design-system.ts

/**
 * Bubba.AI Design System
 * 
 * This file contains design tokens and utility functions to maintain
 * consistent styling across the application.
 */

// Color Palette
export const colors = {
    // Primary brand colors
    primary: {
      50: 'var(--color-primary-50, #eff6ff)',
      100: 'var(--color-primary-100, #dbeafe)',
      200: 'var(--color-primary-200, #bfdbfe)',
      300: 'var(--color-primary-300, #93c5fd)',
      400: 'var(--color-primary-400, #60a5fa)',
      500: 'var(--color-primary-500, #3b82f6)',
      600: 'var(--color-primary-600, #2563eb)',
      700: 'var(--color-primary-700, #1d4ed8)',
      800: 'var(--color-primary-800, #1e40af)',
      900: 'var(--color-primary-900, #1e3a8a)',
      950: 'var(--color-primary-950, #172554)',
    },
    
    // Neutral colors for text, backgrounds, etc.
    neutral: {
      50: 'var(--color-neutral-50, #f9fafb)',
      100: 'var(--color-neutral-100, #f3f4f6)',
      200: 'var(--color-neutral-200, #e5e7eb)',
      300: 'var(--color-neutral-300, #d1d5db)',
      400: 'var(--color-neutral-400, #9ca3af)',
      500: 'var(--color-neutral-500, #6b7280)',
      600: 'var(--color-neutral-600, #4b5563)',
      700: 'var(--color-neutral-700, #374151)',
      800: 'var(--color-neutral-800, #1f2937)',
      900: 'var(--color-neutral-900, #111827)',
      950: 'var(--color-neutral-950, #030712)',
    },
    
    // Semantic colors
    success: 'var(--color-success, #10b981)',
    warning: 'var(--color-warning, #f59e0b)',
    error: 'var(--color-error, #ef4444)',
    info: 'var(--color-info, #3b82f6)',
    
    // UI component-specific colors
    sidebar: 'var(--color-sidebar, #f9fafb)',
    sidebarText: 'var(--color-sidebar-text, #374151)',
    card: 'var(--color-card, #ffffff)',
    cardBorder: 'var(--color-card-border, #e5e7eb)',
    
    // Status-specific colors
    userMessage: 'var(--color-user-message, #eff6ff)',
    aiMessage: 'var(--color-ai-message, #ffffff)',
  };
  
  // Typography
  export const typography = {
    fontFamily: {
      sans: 'var(--font-family-sans, "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)',
      mono: 'var(--font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    },
    fontSize: {
      xs: 'var(--font-size-xs, 0.75rem)',      // 12px
      sm: 'var(--font-size-sm, 0.875rem)',     // 14px
      base: 'var(--font-size-base, 1rem)',     // 16px
      lg: 'var(--font-size-lg, 1.125rem)',     // 18px
      xl: 'var(--font-size-xl, 1.25rem)',      // 20px
      '2xl': 'var(--font-size-2xl, 1.5rem)',   // 24px
      '3xl': 'var(--font-size-3xl, 1.875rem)', // 30px
      '4xl': 'var(--font-size-4xl, 2.25rem)',  // 36px
    },
    fontWeight: {
      normal: 'var(--font-weight-normal, 400)',
      medium: 'var(--font-weight-medium, 500)',
      semibold: 'var(--font-weight-semibold, 600)',
      bold: 'var(--font-weight-bold, 700)',
    },
    lineHeight: {
      none: 'var(--line-height-none, 1)',
      tight: 'var(--line-height-tight, 1.25)',
      normal: 'var(--line-height-normal, 1.5)',
      relaxed: 'var(--line-height-relaxed, 1.75)',
    },
  };
  
  // Spacing system
  export const spacing = {
    0: '0px',
    0.5: 'var(--spacing-0-5, 0.125rem)',   // 2px
    1: 'var(--spacing-1, 0.25rem)',        // 4px
    1.5: 'var(--spacing-1-5, 0.375rem)',   // 6px
    2: 'var(--spacing-2, 0.5rem)',         // 8px
    2.5: 'var(--spacing-2-5, 0.625rem)',   // 10px
    3: 'var(--spacing-3, 0.75rem)',        // 12px
    3.5: 'var(--spacing-3-5, 0.875rem)',   // 14px
    4: 'var(--spacing-4, 1rem)',           // 16px
    5: 'var(--spacing-5, 1.25rem)',        // 20px
    6: 'var(--spacing-6, 1.5rem)',         // 24px
    8: 'var(--spacing-8, 2rem)',           // 32px
    10: 'var(--spacing-10, 2.5rem)',       // 40px
    12: 'var(--spacing-12, 3rem)',         // 48px
    16: 'var(--spacing-16, 4rem)',         // 64px
    20: 'var(--spacing-20, 5rem)',         // 80px
    24: 'var(--spacing-24, 6rem)',         // 96px
  };
  
  // Border radius
  export const borderRadius = {
    none: '0px',
    sm: 'var(--radius-sm, 0.125rem)',      // 2px
    md: 'var(--radius-md, 0.375rem)',      // 6px
    lg: 'var(--radius-lg, 0.5rem)',        // 8px
    xl: 'var(--radius-xl, 0.75rem)',       // 12px
    '2xl': 'var(--radius-2xl, 1rem)',      // 16px
    '3xl': 'var(--radius-3xl, 1.5rem)',    // 24px
    full: 'var(--radius-full, 9999px)',
  };
  
  // Shadows
  export const shadows = {
    sm: 'var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05))',
    md: 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06))',
    lg: 'var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05))',
    xl: 'var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04))',
    '2xl': 'var(--shadow-2xl, 0 25px 50px -12px rgba(0, 0, 0, 0.25))',
    inner: 'var(--shadow-inner, inset 0 2px 4px 0 rgba(0, 0, 0, 0.06))',
    none: 'none',
  };
  
  // Transitions
  export const transitions = {
    default: 'var(--transition-default, 150ms cubic-bezier(0.4, 0, 0.2, 1))',
    slow: 'var(--transition-slow, 300ms cubic-bezier(0.4, 0, 0.2, 1))',
    fast: 'var(--transition-fast, 100ms cubic-bezier(0.4, 0, 0.2, 1))',
  };
  
  // Z-index scale
  export const zIndex = {
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    auto: 'auto',
  };
  
  // Breakpoints for responsive design
  export const breakpoints = {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  };
  
  // Component-specific styling
  export const components = {
    chat: {
      container: `
        bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10
        border border-gray-300 rounded-lg p-4 shadow-md
      `,
      header: `
        flex items-center gap-2 mb-4
      `,
      userMessage: `
        p-3 rounded-lg bg-blue-100 ml-8 mb-3
      `,
      aiMessage: `
        p-3 rounded-lg bg-white mr-8 mb-3
      `,
      inputContainer: `
        relative mt-4
      `,
      chatHistory: `
        mt-4 space-y-4 max-h-96 overflow-y-auto p-2 mb-4
      `,
    },
    
    buttons: {
      primary: `
        bg-primary-600 hover:bg-primary-700 text-white
        px-4 py-2 rounded-md transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
      `,
      secondary: `
        bg-neutral-200 hover:bg-neutral-300 text-neutral-800
        px-4 py-2 rounded-md transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
      `,
      danger: `
        bg-error hover:bg-red-600 text-white
        px-4 py-2 rounded-md transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
      `,
      icon: `
        p-2 rounded-full hover:bg-neutral-100
        transition-colors
      `,
    },
    
    cards: {
      default: `
        bg-white border border-gray-200 rounded-lg shadow-sm p-4
      `,
      interactive: `
        bg-white border border-gray-200 rounded-lg shadow-sm p-4
        hover:shadow-md transition-shadow
      `,
    },
    
    inputs: {
      default: `
        w-full p-3 rounded-lg border border-gray-300 
        focus:border-primary-500 focus:ring-1 focus:ring-primary-500
        focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
      `,
    },
  };
  
  // Utility function to generate responsive classes
  export const responsive = (baseClass: string, breakpoint: keyof typeof breakpoints) => {
    return `${baseClass} ${breakpoint}:${baseClass}`;
  };
  
  // Function to generate color classes based on the design system
  export const colorClass = (colorName: string, shade?: number | string) => {
    if (shade) {
      return `var(--color-${colorName}-${shade})`;
    }
    return `var(--color-${colorName})`;
  };