'use client';
import { useState, useEffect } from 'react';
import { useUser } from '../context';
import { Trophy, Medal, TrendingUp, TrendingDown, Minus, Phone, Handshake, RotateCcw, Users, Building2, Mail } from 'lucide-react';

export default function DeptLeaderboardPage() {
  const ctx = useUser();
  const [data, setData] = useState([]);
  const [department, setDepartment] = useState('');
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/leaderboard/department')
      .then(r => r.json())
      .then(d => {
        setData(d.leaderboard || []);
        setDepartment(d.department || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...data].sort((a, b) => b.score - a.score);
  const myRank = sorted.findIndex(e => e.userId === ctx?.user?.id) + 1;
  const totalMembers = sorted.length;

  const medalColors = [
    { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', shadow: 'rgba(245,158,11,0.3)', text: '🥇' },
    { bg: 'linear-gradient(135deg, #d1d5db, #9ca3af)', shadow: 'rgba(156,163,175,0.3)', text: '🥈' },
    { bg: 'linear-gradient(135deg, #f97316, #ea580c)', shadow: 'rgba(249,115,22,0.3)', text: '🥉' },
  ];

  // Department-specific accent colors
  const deptAccent = {
    Marketing: { gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)', color: '#ec4899', bg: 'rgba(236,72,153,0.06)', border: 'rgba(236,72,153,0.15)' },
    Sales: { gradient: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#6366f1', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.15)' },
    HR: { gradient: 'linear-gradient(135deg, #14b8a6, #2dd4bf)', color: '#14b8a6', bg: 'rgba(20,184,166,0.06)', border: 'rgba(20,184,166,0.15)' },
    Engineering: { gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)' },
  };

  const accent = deptAccent[department] || deptAccent.Sales;

  if (loading) {
    return (
      <div className="animate-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: '3px solid var(--surface-border)', borderTopColor: accent.color, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Loading department data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: accent.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 16px ${accent.border}`,
        }}>
          <Building2 size={22} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>
            {department} Leaderboard
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Department-only rankings — {totalMembers} team member{totalMembers !== 1 ? 's' : ''} competing
          </p>
        </div>
      </div>

      {/* Department Badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 14px', borderRadius: 20,
        background: accent.bg, border: `1px solid ${accent.border}`,
        fontSize: '0.75rem', fontWeight: 700, color: accent.color,
        marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        <Users size={13} /> {department} Department
      </div>

      {/* Points Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { icon: '🏆', label: 'Deal Closed', pts: '1,000 pts', color: '#16a34a', bg: '#f0fdf4' },
          { icon: '📞', label: 'Call Made', pts: '100 pts', color: '#3b82f6', bg: '#eff6ff' },
          { icon: '🔄', label: 'Follow-up', pts: '100 pts', color: '#f59e0b', bg: '#fffbeb' },
          { icon: '📧', label: 'Contacted', pts: '10 pts', color: '#8b5cf6', bg: '#f3e8ff' },
        ].map(p => (
          <div key={p.label} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 10,
            background: p.bg, border: `1px solid ${p.color}25`,
            fontSize: '0.78rem', fontWeight: 600, color: p.color,
          }}>
            <span>{p.icon}</span> {p.label} = <strong>{p.pts}</strong>
          </div>
        ))}
      </div>

      {/* My Position in Department */}
      {myRank > 0 && (
        <div className="card" style={{
          background: accent.bg,
          border: `1px solid ${accent.border}`, marginBottom: 24,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative gradient bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: accent.gradient,
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', paddingTop: 8 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: accent.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem', color: '#fff', fontWeight: 900,
              boxShadow: `0 6px 20px ${accent.border}`,
            }}>#{myRank}</div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Your Department Rank</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Score: <strong style={{ color: accent.color }}>{sorted[myRank - 1]?.score || 0}</strong>
                <span style={{ margin: '0 6px', opacity: 0.3 }}>·</span>
                <span style={{ fontSize: '0.8rem' }}>out of {totalMembers} in {department}</span>
              </p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[{ icon: Handshake, label: 'Deals', value: sorted[myRank - 1]?.dealsCount },
                { icon: Phone, label: 'Calls', value: sorted[myRank - 1]?.callsMade },
                { icon: Mail, label: 'Contacts', value: sorted[myRank - 1]?.emailsSent || 0 },
                { icon: RotateCcw, label: 'Follow-ups', value: sorted[myRank - 1]?.followUps },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <s.icon size={14} color={accent.color} />
                    <p style={{ fontSize: '1.3rem', fontWeight: 800, color: accent.color }}>{s.value}</p>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Period Toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-secondary)', padding: 4, borderRadius: 12, width: 'fit-content', border: '1px solid var(--surface-border)' }}>
        {['week', 'month', 'quarter', 'all'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s', letterSpacing: '-0.01em',
              background: period === p ? 'var(--surface)' : 'transparent',
              color: period === p ? accent.color : 'var(--text-muted)',
              boxShadow: period === p ? 'var(--shadow-sm)' : 'none',
            }}>
            {p === 'all' ? 'All Time' : `This ${p.charAt(0).toUpperCase() + p.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {sorted.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
            background: accent.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trophy size={28} color={accent.color} />
          </div>
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No rankings yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 360, margin: '0 auto' }}>
            No one in the {department} department has logged any activity yet. Start closing deals or making calls to appear here!
          </p>
        </div>
      )}

      {/* Table */}
      {sorted.length > 0 && (
        <div className="table-container">
          <table>
            <thead><tr><th>Rank</th><th>Employee</th><th>Deals</th><th>Calls</th><th>Contacts</th><th>Follow-ups</th><th>Score</th><th>Trend</th></tr></thead>
            <tbody>
              {sorted.map((e, i) => (
                <tr key={`${e.userId}-${i}`} style={e.userId === ctx?.user?.id ? {
                  background: accent.bg,
                  boxShadow: `inset 3px 0 0 ${accent.color}`,
                } : {}}>
                  <td>
                    {i < 3 ? (
                      <span style={{ fontSize: '1.4rem' }}>{medalColors[i].text}</span>
                    ) : (
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{i + 1}</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: e.userId === ctx?.user?.id
                          ? accent.gradient
                          : `linear-gradient(135deg, hsl(${230 + i * 25}, 70%, 65%), hsl(${250 + i * 25}, 70%, 55%))`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '0.8rem', fontWeight: 700,
                      }}>{e.name.charAt(0)}</div>
                      <div>
                        <span style={{ fontWeight: e.userId === ctx?.user?.id ? 700 : 500 }}>
                          {e.name}{e.userId === ctx?.user?.id ? ' (You)' : ''}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{e.dealsCount}</td>
                  <td style={{ fontWeight: 600 }}>{e.callsMade}</td>
                  <td style={{ fontWeight: 600 }}>{e.emailsSent || 0}</td>
                  <td style={{ fontWeight: 600 }}>{e.followUps}</td>
                  <td><strong style={{ color: accent.color, fontSize: '1rem' }}>{e.score}</strong></td>
                  <td>
                    {e.trend === 'up' ? <TrendingUp size={18} color="#34d399" /> :
                     e.trend === 'down' ? <TrendingDown size={18} color="#f87171" /> :
                     <Minus size={18} color="var(--text-muted)" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
