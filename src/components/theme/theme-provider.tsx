"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  attribute?: string;
  themes?: string[];
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  systemTheme: "dark" | "light" | null;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  systemTheme: null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
  themes = ["light", "dark"],
  attribute = "data-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove any class or attribute that might have been applied
    root.removeAttribute(attribute);
    
    // Check for saved theme preference in localStorage
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    
    if (savedTheme) {
      setThemeState(savedTheme);
    } else {
      setThemeState(defaultTheme);
    }
  }, [attribute, defaultTheme]);

  useEffect(() => {
    if (disableTransitionOnChange) {
      document.documentElement.classList.add("disable-transitions");
      
      // Remove the class after transitions are completed (approx 200ms)
      const timeout = setTimeout(() => {
        document.documentElement.classList.remove("disable-transitions");
      }, 200);
      
      return () => clearTimeout(timeout);
    }
  }, [theme, disableTransitionOnChange]);

  useEffect(() => {
    // Listen for system theme changes
    if (enableSystem) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      
      const onSystemThemeChange = () => {
        const newSystemTheme = mediaQuery.matches ? "dark" : "light";
        setSystemTheme(newSystemTheme);
        
        if (theme === "system") {
          document.documentElement.setAttribute(
            attribute,
            newSystemTheme
          );
        }
      };
      
      // Set initial system theme
      onSystemThemeChange();
      
      // Listen for changes
      mediaQuery.addEventListener("change", onSystemThemeChange);
      
      return () => {
        mediaQuery.removeEventListener("change", onSystemThemeChange);
      };
    }
  }, [theme, attribute, enableSystem]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Apply the theme to the document
    if (theme === "system" && enableSystem) {
      if (systemTheme) {
        root.setAttribute(attribute, systemTheme);
      }
    } else {
      root.setAttribute(attribute, theme);
    }
  }, [theme, systemTheme, attribute, enableSystem]);

  const setTheme = (theme: Theme) => {
    localStorage.setItem("theme", theme);
    setThemeState(theme);
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme, systemTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  
  return context;
};