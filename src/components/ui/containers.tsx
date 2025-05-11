// src/components/ui/containers.tsx
import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Types for common container props
interface ContainerBaseProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

// Main page container with responsive padding
export function PageContainer({
  children,
  className,
  maxWidth = "max-w-7xl",
  ...props
}: ContainerBaseProps & { maxWidth?: string }) {
  return (
    <div 
      className={cn(
        "w-full mx-auto px-4 sm:px-6 lg:px-8",
        maxWidth,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Section container with consistent vertical spacing
export function SectionContainer({
  children,
  className,
  spacing = "py-12 md:py-16",
  ...props
}: ContainerBaseProps & { spacing?: string }) {
  return (
    <section 
      className={cn(
        spacing,
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

// Content container with appropriate max-width for text content
export function ContentContainer({
  children,
  className,
  centered = false,
  ...props
}: ContainerBaseProps & { centered?: boolean }) {
  return (
    <div 
      className={cn(
        "max-w-3xl",
        centered && "mx-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Card container with consistent styling
export function CardContainer({
  children,
  className,
  variant = "default",
  ...props
}: ContainerBaseProps & { 
  variant?: "default" | "elevated" | "interactive" | "feature" 
}) {
  return (
    <div 
      className={cn(
        "rounded-lg border overflow-hidden bg-card text-card-foreground",
        variant === "elevated" && "shadow-md hover:shadow-lg transition-shadow",
        variant === "interactive" && "hover:bg-accent/10 transition-colors cursor-pointer",
        variant === "feature" && "border-primary/20 bg-primary/5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Grid container with responsive behavior
export function GridContainer({
  children,
  className,
  cols = "md",
  gap = "gap-6",
  ...props
}: ContainerBaseProps & { 
  cols?: "sm" | "md" | "lg" | "xl" | string;
  gap?: string;
}) {
  const getColsClass = () => {
    switch (cols) {
      case "sm": return "grid-cols-1 sm:grid-cols-2";
      case "md": return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      case "lg": return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
      case "xl": return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";
      default: return cols; // Custom grid template
    }
  };

  return (
    <div 
      className={cn(
        "grid",
        getColsClass(),
        gap,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Flex row container
export function FlexRow({
  children,
  className,
  align = "center",
  justify = "between",
  gap = "gap-4",
  wrap = false,
  ...props
}: ContainerBaseProps & { 
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  gap?: string;
  wrap?: boolean;
}) {
  return (
    <div 
      className={cn(
        "flex",
        `items-${align}`,
        `justify-${justify}`,
        gap,
        wrap && "flex-wrap",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Flex column container
export function FlexCol({
  children,
  className,
  align = "stretch",
  justify = "start",
  gap = "gap-4",
  ...props
}: ContainerBaseProps & { 
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  gap?: string;
}) {
  return (
    <div 
      className={cn(
        "flex flex-col",
        `items-${align}`,
        `justify-${justify}`,
        gap,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Responsive container that changes from row to column on mobile
export function ResponsiveContainer({
  children,
  className,
  breakpoint = "md",
  reverse = false,
  gap = "gap-6",
  ...props
}: ContainerBaseProps & { 
  breakpoint?: "sm" | "md" | "lg" | "xl";
  reverse?: boolean;
  gap?: string;
}) {
  return (
    <div 
      className={cn(
        "flex flex-col",
        breakpoint === "sm" && "sm:flex-row",
        breakpoint === "md" && "md:flex-row",
        breakpoint === "lg" && "lg:flex-row",
        breakpoint === "xl" && "xl:flex-row",
        reverse && "sm:flex-row-reverse md:flex-row-reverse lg:flex-row-reverse xl:flex-row-reverse",
        gap,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Container for authentication-related UI components
export function AuthContainer({
  children,
  className,
  maxWidth = "max-w-md",
  ...props
}: ContainerBaseProps & { maxWidth?: string }) {
  return (
    <div 
      className={cn(
        "mx-auto p-6 rounded-xl border bg-card shadow-sm",
        maxWidth,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Container for dashboard-style content
export function DashboardContainer({
  children,
  className,
  ...props
}: ContainerBaseProps) {
  return (
    <div 
      className={cn(
        "bg-muted/30 rounded-lg border border-border/50 p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Container for chat UI components
export function ChatContainer({
  children,
  className,
  ...props
}: ContainerBaseProps) {
  return (
    <div 
      className={cn(
        "bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}