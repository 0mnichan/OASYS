import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Calendar } from 'lucide-react';

interface TimetableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TimetableDialog: React.FC<TimetableDialogProps> = ({ open, onOpenChange }) => {
  const [currentDay, setCurrentDay] = useState(0);
  const [currentPeriod, setCurrentPeriod] = useState(-1);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [
    { time: '9:00 - 9:50', slot: 1 },
    { time: '10:00 - 10:50', slot: 2 },
    { time: '11:00 - 11:50', slot: 3 },
    { time: '12:00 - 12:50', slot: 4 },
    { time: '2:00 - 2:50', slot: 5 },
    { time: '3:00 - 3:50', slot: 6 },
    { time: '4:00 - 4:50', slot: 7 },
  ];

  // Mock timetable data
  const timetable = [
    ['Mathematics', 'Physics', 'Chemistry', 'Break', 'English', 'Computer Science', 'Lab'],
    ['Computer Science', 'Chemistry', 'Mathematics', 'Break', 'Physics', 'English', 'Lab'],
    ['Physics', 'English', 'Computer Science', 'Break', 'Mathematics', 'Chemistry', 'Free'],
    ['Chemistry', 'Mathematics', 'Physics', 'Break', 'Computer Science', 'English', 'Lab'],
    ['English', 'Computer Science', 'Mathematics', 'Break', 'Chemistry', 'Physics', 'Free'],
  ];

  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Convert Sunday (0) to -1, and shift Monday-Friday to 0-4
      setCurrentDay(day === 0 ? -1 : day - 1);

      // Determine current period based on time
      if (hours === 9 || (hours === 10 && minutes < 50)) {
        setCurrentPeriod(hours === 9 ? 0 : 1);
      } else if (hours === 11 || (hours === 12 && minutes < 50)) {
        setCurrentPeriod(hours === 11 ? 2 : 3);
      } else if (hours === 14 || (hours === 15 && minutes < 50)) {
        setCurrentPeriod(hours === 14 ? 4 : 5);
      } else if (hours === 16 && minutes < 50) {
        setCurrentPeriod(6);
      } else {
        setCurrentPeriod(-1);
      }
    };

    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            Weekly Timetable
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-semibold bg-muted/50">
                  Period / Day
                </th>
                {days.map((day, index) => (
                  <th
                    key={day}
                    className={`p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold transition-all ${
                      currentDay === index
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50'
                    }`}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period, periodIndex) => (
                <tr key={periodIndex} className="border-b border-border">
                  <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium bg-muted/30">
                    <div>Period {period.slot}</div>
                    <div className="text-xs text-muted-foreground">{period.time}</div>
                  </td>
                  {days.map((_, dayIndex) => {
                    const isCurrentClass = currentDay === dayIndex && currentPeriod === periodIndex;
                    const subject = timetable[dayIndex][periodIndex];
                    const isBreak = subject === 'Break';
                    const isFree = subject === 'Free';
                    
                    return (
                      <td
                        key={dayIndex}
                        className={`p-2 sm:p-3 text-center text-xs sm:text-sm transition-all ${
                          isCurrentClass
                            ? 'bg-primary/20 animate-pulse font-bold border-2 border-primary'
                            : isBreak
                            ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                            : isFree
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        {subject}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex gap-4 text-xs sm:text-sm mt-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/20 border-2 border-primary rounded"></div>
            <span>Current Class</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500/10 rounded"></div>
            <span>Break</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500/10 rounded"></div>
            <span>Free Period</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TimetableDialog;
