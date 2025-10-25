
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Course } from '@/hooks/useAttendance';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BunkPlannerProps {
  courses: Course[];
  className?: string;
}

const BunkPlanner: React.FC<BunkPlannerProps> = ({ courses, className }) => {
  // Sort courses by the number of classes that can be skipped (descending)
  const sortedCourses = [...courses].sort((a, b) => b.canSkip - a.canSkip);
  
  // Calculate total skippable classes
  const totalSkippable = courses.reduce((total, course) => {
    return total + Math.max(0, course.canSkip);
  }, 0);
  
  // Calculate if there are any courses that need attendance focus
  const needAttention = courses.some(course => course.canSkip < 0);
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Bunk Planner</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-primary/5 rounded-lg p-3">
              <div className="text-2xl font-semibold">{totalSkippable}</div>
              <div className="text-sm text-muted-foreground">Total skippable classes</div>
            </div>
            <div className={cn(
              "rounded-lg p-3",
              needAttention ? "bg-destructive/5" : "bg-emerald-500/5"
            )}>
              <div className="text-2xl font-semibold">
                {needAttention ? "Warning" : "Good"}
              </div>
              <div className="text-sm text-muted-foreground">
                {needAttention 
                  ? "Some subjects need attention" 
                  : "All subjects above threshold"}
              </div>
            </div>
          </div>
          
          <div className="space-y-3 mt-6">
            <div className="text-sm font-medium">Skip Priority (Best to Worst)</div>
            
            <div className="space-y-2 mt-2">
              {sortedCourses.map(course => (
                <div 
                  key={course.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md",
                    course.canSkip < 0 
                      ? "bg-destructive/10 text-destructive" 
                      : course.canSkip === 0 
                        ? "bg-amber-500/10"
                        : "bg-emerald-500/10"
                  )}
                >
                  <div className="flex items-center">
                    <div className="font-medium text-sm">{course.code}</div>
                    <div className="text-xs ml-2 opacity-80">
                      {course.attended}/{course.total}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {course.canSkip < 0 
                      ? `Need ${Math.abs(course.canSkip)} more` 
                      : course.canSkip > 0 
                        ? `Can skip ${course.canSkip}` 
                        : "At threshold"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <Button variant="outline" className="w-full mt-4">Plan Optimal Bunks</Button>
      </CardContent>
    </Card>
  );
};

export default BunkPlanner;
