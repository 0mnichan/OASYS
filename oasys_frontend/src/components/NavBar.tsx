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
  const saved       = localStorage.getItem('oasys_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark     = saved ? saved === 'dark' : prefersDark;
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
const MOBILE_BREAKPOINT = 768;

const NavBar: React.FC<NavBarProps> = ({ courses = [] }) => {
  const navigate  = useNavigate();
  const [showBunk, setShowBunk] = useState(false);
  const [isDark,   setIsDark]   = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsDark(initTheme());

    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // Init
    onScroll();
    onResize();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
  }, [isDark]);

  // ── MOBILE NAV ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <header style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          height: 54,
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}>
          {/* Logo — always visible */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 18, letterSpacing: '-0.03em', color: 'var(--text-primary)',
            }}>OASYS</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
              color: 'var(--accent-blue)',
              background: 'color-mix(in srgb, var(--accent-blue) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent-blue) 25%, transparent)',
              padding: '2px 6px', borderRadius: 99,
            }}>BETA</span>
          </div>

          {/* Icon-only buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {courses.length > 0 && (
              <MobileBtn onClick={() => setShowBunk(true)} icon={<CalendarDays size={17}/>} label="Bunk Planner" color="var(--accent-blue)" />
            )}
            <MobileBtn onClick={toggleTheme} icon={isDark ? <Sun size={17}/> : <Moon size={17}/>} label="Toggle theme" />
            <MobileBtn onClick={() => navigate('/')} icon={<LogOut size={17}/>} label="Logout" color="var(--accent-red)" />
          </div>
        </header>

        <BunkPlanner open={showBunk} onOpenChange={setShowBunk} courses={courses} />
      </>
    );
  }

  // ── DESKTOP NAV ─────────────────────────────────────────────
  return (
    <>
      {/* Logo: fades out left on scroll */}
      <div style={{
        position: 'fixed', top: 20, left: 'clamp(24px,4vw,40px)', zIndex: 200,
        display: 'flex', alignItems: 'center', gap: 8,
        opacity:       scrolled ? 0 : 1,
        transform:     scrolled ? 'translateX(-24px)' : 'translateX(0)',
        pointerEvents: scrolled ? 'none' : 'auto',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 20, letterSpacing: '-0.03em', color: 'var(--text-primary)',
        }}>OASYS</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
          color: 'var(--accent-blue)',
          background: 'color-mix(in srgb, var(--accent-blue) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent-blue) 25%, transparent)',
          padding: '2px 7px', borderRadius: 99,
        }}>BETA</span>
      </div>

      {/* Vertical OASYS: fades in on scroll, left edge mid-screen */}
      <div style={{
        position: 'fixed', top: '50%', left: scrolled ? 14 : -28,
        transform: 'translateY(-50%)',
        zIndex: 200,
        opacity:       scrolled ? 1 : 0,
        pointerEvents: 'none',
        transition: 'opacity 0.5s ease, left 0.5s ease',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 10, letterSpacing: '0.3em',
          color: 'var(--text-muted)',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          display: 'block',
          userSelect: 'none',
          opacity: 0.45,
        }}> </span>
      </div>

      {/* Floating pill: right side, always visible, morphs on scroll */}
      <div style={{
        position: 'fixed', top: 14, right: 'clamp(20px,3vw,36px)', zIndex: 200,
        display: 'flex', alignItems: 'center',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-glass)',
        borderRadius: 99,
        padding: '4px 6px',
        boxShadow: 'var(--shadow-md)',
        gap: scrolled ? 2 : 4,
        transition: 'gap 0.4s ease',
      }}>
        {courses.length > 0 && (
          <DesktopPillBtn
            onClick={() => setShowBunk(true)}
            icon={<CalendarDays size={15}/>}
            label="Bunk Planner"
            color="var(--accent-blue)"
            collapsed={scrolled}
          />
        )}
        <DesktopPillBtn
          onClick={toggleTheme}
          icon={isDark ? <Sun size={15}/> : <Moon size={15}/>}
          label={isDark ? 'Light' : 'Dark'}
          collapsed={scrolled}
        />
        <DesktopPillBtn
          onClick={() => navigate('/')}
          icon={<LogOut size={15}/>}
          label="Logout"
          color="var(--accent-red)"
          collapsed={scrolled}
        />
      </div>

      <BunkPlanner open={showBunk} onOpenChange={setShowBunk} courses={courses} />
    </>
  );
};

/* ── Mobile icon button ── */
const MobileBtn = ({
  onClick, icon, label, color,
}: { onClick: () => void; icon: React.ReactNode; label: string; color?: string }) => {
  const [hov, setHov] = useState(false);
  const fg = color ?? 'var(--text-secondary)';
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-label={label}
      title={label}
      style={{
        width: 38, height: 38,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 10, border: 'none',
        background: hov
          ? `color-mix(in srgb, ${fg} 12%, transparent)`
          : 'transparent',
        color: hov ? fg : 'var(--text-tertiary)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.15s ease, color 0.15s ease',
      }}
    >
      {icon}
    </button>
  );
};

/* ── Desktop pill button (with collapsing label) ── */
const DesktopPillBtn = ({
  onClick, icon, label, color, collapsed,
}: {
  onClick: () => void; icon: React.ReactNode; label: string;
  color?: string; collapsed: boolean;
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
        gap: collapsed ? 0 : 6,
        height: 34,
        padding: collapsed ? '0 10px' : '0 12px',
        borderRadius: 99, border: 'none',
        background: hov
          ? `color-mix(in srgb, ${fg} 14%, transparent)`
          : 'transparent',
        color: hov ? fg : 'var(--text-tertiary)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.15s ease, color 0.15s ease, padding 0.4s ease, gap 0.4s ease',
      }}
    >
      {icon}
      {/* Label slides out on scroll */}
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
        maxWidth: collapsed ? 0 : 100,
        overflow: 'hidden',
        opacity: collapsed ? 0 : 1,
        whiteSpace: 'nowrap',
        transition: 'max-width 0.4s ease, opacity 0.3s ease',
      }}>
        {label}
      </span>
    </button>
  );
};

export default NavBar;
