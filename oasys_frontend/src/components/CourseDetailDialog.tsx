import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Course } from "@/hooks/useAttendance";
import ProgressRing from "./ProgressRing";
import {
  AlertCircle,
  CheckCircle2,
  Calculator,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CourseDetailDialogProps {
  course: Course | null;
  open: boolean;
  onClose: () => void;
}

const CourseDetailDialog: React.FC<CourseDetailDialogProps> = ({
  course,
  open,
  onClose,
}) => {
  const [action, setAction] = useState<"miss" | "attend">("miss");
  const [hours, setHours] = useState(0);

  // ✅ Reset when dialog closes or course changes
  useEffect(() => {
    if (!open) {
      setAction("miss");
      setHours(0);
    }
  }, [open, course]);

  if (!course) return null;

  const simulateAttendance = () => {
    let totalAfter = course.total;
    let attendedAfter = course.attended;

    if (action === "miss") {
      totalAfter = course.total + hours;
      attendedAfter = course.attended;
    } else {
      totalAfter = course.total + hours;
      attendedAfter = course.attended + hours;
    }

    const percentageAfter =
      totalAfter > 0 ? (attendedAfter / totalAfter) * 100 : 0;
    return {
      total: totalAfter,
      attended: attendedAfter,
      percentage: percentageAfter.toFixed(2),
    };
  };

  const simulation = simulateAttendance();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">{course.name}</DialogTitle>
          <DialogDescription>Course Code: {course.code}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-4">
          {/* Current Status */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 bg-muted/50 rounded-lg">
            <div className="w-full sm:flex-1">
              <p className="text-sm text-muted-foreground mb-1">
                Current Attendance
              </p>
              <p className="text-3xl sm:text-4xl font-bold">
                {course.percentage.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {course.attended} of {course.total} classes attended
              </p>

              {/* ✅ Show same “Can skip / Need” line */}
              <div className="mt-3">
                {course.canSkip !== undefined &&
                  (course.canSkip > 0 ? (
                    <Badge variant="default" className="gap-1 text-white-600 dark:text-white-400">
                      <TrendingUp className="w-3 h-3" />
                      Can skip {course.canSkip} {course.canSkip === 1 ? "class" : "classes"}
                    </Badge>
                  ) : course.canSkip === 0 ? (
                    <Badge variant="outline" className="gap-1 text-yellow-600 dark:text-yellow-400">
                      <AlertCircle className="w-3 h-3" />
                      At threshold
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <TrendingDown className="w-3 h-3" />
                      Need {Math.abs(course.canSkip)} more
                    </Badge>
                  ))}
              </div>
            </div>

            <ProgressRing
              progress={course.percentage}
              size={window.innerWidth < 640 ? 100 : 120}
              strokeWidth={8}
            />
          </div>

          {/* Attendance Calculator */}
          <div className="p-4 sm:p-6 border rounded-lg space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-primary" />
              <h3 className="text-base sm:text-lg font-semibold">
                Attendance Calculator
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
              <span className="text-muted-foreground">If you</span>
              <Select
                value={action}
                onValueChange={(value: "miss" | "attend") => setAction(value)}
              >
                <SelectTrigger className="w-[120px] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="miss">miss</SelectItem>
                  <SelectItem value="attend">attend</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                value={hours || ""}
                onChange={(e) =>
                  setHours(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-[100px] h-10 text-center text-lg font-semibold"
                placeholder="0"
              />
              <span className="text-muted-foreground">hours</span>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setHours(0);
                setAction("miss");
              }}
            >
              Reset
            </Button>

            {/* Simulation Result */}
            <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20 animate-fade-in">
              <p className="text-sm text-muted-foreground mb-2">
                Projected Attendance
              </p>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl sm:text-3xl font-bold text-primary">
                  {simulation.percentage}%
                </span>
                <span className="text-sm text-muted-foreground">
                  ({simulation.attended}/{simulation.total} classes)
                </span>
              </div>
              {parseFloat(simulation.percentage) < 75 && (
                <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Below minimum requirement of 75%
                </p>
              )}
              {parseFloat(simulation.percentage) >= 75 && hours > 0 && (
                <p className="text-sm text-white-600 dark:text-white-400 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Above minimum requirement!
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CourseDetailDialog;
