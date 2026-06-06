'use client';
import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, Zap, Clock, CalendarClock, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const SEV_CONFIG = {
  info:     { Icon: Info,          color: '#3b82f6', bg: '#eff6ff' },
  warning:  { Icon: AlertTriangle, color: '#d97706', bg: '#fffbeb' },
  critical: { Icon: Zap,           color: '#ef4444', bg: '#fee2e2' },
};

export default function EmployeeAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/alerts').then(r => r.json()),
      fetch('/api/leads').then(r => r.json()),
    ]).then(([alertData, leadData]) => {
      setAlerts(alertData.alerts || []);
      setLeads(leadData.leads || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const acknowledged = alerts.filter(a => a.acknowledged);
  const pending = alerts.filter(a => !a.acknowledged && a.status === 'active');

  // Build follow-up reminders from leads with nextFollowupDate
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followupReminders = leads
    .filter(l => l.nextFollowupDate)
    .map(l => {
      const fDate = new Date(l.nextFollowupDate);
      fDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((fDate - today) / (1000 * 60 * 60 * 24));
      return { ...l, followupDate: fDate, diffDays };
    })
    .filter(l => l.diffDays >= -7) // show past-due up to 7 days ago
    .sort((a, b) => a.followupDate - b.followupDate);

  const overdueCount = followupReminders.filter(r => r.diffDays < 0).length;
  const todayCount = followupReminders.filter(r => r.diffDays === 0).length;
  const upcomingCount = followupReminders.filter(r => r.diffDays > 0).length;

  const card = { background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 16, padding: 24 };

  const getFollowupBadge = (diffDays) => {
    if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, bg: 'rgba(239,68,68,0.12)', color: '#dc2626', icon: '🔴' };
    if (diffDays === 0) return { label: 'Today', bg: 'rgba(245,158,11,0.12)', color: '#d97706', icon: '🟠' };
    if (diffDays === 1) return { label: 'Tomorrow', bg: 'rgba(16,185,129,0.12)', color: '#059669', icon: '🟢' };
    if (diffDays <= 3) return { label: `In ${diffDays} days`, bg: 'rgba(99,102,241,0.12)', color: '#6366f1', icon: '🔵' };
    return { label: `In ${diffDays} days`, bg: 'rgba(148,163,184,0.08)', color: '#64748b', icon: '⚪' };
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={24} /> Notifications
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>Follow-up reminders and alerts addressed to you.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Overdue', value: overdueCount, color: '#ef4444' },
          { label: 'Due Today', value: todayCount, color: '#d97706' },
          { label: 'Upcoming', value: upcomingCount, color: '#059669' },
          { label: 'Admin Alerts', value: alerts.length, color: 'var(--primary)' },
          { label: 'Pending Ack', value: pending.length, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign: 'center', padding: 18 }}>
            <p style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color }}>{s.value}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading notifications...</div>
      ) : (
        <>
          {/* ═══════ FOLLOW-UP REMINDERS ═══════ */}
          {followupReminders.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                }}>
                  <CalendarClock size={18} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>Follow-up Reminders</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    {followupReminders.length} upcoming follow-up{followupReminders.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {followupReminders.map(r => {
                  const badge = getFollowupBadge(r.diffDays);
                  return (
                    <div key={r.id} style={{
                      ...card,
                      padding: '16px 20px',
                      border: r.diffDays < 0
                        ? '1.5px solid rgba(239,68,68,0.35)'
                        : r.diffDays === 0
                        ? '1.5px solid rgba(245,158,11,0.35)'
                        : '1px solid var(--surface-border)',
                      background: r.diffDays < 0
                        ? 'rgba(239,68,68,0.02)'
                        : r.diffDays === 0
                        ? 'rgba(245,158,11,0.02)'
                        : 'var(--surface)',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: 12,
                          background: badge.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.1rem', flexShrink: 0,
                        }}>
                          {badge.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                              {r.companyName}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                              — {r.contactPerson}
                            </span>
                            <span style={{
                              padding: '2px 10px', borderRadius: 20,
                              fontSize: '0.68rem', fontWeight: 700,
                              background: badge.bg, color: badge.color,
                            }}>
                              {badge.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} />
                              {new Date(r.nextFollowupDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {r.status && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                Status: {r.status}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href={`/dashboard/workspace`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600, flexShrink: 0 }}>
                          View <ArrowUpRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════ ADMIN ALERTS ═══════ */}
          {alerts.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={18} /> Admin Alerts
              </h3>
            </div>
          )}

          {alerts.length === 0 && followupReminders.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 60 }}>
              <Bell size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} color="var(--text-muted)" />
              <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No notifications yet</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>Follow-up reminders and admin alerts will appear here.</p>
            </div>
          ) : alerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {alerts.map(alert => {
                const cfg = SEV_CONFIG[alert.severity] || SEV_CONFIG.info;
                const SevIcon = cfg.Icon;
                return (
                  <div key={alert.id} style={{ ...card, border: `1px solid ${alert.acknowledged ? 'var(--surface-border)' : cfg.color + '60'}`, opacity: alert.status !== 'active' && !alert.acknowledged ? 0.7 : 1 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SevIcon size={20} color={cfg.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>{alert.title}</span>
                          <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: cfg.color, color: '#fff' }}>
                            {(alert.severity || 'info').charAt(0).toUpperCase() + (alert.severity || 'info').slice(1)}
                          </span>
                          {alert.acknowledged ? (
                            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={11} /> Acknowledged
                            </span>
                          ) : alert.status === 'active' ? (
                            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>
                              Pending
                            </span>
                          ) : (
                            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                              Closed
                            </span>
                          )}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>{alert.message}</p>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} /> {new Date(alert.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {alert.acknowledged && alert.acknowledgedAt && (
                            <span style={{ fontSize: '0.75rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={11} /> Acknowledged {new Date(alert.acknowledgedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
