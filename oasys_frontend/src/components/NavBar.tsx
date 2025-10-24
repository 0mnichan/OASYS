
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { LogOut, Calendar } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import TimetableDialog from './TimetableDialog';

interface NavBarProps {
  className?: string;
}

const NavBar: React.FC<NavBarProps> = ({ className }) => {
  const navigate = useNavigate();
  const [showTimetable, setShowTimetable] = useState(false);
  
  const handleLogout = () => {
    // Simulate logout
    setTimeout(() => {
      navigate('/');
    }, 300);
  };
  
  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 backdrop-blur-lg bg-background/80 border-b z-50 animate-fade-in",
      className
    )}>
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-primary font-semibold text-lg sm:text-xl">OASIS</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Beta</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTimetable(true)}
            className="text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all"
          >
            <Calendar className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Timetable</span>
          </Button>
          <ThemeToggle />
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
      
      <TimetableDialog open={showTimetable} onOpenChange={setShowTimetable} />
    </header>
  );
};

export default NavBar;
