import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { applyTheme, initTheme } from "@/components/NavBar";

const API = "";

// Inject Google Sans font
const _googleFont = (() => {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-oasys-font]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.setAttribute('data-oasys-font', '1');
  link.href = 'https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Google+Sans+Mono:wght@400;700&display=swap';
  document.head.appendChild(link);
})();

const getOrCreateUserId = () => {
  const key = "oasys_user_id";
  let id = sessionStorage.getItem(key);
  if (!id) { id = Math.random().toString(36).substring(2, 10); sessionStorage.setItem(key, id); }
  return id;
};

const FONT = "'Google Sans', sans-serif";
const FONT_MONO = "'Google Sans Mono', monospace";

/* ── Animated theme icon ── */
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
  const navigate = useNavigate();
  const [netid,          setNetid]       = useState("");
  const [password,       setPassword]    = useState("");
  const [captcha,        setCaptcha]     = useState("");
  const [captchaAuto,    setCaptchaAuto] = useState<boolean | null>(null); // null=loading, true=autofilled, false=not
  const [loading,        setLoading]     = useState(false);
  const [error,          setError]       = useState<string | null>(null);
  const [focused,        setFocused]     = useState<string | null>(null);
  const [isDark,         setIsDark]      = useState(false);

  const userId = React.useMemo(() => getOrCreateUserId(), []);

  useEffect(() => {
    setIsDark(initTheme());
    fetchCaptcha();
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
  };

  const fetchCaptcha = async () => {
    setCaptchaAuto(null); setCaptcha(""); setError(null);
    try {
      const res = await fetch(`${API}/start_login/`, { method: "POST", body: new URLSearchParams({ user_id: userId }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.captcha_solved) {
        setCaptcha(data.captcha_solved);
        setCaptchaAuto(true);
      } else {
        setCaptchaAuto(false);
      }
    } catch {
      setError("Could not load captcha. Try again.");
      setCaptchaAuto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!netid || !password || !captcha) { setError("Please fill all fields"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/submit_login/`, { method: "POST", body: new URLSearchParams({ user_id: userId, netid, password, captcha }) });
      const html = await res.text();
      if (res.ok) {
        sessionStorage.setItem("attendanceHTML", html);
        sessionStorage.setItem("oasys_netid", netid);
        navigate("/dashboard");
      } else {
        setError("Login failed — check credentials or captcha.");
        await fetchCaptcha();
      }
    } catch { setError("Network error. Try again."); await fetchCaptcha(); }
    finally { setLoading(false); }
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

        {/* ── Theme toggle ── */}
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

        <div style={{ marginBottom: 24, paddingRight: 48 }}>
          <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 'clamp(20px,4vw,26px)', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
            Sign In
          </h2>
          <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 5 }}>
            SRM Student Portal
          </p>
        </div>

        {error && (
          <div style={{
            background: 'color-mix(in srgb, var(--accent-red) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-red) 28%, transparent)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            fontFamily: FONT_MONO, fontSize: 11, color: 'var(--accent-red)',
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="NET ID" type="text" value={netid} onChange={setNetid}
            placeholder="e.g. xy6767" focused={focused} name="netid" onFocus={setFocused} autoComplete="username" />
          <Field label="PASSWORD" type="password" value={password} onChange={setPassword}
            placeholder="Your portal password" focused={focused} name="password" onFocus={setFocused} autoComplete="current-password" />

          {/* ── Captcha status — no buttons, no image ── */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-card)',
            borderRadius: 12, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {captchaAuto === null ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spinIn 1s linear infinite', lineHeight: 1, color: 'var(--text-tertiary)', fontSize: 13 }}>⟳</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>Loading captcha...</span>
              </>
            ) : captchaAuto === true ? (
              <>
                <span style={{ color: 'var(--accent-green)', fontSize: 13 }}>✓</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: 'var(--accent-green)', letterSpacing: '0.06em' }}>Captcha autofilled!</span>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--accent-amber)', fontSize: 13 }}>⚠</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: 'var(--accent-amber)', letterSpacing: '0.06em' }}>Captcha not autofilled — please try later</span>
              </>
            )}
          </div>

          <button type="button" onClick={handleSubmit} disabled={loading || captchaAuto !== true}
            style={{
              marginTop: 4, padding: '13px', borderRadius: 12, border: 'none',
              background: (loading || captchaAuto !== true) ? 'var(--border-card)' : 'var(--accent-blue)',
              color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 15,
              cursor: (loading || captchaAuto !== true) ? 'not-allowed' : 'pointer',
              boxSizing: 'border-box', width: '100%',
              boxShadow: (loading || captchaAuto !== true) ? 'none' : '0 4px 20px color-mix(in srgb, var(--accent-blue) 38%, transparent)',
              opacity: (loading || captchaAuto !== true) ? 0.5 : 1,
              transition: 'background 0.2s, opacity 0.2s',
            }}>
            {loading ? 'Signing in...' : captchaAuto === null ? 'Loading...' : captchaAuto === false ? 'Captcha unavailable' : 'Sign In →'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, type, value, onChange, placeholder, focused, name, onFocus, autoComplete }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder: string; focused: string | null; name: string;
  onFocus: (n: string | null) => void; autoComplete?: string;
}) => {
  const active = focused === name;
  return (
    <div>
      <div style={{ fontFamily: "'Google Sans Mono', monospace", fontSize: 10, color: 'var(--text-label)', letterSpacing: '0.14em', marginBottom: 7, fontWeight: 700 }}>{label}</div>
      <input type={type} value={value} placeholder={placeholder} autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        onFocus={() => onFocus(name)} onBlur={() => onFocus(null)}
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 12,
          border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border-card)'}`,
          background: 'var(--bg-card)', color: 'var(--text-primary)',
          fontFamily: "'Google Sans', sans-serif", fontWeight: 500, fontSize: 14,
          outline: 'none', boxSizing: 'border-box',
          boxShadow: active ? '0 0 0 3px color-mix(in srgb, var(--accent-blue) 14%, transparent)' : 'none',
        }}
      />
    </div>
  );
};

export default LoginForm;