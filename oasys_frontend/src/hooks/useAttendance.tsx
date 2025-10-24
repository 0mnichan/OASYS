
import { useState, useEffect } from 'react';

// Types
export interface Course {
  id: string;
  code: string;
  name: string;
  attended: number;
  total: number;
  percentage: number;
  minRequired: number;
  canSkip: number;
}

interface AttendanceData {
  courses: Course[];
  overallPercentage: number;
  totalClassesAttended: number;
  totalClassesHeld: number;
  lastUpdated: Date;
}

export const useAttendance = () => {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real application, this would be an API call
        // For demo purposes, we'll simulate a delay and return mock data
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock data
        const mockData: AttendanceData = {
          courses: [
            {
              id: '1',
              code: 'CSE1001',
              name: 'Introduction to Programming',
              attended: 28,
              total: 32,
              percentage: 87.5,
              minRequired: 75,
              canSkip: 4,
            },
            {
              id: '2',
              code: 'MAT2002',
              name: 'Discrete Mathematics',
              attended: 18,
              total: 24,
              percentage: 75,
              minRequired: 75,
              canSkip: 0,
            },
            {
              id: '3',
              code: 'CSE2005',
              name: 'Operating Systems',
              attended: 24,
              total: 30,
              percentage: 80,
              minRequired: 75,
              canSkip: 1,
            },
            {
              id: '4',
              code: 'PHY1001',
              name: 'Physics',
              attended: 15,
              total: 24,
              percentage: 62.5,
              minRequired: 75,
              canSkip: -3, // Negative means they need to attend more
            },
            {
              id: '5',
              code: 'ENG2001',
              name: 'Technical English',
              attended: 22,
              total: 26,
              percentage: 84.6,
              minRequired: 75,
              canSkip: 2,
            },
            {
              id: '6',
              code: 'CSE3001',
              name: 'Data Structures',
              attended: 30,
              total: 32,
              percentage: 93.75,
              minRequired: 75,
              canSkip: 6,
            },
          ],
          overallPercentage: 80.5,
          totalClassesAttended: 137,
          totalClassesHeld: 168,
          lastUpdated: new Date(),
        };
        
        setData(mockData);
      } catch (err) {
        setError('Failed to fetch attendance data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAttendance();
  }, []);

  return { data, isLoading, error };
};
