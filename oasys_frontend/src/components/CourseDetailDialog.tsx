import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Course } from "@/hooks/useAttendance";
import { AlertCircle, CheckCircle2, Calculator, TrendingUp, TrendingDown } from "lucide-react";

interface Props { course: Course | null; open: boolean; onClose: () => void; }

const Ring = ({ pct, size = 110 }: { pct: number; size?: number }) => {
  const r = (size - 12) / 2, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  const color = pct >= 85 ? 'var(--accent-green)' : pct >= 75 ? 'var(--accent-amber)' : 'var(--accent-red)';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={9} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 6px ${color}88)` }} />
    </svg>
  );
};

const CourseDetailDialog: React.FC<Props> = ({ course, open, onClose }) => {
  const [action, setAction] = useState<'miss' | 'attend'>('miss');
  const [hours, setHours] = useState(0);

  useEffect(() => { if (!open) { setAction('miss'); setHours(0); } }, [open, course]);
  if (!course) return null;

  const totalAfter = course.total + hours;
  const attendedAfter = action === 'attend' ? course.attended + hours : course.attended;
  const pctAfter = totalAfter > 0 ? (attendedAfter / totalAfter) * 100 : 0;
  const pctColor = course.percentage >= 85 ? 'var(--accent-green)' : course.percentage >= 75 ? 'var(--accent-amber)' : 'var(--accent-red)';
  const skip = course.canSkip ?? 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ maxWidth: 560, background: 'var(--bg-glass)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid var(--border-glass)', borderRadius: 24, padding: '28px 32px', maxHeight: '88vh', overflowY: 'auto' }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--text-primary)', lineHeight: 1.2 }}>{course.name}</DialogTitle>
          <DialogDescription style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.08em', marginTop: 4 }}>{course.code}</DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 20 }}>

          {/* Current status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, background: 'var(--bg-tile)', border: '1px solid var(--border-card)', borderRadius: 16, padding: '20px 24px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-label)', letterSpacing: '0.15em', marginBottom: 8, fontWeight: 700 }}>CURRENT ATTENDANCE</div>
              <div style={{ fontSize: 40, fontWeight: 800, fontFamily: 'var(--font-mono)', color: pctColor, lineHeight: 1, textShadow: `0 0 20px ${pctColor}66` }}>{course.percentage.toFixed(1)}%</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>{course.attended} of {course.total} classes</div>
              <div style={{ marginTop: 12 }}>
                {skip > 0
                  ? <Chip color="var(--accent-green)"><TrendingUp size={11} />Can skip {skip} {skip === 1 ? 'class' : 'classes'}</Chip>
                  : skip < 0
                    ? <Chip color="var(--accent-red)"><TrendingDown size={11} />Need {Math.abs(skip)} more</Chip>
                    : <Chip color="var(--accent-amber)"><AlertCircle size={11} />At threshold</Chip>
                }
              </div>
            </div>
            <Ring pct={course.percentage} size={110} />
          </div>

          {/* Calculator */}
          <div style={{ background: 'var(--bg-tile)', border: '1px solid var(--border-card)', borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Calculator size={15} style={{ color: 'var(--accent-blue)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Attendance Calculator</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>If you</span>

              {/* Action toggle */}
              <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-card)' }}>
                {(['miss', 'attend'] as const).map(a => (
                  <button key={a} onClick={() => setAction(a)} style={{
                    padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    cursor: 'pointer', border: 'none', transition: 'all 0.15s ease',
                    background: action === a ? (a === 'miss' ? 'var(--accent-red)' : 'var(--accent-green)') : 'var(--bg-card)',
                    color: action === a ? '#fff' : 'var(--text-tertiary)',
                  }}>{a}</button>
                ))}
              </div>

              {/* Hours input */}
              <input type="number" min="0" value={hours || ''} placeholder="0"
                onChange={e => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ width: 70, padding: '7px 10px', borderRadius: 10, border: '1px solid var(--border-card)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, textAlign: 'center', outline: 'none' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>hours</span>

              <button onClick={() => { setHours(0); setAction('miss'); }}
                style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Reset
              </button>
            </div>

            {/* Result */}
            <div style={{ marginTop: 16, padding: '16px 20px', borderRadius: 12, background: pctAfter >= 75 ? 'color-mix(in srgb, var(--accent-green) 7%, transparent)' : 'color-mix(in srgb, var(--accent-red) 7%, transparent)', border: `1px solid ${pctAfter >= 75 ? 'color-mix(in srgb, var(--accent-green) 25%, transparent)' : 'color-mix(in srgb, var(--accent-red) 25%, transparent)'}` }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-label)', letterSpacing: '0.14em', marginBottom: 8, fontWeight: 700 }}>PROJECTED ATTENDANCE</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-mono)', color: pctAfter >= 75 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{pctAfter.toFixed(2)}%</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>({attendedAfter}/{totalAfter} classes)</span>
              </div>
              {pctAfter < 75 && hours > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>
                  <AlertCircle size={12} />Below 75% minimum requirement
                </div>
              )}
              {pctAfter >= 75 && hours > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                  <CheckCircle2 size={12} />Above minimum requirement
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Chip = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`, padding: '4px 10px', borderRadius: 8 }}>
    {children}
  </span>
);

export default CourseDetailDialog;