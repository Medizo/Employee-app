'use client';
import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Briefcase, FileText, History, Trophy, CalendarDays, Lightbulb, ListTodo, Settings, ChevronLeft, LogOut, Menu, Sun, Monitor, Moon, Search, Bell, Timer, CalendarClock } from 'lucide-react';

const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Briefcase, label: 'Workspace', path: '/dashboard/workspace' },
  { icon: FileText, label: 'Forms', path: '/dashboard/forms' },
  { icon: History, label: 'History', path: '/dashboard/history' },
  { icon: Trophy, label: 'Leaderboard', path: '/dashboard/leaderboard' },
  { icon: CalendarDays, label: 'Attendance', path: '/dashboard/attendance' },
  { icon: Lightbulb, label: 'Suggestions', path: '/dashboard/suggestions' },
  { icon: ListTodo, label: 'Tasks', path: '/dashboard/tasks' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

/* ──────────────────────────────────────────────────────
   LIVE CLOCK COMPONENT — renders HH:MM:SS
   Uses native local Date methods for reliable midnight reset
   ────────────────────────────────────────────────────── */
function getLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function LiveClock({ loginTime, todayTotalSeconds, monthlyTotalSeconds }) {
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);

  useEffect(() => {
    const WORK_START = 8;  // 8 AM
    const WORK_END = 20;   // 8 PM

    const tick = () => {
      const now = new Date();
      const todayStr = getLocalDateStr(now);
      const currentHour = now.getHours();

      let liveToday = 0;
      let liveMonth = 0;

      if (loginTime) {
        const loginDate = new Date(loginTime);
        const loginDayStr = getLocalDateStr(loginDate);

        // Only count if we're within working hours right now
        if (currentHour >= WORK_START && currentHour < WORK_END) {
          if (loginDayStr === todayStr) {
            // Logged in today — clamp login start to 8 AM
            const dayStart = new Date(now);
            dayStart.setHours(WORK_START, 0, 0, 0);
            const effectiveLogin = loginDate < dayStart ? dayStart : loginDate;
            liveToday = Math.max(0, Math.floor((now.getTime() - effectiveLogin.getTime()) / 1000));
          } else {
            // Logged in on a previous day — count from 8 AM today
            const dayStart = new Date(now);
            dayStart.setHours(WORK_START, 0, 0, 0);
            liveToday = Math.max(0, Math.floor((now.getTime() - dayStart.getTime()) / 1000));
          }
          liveMonth = liveToday; // only add today's live portion to month
        }
        // Outside 8AM-8PM: liveToday and liveMonth stay 0
      }

      setTodayTotal((todayTotalSeconds || 0) + liveToday);
      setMonthTotal((monthlyTotalSeconds || 0) + liveMonth);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [loginTime, todayTotalSeconds, monthlyTotalSeconds]);

  const fmtTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const fmtHoursMinutes = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {/* Today's Clock */}
      <div className="time-clock-pill" title="Today's logged hours (live)">
        <div className="time-clock-icon" style={{ background: 'rgba(52, 211, 153, 0.15)' }}>
          <Timer size={13} color="#34d399" strokeWidth={2.5} />
        </div>
        <div className="time-clock-info">
          <span className="time-clock-label">Today</span>
          <span className="time-clock-value" style={{ color: '#34d399' }}>
            {fmtTime(todayTotal)}
          </span>
        </div>
        {loginTime && <span className="time-clock-dot" />}
      </div>

      {/* Monthly Clock */}
      <div className="time-clock-pill" title="This month's total logged hours">
        <div className="time-clock-icon" style={{ background: 'rgba(129, 140, 248, 0.15)' }}>
          <CalendarClock size={13} color="#818cf8" strokeWidth={2.5} />
        </div>
        <div className="time-clock-info">
          <span className="time-clock-label">Month</span>
          <span className="time-clock-value" style={{ color: '#818cf8' }}>
            {fmtHoursMinutes(monthTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState('system');
  const [loading, setLoading] = useState(true);

  // Time tracking state
  const [timeData, setTimeData] = useState({
    loginTime: null,
    todayTotalSeconds: 0,
    monthlyTotalSeconds: 0,
  });
  const heartbeatRef = useRef(null);
  const idleTimerRef = useRef(null);
  const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [emailUnread, setEmailUnread] = useState(0);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) { router.push('/login'); return; }
      setUser(d.user);
      setTheme(d.user.theme || 'system');
      setLoading(false);
    }).catch(() => router.push('/login'));
  }, [router]);

  // Fetch time tracking data after user is loaded
  const fetchTimeData = useCallback(() => {
    const localDateStr = getLocalDateStr(new Date());

    fetch(`/api/timetrack?localDate=${localDateStr}`)
      .then(r => r.json())
      .then(d => {
        setTimeData({
          loginTime: d.activeSession?.loginTime || null,
          todayTotalSeconds: d.todayTotalSeconds || 0,
          monthlyTotalSeconds: d.monthlyTotalSeconds || 0,
        });
      })
      .catch(() => {}); // non-fatal
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchTimeData();

    // Heartbeat every 30 seconds to keep session alive
    heartbeatRef.current = setInterval(() => {
      fetch('/api/timetrack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'heartbeat' }),
      }).catch(() => {});
    }, 30000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [user, fetchTimeData]);

  // ═══ IDLE TIMER: auto-logout after 15 minutes of inactivity ═══
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('user');
    router.push('/login');
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        // Auto-logout due to inactivity
        handleLogout();
      }, IDLE_TIMEOUT_MS);
    };

    // Events that reset the idle timer
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));

    // Start the initial timer
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  }, [user, handleLogout]);

  // ═══ TAB/BROWSER CLOSE: auto clock-out ═══
  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable fire-and-forget on tab close
      navigator.sendBeacon('/api/auth/logout', '');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  useEffect(() => {
    const apply = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.setAttribute('data-theme', apply);
  }, [theme]);

  const fetchTasks = useCallback(() => {
    fetch('/api/tasks').then(r => r.json()).then(d => {
      if (d.tasks) {
        const pending = d.tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress');
        setNotifications(pending);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      fetchTasks();
      // Fetch unread email replies
      fetch('/api/emails/unread').then(r => r.json()).then(d => setEmailUnread(d.count || 0)).catch(() => {});
      const emailPoll = setInterval(() => {
        fetch('/api/emails/unread').then(r => r.json()).then(d => setEmailUnread(d.count || 0)).catch(() => {});
      }, 60000);
      return () => clearInterval(emailPoll);
    }
  }, [user, fetchTasks]);

  const clearNotifications = () => {
    setNotifications([]);
    setNotificationsOpen(false);
  };

  useEffect(() => { setMobileOpen(false); setNotificationsOpen(false); setProfileOpen(false); }, [pathname]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '3px solid var(--surface-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Loading NexusFlow...</p>
      </div>
    </div>
  );

  const isActive = (path) => path === '/dashboard' ? pathname === path : pathname.startsWith(path);

  return (
    <UserContext.Provider value={{ user, setUser, theme, setTheme }}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Mobile overlay */}
        {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 40 }} />}

        {/* Sidebar */}
        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
          width: sideOpen ? 264 : 76,
          background: 'var(--sidebar-bg)',
          display: 'flex', flexDirection: 'column',
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s ease',
          transform: mobileOpen ? 'translateX(0)' : undefined,
          overflowX: 'hidden',
        }} className="sidebar">

          {/* Logo */}
          <div style={{ padding: sideOpen ? '24px 20px' : '24px 16px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #818cf8, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            {sideOpen && <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.03em' }}>NexusFlow</span>}
          </div>

          {/* User */}
          {sideOpen && user && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'linear-gradient(135deg, #818cf8, #f472b6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
                }}>
                  {user.name?.charAt(0)}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
                  <p style={{ color: 'rgba(199, 210, 254, 0.6)', fontSize: '0.75rem', fontWeight: 500 }}>{user.department} · {user.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Nav section label */}
          {sideOpen && (
            <div style={{ padding: '16px 20px 8px', fontSize: '0.68rem', fontWeight: 700, color: 'rgba(199, 210, 254, 0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Navigation
            </div>
          )}

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '4px 10px', overflowY: 'auto' }}>
            {navItems.map(item => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <button key={item.path}
                  onClick={() => { router.push(item.path); setMobileOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: sideOpen ? '10px 12px' : '10px',
                    justifyContent: sideOpen ? 'flex-start' : 'center',
                    borderRadius: 10, marginBottom: 2, border: 'none',
                    background: active ? 'var(--sidebar-active)' : 'transparent',
                    color: active ? '#a5b4fc' : 'var(--sidebar-text)',
                    fontWeight: active ? 600 : 400,
                    fontSize: '0.875rem', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}>
                  {active && <div style={{ position: 'absolute', left: 0, top: '22%', bottom: '22%', width: 3, borderRadius: 2, background: '#818cf8' }} />}
                  <Icon size={19} strokeWidth={active ? 2 : 1.5} style={{ flexShrink: 0 }} />
                  {sideOpen && <span>{item.label}</span>}
                  {item.label === 'Workspace' && emailUnread > 0 && (
                    <span style={{
                      position: 'absolute', top: 4, right: sideOpen ? 8 : 4,
                      background: '#ef4444', color: '#fff', borderRadius: 50,
                      padding: '1px 6px', fontSize: '0.6rem', fontWeight: 800,
                      minWidth: 16, textAlign: 'center', lineHeight: '14px',
                    }}>{emailUnread}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom controls */}
          <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={() => setSideOpen(!sideOpen)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: sideOpen ? 'flex-start' : 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'transparent', color: 'var(--sidebar-text)', fontSize: '0.875rem', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
              <ChevronLeft size={18} style={{ transform: sideOpen ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 0.3s' }} />
              {sideOpen && <span>Collapse</span>}
            </button>
            <button onClick={handleLogout}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: sideOpen ? 'flex-start' : 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'transparent', color: '#f87171', fontSize: '0.875rem', border: 'none', cursor: 'pointer', marginTop: 2, transition: 'all 0.15s' }}>
              <LogOut size={18} />
              {sideOpen && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{
          flex: 1,
          marginLeft: sideOpen ? 264 : 76,
          transition: 'margin 0.3s cubic-bezier(0.4,0,0.2,1)',
          minHeight: '100vh',
        }}>
          {/* Topbar */}
          <header style={{
            height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 24px', background: 'var(--surface)', borderBottom: '1px solid var(--surface-border)',
            position: 'sticky', top: 0, zIndex: 30,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => setMobileOpen(true)}
                style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)' }}
                className="mobile-menu-btn">
                <Menu size={22} />
              </button>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {navItems.find(n => isActive(n.path))?.label || 'Dashboard'}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

              {/* ═══════ LIVE TIME CLOCKS ═══════ */}
              <LiveClock
                loginTime={timeData.loginTime}
                todayTotalSeconds={timeData.todayTotalSeconds}
                monthlyTotalSeconds={timeData.monthlyTotalSeconds}
              />

              {/* Theme toggle */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '24px', border: '1px solid var(--surface-border)' }}>
                {[
                  { key: 'light', icon: Sun },
                  { key: 'system', icon: Monitor },
                  { key: 'dark', icon: Moon },
                ].map(({ key, icon: ThIcon }) => (
                  <button key={key} onClick={async () => {
                    setTheme(key);
                    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'theme', theme: key }) });
                  }}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', border: 'none',
                      background: theme === key ? 'var(--surface)' : 'transparent',
                      boxShadow: theme === key ? 'var(--shadow-sm)' : 'none',
                      cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: theme === key ? 'var(--primary)' : 'var(--text-muted)',
                    }}
                    title={`Theme: ${key}`}>
                    <ThIcon size={15} />
                  </button>
                ))}
              </div>

              {/* Notifications */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }} style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', color: 'var(--text-muted)', position: 'relative', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <Bell size={17} />
                  {(notifications.length > 0 || emailUnread > 0) && <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: emailUnread > 0 ? '#ef4444' : '#f472b6', border: '2px solid var(--surface)' }} />}
                </button>
                {notificationsOpen && (
                  <div style={{ position: 'absolute', top: '120%', right: 0, width: 280, background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 12, boxShadow: 'var(--shadow-md)', zIndex: 100, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notifications</h4>
                      <button onClick={clearNotifications} style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
                    </div>
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No new tasks</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' }} onClick={() => { router.push('/dashboard/tasks'); setNotificationsOpen(false); }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>Task: {n.title}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due: {new Date(n.deadline).toLocaleDateString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }} style={{
                  width: 38, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #818cf8, #f472b6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                }}>
                  {user?.name?.charAt(0)}
                </button>
                {profileOpen && (
                  <div style={{ position: 'absolute', top: '120%', right: 0, width: 200, background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 12, boxShadow: 'var(--shadow-md)', zIndex: 100, padding: 8 }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--surface-border)', marginBottom: 8 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                    </div>
                    <button onClick={() => { router.push('/dashboard/settings'); setProfileOpen(false); }} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text)', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background='var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>Settings</button>
                    <button onClick={handleLogout} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', color: '#f87171', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>Logout</button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div style={{ padding: 24 }}>
            {children}
          </div>
        </main>

        <style>{`
          @media (max-width: 768px) {
            .sidebar { transform: translateX(-100%) !important; width: 264px !important; }
            .sidebar { ${mobileOpen ? 'transform: translateX(0) !important;' : ''} }
            main { margin-left: 0 !important; }
            .mobile-menu-btn { display: flex !important; }
            .time-clock-pill { display: none !important; }
          }
          @media (min-width: 769px) and (max-width: 1024px) {
            .time-clock-label { display: none !important; }
          }

          .time-clock-pill {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 5px 12px 5px 6px;
            background: var(--bg-secondary);
            border: 1px solid var(--surface-border);
            border-radius: 12px;
            position: relative;
            transition: all 0.2s;
          }
          .time-clock-pill:hover {
            border-color: var(--primary-light);
            box-shadow: 0 0 12px rgba(99, 102, 241, 0.1);
          }
          .time-clock-icon {
            width: 28px;
            height: 28px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .time-clock-info {
            display: flex;
            flex-direction: column;
            line-height: 1;
          }
          .time-clock-label {
            font-size: 0.6rem;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .time-clock-value {
            font-size: 0.82rem;
            font-weight: 800;
            font-variant-numeric: tabular-nums;
            letter-spacing: -0.02em;
          }
          .time-clock-dot {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #34d399;
            animation: clockPulse 2s ease-in-out infinite;
          }
          @keyframes clockPulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.5); }
            50% { opacity: 0.6; box-shadow: 0 0 0 4px rgba(52, 211, 153, 0); }
          }
        `}
        </style>
      </div>
    </UserContext.Provider>
  );
}
