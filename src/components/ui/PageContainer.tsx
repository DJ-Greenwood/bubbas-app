import React from 'react';
import { cn } from '@/lib/utils'; // Assuming cn utility is available

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, className }) => {
  return (
    <div className={cn("container mx-auto px-4 sm:px-6 lg:px-8 py-8", className)}>
      {children}
    </div>
  );
};

export default PageContainer;