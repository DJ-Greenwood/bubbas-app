import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names using clsx and tailwind-merge
 * This ensures Tailwind classes are properly merged without conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date as a readable string
 */
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a timestamp in a readable way
 */
export function formatTime(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format file size into human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Debounce a function to avoid excessive calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}

/**
 * Truncate text with ellipsis if it exceeds the specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Safely access localStorage, checking for environment availability.
 */
const isLocalStorageAvailable = typeof window !== 'undefined' && window.localStorage;

export const safeLocalStorage = {
  /**
   * Get an item from localStorage.
   * @param key The key of the item to retrieve.
   * @returns The item as a string, or null if not found or localStorage is unavailable.
   */
  get(key: string): string | null {
    if (!isLocalStorageAvailable) return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error("Error getting item from localStorage:", e);
      return null;
    }
  },

  /**
   * Set an item in localStorage.
   * @param key The key of the item.
   * @param value The value of the item (will be converted to string).
   */
  set(key: string, value: string): void {
    if (!isLocalStorageAvailable) return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error("Error setting item in localStorage:", e);
    }
  },

  /**
   * Remove an item from localStorage.
   * @param key The key of the item to remove.
   */
  remove(key: string): void {
    if (!isLocalStorageAvailable) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error("Error removing item from localStorage:", e);
    }
  },

  /**
   * Clear all items from localStorage.
   */
  clear(): void {
    if (!isLocalStorageAvailable) return;
    try {
      localStorage.clear();
    } catch (e) {
      console.error("Error clearing localStorage:", e);
    }
  },
};