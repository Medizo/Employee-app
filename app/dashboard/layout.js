'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

const navItems = [
  { icon: '🏠', label: 'Dashboard', path: '/dashboard' },
  { icon: '💼', label: 'Workspace', path: '/dashboard/workspace' },
  { icon: '📋', label: 'Forms', path: '/dashboard/forms' },
  { icon: '📜', label: 'History', path: '/dashboard/history' },
  { icon: '🏆', label: 'Leaderboard', path: '/dashboard/leaderboard' },
  { icon: '📅', label: 'Attendance', path: '/dashboard/attendance' },
  { icon: '💡', label: 'Suggestions', path: '/dashboard/suggestions' },
  { icon: '📨', label: 'Tasks', path: '/dashboard/tasks' },
  { icon: '⚙️', label: 'Settings', path: '/dashboard/settings' },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState('system');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) { router.push('/login'); return; }
      setUser(d.user);
      setTheme(d.user.theme || 'system');
      setLoading(false);
    }).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    const apply = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.setAttribute('data-theme', apply);
  }, [theme]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--surface-border)', borderTopColor: 'var(--primary-light)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    </div>
  );

  const isActive = (path) => path === '/dashboard' ? pathname === path : pathname.startsWith(path);

  return (
    <UserContext.Provider value={{ user, setUser, theme, setTheme }}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Mobile overlay */}
        {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />}

        {/* Sidebar */}
        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
          width: sideOpen ? 260 : 72,
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s ease',
          transform: mobileOpen ? 'translateX(0)' : undefined,
          overflowX: 'hidden',
        }} className="sidebar">
          {/* Logo */}
          <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#06b6d4,#0e7490)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 10L9 13L14 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            {sideOpen && <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>NexusFlow</span>}
          </div>

          {/* User info */}
          {sideOpen && user && (
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                  {user.name?.charAt(0)}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
                  <p style={{ color: '#64748b', fontSize: '0.75rem' }}>{user.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
            {navItems.map(item => (
              <button key={item.path}
                onClick={() => { router.push(item.path); setMobileOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: sideOpen ? '10px 12px' : '10px',
                  justifyContent: sideOpen ? 'flex-start' : 'center',
                  borderRadius: 10, marginBottom: 2, border: 'none',
                  background: isActive(item.path) ? 'var(--sidebar-active)' : 'transparent',
                  color: isActive(item.path) ? '#22d3ee' : 'var(--sidebar-text)',
                  fontWeight: isActive(item.path) ? 600 : 400,
                  fontSize: '0.875rem', cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}>
                {isActive(item.path) && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: 2, background: '#22d3ee' }} />}
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                {sideOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Collapse & Logout */}
          <div style={{ padding: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setSideOpen(!sideOpen)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: sideOpen ? 'flex-start' : 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'transparent', color: 'var(--sidebar-text)', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: '1.1rem', transform: sideOpen ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 0.3s' }}>◀</span>
              {sideOpen && <span>Collapse</span>}
            </button>
            <button onClick={handleLogout}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: sideOpen ? 'flex-start' : 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'transparent', color: '#ef4444', fontSize: '0.875rem', border: 'none', cursor: 'pointer', marginTop: 2 }}>
              <span style={{ fontSize: '1.1rem' }}>🚪</span>
              {sideOpen && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{
          flex: 1,
          marginLeft: sideOpen ? 260 : 72,
          transition: 'margin 0.3s cubic-bezier(0.4,0,0.2,1)',
          minHeight: '100vh',
        }}>
          {/* Topbar */}
          <header style={{
            height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 24px', background: 'var(--surface)', borderBottom: '1px solid var(--surface-border)',
            position: 'sticky', top: 0, zIndex: 30,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setMobileOpen(true)}
                style={{ display: 'none', background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text)' }}
                className="mobile-menu-btn">☰</button>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
                {navItems.find(n => isActive(n.path))?.label || 'Dashboard'}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '24px' }}>
                {['light', 'system', 'dark'].map(t => (
                  <button key={t} onClick={async () => {
                    setTheme(t);
                    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'theme', theme: t }) });
                  }}
                    style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: theme === t ? 'var(--surface)' : 'transparent', boxShadow: theme === t ? 'var(--shadow-sm)' : 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: theme === t ? 'var(--primary)' : 'var(--text-secondary)' }}
                    title={`Theme: ${t}`}>
                    {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'}
                  </button>
                ))}
              </div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
                {user?.name?.charAt(0)}
              </div>
            </div>
          </header>

          {/* Page content */}
          <div style={{ padding: 24 }}>
            {children}
          </div>
        </main>

        <style>{`
          @media (max-width: 768px) {
            .sidebar { transform: translateX(-100%) !important; width: 260px !important; }
            .sidebar { ${mobileOpen ? 'transform: translateX(0) !important;' : ''} }
            main { margin-left: 0 !important; }
            .mobile-menu-btn { display: flex !important; }
          }
        `}</style>
      </div>
    </UserContext.Provider>
  );
}
