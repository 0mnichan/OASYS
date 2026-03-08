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

/* ── Skeleton shimmer box ── */
const SkeletonBox = ({ width, height }: { width: number | string; height: number }) => (
  <>
    <div style={{
      width, height, borderRadius: 6,
      background: 'var(--border-subtle)',
      position: 'relative', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, var(--bg-glass-shimmer, rgba(255,255,255,0.12)) 50%, transparent 100%)',
        animation: 'shimmer 1.6s ease-in-out infinite',
      }}/>
    </div>
    <style>{`
      @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
      @keyframes spinIn  { from { transform: rotate(-90deg) scale(0.5); opacity: 0; } to { transform: rotate(0deg) scale(1); opacity: 1; } }
    `}</style>
  </>
);

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
  const [netid,          setNetid]          = useState("");
  const [password,       setPassword]       = useState("");
  const [captcha,        setCaptcha]        = useState("");
  const [captchaImg,     setCaptchaImg]     = useState("");
  const [captchaSolved,  setCaptchaSolved]  = useState<boolean | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [focused,        setFocused]        = useState<string | null>(null);
  const [isDark,         setIsDark]         = useState(false);

  const userId = React.useMemo(() => getOrCreateUserId(), []);

  useEffect(() => {
    const dark = initTheme();
    setIsDark(dark);
    fetchCaptcha();
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
  };

  const fetchCaptcha = async () => {
    setCaptchaLoading(true); setError(null); setCaptchaSolved(null); setCaptcha("");
    try {
      const res = await fetch(`${API}/start_login/`, { method: "POST", body: new URLSearchParams({ user_id: userId }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCaptchaImg(`data:image/png;base64,${data.captcha_image}`);
      setCaptchaSolved(false);
    } catch { setError("Could not load captcha. Try again."); setCaptchaSolved(false); }
    finally { setCaptchaLoading(false); }
  };

  const refreshCaptcha = async () => {
    setCaptchaLoading(true); setError(null); setCaptchaSolved(null); setCaptcha("");
    try {
      const res = await fetch(`${API}/refresh_captcha/`, { method: "POST", body: new URLSearchParams({ user_id: userId }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCaptchaImg(`data:image/png;base64,${data.captcha_image}`);
      setCaptchaSolved(false);
    } catch { setError("Could not refresh captcha."); setCaptchaSolved(false); }
    finally { setCaptchaLoading(false); }
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
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--border-glass)', borderRadius: 24,
        padding: 'clamp(24px,5vw,36px)',
        boxShadow: 'var(--shadow-glass)',
        position: 'relative',
      }}>

        {/* ── Theme toggle ── */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
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
          <h2 style={{
            fontFamily: FONT, fontWeight: 700,
            fontSize: 'clamp(20px,4vw,26px)', color: 'var(--text-primary)',
            margin: 0, letterSpacing: '-0.01em',
          }}>Sign In</h2>
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

          {/* ── Captcha section ── */}
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'var(--text-label)', letterSpacing: '0.14em', marginBottom: 8, fontWeight: 700 }}>CAPTCHA (please change if captcha seems cut)</div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 12, padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {captchaLoading
                  ? <SkeletonBox width={110} height={40} />
                  : captchaImg
                  ? <img
                      src={captchaImg} alt="Captcha"
                      style={{ height: 48, width: 'auto', maxWidth: 'calc(100% - 80px)', objectFit: 'contain', borderRadius: 6, background: '#fff', display: 'block', flexShrink: 1 }}
                    />
                  : <SkeletonBox width={110} height={40} />
                }
                <button type="button" onClick={refreshCaptcha} disabled={captchaLoading}
                  style={{
                    marginLeft: 'auto', fontFamily: FONT_MONO, fontSize: 11,
                    color: 'var(--accent-blue)', background: 'none', border: 'none',
                    cursor: captchaLoading ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.06em', opacity: captchaLoading ? 0.4 : 1,
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}>CHANGE</button>
              </div>
              {captchaLoading && (
                <div style={{ marginTop: 7, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.06em', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', animation: 'spinIn 1s linear infinite', lineHeight: 1 }}>⟳</span>
                  &nbsp;Loading captcha...
                </div>
              )}
            </div>
          </div>

          <Field label="ENTER CAPTCHA" type="text" value={captcha} onChange={setCaptcha}
            placeholder="Type the code above" focused={focused} name="captcha" onFocus={setFocused} />

          <button type="button" onClick={handleSubmit} disabled={loading}
            style={{
              marginTop: 4, padding: '13px', borderRadius: 12, border: 'none',
              background: loading ? 'var(--border-card)' : 'var(--accent-blue)',
              color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxSizing: 'border-box', width: '100%',
              boxShadow: loading ? 'none' : '0 4px 20px color-mix(in srgb, var(--accent-blue) 38%, transparent)',
              opacity: loading ? 0.7 : 1,
            }}>
            {loading ? 'Signing in...' : 'Sign In →'}
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
  const FONT = "'Google Sans', sans-serif";
  const FONT_MONO = "'Google Sans Mono', monospace";
  return (
    <div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'var(--text-label)', letterSpacing: '0.14em', marginBottom: 7, fontWeight: 700 }}>{label}</div>
      <input type={type} value={value} placeholder={placeholder} autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        onFocus={() => onFocus(name)} onBlur={() => onFocus(null)}
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 12,
          border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border-card)'}`,
          background: 'var(--bg-card)', color: 'var(--text-primary)',
          fontFamily: FONT, fontWeight: 500, fontSize: 14,
          outline: 'none', boxSizing: 'border-box',
          boxShadow: active ? '0 0 0 3px color-mix(in srgb, var(--accent-blue) 14%, transparent)' : 'none',
        }}
      />
    </div>
  );
};

export default LoginForm;