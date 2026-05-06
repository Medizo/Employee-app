'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from './layout';

export default function DashboardHome() {
  const ctx = useUser();
  const user = ctx?.user;
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => { setStats(d.stats); setActivity(d.activity || []); });
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const statCards = [
    { icon: '👥', label: 'My Total Leads', value: stats?.totalLeads || 0, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    { icon: '📋', label: 'Tasks Pending', value: stats?.tasksPending || 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { icon: '💰', label: 'Deals Closed', value: stats?.dealsClosed || 0, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { icon: '📞', label: "Today's Activity", value: stats?.todayActivity || 0, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { icon: '🔥', label: 'Attendance Streak', value: `${stats?.streak || 0}d`, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  ];

  return (
    <div className="animate-fade">
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0e7490, #06b6d4, #8b5cf6)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 24, color: '#fff', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ position: 'absolute', right: 40, bottom: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4, position: 'relative' }}>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p style={{ opacity: 0.9, fontSize: '0.9rem' }}>{user?.department} · {user?.role}</p>
        <p style={{ opacity: 0.7, fontSize: '0.85rem', marginTop: 4 }}>{today}</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {statCards.map((s, i) => (
          <div key={i} className="card card-glow" style={{ display: 'flex', alignItems: 'center', gap: 14, animation: `slideUp 0.4s ease ${i*0.08}s both` }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{s.icon}</div>
            <div>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { icon: '➕', label: 'Add Lead', href: '/dashboard/workspace/add' },
          { icon: '✉️', label: 'Compose Email', href: '/dashboard/workspace/email' },
          { icon: '📅', label: 'Mark Attendance', href: '/dashboard/forms' },
        ].map((a, i) => (
          <Link key={i} href={a.href} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
            background: 'var(--surface)', border: '1px solid var(--surface-border)',
            borderRadius: 12, color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem',
            transition: 'all 0.2s', textDecoration: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-light)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--surface-border)'; e.currentTarget.style.transform = 'none'; }}>
            <span style={{ fontSize: '1.2rem' }}>{a.icon}</span>{a.label}
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>📊 Recent Activity</h3>
        {activity.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No recent activity</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activity.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < activity.length - 1 ? '1px solid var(--surface-border)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>{a.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{a.text}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.time}</p>
                </div>
                <span className={`badge badge-${a.type}`} style={{ textTransform: 'capitalize' }}>{a.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
