'use client';

// This is a sample of how your ThemeProvider component might look.
// If you're using next-themes, it should be similar to this.
// Update your actual component at @/components/theme/theme-provider

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ 
  children, 
  attribute = "data-theme", // Changed default from "class" to "data-theme"
  defaultTheme = "light",
  enableSystem = true,
  disableTransitionOnChange = true,
  themes = ['light', 'dark']
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      themes={themes}
    >
      {children}
    </NextThemesProvider>
  );
}