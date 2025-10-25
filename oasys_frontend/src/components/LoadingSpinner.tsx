
import React from 'react';
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  
  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <svg 
        className="animate-rotate" 
        viewBox="0 0 50 50"
      >
        <circle
          className="animate-dash stroke-primary/30"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="80, 200"
        />
        <circle
          className="stroke-primary"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="30, 200"
        />
      </svg>
    </div>
  );
};

export default LoadingSpinner;
