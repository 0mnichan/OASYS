import React from 'react';
import { Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { Course } from '@/hooks/useAttendance';
import { Badge } from './ui/badge';

interface UpcomingClassProps {
  course: Course;
}

const UpcomingClass: React.FC<UpcomingClassProps> = ({ course }) => {
  // Calculate what happens if they miss
  const attendedIfMissed = course.attended;
  const totalIfMissed = course.total + 1;
  const percentageIfMissed = (attendedIfMissed / totalIfMissed) * 100;
  
  const canMiss = course.canSkip > 0;
  
  return (
    <div className="glass-panel p-6 sm:p-8 h-full">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Clock className="w-6 sm:w-7 h-6 sm:h-7 text-primary" />
        <h3 className="text-xl sm:text-2xl font-semibold">Upcoming Hour</h3>
        <Badge variant="outline" className="ml-auto text-sm">Next Class</Badge>
      </div>
      
      <div className="space-y-5 sm:space-y-6">
        <div>
          <p className="text-2xl sm:text-3xl font-bold mb-2">{course.name}</p>
        </div>
        
        <div className="pt-4 sm:pt-5 border-t">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-left">
                <p className="text-xs text-muted-foreground mb-1">Attendance Percentage</p>
                <p className="text-3xl sm:text-4xl font-bold">{course.percentage.toFixed(1)}%</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Classes Attended</p>
                <p className="text-3xl sm:text-4xl font-bold">{course.attended}/{course.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-muted/50 p-4 sm:p-5 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm sm:text-base text-muted-foreground">Can You Miss?</p>
              {canMiss ? (
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 sm:w-6 h-5 sm:h-6 text-green-500" />
                  <span className="text-2xl sm:text-3xl font-bold text-green-500">Yes</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 sm:w-6 h-5 sm:h-6 text-destructive" />
                  <span className="text-2xl sm:text-3xl font-bold text-destructive">No</span>
                </div>
              )}
            </div>
            
            <div className="pt-3 border-t border-border/50">
              <p className="text-sm sm:text-base text-muted-foreground mb-3">If you miss this class:</p>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Attendance will drop to</p>
                <p className={`text-2xl sm:text-3xl font-bold ${percentageIfMissed >= 75 ? 'text-primary' : 'text-destructive'}`}>
                  {percentageIfMissed.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
          {percentageIfMissed < 75 && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              Below minimum 75% requirement
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpcomingClass;
