import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '@/components/NavBar';
import CourseCard from '@/components/CourseCard';
import UpcomingClass from '@/components/UpcomingClass';
import CourseDetailDialog from '@/components/CourseDetailDialog';
import { useAttendance, Course } from '@/hooks/useAttendance';
import ProgressRing from '@/components/ProgressRing';
import { toast } from 'sonner';

const Dashboard = () => {
  const { data, isLoading, error } = useAttendance();
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseDetail, setShowCourseDetail] = useState(false);
  
  useEffect(() => {
    if (error) {
      toast.error('Failed to fetch data', {
        description: 'Please try again later',
        duration: 5000,
      });
    }
  }, [error]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="mb-6 relative">
            <div className="absolute inset-0 animate-ping">
              <ProgressRing 
                progress={75}
                size={80}
                strokeWidth={6}
                className="mx-auto opacity-20"
              />
            </div>
            <ProgressRing 
              progress={75}
              size={80}
              strokeWidth={6}
              className="mx-auto relative"
            />
          </div>
          <h2 className="text-xl font-medium mb-2 animate-pulse">Fetching your attendance data</h2>
          <p className="text-muted-foreground">This may take a moment...</p>
        </div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center max-w-md p-4">
          <h2 className="text-xl font-medium mb-2 text-destructive">Failed to load data</h2>
          <p className="text-muted-foreground mb-4">There was an error fetching your attendance data.</p>
          <button 
            onClick={() => navigate('/')} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Get upcoming class (using first course as example, you can add logic to determine actual next class)
  const upcomingCourse = data.courses[0];

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setShowCourseDetail(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <NavBar />

      <CourseDetailDialog
        course={selectedCourse}
        open={showCourseDetail}
        onClose={() => setShowCourseDetail(false)}
      />
      
      <main className="container mx-auto pt-20 sm:pt-24 px-3 sm:px-4 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
            Welcome, <span className="text-primary">Student</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Last updated: {data.lastUpdated.toLocaleString()}
          </p>
        </div>
        
        {/* Overall Attendance & Upcoming Class */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Overall Attendance */}
          <div className="glass-panel p-4 sm:p-6 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-base sm:text-lg font-semibold mb-4">Overall Attendance</h3>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">{data.overallPercentage.toFixed(1)}%</p>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                  {data.totalClassesAttended} of {data.totalClassesHeld} classes attended
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Across {data.courses.length} courses
                </p>
              </div>
              <ProgressRing 
                progress={data.overallPercentage} 
                size={window.innerWidth < 640 ? 80 : 120} 
                strokeWidth={window.innerWidth < 640 ? 6 : 8}
              />
            </div>
          </div>

          {/* Upcoming Class */}
          <div className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <UpcomingClass course={upcomingCourse} />
          </div>
        </div>
        
        {/* Course Breakdown */}
        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Course Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {data.courses.map((course, index) => (
              <div 
                key={course.id}
                className="animate-scale-in"
                style={{ animationDelay: `${0.5 + index * 0.05}s` }}
              >
                <CourseCard 
                  course={course}
                  onClick={() => handleCourseClick(course)}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
