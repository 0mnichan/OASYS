import { useEffect, useState } from "react";

export interface Course {
  id: string;
  code?: string;
  name: string;
  attended: number;
  total: number;
  percentage: number;
  action: string;
  canSkip?: number; // positive => can skip, negative => needs this many classes
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
    const parseFromHTML = (html: string): AttendanceData => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const table = doc.querySelector("table");
      if (!table) throw new Error("Attendance table not found in HTML");

      const rows = Array.from(table.querySelectorAll("tr")).slice(1); // skip header

      const courses: Course[] = [];
      let totalHeld = 0;
      let totalAttended = 0;

      for (const row of rows) {
        const cols = Array.from(row.querySelectorAll("td"));
        if (cols.length < 4) continue; // skip malformed rows

        // typical SRM table indices (based on your backend scraping):
        // 0 -> subject name
        // 1 -> something (maybe code)
        // 2 -> total
        // 3 -> present/attended
        // ... last -> Action (we appended)

        const name = cols[0].textContent?.trim() || "Unknown";
        const maybeCode = cols[1]?.textContent?.trim() || undefined;
        const totalText = cols[2]?.textContent?.trim() || "0";
        const attendedText = cols[3]?.textContent?.trim() || "0";
        const actionText = cols[cols.length - 1]?.textContent?.trim() || "";

        const total = parseInt(totalText.replace(/\D/g, "")) || 0;
        const attended = parseInt(attendedText.replace(/\D/g, "")) || 0;
        const percentage = total ? (attended / total) * 100 : 0;

        // parse canSkip from actionText (examples: "Can bunk 4 hrs", "Attend 3 hrs", "Exactly at 75%")
        let canSkip: number | undefined = undefined;
        const canBunkMatch = actionText.match(/Can\s+.*?(\d+)\s*(?:hrs|classes)?/i);
        const attendNeedMatch = actionText.match(/Attend\s+(\d+)\s*(?:hrs|classes)?/i);
        const exactMatch = /Exactly/i.test(actionText);

        if (canBunkMatch) {
          canSkip = parseInt(canBunkMatch[1], 10);
        } else if (attendNeedMatch) {
          canSkip = -parseInt(attendNeedMatch[1], 10); // negative: needs to attend more
        } else if (exactMatch) {
          canSkip = 0;
        }

        courses.push({
          id: name,
          code: maybeCode,
          name,
          attended,
          total,
          percentage: Math.round(percentage * 100) / 100,
          action: actionText,
          canSkip,
        });

        totalHeld += total;
        totalAttended += attended;
      }

      const overallPercentage = totalHeld ? (totalAttended / totalHeld) * 100 : 0;

      return {
        courses,
        overallPercentage: Math.round(overallPercentage * 100) / 100,
        totalClassesAttended: totalAttended,
        totalClassesHeld: totalHeld,
        lastUpdated: new Date(),
      };
    };

    try {
      setIsLoading(true);
      setError(null);
      const html = sessionStorage.getItem("attendanceHTML");
      if (!html) {
        setError("No attendance data found. Please login first.");
        setData(null);
        setIsLoading(false);
        return;
      }

      const parsed = parseFromHTML(html);
      setData(parsed);
    } catch (err: any) {
      console.error("useAttendance parse error:", err);
      setError("Failed to parse attendance data.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error };
};
