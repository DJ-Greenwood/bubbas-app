// src/utils/accessibility.tsx
import React, { FC } from 'react';

/**
 * Accessibility utilities for ensuring the app is usable by all users
 */

// Check if high contrast mode is enabled
export const isHighContrastMode = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches;
  };
  
  // Check if reduced motion is enabled
  export const isReducedMotion = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };
  
  // Apply focus styles for keyboard navigation
  export const getFocusRingClasses = (isActive: boolean = false): string => {
    return isActive
      ? 'outline-none ring-2 ring-offset-2 ring-primary-500'
      : 'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500';
  };
  
  // Generate proper ARIA attributes for common UI patterns
  export const getAriaAttributes = (
    type: 'button' | 'tab' | 'checkbox' | 'dialog' | 'menu' | 'listitem',
    props: Record<string, any> = {}
  ): Record<string, any> => {
    const baseAttrs: Record<string, any> = {};
    
    switch (type) {
      case 'button':
        baseAttrs['role'] = 'button';
        baseAttrs['tabIndex'] = props.disabled ? -1 : 0;
        if (props.disabled) baseAttrs['aria-disabled'] = true;
        break;
        
      case 'tab':
        baseAttrs['role'] = 'tab';
        baseAttrs['aria-selected'] = props.selected || false;
        baseAttrs['tabIndex'] = props.selected ? 0 : -1;
        if (props.controls) baseAttrs['aria-controls'] = props.controls;
        break;
        
      case 'checkbox':
        baseAttrs['role'] = 'checkbox';
        baseAttrs['aria-checked'] = props.checked || false;
        baseAttrs['tabIndex'] = 0;
        break;
        
      case 'dialog':
        baseAttrs['role'] = 'dialog';
        baseAttrs['aria-modal'] = true;
        baseAttrs['aria-labelledby'] = props.labelledby;
        baseAttrs['aria-describedby'] = props.describedby;
        break;
        
      case 'menu':
        baseAttrs['role'] = 'menu';
        break;
        
      case 'listitem':
        baseAttrs['role'] = 'listitem';
        break;
    }
    
    return { ...baseAttrs, ...props };
  };
  
  // Screen reader only text (visually hidden)
  export const ScreenReaderText: FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <span className="sr-only">
        {children}
      </span>
    );
  };
  
  // Add announcement for screen readers
  export const announceToScreenReader = (message: string): void => {
    if (typeof document === 'undefined') return;
    
    const announce = document.createElement('div');
    announce.setAttribute('aria-live', 'assertive');
    announce.setAttribute('aria-atomic', 'true');
    announce.className = 'sr-only';
    announce.textContent = message;
    
    document.body.appendChild(announce);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announce);
    }, 3000);
  };