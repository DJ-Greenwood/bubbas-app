// src/components/ui/SectionContainer.tsx

import React from 'react';
import { cn } from '@/lib/utils';

interface SectionContainerProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const SectionContainer = ({ children, className, ...props }: SectionContainerProps) => {
  return (
    <section
      className={cn('bg-white rounded-lg shadow-sm p-6', className)}
      {...props}
    >
      {children}
    </section>
  );
};
