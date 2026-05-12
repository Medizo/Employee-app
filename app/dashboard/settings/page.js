'use client';
import { useState } from 'react';
import { useUser } from '../layout';

export default function SettingsPage() {
  const ctx = useUser();
  const user = ctx?.user;
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ current: '', newPw: '', confirm: '' });
  const [notifs, setNotifs] = useState(user?.notifications || { email: true, taskReminders: true, leaderboard: true, attendance: true });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  const getStrength = () => {
    const p = passwords.newPw;
    if (!p) return { w: '0%', c: '#475569', l: '' };
    if (p.length < 6) return { w: '25%', c: '#ef4444', l: 'Weak' };
    if (p.length < 8) return { w: '50%', c: '#f59e0b', l: 'Fair' };
    if (/[A-Z]/.test(p) && /[0-9]/.test(p) && /[^a-zA-Z0-9]/.test(p)) return { w: '100%', c: '#10b981', l: 'Strong' };
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) return { w: '75%', c: '#06b6d4', l: 'Good' };
    return { w: '50%', c: '#f59e0b', l: 'Fair' };
  };
  const str = getStrength();

  const saveProfile = async () => {
    setSaving(true);
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'profile', ...profile }) });
    setSaving(false); setSaved('Profile updated!'); setTimeout(() => setSaved(''), 2000);
  };

  const changePassword = async () => {
    setError('');
    if (passwords.newPw !== passwords.confirm) { setError('Passwords do not match'); return; }
    if (passwords.newPw.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSaving(true);
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'password', currentPassword: passwords.current, newPassword: passwords.newPw }) });
    setSaving(false); setPasswords({ current: '', newPw: '', confirm: '' }); setSaved('Password changed!'); setTimeout(() => setSaved(''), 2000);
  };

  const saveNotifs = async () => {
    setSaving(true);
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'notifications', notifications: notifs }) });
    setSaving(false); setSaved('Preferences saved!'); setTimeout(() => setSaved(''), 2000);
  };

  const saveThemeMode = async (t) => {
    ctx.setTheme(t);
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'theme', theme: t }) });
    setSaved('Theme mode updated!'); setTimeout(() => setSaved(''), 2000);
  };

  const saveThemeColor = async (c) => {
    ctx.setThemeColor(c);
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'themeColor', themeColor: c }) });
    setSaved('Theme color updated!'); setTimeout(() => setSaved(''), 2000);
  };

  const tabs = [
    { key: 'profile', icon: '👤', label: 'Edit Profile' },
    { key: 'password', icon: '🔒', label: 'Change Password' },
    { key: 'notifications', icon: '🔔', label: 'Notifications' },
    { key: 'theme', icon: '🎨', label: 'Theme' },
  ];

  return (
    <div className="animate-fade">
      <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 20 }}>⚙️ Settings</h2>

      {saved && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '10px 16px', color: 'var(--success)', marginBottom: 16, textAlign: 'center', fontWeight: 600 }}>✅ {saved}</div>}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Tab nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: tab === t.key ? 600 : 400, textAlign: 'left',
                background: tab === t.key ? 'var(--primary-glow)' : 'transparent', color: tab === t.key ? 'var(--primary-light)' : 'var(--text-secondary)' }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, minWidth: 300 }}>
          {tab === 'profile' && (
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>👤 Edit Profile</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.5rem', fontWeight: 800 }}>{user?.name?.charAt(0)}</div>
                <div>
                  <p style={{ fontWeight: 700 }}>{user?.name}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.email}</p>
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input value={user?.department || ''} disabled style={{ opacity: 0.6 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <input value={user?.role || ''} disabled style={{ opacity: 0.6 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          )}

          {tab === 'password' && (
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>🔒 Change Password</h3>
              {error && <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: '10px', color: 'var(--danger)', marginBottom: 16, fontSize: '0.85rem' }}>{error}</div>}
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" value={passwords.newPw} onChange={e => { setPasswords({...passwords, newPw: e.target.value}); setError(''); }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <div style={{ flex: 1, height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: str.w, height: '100%', background: str.c, borderRadius: 2, transition: 'all 0.3s' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: str.c, fontWeight: 600 }}>{str.l}</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" value={passwords.confirm} onChange={e => { setPasswords({...passwords, confirm: e.target.value}); setError(''); }} />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                <p>• At least 6 characters</p>
                <p>• Include uppercase and numbers for a stronger password</p>
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" onClick={changePassword} disabled={saving}>{saving ? 'Changing...' : 'Change Password'}</button>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>🔔 Notification Preferences</h3>
              {[
                { key: 'email', label: 'Email Notifications', desc: 'Receive email updates for important events' },
                { key: 'taskReminders', label: 'Task Reminders', desc: 'Get notified about upcoming task deadlines' },
                { key: 'leaderboard', label: 'Leaderboard Updates', desc: 'Updates when your rank changes' },
                { key: 'attendance', label: 'Attendance Alerts', desc: 'Reminders to mark your attendance' },
              ].map(n => (
                <div key={n.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--surface-border)' }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>{n.label}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{n.desc}</p>
                  </div>
                  <button onClick={() => setNotifs({...notifs, [n.key]: !notifs[n.key]})}
                    style={{ width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', padding: 2, transition: 'background 0.2s',
                      background: notifs[n.key] ? 'var(--primary)' : 'var(--bg-secondary)' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'transform 0.2s',
                      transform: notifs[n.key] ? 'translateX(22px)' : 'translateX(0)' }} />
                  </button>
                </div>
              ))}
              <div className="form-actions">
                <button className="btn btn-primary" onClick={saveNotifs} disabled={saving}>{saving ? 'Saving...' : 'Save Preferences'}</button>
              </div>
            </div>
          )}

          {tab === 'theme' && (
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>🎨 Theme</h3>
              
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>Color Palette</h4>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { key: 'beige', label: 'Beige', color: '#c29b76' },
                    { key: 'seafoam', label: 'Seafoam', color: '#5b9e8c' },
                    { key: 'rose', label: 'Rose', color: '#c97a8e' },
                  ].map(c => (
                    <button key={c.key} onClick={() => saveThemeColor(c.key)}
                      style={{ padding: '8px 16px', borderRadius: 20, border: `2px solid ${ctx?.themeColor === c.key ? 'var(--text)' : 'transparent'}`, cursor: 'pointer', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: c.color }} />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>Appearance</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { key: 'light', icon: '☀️', label: 'Light', bg: '#f0f4f8' },
                    { key: 'dark', icon: '🌙', label: 'Dark', bg: '#0b1120' },
                    { key: 'system', icon: '💻', label: 'System', bg: 'linear-gradient(135deg, #f0f4f8 50%, #0b1120 50%)' },
                  ].map(t => (
                    <button key={t.key} onClick={() => saveThemeMode(t.key)}
                      style={{ padding: 20, borderRadius: 12, border: `2px solid ${ctx?.theme === t.key ? 'var(--primary-light)' : 'var(--surface-border)'}`, cursor: 'pointer', textAlign: 'center', background: 'var(--surface)', transition: 'all 0.2s' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: t.bg, margin: '0 auto 10px', border: '1px solid var(--surface-border)' }} />
                      <span style={{ fontSize: '1.2rem' }}>{t.icon}</span>
                      <p style={{ fontWeight: 600, marginTop: 4, color: 'var(--text)' }}>{t.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
