import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Course } from '@/hooks/useAttendance';
import { CalendarDays, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface BunkPlannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
}

type Mode    = 'bunk' | 'attend';
type DayMark = 'bunk' | 'attend' | null;

const DAYS   = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const BunkPlanner: React.FC<BunkPlannerProps> = ({ open, onOpenChange, courses }) => {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedId, setSelectedId] = useState<string>(courses[0]?.id || '');
  const [mode,  setMode]  = useState<Mode>('bunk');
  const [marks, setMarks] = useState<Record<string, DayMark>>({});

  const selectedCourse = courses.find(c => c.id === selectedId) ?? courses[0];

  const prevMonth = () => viewMonth === 0
    ? (setViewMonth(11), setViewYear(y => y - 1))
    : setViewMonth(m => m - 1);
  const nextMonth = () => viewMonth === 11
    ? (setViewMonth(0), setViewYear(y => y + 1))
    : setViewMonth(m => m + 1);

  const key = (d: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const toggleDay = (day: number) => {
    const k = key(day);
    setMarks(p => ({ ...p, [k]: p[k] === mode ? null : mode }));
  };

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const simulation = useMemo(() => {
    if (!selectedCourse) return null;
    let bunked = 0, attended = 0;
    Object.values(marks).forEach(v => {
      if (v === 'bunk')   bunked++;
      if (v === 'attend') attended++;
    });
    const totalAfter    = selectedCourse.total + bunked + attended;
    const attendedAfter = selectedCourse.attended + attended;
    const pct           = totalAfter > 0 ? (attendedAfter / totalAfter) * 100 : 0;
    return { bunked, attended, totalAfter, attendedAfter, pct, delta: pct - selectedCourse.percentage };
  }, [marks, selectedCourse]);

  const totalMarked = Object.values(marks).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{
        maxWidth: 'min(500px, 96vw)',
        padding: 0, gap: 0, overflow: 'hidden',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid var(--border-glass)',
        borderRadius: 20,
      }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <DialogTitle style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16,
            color: 'var(--text-primary)', margin: 0,
          }}>
            <CalendarDays size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }}/>
            Bunk Planner
          </DialogTitle>
        </div>

        <div style={{ padding: '14px 20px 18px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: 'calc(90vh - 60px)' }}>

          {/* Subject selector */}
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 10,
              fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600,
              background: 'var(--bg-card)', border: '1px solid var(--border-card)',
              color: 'var(--text-primary)', cursor: 'pointer', outline: 'none',
            }}>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.percentage.toFixed(1)}%</option>
            ))}
          </select>

          {/* Mode + status row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-card)', flexShrink: 0 }}>
              {(['bunk', 'attend'] as Mode[]).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: '7px 14px', fontSize: 11, fontWeight: 700,
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
                  cursor: 'pointer', border: 'none',
                  background: mode === m
                    ? (m === 'bunk' ? 'var(--accent-red)' : 'var(--accent-green)')
                    : 'var(--bg-card)',
                  color: mode === m ? '#fff' : 'var(--text-tertiary)',
                }}>{m.toUpperCase()}</button>
              ))}
            </div>

            {/* Current status chip */}
            {selectedCourse && (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg-tile)', border: '1px solid var(--border-subtle)',
                borderRadius: 10, padding: '7px 12px',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {selectedCourse.percentage.toFixed(1)}%
                </span>
                {(selectedCourse.canSkip ?? 0) > 0
                  ? <span style={{ fontSize: 10, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-mono)' }}><TrendingUp size={11}/>skip {selectedCourse.canSkip}</span>
                  : (selectedCourse.canSkip ?? 0) < 0
                  ? <span style={{ fontSize: 10, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-mono)' }}><TrendingDown size={11}/>need {Math.abs(selectedCourse.canSkip!)}</span>
                  : <span style={{ fontSize: 10, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>at limit</span>
                }
              </div>
            )}
          </div>

          {/* Calendar */}
          <div style={{ background: 'var(--bg-tile)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '12px 12px 10px' }}>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <CalNavBtn onClick={prevMonth}><ChevronLeft size={13}/></CalNavBtn>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <CalNavBtn onClick={nextMonth}><ChevronRight size={13}/></CalNavBtn>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
              {DAYS.map((d, i) => (
                <div key={i} style={{
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  color: i === 0 ? 'var(--accent-red)' : 'var(--text-muted)',
                  padding: '2px 0', letterSpacing: '0.04em',
                }}>{d}</div>
              ))}
            </div>

            {/* Day cells — fixed 34px height, no aspect-ratio */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
              {cells.map((day, i) => {
                if (!day) return <div key={`e${i}`} style={{ height: 34 }}/>;

                const k       = key(day);
                const mark    = marks[k];
                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                const isSun   = new Date(viewYear, viewMonth, day).getDay() === 0;

                let bg      = 'transparent';
                let color   = isSun ? 'var(--accent-red)' : 'var(--text-secondary)';
                let border  = '1px solid transparent';
                let opacity = isSun ? 0.35 : 1;

                if (mark === 'bunk')   { bg = 'var(--accent-red)';   color = '#fff'; opacity = 1; }
                if (mark === 'attend') { bg = 'var(--accent-green)'; color = '#fff'; opacity = 1; }
                if (!mark && isToday)  { border = '1.5px solid var(--accent-blue)'; color = 'var(--accent-blue)'; }

                return (
                  <button
                    key={k}
                    onClick={() => !isSun && toggleDay(day)}
                    disabled={isSun}
                    style={{
                      height: 34,               // fixed height — no aspect-ratio
                      width: '100%',
                      borderRadius: 7,
                      background: bg, border, color,
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      fontWeight: mark || isToday ? 700 : 400,
                      cursor: isSun ? 'default' : 'pointer',
                      opacity,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={e => {
                      if (!isSun && !mark)
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--border-subtle)';
                    }}
                    onMouseLeave={e => {
                      if (!mark)
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Legend + clear */}
            <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Legend color="var(--accent-red)"   label="Bunk" />
              <Legend color="var(--accent-green)" label="Attend" />
              <Legend color="var(--accent-blue)"  label="Today" isRing />
              {totalMarked > 0 && (
                <button onClick={() => setMarks({})} style={{
                  marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)', background: 'none', border: 'none',
                  cursor: 'pointer', textDecoration: 'underline',
                }}>Clear all</button>
              )}
            </div>
          </div>

          {/* Projection box */}
          <div style={{
            borderRadius: 14, padding: '14px 16px',
            border: `1px solid ${
              totalMarked > 0 && simulation
                ? simulation.pct >= 75
                  ? 'color-mix(in srgb, var(--accent-green) 30%, transparent)'
                  : 'color-mix(in srgb, var(--accent-red) 30%, transparent)'
                : 'var(--border-subtle)'
            }`,
            background: totalMarked > 0 && simulation
              ? simulation.pct >= 75
                ? 'color-mix(in srgb, var(--accent-green) 6%, transparent)'
                : 'color-mix(in srgb, var(--accent-red) 6%, transparent)'
              : 'var(--bg-tile)',
            minHeight: 60,
            display: 'flex', alignItems: 'center',
          }}>
            {totalMarked === 0 || !simulation ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', margin: 0, textAlign: 'center', width: '100%' }}>
                Mark days above to see projected attendance
              </p>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-label)', letterSpacing: '0.12em', marginBottom: 4, fontWeight: 700 }}>PROJECTED</div>
                  <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-mono)', color: simulation.pct >= 75 ? 'var(--accent-green)' : 'var(--accent-red)', lineHeight: 1 }}>
                    {simulation.pct.toFixed(1)}%
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>
                    {simulation.attendedAfter}/{simulation.totalAfter} classes
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: simulation.delta >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {simulation.delta >= 0 ? '+' : ''}{simulation.delta.toFixed(1)}%
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {[simulation.bunked > 0 && `${simulation.bunked} bunked`, simulation.attended > 0 && `${simulation.attended} attended`].filter(Boolean).join(', ')}
                  </div>
                  {simulation.pct < 75 && (
                    <div style={{ fontSize: 10, color: 'var(--accent-red)', fontFamily: 'var(--font-mono)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                      <AlertCircle size={10}/>Need {Math.ceil((75 * simulation.totalAfter - 100 * simulation.attendedAfter) / 25)} to recover
                    </div>
                  )}
                  {simulation.pct >= 75 && simulation.delta < 0 && (
                    <div style={{ fontSize: 10, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>Still safe ✓</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const CalNavBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} style={{
    width: 28, height: 28, borderRadius: 8,
    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    {children}
  </button>
);

const Legend = ({ color, label, isRing }: { color: string; label: string; isRing?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    <div style={{
      width: 10, height: 10, borderRadius: 3, flexShrink: 0,
      background: isRing ? 'transparent' : color,
      border: isRing ? `2px solid ${color}` : 'none',
    }}/>
    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{label}</span>
  </div>
);

export default BunkPlanner;
