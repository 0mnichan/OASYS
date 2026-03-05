import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Course } from "@/hooks/useAttendance";
import { AlertCircle, CheckCircle2, Calculator, TrendingUp, TrendingDown } from "lucide-react";

interface Props { course: Course | null; open: boolean; onClose: () => void; }

/* ─── Horizontal percent bar ─── */
const PctBar = ({ pct }: { pct: number }) => {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 120); return () => clearTimeout(t); }, [pct]);
  const color = pct >= 85 ? 'var(--accent-green)' : pct >= 75 ? 'var(--accent-amber)' : 'var(--accent-red)';

  return (
    <div style={{ width: '100%' }}>
      {/* Track */}
      <div style={{ height: 10, borderRadius: 99, background: 'var(--border-subtle)', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%', width: `${Math.min(w, 100)}%`, borderRadius: 99,
          background: color,
          boxShadow: `0 0 10px ${color}88`,
          transition: 'width 1s cubic-bezier(.4,0,.2,1)',
        }}/>
      </div>
      {/* 75% marker */}
      <div style={{ position: 'relative', height: 0 }}>
        <div style={{
          position: 'absolute', left: '75%', top: -10,
          width: 1.5, height: 10,
          background: 'var(--accent-amber)',
          opacity: 0.7,
        }}/>
      </div>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>0%</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--accent-amber)', position: 'relative', left: '-12.5%' }}>75%</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>100%</span>
      </div>
    </div>
  );
};

const Chip = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
    color,
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
    padding: '4px 10px', borderRadius: 8,
  }}>
    {children}
  </span>
);

const CourseDetailDialog: React.FC<Props> = ({ course, open, onClose }) => {
  const [action, setAction] = useState<'miss' | 'attend'>('miss');
  const [hours,  setHours]  = useState(0);

  useEffect(() => { if (!open) { setAction('miss'); setHours(0); } }, [open, course]);
  if (!course) return null;

  const totalAfter    = course.total + hours;
  const attendedAfter = action === 'attend' ? course.attended + hours : course.attended;
  const pctAfter      = totalAfter > 0 ? (attendedAfter / totalAfter) * 100 : 0;
  const skip          = course.canSkip ?? 0;
  const pctColor      = course.percentage >= 85 ? 'var(--accent-green)' : course.percentage >= 75 ? 'var(--accent-amber)' : 'var(--accent-red)';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{
        maxWidth: 'min(520px, 94vw)',
        /* Fixed max height so it never overflows screen — scrollable inside */
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        gap: 0,
        overflow: 'hidden',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid var(--border-glass)',
        borderRadius: 20,
      }}>

        {/* ── Fixed header (always visible, close button here) ── */}
        <div style={{
          flexShrink: 0,
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <DialogTitle style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(15px,3vw,19px)',
            color: 'var(--text-primary)', lineHeight: 1.25, margin: 0,
          }}>{course.name}</DialogTitle>
          <DialogDescription style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text-tertiary)', letterSpacing: '0.08em', marginTop: 4,
          }}>{course.code}</DialogDescription>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 20px 20px',
          display: 'flex', flexDirection: 'column', gap: 14,
          /* Hide scrollbar inside dialog too */
          scrollbarWidth: 'none',
        }}>

          {/* Current attendance card */}
          <div style={{
            background: 'var(--bg-tile)', border: '1px solid var(--border-card)',
            borderRadius: 16, padding: '18px 20px',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-label)', letterSpacing: '0.15em', marginBottom: 8, fontWeight: 700 }}>
              CURRENT ATTENDANCE
            </div>

            {/* Big percentage */}
            <div style={{
              fontSize: 'clamp(36px,8vw,52px)', fontWeight: 800,
              fontFamily: 'var(--font-mono)', color: pctColor, lineHeight: 1,
              textShadow: `0 0 24px ${pctColor}66`, marginBottom: 6,
            }}>
              {course.percentage.toFixed(1)}%
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
              {course.attended} of {course.total} classes
            </div>

            {/* Horizontal bar */}
            <PctBar pct={course.percentage} />

            <div style={{ marginTop: 14 }}>
              {skip > 0
                ? <Chip color="var(--accent-green)"><TrendingUp size={11}/>Can skip {skip} {skip === 1 ? 'class' : 'classes'}</Chip>
                : skip < 0
                ? <Chip color="var(--accent-red)"><TrendingDown size={11}/>Need {Math.abs(skip)} more</Chip>
                : <Chip color="var(--accent-amber)"><AlertCircle size={11}/>At threshold</Chip>
              }
            </div>
          </div>

          {/* Calculator card */}
          <div style={{
            background: 'var(--bg-tile)', border: '1px solid var(--border-card)',
            borderRadius: 16, padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Calculator size={15} style={{ color: 'var(--accent-blue)', flexShrink: 0 }}/>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                Attendance Calculator
              </span>
            </div>

            {/* Controls row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>If you</span>

              <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-card)' }}>
                {(['miss', 'attend'] as const).map(a => (
                  <button key={a} onClick={() => setAction(a)} style={{
                    padding: '7px 14px', fontSize: 12, fontWeight: 700,
                    fontFamily: 'var(--font-mono)', cursor: 'pointer', border: 'none',
                    background: action === a
                      ? (a === 'miss' ? 'var(--accent-red)' : 'var(--accent-green)')
                      : 'var(--bg-card)',
                    color: action === a ? '#fff' : 'var(--text-tertiary)',
                  }}>{a}</button>
                ))}
              </div>

              <input
                type="number" min="0" value={hours || ''} placeholder="0"
                onChange={e => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                style={{
                  width: 60, padding: '7px 10px', borderRadius: 10,
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-card)', color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
                  textAlign: 'center', outline: 'none',
                }}
              />

              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>hrs</span>

              <button onClick={() => { setHours(0); setAction('miss'); }} style={{
                marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)',
                color: 'var(--text-tertiary)', background: 'none', border: 'none',
                cursor: 'pointer', textDecoration: 'underline',
              }}>Reset</button>
            </div>

            {/* Projection result — inline, doesn't push content off screen */}
            {hours > 0 && (
              <div style={{
                marginTop: 14, padding: '14px 16px', borderRadius: 12,
                background: pctAfter >= 75
                  ? 'color-mix(in srgb, var(--accent-green) 7%, transparent)'
                  : 'color-mix(in srgb, var(--accent-red) 7%, transparent)',
                border: `1px solid ${pctAfter >= 75
                  ? 'color-mix(in srgb, var(--accent-green) 25%, transparent)'
                  : 'color-mix(in srgb, var(--accent-red) 25%, transparent)'}`,
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-label)', letterSpacing: '0.14em', marginBottom: 8, fontWeight: 700 }}>
                  PROJECTED
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-mono)',
                    color: pctAfter >= 75 ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}>{pctAfter.toFixed(2)}%</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                    ({attendedAfter}/{totalAfter})
                  </span>
                </div>

                {/* Projected bar */}
                <div style={{ marginTop: 10 }}>
                  <PctBar pct={pctAfter} />
                </div>

                {pctAfter < 75 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 11, color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>
                    <AlertCircle size={11}/>Below 75% minimum
                  </div>
                )}
                {pctAfter >= 75 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 11, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                    <CheckCircle2 size={11}/>Above minimum requirement
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CourseDetailDialog;
