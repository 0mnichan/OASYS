import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '@/components/NavBar';
import CourseDetailDialog from '@/components/CourseDetailDialog';
import { useAttendance, Course } from '@/hooks/useAttendance';
import { toast } from 'sonner';

/* ─── SVG Ring with % centered inside ─── */
const Ring = ({ pct, size = 148 }: { pct: number; size?: number }) => {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 85 ? 'var(--accent-green)' : pct >= 75 ? 'var(--accent-amber)' : 'var(--accent-red)';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}
        style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
        <defs>
          <filter id="rGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={10} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" filter="url(#rGlow)"
          style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: size * 0.21, fontWeight: 800,
          fontFamily: 'var(--font-mono)', color, lineHeight: 1,
          textShadow: `0 0 20px ${color}77`,
        }}>{pct.toFixed(1)}</span>
        <span style={{
          fontSize: size * 0.1, fontFamily: 'var(--font-mono)',
          color: 'var(--text-tertiary)', marginTop: 2,
        }}>%</span>
      </div>
    </div>
  );
};

/* ─── 3D tilt ─── */
const Tilt = ({ children, style, onClick }: {
  children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = window.innerWidth < 640;

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return;
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-3px)`;
    el.style.boxShadow = `${-x * 14}px ${y * -14}px 28px rgba(0,0,0,0.20), 0 0 0 1px var(--border-glass)`;
  }, [isMobile]);

  const onLeave = useCallback(() => {
    const el = ref.current; if (!el) return;
    el.style.transform = 'none';
    el.style.boxShadow = 'var(--shadow-md), 0 0 0 1px var(--border-card)';
  }, []);

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: 'var(--shadow-md), 0 0 0 1px var(--border-card)',
        willChange: 'transform',
        ...style,
      }}>
      {children}
    </div>
  );
};

/* ─── Animated progress bar ─── */
const Bar = ({ pct, delay = 0 }: { pct: number; delay?: number }) => {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 300 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  const color = pct >= 85 ? 'var(--accent-green)' : pct >= 75 ? 'var(--accent-amber)' : 'var(--accent-red)';
  return (
    <div style={{ height: 3, borderRadius: 99, background: 'var(--border-subtle)', overflow: 'hidden', marginTop: 12 }}>
      <div style={{
        height: '100%', width: `${Math.min(w, 100)}%`, borderRadius: 99,
        background: color, boxShadow: `0 0 8px ${color}`,
        transition: `width 1s ${delay}ms cubic-bezier(.4,0,.2,1)`,
      }} />
    </div>
  );
};

/* ─── Stat tile ─── */
const StatTile = ({ label, value, color, sub, delay = 0 }: {
  label: string; value: number; color: string; sub: string; delay?: number;
}) => {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <Tilt style={{
      background: 'var(--bg-tile)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--border-card)', borderRadius: 16,
      padding: 'clamp(14px,2.5vw,20px) clamp(14px,2.5vw,22px)',
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(16px)',
      transition: `opacity 0.5s ${delay}ms ease, transform 0.5s ${delay}ms ease`,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
        color: 'var(--text-label)', letterSpacing: '0.13em',
        marginBottom: 10, lineHeight: 1.4,
      }}>{label}</div>
      <div style={{
        fontSize: 'clamp(28px,5vw,38px)', fontWeight: 800,
        fontFamily: 'var(--font-display)', color,
        lineHeight: 1, textShadow: `0 0 20px ${color}44`,
      }}>{value}</div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--text-tertiary)', marginTop: 6,
      }}>{sub}</div>
    </Tilt>
  );
};

/* ─── Course card ─── */
const CourseCard = ({ course, index, onClick }: { course: Course; index: number; onClick: () => void }) => {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 80 + index * 50); return () => clearTimeout(t); }, [index]);

  const pct = course.percentage;
  const color = pct >= 85 ? 'var(--accent-green)' : pct >= 75 ? 'var(--accent-amber)' : 'var(--accent-red)';
  const skip = course.canSkip ?? 0;
  const chipColor = skip > 0 ? 'var(--accent-green)' : skip < 0 ? 'var(--accent-red)' : 'var(--accent-amber)';
  const chipLabel = skip > 0 ? `SKIP ${skip}` : skip < 0 ? `NEED ${Math.abs(skip)}` : 'AT LIMIT';

  return (
    <Tilt onClick={onClick} style={{
      background: 'var(--bg-card)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--border-card)', borderRadius: 16,
      padding: '20px 22px',
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(20px)',
      transition: `opacity 0.45s ease, transform 0.45s ease`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
          {course.code}
        </span>
        <span style={{
          fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)',
          color, lineHeight: 1, textShadow: `0 0 12px ${color}55`,
        }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.55, minHeight: 36 }}>
        {course.name}
      </div>
      <Bar pct={pct} delay={80 + index * 50} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
          {course.attended}/{course.total}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
          color: chipColor,
          background: `color-mix(in srgb, ${chipColor} 13%, transparent)`,
          border: `1px solid color-mix(in srgb, ${chipColor} 28%, transparent)`,
          padding: '3px 9px', borderRadius: 6,
        }}>{chipLabel}</span>
      </div>
    </Tilt>
  );
};

/* ─── Ambient blobs ─── */
const Blobs = () => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
    {[
      { top: -200, left: -120, w: 700, color: 'var(--blob-1)', dur: '20s' },
      { top: 300, right: -160, w: 600, color: 'var(--blob-2)', dur: '26s', rev: true },
      { bottom: -80, left: '35%', w: 500, color: 'var(--blob-3)', dur: '16s' },
    ].map((b, i) => (
      <div key={i} style={{
        position: 'absolute',
        top: b.top, left: (b as any).left, right: (b as any).right, bottom: (b as any).bottom,
        width: b.w, height: b.w, borderRadius: '50%',
        background: `radial-gradient(circle, ${b.color} 0%, transparent 65%)`,
        animation: `blobDrift ${b.dur} ease-in-out infinite ${(b as any).rev ? 'alternate-reverse' : 'alternate'}`,
      }} />
    ))}
  </div>
);

/* ─── Dashboard ─── */
const Dashboard = () => {
  const { data, isLoading, error } = useAttendance();
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [headVis, setHeadVis] = useState(false);
  const [heroVis, setHeroVis] = useState(false);

  useEffect(() => { if (error) toast.error('Failed to fetch data', { duration: 5000 }); }, [error]);
  useEffect(() => {
    if (data) {
      setTimeout(() => setHeadVis(true), 100);
      setTimeout(() => setHeroVis(true), 260);
    }
  }, [data]);

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-blue)', margin: '0 auto 16px', animation: 'pulseDot 1.2s ease-in-out infinite' }} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.22em' }}>FETCHING RECORDS</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <p style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        FETCH ERROR —{' '}
        <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/')}>RETRY LOGIN</span>
      </p>
    </div>
  );

  const fullName = data.studentName
    ? data.studentName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    : 'Student';

  const coursesAbove = data.courses.filter(c => (c.canSkip ?? 0) > 0).length;
  const coursesBelow = data.courses.filter(c => (c.canSkip ?? 0) < 0).length;
  const totalSkippable = data.courses.reduce((s, c) => s + Math.max(0, c.canSkip ?? 0), 0);

  const pad = 'clamp(16px,4vw,32px)';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', position: 'relative' }}>
      <Blobs />

      {/* Grain */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
        opacity: 0.6,
      }} />

      <NavBar courses={data.courses} />
      <CourseDetailDialog course={selectedCourse} open={showDetail} onClose={() => setShowDetail(false)} />

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1320, margin: '0 auto', padding: `clamp(80px,10vw,100px) ${pad} 0` }}>

        {/* ── HEADER ── */}
        <div style={{
          marginBottom: 'clamp(28px,5vw,44px)',
          opacity: headVis ? 1 : 0,
          transform: headVis ? 'none' : 'translateY(-16px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-label)', letterSpacing: '0.22em', marginBottom: 10, fontWeight: 700 }}>
            STUDENT RECORD
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(30px,5vw,52px)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15, color: 'var(--text-primary)' }}>
            {fullName}
          </h1>
          {data.regNumber && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8, letterSpacing: '0.08em' }}>
              {data.regNumber}
            </div>
          )}
          {data.period && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 5, letterSpacing: '0.05em' }}>
              {data.period}
            </div>
          )}
        </div>

        {/* ── HERO PANEL ── */}
        <div style={{
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--border-glass)', borderRadius: 24,
          padding: 'clamp(20px,4vw,32px) clamp(18px,4vw,36px)',
          marginBottom: 'clamp(24px,4vw,44px)',
          boxShadow: 'var(--shadow-glass)',
          opacity: heroVis ? 1 : 0,
          transform: heroVis ? 'none' : 'translateY(20px) scale(0.98)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}>
          {/* Ring + overall — centered, wraps naturally on mobile */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 'clamp(20px,4vw,40px)', flexWrap: 'wrap',
            marginBottom: 'clamp(16px,3vw,28px)',
          }}>
            <Ring pct={data.overallPercentage} size={Math.max(110, Math.min(148, window.innerWidth * 0.3))} />
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-label)', letterSpacing: '0.18em', marginBottom: 10, fontWeight: 700 }}>
                OVERALL ATTENDANCE
              </div>
              <div style={{ fontSize: 'clamp(26px,5vw,38px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {data.totalClassesAttended}
                <span style={{ color: 'var(--text-muted)', fontSize: 'clamp(15px,2.5vw,22px)', fontWeight: 400 }}>
                  {' '}/ {data.totalClassesHeld}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
                classes attended
              </div>
            </div>
          </div>

          {/* Horizontal divider */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--border-glass), transparent)', margin: `0 0 clamp(16px,3vw,24px)` }} />

          {/* Stat tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'clamp(10px,2vw,14px)' }}>
            <StatTile label="Enrolled" value={data.courses.length} color="var(--accent-blue)" sub="subjects" delay={320} />
            <StatTile label="Can Skip" value={coursesAbove} color="var(--accent-green)" sub="subjects" delay={400} />
            <StatTile label="Need Classes" value={coursesBelow} color="var(--accent-red)" sub="subjects" delay={480} />
            <StatTile label="Free Hours" value={totalSkippable} color="var(--accent-purple)" sub="skippable" delay={560} />
          </div>
        </div>

        {/* ── SECTION LABEL ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'clamp(14px,2vw,22px)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-label)', letterSpacing: '0.18em', whiteSpace: 'nowrap', fontWeight: 700 }}>
            SUBJECTS // {data.courses.length}
          </span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border-card), transparent)' }} />
        </div>

        {/* ── COURSE GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))', gap: 'clamp(10px,2vw,16px)' }}>
          {data.courses.map((course, i) => (
            <CourseCard key={course.id} course={course} index={i}
              onClick={() => { setSelectedCourse(course); setShowDetail(true); }} />
          ))}
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1320, margin: '0 auto',
        padding: `clamp(40px,6vw,64px) ${pad} clamp(28px,4vw,40px)`,
        marginTop: 'clamp(40px,6vw,64px)',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
              OASYS
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', lineHeight: 1.8, maxWidth: 360 }}>
              Optimal Attendance SYStem — an unofficial student utility tool.
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', lineHeight: 2, textAlign: 'right', maxWidth: 400 }}>
            <div style={{ color: 'var(--accent-amber)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
              ⚠ DISCLAIMER
            </div>
            <div>Not affiliated with SRM Institute of Science and Technology,</div>
            <div>its management, or any associated entity.</div>
            <div>Use entirely at your own risk. No data is stored or shared.</div>
            <div style={{ marginTop: 6, color: 'var(--text-muted)', opacity: 0.6 }}>© {new Date().getFullYear()} OASYS · Built by 0mnichan</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;