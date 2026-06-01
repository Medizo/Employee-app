'use client';
import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Briefcase, FileText, History, Trophy, CalendarDays, Lightbulb, ListTodo, Settings, ChevronLeft, LogOut, Menu, Sun, Monitor, Moon, Search, Bell, Timer, CalendarClock, AlertTriangle, Info, Zap, Glasses, Eye, CheckCircle2, BarChart3, PenTool } from 'lucide-react';
import { UserContext } from './context';
import logoImg from '../logo.png';

const allNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', desc: 'Overview of your performance and active tasks' },
  { icon: Briefcase, label: 'Workspace', path: '/dashboard/workspace', desc: 'Manage your assigned leads and email correspondence', departments: ['Sales'] },
  { icon: PenTool, label: 'Content Studio', path: '/dashboard/content-studio', desc: 'Create posts and auto-publish to LinkedIn & Twitter', departments: ['Marketing'] },
  { icon: FileText, label: 'Forms', path: '/dashboard/forms', desc: 'Submit daily reports, expenses, and standard forms' },
  { icon: History, label: 'History', path: '/dashboard/history', desc: 'View your past submissions and activity history' },
  { icon: Trophy, label: 'Leaderboard', path: '/dashboard/leaderboard', desc: 'See company rankings and top performers' },
  { icon: BarChart3, label: 'Dept. Leaderboard', path: '/dashboard/dept-leaderboard', desc: 'Rankings within your department only' },
  { icon: CalendarDays, label: 'Attendance', path: '/dashboard/attendance', desc: 'View your attendance log and apply for leave' },
  { icon: Lightbulb, label: 'Suggestions', path: '/dashboard/suggestions', desc: 'Submit ideas or feedback to management' },
  { icon: ListTodo, label: 'Tasks', path: '/dashboard/tasks', desc: 'View and update your assigned tasks' },
  { icon: Bell, label: 'Alert History', path: '/dashboard/alerts', desc: 'Review warnings or alerts issued to you' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings', desc: 'Update your profile and theme preferences' },
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
  const [themeMode, setThemeMode] = useState('system');
  const [themeColor, setThemeColor] = useState('beige');
  const [loading, setLoading] = useState(true);
  const [textSize, setTextSize] = useState(16);

  // Time tracking state
  const [timeData, setTimeData] = useState({
    loginTime: null,
    todayTotalSeconds: 0,
    monthlyTotalSeconds: 0,
  });
  const [hoveredTab, setHoveredTab] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heartbeatRef = useRef(null);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [emailUnread, setEmailUnread] = useState(0);
  // Alerts
  const [pendingAlerts, setPendingAlerts] = useState([]);
  const [activeAlertIdx, setActiveAlertIdx] = useState(0);
  const [alertComment, setAlertComment] = useState('');
  const [alertSubmitting, setAlertSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) { router.push('/login'); return; }
      setUser(d.user);
      const userTheme = d.user.theme || 'system';
      const userColor = d.user.themeColor || 'beige';
      setThemeMode(userTheme);
      setThemeColor(userColor);
      setLoading(false);
      // Check for unacknowledged alerts
      fetch('/api/alerts').then(r => r.json()).then(ad => {
        const unacked = (ad.alerts || []).filter(a => !a.acknowledged);
        if (unacked.length > 0) { setPendingAlerts(unacked); setActiveAlertIdx(0); }
      }).catch(() => {});
    }).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${textSize}px`;
  }, [textSize]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setSideOpen(false);
      }
    };
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('user');
    router.push('/login');
  }, [router]);

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
    let mode = themeMode;
    if (themeMode === 'system') {
      mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Combine mode and color
    let apply = themeColor;
    if (mode === 'high-contrast') {
      apply = 'high-contrast';
    } else if (mode === 'high-contrast-light') {
      apply = 'high-contrast-light';
    } else if (mode === 'dark') {
      apply = themeColor === 'beige' ? 'dark' : `${themeColor}-dark`; // beige's dark mode is just 'dark'
    } else if (themeColor !== 'beige') {
      apply = themeColor; // 'seafoam' or 'rose'
    } else {
      apply = 'light'; // default light for beige
    }
    
    document.documentElement.setAttribute('data-theme', apply);
  }, [themeMode, themeColor]);

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

  // Poll for new alerts every 30s (must be above early return to maintain hook order)
  useEffect(() => {
    if (!user) return;
    const poll = setInterval(() => {
      fetch('/api/alerts').then(r => r.json()).then(ad => {
        const unacked = (ad.alerts || []).filter(a => !a.acknowledged && a.status === 'active');
        if (unacked.length > 0) { setPendingAlerts(unacked); setActiveAlertIdx(0); }
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(poll);
  }, [user]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '3px solid var(--surface-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Loading Cluso CRM...</p>
      </div>
    </div>
  );

  const isActive = (path) => path === '/dashboard' ? pathname === path : pathname.startsWith(path);

  const SEV = {
    info:     { color: '#3b82f6', bg: '#eff6ff', Icon: Info, label: 'INFORMATION' },
    warning:  { color: '#d97706', bg: '#fffbeb', Icon: AlertTriangle, label: 'WARNING' },
    critical: { color: '#ef4444', bg: '#fee2e2', Icon: Zap, label: 'CRITICAL' },
  };

  const acknowledgeAlert = async () => {
    const alert = pendingAlerts[activeAlertIdx];
    if (!alert) return;
    if (alert.requireComment && !alertComment.trim()) return;
    setAlertSubmitting(true);
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId: alert.id, comment: alertComment }),
    });
    setAlertComment('');
    setAlertSubmitting(false);
    if (activeAlertIdx + 1 < pendingAlerts.length) {
      setActiveAlertIdx(i => i + 1);
    } else {
      setPendingAlerts([]);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, theme: themeMode, setTheme: setThemeMode, themeColor, setThemeColor }}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        {hoveredTab && (
          <div
            style={{
              position: 'fixed',
              left: mousePos.x + 15,
              top: mousePos.y + 15,
              background: 'var(--surface)',
              border: '1px solid var(--surface-border)',
              padding: '8px 12px',
              borderRadius: 8,
              boxShadow: 'var(--shadow-md)',
              zIndex: 9999,
              pointerEvents: 'none',
              maxWidth: 250,
              opacity: 1,
              transition: 'opacity 0.15s ease',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{hoveredTab.label}</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{hoveredTab.desc}</p>
          </div>
        )}
        {/* ── FULL-SCREEN ALERT OVERLAY ─────────────────── */}
        {pendingAlerts.length > 0 && (() => {
          const alert = pendingAlerts[activeAlertIdx];
          const sev = SEV[alert?.severity] || SEV.info;
          const SevIcon = sev.Icon;
          const isCritical = alert?.severity === 'critical';
          const borderColor = isCritical ? '#ef4444' : sev.color;
          return (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: isCritical ? 'rgba(30,0,0,0.96)' : 'rgba(0,0,0,0.92)',
              backdropFilter: 'blur(12px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '30px 26px',
              overflow: 'hidden',
              animation: isCritical ? 'alertPulse 2s ease-in-out infinite' : undefined,
            }}>
              {/* Top hazard stripe */}
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, height: 6, zIndex: 10000,
                background: `repeating-linear-gradient(90deg, ${borderColor} 0px, ${borderColor} 20px, transparent 20px, transparent 40px)`,
              }} />
              {/* Bottom hazard stripe */}
              <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, height: 6, zIndex: 10000,
                background: `repeating-linear-gradient(90deg, ${borderColor} 0px, ${borderColor} 20px, transparent 20px, transparent 40px)`,
              }} />
              {/* Left border */}
              <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 6, zIndex: 10000, background: borderColor }} />
              {/* Right border */}
              <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 6, zIndex: 10000, background: borderColor }} />

              {/* Severity icon (large, pulsing) */}
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: `${borderColor}20`, border: `3px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8, flexShrink: 0,
                animation: isCritical ? 'alertIconPulse 1.5s ease-in-out infinite' : undefined,
                boxShadow: `0 0 40px ${borderColor}40`,
              }}>
                <SevIcon size={22} color={borderColor} />
              </div>

              {/* Severity label */}
              <div style={{
                padding: '4px 16px', borderRadius: 24,
                background: borderColor, color: '#fff',
                fontWeight: 900, fontSize: '0.65rem', letterSpacing: '0.15em',
                textTransform: 'uppercase', marginBottom: 4, flexShrink: 0,
              }}>
                ⚠ {sev.label} ALERT
              </div>

              {/* Alert counter */}
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 500, marginBottom: 8, flexShrink: 0 }}>
                Alert {activeAlertIdx + 1} of {pendingAlerts.length} • Issued by {alert?.createdBy || 'Admin'} • {alert?.createdAt ? new Date(alert.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
              </p>

              {/* Main content card — flex column so only message scrolls */}
              <div style={{
                width: '100%', maxWidth: 840,
                maxHeight: 'calc(100vh - 160px)',
                background: '#fff', borderRadius: 20,
                border: `3px solid ${borderColor}`,
                boxShadow: `0 0 60px ${borderColor}30, 0 25px 80px rgba(0,0,0,0.4)`,
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }}>
                {/* Title bar — always visible */}
                <div style={{
                  background: `linear-gradient(135deg, ${borderColor}, ${borderColor}cc)`,
                  padding: '16px 24px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  flexShrink: 0,
                }}>
                  <SevIcon size={24} color="#fff" />
                  <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.01em', margin: 0, lineHeight: 1.3 }}>
                    {alert?.title}
                  </h2>
                </div>

                {/* Scrollable message area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 0', minHeight: 0 }}>
                  <p style={{ color: '#1e293b', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: 20, whiteSpace: 'pre-wrap' }}>
                    {alert?.message}
                  </p>
                </div>

                {/* Fixed bottom section — comment + button always visible */}
                <div style={{ padding: '16px 24px 20px', flexShrink: 0, borderTop: '1px solid #e2e8f0' }}>
                  {alert?.requireComment ? (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                        {alert?.commentPrompt || 'Your Response'} <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <textarea
                        value={alertComment}
                        onChange={e => setAlertComment(e.target.value)}
                        placeholder="Write your response here..."
                        style={{
                          width: '100%', padding: '12px 16px',
                          border: `2px solid ${alertComment.trim() ? '#22c55e' : '#e2e8f0'}`,
                          borderRadius: 12, fontSize: '0.9rem',
                          outline: 'none', resize: 'none', height: 80,
                          fontFamily: 'inherit', color: '#0f172a', boxSizing: 'border-box',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.target.style.borderColor = borderColor}
                        onBlur={e => e.target.style.borderColor = alertComment.trim() ? '#22c55e' : '#e2e8f0'}
                      />
                    </div>
                  ) : (
                    <div style={{
                      background: `${borderColor}10`, border: `1px solid ${borderColor}30`,
                      borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <Info size={16} color={borderColor} />
                      <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>
                        Please click below to acknowledge you have read and understood this alert.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={acknowledgeAlert}
                    disabled={alertSubmitting || (alert?.requireComment && !alertComment.trim())}
                    style={{
                      width: '100%', padding: '14px',
                      background: `linear-gradient(135deg, ${borderColor}, ${borderColor}dd)`,
                      color: '#fff', border: 'none', borderRadius: 14,
                      fontWeight: 800, fontSize: '1rem',
                      cursor: (alertSubmitting || (alert?.requireComment && !alertComment.trim())) ? 'not-allowed' : 'pointer',
                      opacity: (alertSubmitting || (alert?.requireComment && !alertComment.trim())) ? 0.5 : 1,
                      transition: 'all 0.2s',
                      boxShadow: `0 4px 20px ${borderColor}40`,
                      letterSpacing: '0.02em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    }}
                  >
                    <CheckCircle2 size={20} />
                    {alertSubmitting ? 'Acknowledging...' : pendingAlerts.length > 1 ? `Acknowledge & Continue (${activeAlertIdx + 1}/${pendingAlerts.length})` : 'I Acknowledge This Alert'}
                  </button>
                </div>
              </div>


            </div>
          );
        })()}
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
          <div style={{ padding: sideOpen ? '24px 20px' : '24px 16px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: 'var(--border-width) solid rgba(255,255,255,0.08)' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: 'var(--shadow-md)', overflow: 'hidden'
            }}>
              <img src={logoImg.src} alt="Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
            </div>
            {sideOpen && <span style={{ color: 'var(--text)', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.03em' }}>Cluso CRM</span>}
          </div>

          {/* User */}
          {sideOpen && user && (
            <div style={{ padding: '16px 20px', borderBottom: 'var(--border-width) solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: user.profilePicture ? 'transparent' : 'linear-gradient(135deg, var(--primary-light), var(--accent, #f472b6))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--primary-invert, #fff)', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : user.name?.charAt(0)}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>{user.department} · {user.role}</p>
                  {user.id && <p style={{ color: 'var(--primary-light)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', marginTop: 2, fontFamily: 'monospace' }}>{user.id}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Nav section label */}
          {sideOpen && (
            <div style={{ padding: '16px 20px 8px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Navigation
            </div>
          )}

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '4px 10px', overflowY: 'auto' }}>
            {allNavItems
              .filter(item => {
                if (item.roles) {
                  return item.roles.includes(user?.role);
                }
                if (['College POC', 'Campus Ambassador'].includes(user?.role)) {
                  // Permit only generic/essential pages for ambassadors and POCs
                  return ['Dashboard', 'History', 'Suggestions', 'Settings', 'Tasks'].includes(item.label);
                }
                return !item.departments || item.departments.includes(user?.department);
              })
              .map(item => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <button key={item.path}
                  onClick={() => { router.push(item.path); setMobileOpen(false); }}
                  onMouseEnter={() => setHoveredTab(item)}
                  onMouseLeave={() => setHoveredTab(null)}
                  onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
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
                  {active && <div style={{ position: 'absolute', left: 0, top: '22%', bottom: '22%', width: 3, borderRadius: 2, background: 'var(--primary)' }} />}
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
          <div style={{ padding: '8px 10px', borderTop: 'var(--border-width) solid rgba(255,255,255,0.08)' }}>
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
          width: `calc(100% - ${sideOpen ? 264 : 76}px)`,
          overflowX: 'auto',
        }}>
          {/* Topbar */}
          <header style={{
            minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            padding: '12px 24px', background: 'var(--surface)', borderBottom: 'var(--border-width) solid var(--surface-border)',
            position: 'sticky', top: 0, zIndex: 30,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => setMobileOpen(true)}
                style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)' }}
                className="mobile-menu-btn">
                <Menu size={22} />
              </button>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                {allNavItems.find(n => isActive(n.path))?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="header-controls" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {/* ═══════ GROUP 1: TIME TRACKING ═══════ */}
              <div className="header-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LiveClock
                  loginTime={timeData.loginTime}
                  todayTotalSeconds={timeData.todayTotalSeconds}
                  monthlyTotalSeconds={timeData.monthlyTotalSeconds}
                />
              </div>

              {/* ═══════ GROUP 2: SETTINGS ═══════ */}
              <div className="header-group" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Color Palette */}
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '24px', border: 'var(--border-width) solid var(--surface-border)', gap: 4 }}>
                  {[
                    { key: 'beige', color: '#c29b76' },
                    { key: 'seafoam', color: '#5b9e8c' },
                    { key: 'rose', color: '#c97a8e' },
                  ].map(({ key, color }) => (
                    <button key={key} onClick={async () => {
                      setThemeColor(key);
                      await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'themeColor', themeColor: key }) });
                    }}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', border: '2px solid',
                        borderColor: themeColor === key ? 'var(--text)' : 'transparent',
                        background: color,
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                      title={`Color: ${key}`} />
                  ))}
                </div>

                {/* Text Size */}
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '24px', border: 'var(--border-width) solid var(--surface-border)', gap: 4 }}>
                  <button onClick={() => setTextSize(s => Math.max(12, s - 2))} style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Decrease Text Size">A-</button>
                  <span style={{ 
                    fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)',
                    background: 'var(--surface)', border: '1px solid var(--surface-border)',
                    borderRadius: '8px', width: 32, height: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'var(--shadow-sm)'
                  }}>{textSize}</span>
                  <button onClick={() => setTextSize(s => Math.min(24, s + 2))} style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontWeight: 800, fontSize: '1.0rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Increase Text Size">A+</button>
                </div>

                {/* Theme Mode */}
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '24px', border: 'var(--border-width) solid var(--surface-border)' }}>
                  {[
                    { key: 'light', icon: Sun },
                    { key: 'system', icon: Monitor },
                    { key: 'dark', icon: Moon },
                    { key: 'high-contrast', icon: Glasses },
                    { key: 'high-contrast-light', icon: Eye },
                  ].map(({ key, icon: ThIcon }) => (
                    <button key={key} onClick={async () => {
                      setThemeMode(key);
                      await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'theme', theme: key }) });
                    }}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', border: 'none',
                        background: themeMode === key ? 'var(--surface)' : 'transparent',
                        boxShadow: themeMode === key ? 'var(--shadow-sm)' : 'none',
                        cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: themeMode === key ? 'var(--primary)' : 'var(--text-muted)',
                      }}
                      title={`Mode: ${key}`}>
                      <ThIcon size={15} />
                    </button>
                  ))}
                </div>
              </div>

              {/* ═══════ GROUP 3: USER ═══════ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Notifications */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }} style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', border: 'var(--border-width) solid var(--surface-border)', color: pendingAlerts.length > 0 ? '#ef4444' : 'var(--text-muted)', position: 'relative', cursor: 'pointer', transition: 'all 0.15s', animation: pendingAlerts.length > 0 ? 'bellShake 1s ease-in-out infinite' : undefined }}>
                    <Bell size={18} />
                    {(notifications.length > 0 || emailUnread > 0 || pendingAlerts.length > 0) && <span style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: '50%', background: pendingAlerts.length > 0 ? '#ef4444' : emailUnread > 0 ? '#ef4444' : '#f472b6', border: '2px solid var(--surface)', animation: pendingAlerts.length > 0 ? 'alertIconPulse 1s ease-in-out infinite' : undefined }} />}
                  </button>
                  {notificationsOpen && (
                    <div style={{ position: 'absolute', top: '120%', right: 0, width: 320, background: 'var(--surface)', border: 'var(--border-width) solid var(--surface-border)', borderRadius: 12, boxShadow: 'var(--shadow-md)', zIndex: 100, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: 'var(--border-width) solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notifications</h4>
                        <button onClick={clearNotifications} style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
                      </div>
                      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                        {/* Active Alerts Section */}
                        {pendingAlerts.length > 0 && (
                          <>
                            <div style={{ padding: '8px 16px', background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                              <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em' }}>⚠ Active Alerts ({pendingAlerts.length})</p>
                            </div>
                            {pendingAlerts.map(a => {
                              const s = SEV[a.severity] || SEV.info;
                              const SIcon = s.Icon;
                              return (
                                <div key={a.id} style={{ padding: '12px 16px', borderBottom: '1px solid #fecaca', background: '#fff5f5', display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => { router.push('/dashboard/alerts'); setNotificationsOpen(false); }}>
                                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.bg, border: `2px solid ${s.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <SIcon size={14} color={s.color} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626', display: 'block' }}>{a.title}</span>
                                    <span style={{ fontSize: '0.72rem', color: '#991b1b' }}>{a.severity?.toUpperCase()} • {a.createdAt ? new Date(a.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Now'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                        {/* Tasks Section */}
                        {notifications.length === 0 && pendingAlerts.length === 0 ? (
                          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No new notifications</div>
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
                    background: user?.profilePicture ? 'transparent' : 'linear-gradient(135deg, var(--primary-light), var(--accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--primary-invert, #fff)', fontWeight: 700, fontSize: '0.85rem',
                    boxShadow: 'var(--shadow-md)', overflow: 'hidden', padding: 0,
                  }}>
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : user?.name?.charAt(0)}
                  </button>
                  {profileOpen && (
                    <div style={{ position: 'absolute', top: '120%', right: 0, width: 200, background: 'var(--surface)', border: 'var(--border-width) solid var(--surface-border)', borderRadius: 12, boxShadow: 'var(--shadow-md)', zIndex: 100, padding: 8 }}>
                      <div style={{ padding: '8px 12px', borderBottom: 'var(--border-width) solid var(--surface-border)', marginBottom: 8 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                        {user?.id && <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace', marginTop: 4, background: 'var(--primary-glow)', padding: '2px 8px', borderRadius: 6, display: 'inline-block', letterSpacing: '0.04em' }}>{user.id}</p>}
                      </div>
                      <button onClick={() => { router.push('/dashboard/settings'); setProfileOpen(false); }} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text)', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background='var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>Settings</button>
                      <button onClick={handleLogout} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', color: '#f87171', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>Logout</button>
                    </div>
                  )}
                </div>
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
          @keyframes alertPulse {
            0%, 100% { box-shadow: inset 0 0 80px rgba(239, 68, 68, 0.05); }
            50% { box-shadow: inset 0 0 120px rgba(239, 68, 68, 0.15); }
          }
          @keyframes alertIconPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
            50% { transform: scale(1.08); box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
          }
          @keyframes bellShake {
            0%, 100% { transform: rotate(0deg); }
            15% { transform: rotate(12deg); }
            30% { transform: rotate(-10deg); }
            45% { transform: rotate(6deg); }
            60% { transform: rotate(-4deg); }
            75% { transform: rotate(2deg); }
            85% { transform: rotate(0deg); }
          }
        `}
        </style>
      </div>
    </UserContext.Provider>
  );
}
