import React, { useEffect, useState } from 'react';
import LoginForm from '@/components/LoginForm';
import TermsDialog from '@/components/TermsDialog';
import { Shield, Github } from 'lucide-react';

const Index = () => {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    document.body.classList.add('landing-page');
    const accepted = localStorage.getItem("oasys_terms_accepted");
    if (!accepted) setShowTermsModal(true);
    setTimeout(() => setVis(true), 80);
    return () => document.body.classList.remove('landing-page');
  }, []);

  const handleAccept = (dontShowAgain: boolean) => {
    if (dontShowAgain) localStorage.setItem("oasys_terms_accepted", "true");
    setShowTermsModal(false);
  };
  const handleDecline = () => {
    alert("You must agree to the Terms and Conditions to use OASYS.");
    window.location.href = "https://oasys-omxb.onrender.com/";
  };

  return (
    <>
      <TermsDialog open={showTermsModal} onAccept={handleAccept} onDecline={handleDecline} />

      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', position: 'relative', overflow: 'hidden' }}>

        {/* Ambient blobs */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -200, left: -100, width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, var(--blob-1) 0%, transparent 65%)', animation: 'blobDrift 20s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: -100, right: -150, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, var(--blob-2) 0%, transparent 65%)', animation: 'blobDrift 26s ease-in-out infinite alternate-reverse' }} />
          <div style={{ position: 'absolute', top: '40%', left: '40%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, var(--blob-3) 0%, transparent 65%)', animation: 'blobDrift 16s ease-in-out infinite alternate' }} />
        </div>

        {/* Grain */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`, opacity: 0.6 }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48 }}>

          {/* Hero text */}
          <div style={{
            textAlign: 'center',
            opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(-20px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-label)', letterSpacing: '0.24em', marginBottom: 16, fontWeight: 700 }}>SRM RAMAPURAM</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(52px, 10vw, 96px)', letterSpacing: '-0.04em', lineHeight: 1, margin: 0, color: 'var(--text-primary)' }}>
              OASYS
            </h1>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--text-tertiary)', marginTop: 14, maxWidth: 420, lineHeight: 1.6 }}>
              Optimal Attendance SYStem — track, plan, and stay above 75%.
            </p>
          </div>

          {/* Login card */}
          <div style={{
            opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s 0.15s ease, transform 0.7s 0.15s ease',
            width: '100%', display: 'flex', justifyContent: 'center',
          }}>
            <LoginForm />
          </div>

          {/* Footer links */}
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
            opacity: vis ? 1 : 0, transition: 'opacity 0.7s 0.3s ease',
          }}>
            <FooterBtn onClick={() => setShowTermsModal(true)} icon={<Shield size={13} />} label="Terms & Conditions" />
            <FooterBtn href="https://github.com/0mnichan/OASYS.git" icon={<Github size={13} />} label="View on GitHub" />
          </div>

          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 420, lineHeight: 1.8, letterSpacing: '0.02em', opacity: vis ? 0.7 : 0, transition: 'opacity 0.7s 0.4s ease' }}>
            Credentials are used only to fetch attendance data and are never stored. This is an unofficial tool not affiliated with SRMIST.
          </p>
        </div>
      </div>
    </>
  );
};

const FooterBtn = ({ onClick, href, icon, label }: { onClick?: () => void; href?: string; icon: React.ReactNode; label: string }) => {
  const [hov, setHov] = useState(false);
  const style: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10,
    background: hov ? 'var(--bg-glass)' : 'transparent',
    border: '1px solid ' + (hov ? 'var(--border-card)' : 'transparent'),
    color: hov ? 'var(--text-primary)' : 'var(--text-muted)',
    fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s ease', textDecoration: 'none',
  };
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" style={style} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{icon}{label}</a>
    : <button onClick={onClick} style={style} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{icon}{label}</button>;
};

export default Index;