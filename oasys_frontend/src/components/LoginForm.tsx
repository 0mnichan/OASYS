import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { applyTheme, initTheme } from "@/components/NavBar";

const API = "";

const getOrCreateUserId = () => {
  const key = "oasys_user_id";
  let id = sessionStorage.getItem(key);
  if (!id) { id = Math.random().toString(36).substring(2, 10); sessionStorage.setItem(key, id); }
  return id;
};

/* ── Skeleton shimmer box ── */
const SkeletonBox = ({ width, height }: { width: number | string; height: number }) => (
  <>
    <div style={{
      width, height, borderRadius: 6,
      background: 'var(--border-subtle)',
      position: 'relative', overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Shimmer sweep */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, var(--bg-glass-shimmer, rgba(255,255,255,0.12)) 50%, transparent 100%)',
        animation: 'shimmer 1.6s ease-in-out infinite',
      }}/>
    </div>
    <style>{`
      @keyframes shimmer {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
    `}</style>
  </>
);

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [netid,     setNetid]     = useState("");
  const [password,  setPassword]  = useState("");
  const [captcha,   setCaptcha]   = useState("");
  const [captchaImg, setCaptchaImg] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [focused,   setFocused]   = useState<string | null>(null);
  const [isDark,    setIsDark]    = useState(false);

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
    setCaptchaLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/start_login/`, { method: "POST", body: new URLSearchParams({ user_id: userId }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCaptchaImg(`data:image/png;base64,${data.captcha_image}`);
      setCaptcha("");
    } catch { setError("Could not load captcha. Try again."); }
    finally   { setCaptchaLoading(false); }
  };

  const refreshCaptcha = async () => {
    setCaptchaLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/refresh_captcha/`, { method: "POST", body: new URLSearchParams({ user_id: userId }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCaptchaImg(`data:image/png;base64,${data.captcha_image}`);
      setCaptcha("");
    } catch { setError("Could not refresh captcha."); }
    finally   { setCaptchaLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!netid || !password || !captcha) { setError("Please fill all fields"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/submit_login/`, { method: "POST", body: new URLSearchParams({ user_id: userId, netid, password, captcha }) });
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
    finally   { setLoading(false); }
  };

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--border-glass)', borderRadius: 24,
        padding: 'clamp(24px,5vw,36px)',
        boxShadow: 'var(--shadow-glass)',
        position: 'relative',  /* for the toggle button */
      }}>

        {/* ── Theme toggle — top RIGHT of card ── */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--bg-tile)',
            border: '1px solid var(--border-card)',
            color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
          {isDark ? <Sun size={15}/> : <Moon size={15}/>}
        </button>

        {/* Form header — right-padded so it doesn't overlap toggle */}
        <div style={{ marginBottom: 24, paddingRight: 48 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(20px,4vw,26px)', color: 'var(--text-primary)',
            margin: 0, letterSpacing: '-0.02em',
          }}>Sign In</h2>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text-tertiary)', marginTop: 5,
          }}>SRM Student Portal</p>
        </div>

        {error && (
          <div style={{
            background: 'color-mix(in srgb, var(--accent-red) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-red) 28%, transparent)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-red)',
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field
            label="NET ID" type="text" value={netid} onChange={setNetid}
            placeholder="e.g. RA2317777777777"
            focused={focused} name="netid" onFocus={setFocused}
            autoComplete="username"
          />
          <Field
            label="PASSWORD" type="password" value={password} onChange={setPassword}
            placeholder="Your portal password"
            focused={focused} name="password" onFocus={setFocused}
            autoComplete="current-password"
          />

          {/* Captcha row */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-label)', letterSpacing: '0.14em', marginBottom: 8, fontWeight: 700 }}>CAPTCHA</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg-card)', border: '1px solid var(--border-card)',
              borderRadius: 12, padding: '10px 14px',
            }}>
              {/* Skeleton while loading, image when ready */}
              {captchaLoading
                ? <SkeletonBox width={110} height={40} />
                : captchaImg
                ? <img src={captchaImg} alt="Captcha" style={{ height: 40, borderRadius: 6, background: '#fff', display: 'block' }}/>
                : <SkeletonBox width={110} height={40} />
              }
              <button
                type="button" onClick={refreshCaptcha} disabled={captchaLoading}
                style={{
                  marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--accent-blue)', background: 'none', border: 'none',
                  cursor: captchaLoading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.06em', opacity: captchaLoading ? 0.4 : 1,
                  flexShrink: 0,
                }}>CHANGE</button>
            </div>
          </div>

          <Field
            label="ENTER CAPTCHA" type="text" value={captcha} onChange={setCaptcha}
            placeholder="Type the code above"
            focused={focused} name="captcha" onFocus={setFocused}
          />

          <button
            type="button" onClick={handleSubmit} disabled={loading}
            style={{
              marginTop: 4, padding: '13px', borderRadius: 12, border: 'none',
              background: loading ? 'var(--border-card)' : 'var(--accent-blue)',
              color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
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

/* ─── Input field ─── */
const Field = ({ label, type, value, onChange, placeholder, focused, name, onFocus, autoComplete }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  focused: string | null; name: string;
  onFocus: (n: string | null) => void; autoComplete?: string;
}) => {
  const active = focused === name;
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-label)', letterSpacing: '0.14em', marginBottom: 7, fontWeight: 700 }}>{label}</div>
      <input
        type={type} value={value} placeholder={placeholder} autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        onFocus={() => onFocus(name)} onBlur={() => onFocus(null)}
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 12,
          border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border-card)'}`,
          background: 'var(--bg-card)', color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)', fontSize: 14, outline: 'none',
          boxShadow: active ? '0 0 0 3px color-mix(in srgb, var(--accent-blue) 14%, transparent)' : 'none',
        }}
      />
    </div>
  );
};

export default LoginForm;
