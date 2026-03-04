import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BunkPlanner from './BunkPlanner';
import { Course } from '@/hooks/useAttendance';
import { CalendarDays, LogOut, Sun, Moon } from 'lucide-react';

interface NavBarProps { courses?: Course[]; }

export const applyTheme = (dark: boolean) => {
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('oasys_theme', dark ? 'dark' : 'light');
};

export const initTheme = (): boolean => {
  const saved = localStorage.getItem('oasys_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark = saved ? saved === 'dark' : prefersDark;
  // Set without transition to avoid flash on load
  document.documentElement.setAttribute('data-no-transition', '');
  document.documentElement.classList.toggle('dark', useDark);
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      document.documentElement.removeAttribute('data-no-transition')
    )
  );
  return useDark;
};

const SCROLL_THRESHOLD = 60;

const NavBar: React.FC<NavBarProps> = ({ courses = [] }) => {
  const navigate = useNavigate();
  const [showBunk, setShowBunk] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setIsDark(initTheme());
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
  }, [isDark]);

  return (
    <>
      {/* ── Top-left: OASYS BETA (fades out on scroll) ── */}
      <div style={{
        position: 'fixed', top: 20, left: 'clamp(16px,4vw,32px)', zIndex: 200,
        display: 'flex', alignItems: 'center', gap: 8,
        opacity: scrolled ? 0 : 1,
        transform: scrolled ? 'translateX(-24px)' : 'translateX(0)',
        pointerEvents: scrolled ? 'none' : 'auto',
        transition: 'opacity 0.45s ease, transform 0.45s ease',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
          OASYS
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
          color: 'var(--accent-blue)',
          background: 'color-mix(in srgb, var(--accent-blue) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent-blue) 25%, transparent)',
          padding: '2px 7px', borderRadius: 99,
        }}>BETA</span>
      </div>

      {/* ── Left edge: vertical OASYS (fades in on scroll) ── */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: scrolled ? 14 : -32,
        transform: 'translateY(-50%)',
        zIndex: 200,
        opacity: scrolled ? 1 : 0,
        pointerEvents: 'none',
        transition: 'opacity 0.5s ease, left 0.5s ease',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 11,
          letterSpacing: '0.28em',
          color: 'var(--text-muted)',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          display: 'block',
          userSelect: 'none',
        }}>
          OASYS
        </span>
      </div>

      {/* ── Right: floating pill (always visible, morphs on scroll) ── */}
      <div style={{
        position: 'fixed',
        top: 16,
        right: 'clamp(12px,3vw,24px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: scrolled ? 0 : 4,
        background: scrolled
          ? 'var(--bg-glass)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        border: scrolled ? '1px solid var(--border-glass)' : '1px solid transparent',
        borderRadius: 99,
        padding: scrolled ? '4px 4px' : '0',
        boxShadow: scrolled ? 'var(--shadow-md)' : 'none',
        transition: 'background 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease, padding 0.45s ease, gap 0.45s ease, backdrop-filter 0.45s ease',
      }}>
        {courses.length > 0 && (
          <PillBtn
            onClick={() => setShowBunk(true)}
            icon={<CalendarDays size={15} />}
            label="Bunk Planner"
            color="var(--accent-blue)"
            scrolled={scrolled}
          />
        )}
        <PillBtn
          onClick={toggleTheme}
          icon={isDark ? <Sun size={15} /> : <Moon size={15} />}
          label={isDark ? 'Light' : 'Dark'}
          scrolled={scrolled}
        />
        <PillBtn
          onClick={() => navigate('/')}
          icon={<LogOut size={15} />}
          label="Logout"
          color="var(--accent-red)"
          scrolled={scrolled}
          danger
        />
      </div>

      <BunkPlanner open={showBunk} onOpenChange={setShowBunk} courses={courses} />
    </>
  );
};

/* ── Individual pill button ── */
const PillBtn = ({
  onClick, icon, label, color, scrolled, danger,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color?: string;
  scrolled: boolean;
  danger?: boolean;
}) => {
  const [hov, setHov] = useState(false);
  const fg = color ?? 'var(--text-secondary)';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6,
        width: scrolled ? 36 : 'auto',
        height: scrolled ? 36 : 'auto',
        padding: scrolled ? '0' : '6px 12px',
        borderRadius: 99,
        border: 'none',
        background: hov
          ? (scrolled
            ? 'color-mix(in srgb, ' + fg + ' 14%, transparent)'
            : 'var(--bg-glass)')
          : 'transparent',
        backdropFilter: (!scrolled && hov) ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: (!scrolled && hov) ? 'blur(12px)' : 'none',
        color: hov ? fg : (scrolled ? 'var(--text-tertiary)' : 'var(--text-tertiary)'),
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.2s ease, color 0.2s ease, width 0.45s ease, height 0.45s ease, padding 0.45s ease',
      }}
    >
      {icon}
      {/* Label only shown when not scrolled */}
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
        maxWidth: scrolled ? 0 : 80,
        overflow: 'hidden',
        opacity: scrolled ? 0 : 1,
        transition: 'max-width 0.35s ease, opacity 0.3s ease',
        whiteSpace: 'nowrap',
      }}>{label}</span>
    </button>
  );
};

export default NavBar;