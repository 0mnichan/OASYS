import React, { useEffect, useRef, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { applyTheme, initTheme } from "@/components/NavBar";

const _googleFont = (() => {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-oasys-font]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.setAttribute('data-oasys-font', '1');
  link.href = 'https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Google+Sans+Mono:wght@400;700&display=swap';
  document.head.appendChild(link);
})();

const FONT = "'Google Sans', sans-serif";
const FONT_MONO = "'Google Sans Mono', monospace";

const ThemeIcon = ({ isDark }: { isDark: boolean }) => {
  const isFirst = useRef(true);
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setAnimKey(k => k + 1);
  }, [isDark]);
  return (
    <span key={animKey} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: animKey > 0 ? 'spinIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
    }}>
      {isDark ? <Sun size={15}/> : <Moon size={15}/>}
    </span>
  );
};

const LoginForm: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => { setIsDark(initTheme()); }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
  };

  return (
    <div style={{ width: '100%', maxWidth: 420, fontFamily: FONT }}>
      <style>{`
        @keyframes spinIn { from { transform: rotate(-90deg) scale(0.5); opacity: 0; } to { transform: rotate(0deg) scale(1); opacity: 1; } }
      `}</style>

      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--border-glass)', borderRadius: 24,
        padding: 'clamp(24px,5vw,36px)',
        boxShadow: 'var(--shadow-glass)',
        position: 'relative',
      }}>

        <button onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--bg-tile)', border: '1px solid var(--border-card)',
            color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, overflow: 'hidden',
          }}>
          <ThemeIcon isDark={isDark} />
        </button>

        <div style={{ paddingRight: 48, marginBottom: 20 }}>
          <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 'clamp(20px,4vw,26px)', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
            OASYS
          </h2>
          <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 5 }}>
            SRM Attendance Tracker
          </p>
        </div>

        <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
          <p style={{ margin: '0 0 12px' }}>sorry vro 😔😔</p>
          <p style={{ margin: '0 0 12px' }}>srm ts pmo fr, they done implemented area 51 ahh security on the portal 😭😭</p>
          <p style={{ margin: '0 0 12px' }}>logins are blocked rn while i try to figure it out 💀</p>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 11 }}>check back soon 🙏</p>
        </div>

      </div>
    </div>
  );
};

export default LoginForm;