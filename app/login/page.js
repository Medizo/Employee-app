'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Zap, ArrowRight, KeyRound } from 'lucide-react';

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
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <rect width="44" height="44" rx="14" fill="url(#lg1)"/>
                <path d="M14 22L19 14h6l-4 8h5l-8 12 2-8h-5l5-6z" fill="#fff" opacity="0.9"/>
                <defs><linearGradient id="lg1" x1="0" y1="0" x2="44" y2="44"><stop stopColor="#818cf8"/><stop offset="1" stopColor="#6366f1"/></linearGradient></defs>
              </svg>
            </div>
            <h1 style={styles.title}>NexusFlow</h1>
            <p style={styles.subtitle}>Employee Portal — Sign in to continue</p>
          </div>

          {error && <div style={styles.errorBox}><span style={{ fontSize: '0.9rem' }}>⚠️</span> {error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}><Mail size={17} color="#818cf8" /></span>
                <input
                  type="email" placeholder="you@company.com" required
                  style={styles.input}
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  onFocus={e => { e.target.style.borderColor = '#818cf8'; e.target.style.boxShadow = '0 0 0 3px rgba(129,140,248,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}><Lock size={17} color="#818cf8" /></span>
                <input
                  type={showPw ? 'text' : 'password'} placeholder="Enter your password" required
                  style={styles.input}
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  onFocus={e => { e.target.style.borderColor = '#818cf8'; e.target.style.boxShadow = '0 0 0 3px rgba(129,140,248,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" style={styles.eyeBtn} onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
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

            <button type="submit" disabled={loading} style={styles.submitBtn}
              onMouseEnter={e => { if (!loading) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 8px 24px rgba(99,102,241,0.4)'; } }}
              onMouseLeave={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 16px rgba(99,102,241,0.3)'; }}>
              {loading ? <span style={styles.spinner} /> : <ArrowRight size={18} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={styles.demoBox}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
              <KeyRound size={14} color="#818cf8" />
              <p style={styles.demoTitle}>Demo Credentials</p>
            </div>
            <p style={styles.demoText}>Email: <strong style={{ color: '#c7d2fe' }}>ahmad@company.com</strong></p>
            <p style={styles.demoText}>Password: <strong style={{ color: '#c7d2fe' }}>password123</strong></p>
          </div>
        </div>
      </div>
      <style>{`
        .shake-anim { animation: shake 0.5s ease-in-out; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 50%{transform:translateX(8px)} 75%{transform:translateX(-4px)} }
      `}
      </style>
    </div>
  );
}

const styles = {
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f0a2e 0%, #1e1b4b 40%, #312e81 100%)', position: 'relative', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  bgOrbs: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  orb: { position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.25 },
  orb1: { width: 500, height: 500, background: '#6366f1', top: '-15%', left: '-10%' },
  orb2: { width: 400, height: 400, background: '#f472b6', bottom: '-10%', right: '-8%' },
  orb3: { width: 250, height: 250, background: '#818cf8', top: '40%', left: '55%', transform: 'translate(-50%,-50%)' },
  container: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, padding: '20px' },
  card: { background: 'rgba(30, 27, 75, 0.7)', backdropFilter: 'blur(24px)', border: '1px solid rgba(129,140,248,0.15)', borderRadius: 24, padding: '44px 36px', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' },
  logoSection: { textAlign: 'center', marginBottom: 36 },
  logo: { display: 'inline-flex', marginBottom: 16 },
  title: { fontSize: '1.8rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.03em' },
  subtitle: { fontSize: '0.88rem', color: '#94a3b8', marginTop: 6, fontWeight: 400 },
  errorBox: { background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 12, padding: '10px 14px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 },
  formGroup: { marginBottom: 20 },
  label: { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: 14, pointerEvents: 'none', zIndex: 1, display: 'flex' },
  input: { width: '100%', padding: '13px 14px 13px 46px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#f1f5f9', fontSize: '0.9rem', transition: 'border 0.2s, box-shadow 0.2s', outline: 'none', fontFamily: 'inherit' },
  eyeBtn: { position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' },
  options: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#94a3b8', cursor: 'pointer' },
  checkbox: { width: 16, height: 16, accentColor: '#6366f1', borderRadius: 4 },
  forgotLink: { fontSize: '0.85rem', color: '#818cf8', textDecoration: 'none', fontWeight: 500 },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 16px rgba(99,102,241,0.3)', fontFamily: 'inherit', letterSpacing: '-0.01em' },
  spinner: { width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' },
  demoBox: { marginTop: 28, padding: '16px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, textAlign: 'center' },
  demoTitle: { fontSize: '0.78rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.04em' },
  demoText: { fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6 },
};
