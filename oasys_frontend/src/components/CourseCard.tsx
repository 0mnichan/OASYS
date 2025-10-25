import React from 'react';
import { Course } from '@/hooks/useAttendance';
import ProgressRing from './ProgressRing';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface CourseCardProps {
  course: Course;
  onClick: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onClick }) => {
  const attendanceStatus = course.percentage >= 75 ? 'good' : 'warning';
  
  return (
    <Card 
      className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 active:scale-95"
      onClick={onClick}
    >
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm sm:text-base mb-1 line-clamp-2">{course.name}</CardTitle>
          </div>
          <ProgressRing 
            progress={course.percentage} 
            size={window.innerWidth < 640 ? 50 : 60} 
            strokeWidth={5}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{course.percentage.toFixed(1)}%</span>
            <span className="font-semibold">{course.attended}/{course.total}</span>
          </div>
          
          <div className="pt-3 border-t">
            {course.canSkip > 0 ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Can skip {course.canSkip} {course.canSkip === 1 ? 'class' : 'classes'}</span>
              </div>
            ) : course.canSkip === 0 ? (
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">At threshold</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-medium">Need {Math.abs(course.canSkip)} more</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseCard;
