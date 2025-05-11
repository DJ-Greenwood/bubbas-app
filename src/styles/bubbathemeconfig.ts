// src/styles/theme-config.ts
/**
 * This file centralizes theme configuration for the Bubbas.AI application.
 * It defines theme types, color palettes, and other design variables that
 * are used throughout the application to maintain a consistent visual language.
 */

// Available theme modes
export type ThemeMode = 'light' | 'dark';

/**
 * Base colors interface defining all color variables used in the theme
 */
export interface ThemeColors {
  // Base UI colors
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  
  // Bubba brand colors
  bubbaBlue: string;
  bubbaLightBlue: string;
  bubbaPurple: string;
  bubbaGreen: string;
  bubbaYellow: string;
  bubbaRed: string;
  
  // Chart colors
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  
  // Sidebar specific colors
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
}

/**
 * Theme configuration interface for non-color values
 */
export interface ThemeConfig {
  // Radius values
  borderRadius: string;
  
  // Typography
  fontSizes: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };
  
  fontWeights: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  
  // Spacing scale
  spacing: {
    '0': string;
    '1': string;
    '2': string;
    '3': string;
    '4': string;
    '5': string;
    '6': string;
    '8': string;
    '10': string;
    '12': string;
    '16': string;
    '20': string;
    '24': string;
    '32': string;
    '40': string;
    '48': string;
    '64': string;
  };
  
  // Profile image dimensions
  profileImageDimensions: {
    width: string;
    height: string;
  };
  
  // Animation durations
  animations: {
    fast: string;
    normal: string;
    slow: string;
  };
}

/**
 * Light theme color palette
 */
export const lightThemeColors: ThemeColors = {
  // Base UI colors
  background: 'hsl(0 0% 100%)',
  foreground: 'hsl(0 0% 3.9%)',
  card: 'hsl(0 0% 100%)',
  cardForeground: 'hsl(0 0% 3.9%)',
  popover: 'hsl(0 0% 100%)',
  popoverForeground: 'hsl(0 0% 3.9%)',
  primary: 'hsl(203 56% 77%)',
  primaryForeground: 'hsl(0 0% 100%)',
  secondary: 'hsl(0 0% 96.1%)',
  secondaryForeground: 'hsl(0 0% 9%)',
  muted: 'hsl(0 0% 96.1%)',
  mutedForeground: 'hsl(0 0% 45.1%)',
  accent: 'hsl(33 100% 74%)',
  accentForeground: 'hsl(0 0% 0%)',
  destructive: 'hsl(0 84.2% 60.2%)',
  destructiveForeground: 'hsl(0 0% 98%)',
  border: 'hsl(0 0% 89.8%)',
  input: 'hsl(0 0% 89.8%)',
  ring: 'hsl(0 0% 3.9%)',
  
  // Bubba brand colors
  bubbaBlue: 'hsl(215 100% 50%)',
  bubbaLightBlue: 'hsl(195 100% 90%)',
  bubbaPurple: 'hsl(260 100% 65%)',
  bubbaGreen: 'hsl(130 70% 50%)',
  bubbaYellow: 'hsl(40 100% 60%)',
  bubbaRed: 'hsl(0 100% 60%)',
  
  // Chart colors
  chart1: 'hsl(12 76% 61%)',
  chart2: 'hsl(173 58% 39%)',
  chart3: 'hsl(197 37% 24%)',
  chart4: 'hsl(43 74% 66%)',
  chart5: 'hsl(27 87% 67%)',
  
  // Sidebar specific colors
  sidebarBackground: 'hsl(0 0% 98%)',
  sidebarForeground: 'hsl(240 5.3% 26.1%)',
  sidebarPrimary: 'hsl(240 5.9% 10%)',
  sidebarPrimaryForeground: 'hsl(0 0% 98%)',
  sidebarAccent: 'hsl(240 4.8% 95.9%)',
  sidebarAccentForeground: 'hsl(240 5.9% 10%)',
  sidebarBorder: 'hsl(220 13% 91%)',
  sidebarRing: 'hsl(217.2 91.2% 59.8%)',
};

/**
 * Dark theme color palette
 */
export const darkThemeColors: ThemeColors = {
  // Base UI colors
  background: 'hsl(0 0% 3.9%)',
  foreground: 'hsl(0 0% 98%)',
  card: 'hsl(0 0% 3.9%)',
  cardForeground: 'hsl(0 0% 98%)',
  popover: 'hsl(0 0% 3.9%)',
  popoverForeground: 'hsl(0 0% 98%)',
  primary: 'hsl(203 56% 77%)',
  primaryForeground: 'hsl(0 0% 0%)',
  secondary: 'hsl(0 0% 14.9%)',
  secondaryForeground: 'hsl(0 0% 98%)',
  muted: 'hsl(0 0% 14.9%)',
  mutedForeground: 'hsl(0 0% 63.9%)',
  accent: 'hsl(33 100% 74%)',
  accentForeground: 'hsl(0 0% 0%)',
  destructive: 'hsl(0 62.8% 30.6%)',
  destructiveForeground: 'hsl(0 0% 98%)',
  border: 'hsl(0 0% 14.9%)',
  input: 'hsl(0 0% 14.9%)',
  ring: 'hsl(0 0% 83.1%)',
  
  // Bubba theme colors - with subtle adjustments for dark mode
  bubbaBlue: 'hsl(215 100% 60%)',
  bubbaLightBlue: 'hsl(195 100% 70%)',
  bubbaPurple: 'hsl(260 100% 75%)',
  bubbaGreen: 'hsl(130 70% 45%)',
  bubbaYellow: 'hsl(40 100% 55%)',
  bubbaRed: 'hsl(0 100% 65%)',
  
  // Chart colors - adjusted for dark mode
  chart1: 'hsl(220 70% 50%)',
  chart2: 'hsl(160 60% 45%)',
  chart3: 'hsl(30 80% 55%)',
  chart4: 'hsl(280 65% 60%)',
  chart5: 'hsl(340 75% 55%)',
  
  // Sidebar specific colors
  sidebarBackground: 'hsl(240 5.9% 10%)',
  sidebarForeground: 'hsl(240 4.8% 95.9%)',
  sidebarPrimary: 'hsl(224.3 76.3% 48%)',
  sidebarPrimaryForeground: 'hsl(0 0% 100%)',
  sidebarAccent: 'hsl(240 3.7% 15.9%)',
  sidebarAccentForeground: 'hsl(240 4.8% 95.9%)',
  sidebarBorder: 'hsl(240 3.7% 15.9%)',
  sidebarRing: 'hsl(217.2 91.2% 59.8%)',
};

/**
 * Shared theme configuration for both light and dark modes
 */
export const themeConfig: ThemeConfig = {
  borderRadius: '0.5rem',
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  spacing: {
    '0': '0',
    '1': '0.25rem',
    '2': '0.5rem',
    '3': '0.75rem',
    '4': '1rem',
    '5': '1.25rem',
    '6': '1.5rem',
    '8': '2rem',
    '10': '2.5rem',
    '12': '3rem',
    '16': '4rem',
    '20': '5rem',
    '24': '6rem',
    '32': '8rem',
    '40': '10rem',
    '48': '12rem',
    '64': '16rem',
  },
  profileImageDimensions: {
    width: '16px',
    height: '16px',
  },
  animations: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
};

/**
 * Helper function to convert a theme object to CSS variables
 * @param theme The theme to convert (light or dark)
 * @returns CSS variable string ready to be inserted in a style block
 */
export function generateThemeVariables(theme: 'light' | 'dark'): string {
  const colors = theme === 'light' ? lightThemeColors : darkThemeColors;
  
  // Convert our theme object to CSS variables
  let cssVars = '';
  
  // Add color variables
  Object.entries(colors).forEach(([key, value]) => {
    cssVars += `  --${kebabCase(key)}: ${value};\n`;
  });
  
  // Add config variables
  cssVars += `  --radius: ${themeConfig.borderRadius};\n`;
  cssVars += `  --profile-image-width: ${themeConfig.profileImageDimensions.width};\n`;
  cssVars += `  --profile-image-height: ${themeConfig.profileImageDimensions.height};\n`;
  
  // Add typography variables
  Object.entries(themeConfig.fontSizes).forEach(([key, value]) => {
    cssVars += `  --text-${key}: ${value};\n`;
  });
  
  // Add animation durations
  Object.entries(themeConfig.animations).forEach(([key, value]) => {
    cssVars += `  --animation-${key}: ${value};\n`;
  });
  
  return cssVars;
}

/**
 * Generate a complete CSS stylesheet for both themes
 * @returns Complete CSS with light and dark theme variables
 */
export function generateThemeStylesheet(): string {
  const lightVars = generateThemeVariables('light');
  const darkVars = generateThemeVariables('dark');
  
  return `
:root {
${lightVars}
}

[data-theme="dark"] {
${darkVars}
}
  `;
}

/**
 * Helper to convert camelCase to kebab-case for CSS variables
 */
function kebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Get a specific theme color as an HSL CSS variable reference
 * @param colorName The color name from ThemeColors
 * @returns The CSS variable reference (e.g., 'hsl(var(--primary))')
 */
export function getThemeColor(colorName: keyof ThemeColors): string {
  return `hsl(var(--${kebabCase(colorName)}))`;
}

/**
 * Get a specific theme color with opacity as an HSLA CSS variable reference
 * @param colorName The color name from ThemeColors
 * @param opacity The opacity value (0-100)
 * @returns The CSS variable reference with opacity (e.g., 'hsl(var(--primary) / 50%)')
 */
export function getThemeColorWithOpacity(colorName: keyof ThemeColors, opacity: number): string {
  // Ensure opacity is between 0 and 100
  const normalizedOpacity = Math.max(0, Math.min(100, opacity));
  return `hsl(var(--${kebabCase(colorName)}) / ${normalizedOpacity}%)`;
}

/**
 * Generate a gradient string using theme colors
 * @param direction The gradient direction (e.g., 'to right', '135deg')
 * @param from First color name
 * @param to Second color name
 * @param fromOpacity Optional opacity for first color (0-100)
 * @param toOpacity Optional opacity for second color (0-100)
 * @returns CSS gradient string
 */
export function generateGradient(
  direction: string,
  from: keyof ThemeColors,
  to: keyof ThemeColors,
  fromOpacity?: number,
  toOpacity?: number
): string {
  const fromColor = fromOpacity !== undefined 
    ? getThemeColorWithOpacity(from, fromOpacity)
    : getThemeColor(from);
    
  const toColor = toOpacity !== undefined
    ? getThemeColorWithOpacity(to, toOpacity)
    : getThemeColor(to);
    
  return `linear-gradient(${direction}, ${fromColor} 0%, ${toColor} 100%)`;
}