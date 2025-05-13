import React from "react";

interface FlexRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const FlexRow: React.FC<FlexRowProps> = ({ children, className = "", ...props }) => (
  <div className={`flex flex-row items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);

export default FlexRow;
