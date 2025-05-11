// src/components/ui/containers.tsx

import React, { ReactNode } from 'react';

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

// Chat container - main wrapper for the chat interface
export const ChatContainer: React.FC<ContainerProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-w-4xl mx-auto ${className}`}>
      {children}
    </div>
  );
};

// Flexible column layout with customizable gap
type FlexColProps = ContainerProps & {
  gap?: 'gap-2' | 'gap-3' | 'gap-4' | 'gap-6' | 'gap-8';
  justifyContent?: 'justify-start' | 'justify-center' | 'justify-between' | 'justify-end';
  alignItems?: 'items-start' | 'items-center' | 'items-end' | 'items-stretch';
};

export const FlexCol: React.FC<FlexColProps> = ({ 
  children, 
  className = '',
  gap = 'gap-4',
  justifyContent = 'justify-start',
  alignItems = 'items-stretch'
}) => {
  return (
    <div className={`flex flex-col ${gap} ${justifyContent} ${alignItems} ${className}`}>
      {children}
    </div>
  );
};

// Flexible row layout with customizable gap
type FlexRowProps = ContainerProps & {
  gap?: 'gap-2' | 'gap-3' | 'gap-4' | 'gap-6' | 'gap-8';
  justifyContent?: 'justify-start' | 'justify-center' | 'justify-between' | 'justify-end';
  alignItems?: 'items-start' | 'items-center' | 'items-end' | 'items-stretch';
  wrap?: boolean;
};

export const FlexRow: React.FC<FlexRowProps> = ({ 
  children, 
  className = '',
  gap = 'gap-4',
  justifyContent = 'justify-start',
  alignItems = 'items-center',
  wrap = false
}) => {
  return (
    <div className={`flex ${wrap ? 'flex-wrap' : 'flex-nowrap'} ${gap} ${justifyContent} ${alignItems} ${className}`}>
      {children}
    </div>
  );
};