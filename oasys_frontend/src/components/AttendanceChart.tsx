
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Course } from '@/hooks/useAttendance';

interface AttendanceChartProps {
  courses: Course[];
  className?: string;
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ courses, className }) => {
  // Transform data for the chart
  const chartData = courses.map(course => ({
    name: course.code,
    attendance: course.percentage,
    threshold: course.minRequired,
  }));
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const course = courses.find(c => c.code === label);
      return (
        <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border">
          <p className="font-medium">{course?.name}</p>
          <p className="text-muted-foreground text-sm">Code: {label}</p>
          <p className="text-sm">Attendance: <span className="font-medium">{payload[0].value}%</span></p>
          <p className="text-sm">Classes: <span className="font-medium">{course?.attended}/{course?.total}</span></p>
          <p className="text-sm mt-1">
            {course?.canSkip >= 0 
              ? `Can skip: ${course?.canSkip} classes` 
              : `Need to attend: ${Math.abs(course?.canSkip || 0)} more`}
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Course Attendance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="attendance" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
              {/* Add a line for the threshold */}
              <Bar 
                dataKey="threshold" 
                fill="transparent" 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="4 4" 
                radius={[0, 0, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceChart;
