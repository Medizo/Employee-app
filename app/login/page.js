'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Zap, ArrowRight, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
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
      <div style={styles.container}>
        <div style={styles.card} className={shake ? 'shake-anim' : ''}>
          <div style={styles.logoSection}>
            <div style={styles.logo}>
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <rect width="44" height="44" rx="14" fill="#6366f1"/>
                <path d="M14 22L19 14h6l-4 8h5l-8 12 2-8h-5l5-6z" fill="#fff" opacity="0.9"/>
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
                <span style={styles.inputIcon}><Mail size={17} color="#64748b" /></span>
                <input
                  type="email" placeholder="you@company.com" required
                  style={styles.input}
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}><Lock size={17} color="#64748b" /></span>
                <input
                  type={showPw ? 'text' : 'password'} placeholder="Enter your password" required
                  style={styles.input}
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" style={styles.eyeBtn} onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </button>
              </div>
            </div>

            <div style={styles.options}>
              <a href="/forgot-password" style={styles.forgotLink}>Forgot password?</a>
            </div>

            <button type="submit" disabled={loading} style={styles.submitBtn}
              onMouseEnter={e => { if (!loading) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 8px 24px rgba(15,23,42,0.3)'; } }}
              onMouseLeave={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 16px rgba(15,23,42,0.2)'; }}>
              {loading ? <span style={styles.spinner} /> : <ArrowRight size={18} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
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
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', position: 'relative', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  container: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, padding: '20px' },
  card: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 24, padding: '44px 36px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)' },
  logoSection: { textAlign: 'center', marginBottom: 36 },
  logo: { display: 'inline-flex', marginBottom: 16 },
  title: { fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' },
  subtitle: { fontSize: '0.88rem', color: '#64748b', marginTop: 6, fontWeight: 400 },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px', color: '#ef4444', fontSize: '0.85rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 },
  formGroup: { marginBottom: 20 },
  label: { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: 14, pointerEvents: 'none', zIndex: 1, display: 'flex' },
  input: { width: '100%', padding: '13px 14px 13px 46px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, color: '#0f172a', fontSize: '0.9rem', transition: 'border 0.2s, box-shadow 0.2s', outline: 'none', fontFamily: 'inherit' },
  eyeBtn: { position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' },
  options: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 24 },
  forgotLink: { fontSize: '0.85rem', color: '#6366f1', textDecoration: 'none', fontWeight: 500 },
  submitBtn: { width: '100%', padding: '14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 16px rgba(15,23,42,0.2)', fontFamily: 'inherit', letterSpacing: '-0.01em' },
  spinner: { width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' },
};
