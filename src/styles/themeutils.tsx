// src/compnents/styles/theme-utils.ts

/**
 * Theme utilities for Bubbas.AI
 * 
 * This file contains helper functions for working with themes,
 * including the script to prevent flash of incorrect theme,
 * CSS helpers, and other theme-related utilities.
 */

import { safeLocalStorage } from '@/lib/utils';

/**
 * The key used to store the theme in localStorage
 */
export const THEME_STORAGE_KEY = 'bubbas-theme';

/**
 * Script to inject into HTML to prevent flash of wrong theme
 * This should be injected in the <head> of the document
 */
export const themeDetectionScript = `
(function() {
  try {
    const storedTheme = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', storedTheme);
      return;
    }
    
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } catch (error) {
    // Fallback to light theme
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

/**
 * CSS to disable transitions temporarily
 * This is useful when changing themes to prevent animation flicker
 */
export const transitionDisableCSS = `
.disable-transitions,
.disable-transitions * {
  transition: none !important;
}
`;

/**
 * Get a CSS variable from the current theme
 * 
 * @param variableName - The CSS variable name without the leading --
 * @param fallback - Optional fallback value
 * @returns The CSS variable value
 * 
 * @example
 * // Returns "var(--primary)"
 * getCssVariable('primary')
 * 
 * @example
 * // Returns "var(--primary, #3b82f6)"
 * getCssVariable('primary', '#3b82f6')
 */
export function getCssVariable(variableName: string, fallback?: string): string {
  if (fallback) {
    return `var(--${variableName}, ${fallback})`;
  }
  return `var(--${variableName})`;
}

/**
 * Get an HSL color from CSS variables
 * 
 * @param colorVariable - The CSS variable name (without --)
 * @param opacity - Optional opacity value (0-100)
 * @returns HSL/HSLA string
 * 
 * @example
 * // Returns "hsl(var(--primary))"
 * getHslVariable('primary')
 * 
 * @example
 * // Returns "hsl(var(--primary) / 50%)"
 * getHslVariable('primary', 50)
 */
export function getHslVariable(colorVariable: string, opacity?: number): string {
  if (opacity !== undefined) {
    // Normalize opacity to 0-100 range
    const normalizedOpacity = Math.max(0, Math.min(100, opacity));
    return `hsl(var(--${colorVariable}) / ${normalizedOpacity}%)`;
  }
  return `hsl(var(--${colorVariable}))`;
}

/**
 * Create a CSS gradient using theme variables
 * 
 * @param direction - The gradient direction (e.g., "to right", "45deg")
 * @param fromColor - Starting color variable
 * @param toColor - Ending color variable
 * @param fromOpacity - Optional starting opacity (0-100)
 * @param toOpacity - Optional ending opacity (0-100)
 * @returns CSS gradient string
 * 
 * @example
 * // Returns "linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))"
 * createGradient("to right", "primary", "accent")
 */
export function createGradient(
  direction: string,
  fromColor: string,
  toColor: string,
  fromOpacity?: number,
  toOpacity?: number
): string {
  const from = getHslVariable(fromColor, fromOpacity);
  const to = getHslVariable(toColor, toOpacity);
  
  return `linear-gradient(${direction}, ${from}, ${to})`;
}

/**
 * Get the current theme from localStorage
 * 
 * @param defaultTheme - Fallback theme if none is stored
 * @returns The current theme ('light' or 'dark')
 */
export function getStoredTheme(defaultTheme: 'light' | 'dark' = 'light'): 'light' | 'dark' {
  const theme = safeLocalStorage.get(THEME_STORAGE_KEY);
  return (theme === 'light' || theme === 'dark') ? theme : defaultTheme;
}

/**
 * Save theme preference to localStorage
 * 
 * @param theme - The theme to save ('light' or 'dark')
 * @returns Whether the operation was successful
 */
export function saveTheme(theme: 'light' | 'dark'): boolean {
  safeLocalStorage.set(THEME_STORAGE_KEY, theme);
  return true; // Assuming set is always successful or error handling is internal
}

/**
 * Detect if user prefers dark mode from system settings
 * 
 * @returns true if system is set to dark mode, false otherwise
 */
export function isSystemDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get the appropriate theme-specific value
 * 
 * @param lightValue - Value to use in light theme
 * @param darkValue - Value to use in dark theme
 * @param currentTheme - Optional current theme (will be detected if not provided)
 * @returns The appropriate value for the current theme
 * 
 * @example
 * // Returns "white" in light mode and "black" in dark mode
 * getThemeValue("white", "black")
 */
export function getThemeValue<T>(lightValue: T, darkValue: T, currentTheme?: 'light' | 'dark'): T {
  const theme = currentTheme || getStoredTheme();
  return theme === 'dark' ? darkValue : lightValue;
}