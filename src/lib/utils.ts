// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { colors, spacing, typography } from "@/styles/design-system";

// Utility function for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Type-safe access to design system values with autocompletion
type ColorKey = keyof typeof colors;
type ColorShade = keyof typeof colors.primary;
type SpacingKey = keyof typeof spacing;
type FontSizeKey = keyof typeof typography.fontSize;
type FontWeightKey = keyof typeof typography.fontWeight;

// Type-safe color accessor
export function getColor(color: ColorKey): typeof colors[ColorKey];
export function getColor(color: ColorKey, shade: ColorShade): string;
export function getColor(color: ColorKey, shade?: ColorShade): any {
  if (shade === undefined) {
    return colors[color];
  }
  
  // For semantic colors like success, warning, error, info
  if (typeof colors[color] === 'string') {
    return colors[color];
  }
  
  return colors[color][shade as ColorShade];
}

// Type-safe spacing accessor
export function getSpacing(size: SpacingKey): string {
  return spacing[size];
}

// Type-safe font size accessor
export function getFontSize(size: FontSizeKey): string {
  return typography.fontSize[size];
}

// Type-safe font weight accessor
export function getFontWeight(weight: FontWeightKey): string {
  return typography.fontWeight[weight];
}

// CSS variables accessor for runtime use
export function getCssVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`);
}