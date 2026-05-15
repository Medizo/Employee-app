'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from './context';
import { Users, ClipboardList, Handshake, Activity, Flame, Plus, Mail, CalendarCheck, ArrowUpRight, TrendingUp, Clock, Image as ImageIcon, FileBarChart } from 'lucide-react';

const sceneries = [
  { type: 'image', bg: 'url(/scenery/forest.png)' },
  { type: 'image', bg: 'url(/scenery/grass.png)' },
  { type: 'image', bg: 'url(/scenery/flower.png)' },
  { type: 'image', bg: 'url(/scenery/ocean.png)' },
];

export default function DashboardHome() {
  const ctx = useUser();
  const user = ctx?.user;
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => { setStats(d.stats); setActivity(d.activity || []); });
    const savedBg = localStorage.getItem('welcomeBg');
    if (savedBg) {
      const idx = parseInt(savedBg, 10);
      setBgIndex(idx < sceneries.length ? idx : 0);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex(prev => {
        const next = (prev + 1) % sceneries.length;
        localStorage.setItem('welcomeBg', next);
        return next;
      });
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [sceneries.length]);

  const changeBg = () => {
    const next = (bgIndex + 1) % sceneries.length;
    setBgIndex(next);
    localStorage.setItem('welcomeBg', next);
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    { icon: Users, label: 'My Leads', value: stats?.totalLeads || 0, color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.15)' },
    { icon: ClipboardList, label: 'Tasks Pending', value: stats?.tasksPending || 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
    { icon: Handshake, label: 'Deals Closed', value: stats?.dealsClosed || 0, color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.15)' },
    { icon: Activity, label: "Today's Activity", value: stats?.todayActivity || 0, color: '#f472b6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.15)' },
    { icon: Flame, label: 'Att. Streak', value: `${stats?.streak || 0}d`, color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.15)' },
  ];

  const quickActions = [
    { icon: Plus, label: 'Add Lead', href: '/dashboard/workspace/add', desc: 'Create new contact', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)' },
    { icon: Mail, label: 'Compose Email', href: '/dashboard/workspace/email', desc: 'Send to leads', gradient: 'linear-gradient(135deg, #f472b6, #f9a8d4)' },
    { icon: FileBarChart, label: 'Submit DAR', href: '/dashboard/forms?type=daily', desc: 'Daily Activity Report', gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)' },
    { icon: CalendarCheck, label: 'Attendance', href: '/dashboard/attendance', desc: 'View your hours', gradient: 'linear-gradient(135deg, #34d399, #6ee7b7)' },
  ];

  const typeIcons = {
    lead: '👤', task: '📋', email: '✉️', attendance: '📅', proof: '📎', submission: '📄', default: '📌'
  };

  const currentBg = sceneries[bgIndex];

  return (
    <div className="animate-fade">
      {/* Welcome banner */}
      <div style={{
        backgroundImage: currentBg.bg,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        borderRadius: 24, padding: '40px 48px', marginBottom: 28, 
        color: '#fff', 
        position: 'relative', overflow: 'hidden',
        transition: 'background-image 1.2s ease-in-out',
        boxShadow: 'var(--shadow-lg), inset 0 0 120px rgba(0,0,0,0.3)',
        textShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}>
        {/* Subtle glass overlay for better text contrast */}
        <div style={{
          position: 'absolute', inset: 0, 
          background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
          zIndex: 0 
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ opacity: 0.9, fontWeight: 500, marginBottom: 8, fontSize: '0.95rem' }}>{greeting}</p>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: 12, letterSpacing: '-0.03em' }}>
            Welcome back, {user?.name?.split(' ')[0] || 'Ahmad'} 👋
          </h1>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)', padding: '5px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.2)' }}>
              {user?.department}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)', padding: '5px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.2)' }}>
              {user?.role}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: 0.9, fontSize: '0.8rem', fontWeight: 600 }}>
              <Clock size={14} /> {today}
            </span>
          </div>
        </div>
        
        {/* BG Changer Button */}
        <button onClick={changeBg} title="Change Background" style={{
          position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          cursor: 'pointer', backdropFilter: 'blur(4px)', zIndex: 10, transition: 'all 0.2s',
        }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}>
          <ImageIcon size={16} />
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card" style={{
              display: 'flex', alignItems: 'center', gap: 14,
              animation: `slideUp 0.4s ease ${i * 0.06}s both`,
              borderColor: s.border,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, background: s.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={22} color={s.color} strokeWidth={1.8} />
              </div>
              <div>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1, letterSpacing: '-0.03em' }}>{s.value}</p>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 3, fontWeight: 500 }}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 14, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>Quick Actions</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {quickActions.map((a, i) => {
          const Icon = a.icon;
          return (
            <Link key={i} href={a.href} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
              background: 'var(--surface)', border: '1px solid var(--surface-border)',
              borderRadius: 14, color: 'var(--text)', fontWeight: 600, fontSize: '0.88rem',
              transition: 'all 0.2s', textDecoration: 'none', position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-light)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--surface-border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, background: a.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={20} color="#fff" strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{a.label}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: 1 }}>{a.desc}</p>
              </div>
              <ArrowUpRight size={16} color="var(--text-muted)" />
            </Link>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={17} color="var(--primary)" />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>Recent Activity</h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Last 7 days</span>
        </div>
        {activity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.5rem' }}>📭</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>No recent activity</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>Start by adding a lead or completing a task</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {activity.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 8px',
                borderRadius: 10, transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', flexShrink: 0,
                }}>
                  {typeIcons[a.type] || typeIcons.default}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.text}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{a.time}</p>
                </div>
                <span className={`badge badge-${a.type}`} style={{ textTransform: 'capitalize', flexShrink: 0 }}>{a.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
