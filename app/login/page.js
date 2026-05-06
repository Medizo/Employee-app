'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      } else {
        if (remember) localStorage.setItem('remember-email', form.email);
        else localStorage.removeItem('remember-email');
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.bgOrbs}>
        <div style={{...styles.orb, ...styles.orb1}} />
        <div style={{...styles.orb, ...styles.orb2}} />
        <div style={{...styles.orb, ...styles.orb3}} />
      </div>
      <div style={styles.container}>
        <div style={styles.card} className={shake ? 'shake-anim' : ''}>
          <div style={styles.logoSection}>
            <div style={styles.logo}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="12" fill="url(#g1)"/>
                <path d="M12 20L18 26L28 14" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <defs><linearGradient id="g1" x1="0" y1="0" x2="40" y2="40"><stop stopColor="#06b6d4"/><stop offset="1" stopColor="#0e7490"/></linearGradient></defs>
              </svg>
            </div>
            <h1 style={styles.title}>NexusFlow</h1>
            <p style={styles.subtitle}>Employee Portal — Sign in to continue</p>
          </div>

          {error && <div style={styles.errorBox}><span>⚠️</span> {error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>📧</span>
                <input
                  type="email" placeholder="you@company.com" required
                  style={styles.input}
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>🔒</span>
                <input
                  type={showPw ? 'text' : 'password'} placeholder="Enter your password" required
                  style={styles.input}
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                />
                <button type="button" style={styles.eyeBtn} onClick={() => setShowPw(!showPw)}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={styles.options}>
              <label style={styles.checkLabel}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={styles.checkbox} />
                Remember me
              </label>
              <a href="/forgot-password" style={styles.forgotLink}>Forgot password?</a>
            </div>

            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? <span style={styles.spinner} /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={styles.demoBox}>
            <p style={styles.demoTitle}>🔑 Demo Credentials</p>
            <p style={styles.demoText}>Email: <strong>ahmad@company.com</strong></p>
            <p style={styles.demoText}>Password: <strong>password123</strong></p>
          </div>
        </div>
      </div>
      <style>{`
        .shake-anim { animation: shake 0.5s ease-in-out; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 50%{transform:translateX(8px)} 75%{transform:translateX(-4px)} }
      `}</style>
    </div>
  );
}

const styles = {
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0b1120 0%, #0f172a 50%, #1a1a2e 100%)', position: 'relative', overflow: 'hidden' },
  bgOrbs: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  orb: { position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.3 },
  orb1: { width: 400, height: 400, background: '#06b6d4', top: '-10%', left: '-5%' },
  orb2: { width: 300, height: 300, background: '#8b5cf6', bottom: '-5%', right: '-5%' },
  orb3: { width: 200, height: 200, background: '#0e7490', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' },
  container: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, padding: '20px' },
  card: { background: 'rgba(26, 35, 50, 0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '40px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  logoSection: { textAlign: 'center', marginBottom: 32 },
  logo: { display: 'inline-flex', marginBottom: 16 },
  title: { fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' },
  subtitle: { fontSize: '0.9rem', color: '#94a3b8', marginTop: 4 },
  errorBox: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 },
  formGroup: { marginBottom: 20 },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: 14, fontSize: '1rem', pointerEvents: 'none', zIndex: 1 },
  input: { width: '100%', padding: '12px 14px 12px 44px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: '0.9rem', transition: 'border 0.2s, box-shadow 0.2s', outline: 'none' },
  eyeBtn: { position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: 4 },
  options: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#94a3b8', cursor: 'pointer' },
  checkbox: { width: 16, height: 16, accentColor: '#06b6d4' },
  forgotLink: { fontSize: '0.85rem', color: '#06b6d4', textDecoration: 'none' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #0e7490, #06b6d4)', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'transform 0.2s, box-shadow 0.2s' },
  spinner: { width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' },
  demoBox: { marginTop: 24, padding: '14px 16px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10, textAlign: 'center' },
  demoTitle: { fontSize: '0.8rem', fontWeight: 600, color: '#06b6d4', marginBottom: 6 },
  demoText: { fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6 },
};
