// src/utils/responsive.ts
import React from 'react';

/**
 * Utility functions for responsive design
 */

// Detect mobile device
export const isMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  };
  
  // Detect tablet device
  export const isTablet = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  };
  
  // Detect desktop device
  export const isDesktop = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1024;
  };
  
  // Hook to get current viewport size
  export const useViewport = () => {
    const [width, setWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
    const [height, setHeight] = React.useState(typeof window !== 'undefined' ? window.innerHeight : 768);
  
    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      
      const handleWindowResize = () => {
        setWidth(window.innerWidth);
        setHeight(window.innerHeight);
      };
      
      window.addEventListener("resize", handleWindowResize);
      return () => window.removeEventListener("resize", handleWindowResize);
    }, []);
  
    return { width, height };
  };
  
  // Get responsive class based on screen size
  export const getResponsiveClass = (
    base: string, 
    sm?: string, 
    md?: string, 
    lg?: string, 
    xl?: string
  ) => {
    let classes = base;
    
    if (sm) classes += ` sm:${sm}`;
    if (md) classes += ` md:${md}`;
    if (lg) classes += ` lg:${lg}`;
    if (xl) classes += ` xl:${xl}`;
    
    return classes;
  };
  
  // Responsive size utility
  export const getResponsiveSize = (
    defaultSize: number,
    breakpoints: {
      sm?: number;
      md?: number;
      lg?: number;
      xl?: number;
    }
  ) => {
    if (typeof window === 'undefined') return defaultSize;
    
    const width = window.innerWidth;
    
    if (width >= 1280 && breakpoints.xl) return breakpoints.xl;
    if (width >= 1024 && breakpoints.lg) return breakpoints.lg;
    if (width >= 768 && breakpoints.md) return breakpoints.md;
    if (width >= 640 && breakpoints.sm) return breakpoints.sm;
    
    return defaultSize;
  };