'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmail = (e) => { e.preventDefault(); setLoading(true); setTimeout(() => { setStep(2); setLoading(false); }, 1000); };
  const handleOtp = (e) => { e.preventDefault(); if (otp === '123456') { setStep(3); setError(''); } else { setError('Invalid OTP. Use 123456 for demo.'); } };
  const handleReset = (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    if (newPw.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setTimeout(() => { setStep(4); setLoading(false); }, 800);
  };

  const getStrength = () => {
    if (newPw.length === 0) return { width: '0%', color: '#475569', label: '' };
    if (newPw.length < 6) return { width: '25%', color: '#ef4444', label: 'Weak' };
    if (newPw.length < 8) return { width: '50%', color: '#f59e0b', label: 'Fair' };
    if (/[A-Z]/.test(newPw) && /[0-9]/.test(newPw)) return { width: '100%', color: '#10b981', label: 'Strong' };
    return { width: '75%', color: '#06b6d4', label: 'Good' };
  };
  const strength = getStrength();

  const card = { background: 'rgba(26,35,50,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '40px 36px', maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' };
  const inputStyle = { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' };
  const btnStyle = { width: '100%', padding: 14, background: 'linear-gradient(135deg,#0e7490,#06b6d4)', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 700, cursor: 'pointer' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0b1120,#0f172a,#1a1a2e)', padding: 20 }}>
      <div style={card}>
        {step === 1 && (
          <form onSubmit={handleEmail}>
            <h2 style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>🔐 Forgot Password</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 24 }}>Enter your email to receive a reset OTP</p>
            <input type="email" placeholder="your@email.com" required value={email} onChange={e => setEmail(e.target.value)} style={{...inputStyle, marginBottom: 20}} />
            <button type="submit" disabled={loading} style={btnStyle}>{loading ? 'Sending OTP...' : 'Send OTP'}</button>
            <p style={{ textAlign: 'center', marginTop: 16 }}><a href="/login" style={{ color: '#06b6d4', fontSize: '0.85rem' }}>← Back to Login</a></p>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleOtp}>
            <h2 style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>📧 Enter OTP</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 24 }}>We sent a 6-digit code to {email}</p>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: 16 }}>{error}</div>}
            <input type="text" placeholder="Enter 6-digit OTP" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value)} style={{...inputStyle, marginBottom: 12, textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em'}} />
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 20, textAlign: 'center' }}>Demo OTP: <strong style={{ color: '#06b6d4' }}>123456</strong></p>
            <button type="submit" style={btnStyle}>Verify OTP</button>
          </form>
        )}
        {step === 3 && (
          <form onSubmit={handleReset}>
            <h2 style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>🔑 Set New Password</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 24 }}>Choose a strong new password</p>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: 16 }}>{error}</div>}
            <input type="password" placeholder="New password" required value={newPw} onChange={e => { setNewPw(e.target.value); setError(''); }} style={{...inputStyle, marginBottom: 8}} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: strength.width, height: '100%', background: strength.color, borderRadius: 2, transition: 'all 0.3s' }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 600 }}>{strength.label}</span>
            </div>
            <input type="password" placeholder="Confirm password" required value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(''); }} style={{...inputStyle, marginBottom: 20}} />
            <button type="submit" disabled={loading} style={btnStyle}>{loading ? 'Resetting...' : 'Reset Password'}</button>
          </form>
        )}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h2 style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Password Reset!</h2>
            <p style={{ color: '#94a3b8', marginBottom: 24 }}>Your password has been updated successfully.</p>
            <button onClick={() => router.push('/login')} style={btnStyle}>Go to Login</button>
          </div>
        )}
      </div>
    </div>
  );
}
