
import React, { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  bgStrokeColor?: string;
  strokeColor?: string;
  showPercentage?: boolean;
  label?: string;
  threshold?: number;
  animation?: boolean;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 100,
  strokeWidth = 8,
  className,
  bgStrokeColor = 'stroke-gray-200',
  strokeColor = 'stroke-primary',
  showPercentage = true,
  label,
  threshold = 75,
  animation = true,
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  
  // Animation effect
  useEffect(() => {
    if (!animation) {
      setDisplayProgress(progress);
      return;
    }
    
    const duration = 1000;
    const startTime = Date.now();
    const startValue = displayProgress;
    
    const updateProgress = () => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      
      if (elapsedTime < duration) {
        const nextProgress = startValue + (progress - startValue) * (elapsedTime / duration);
        setDisplayProgress(nextProgress);
        requestAnimationFrame(updateProgress);
      } else {
        setDisplayProgress(progress);
      }
    };
    
    requestAnimationFrame(updateProgress);
  }, [progress, animation]);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (displayProgress / 100) * circumference;
  
  // Determine color based on threshold and progress
  const getStrokeColor = () => {
    if (progress < threshold) return 'stroke-destructive';
    if (progress < threshold + 10) return 'stroke-amber-500';
    return strokeColor;
  };
  
  const actualStrokeColor = getStrokeColor();

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg height={size} width={size} className="transform -rotate-90">
        <circle
          className={bgStrokeColor}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          className={cn("progress-ring-circle", actualStrokeColor)}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      
      {(showPercentage || label) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showPercentage && (
            <span className="text-lg font-medium">
              {Math.round(displayProgress)}%
            </span>
          )}
          {label && (
            <span className="text-xs text-muted-foreground">{label}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressRing;
