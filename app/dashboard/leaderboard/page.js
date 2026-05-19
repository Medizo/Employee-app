'use client';
import { useState, useEffect } from 'react';
import { useUser } from '../context';
import { Trophy, Medal, TrendingUp, TrendingDown, Minus, Phone, Handshake, RotateCcw, Mail } from 'lucide-react';

export default function LeaderboardPage() {
  const ctx = useUser();
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(d => setData(d.leaderboard || []));
  }, []);

  const sorted = [...data].sort((a, b) => b.score - a.score);
  const myRank = sorted.findIndex(e => e.userId === ctx?.user?.id) + 1;

  const medalColors = [
    { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', shadow: 'rgba(245,158,11,0.3)', text: '🥇' },
    { bg: 'linear-gradient(135deg, #d1d5db, #9ca3af)', shadow: 'rgba(156,163,175,0.3)', text: '🥈' },
    { bg: 'linear-gradient(135deg, #f97316, #ea580c)', shadow: 'rgba(249,115,22,0.3)', text: '🥉' },
  ];

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trophy size={20} color="var(--primary)" />
        </div>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>Team Leaderboard</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Live performance rankings — powered by real data</p>
        </div>
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

      {/* My Position */}
      {myRank > 0 && (
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(244,114,182,0.06))',
          border: '1px solid rgba(99,102,241,0.15)', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', color: '#fff', fontWeight: 800,
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}>#{myRank}</div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Your Position</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Score: <strong style={{ color: 'var(--primary)' }}>{sorted[myRank-1]?.score || 0}</strong></p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                { icon: Handshake, label: 'Deals', value: sorted[myRank-1]?.dealsCount },
                { icon: Phone, label: 'Calls', value: sorted[myRank-1]?.callsMade },
                { icon: Mail, label: 'Contacts', value: sorted[myRank-1]?.emailsSent || 0 },
                { icon: RotateCcw, label: 'Follow-ups', value: sorted[myRank-1]?.followUps },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <s.icon size={14} color="var(--primary)" />
                    <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>{s.value}</p>
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
              color: period === p ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: period === p ? 'var(--shadow-sm)' : 'none',
            }}>
            {p === 'all' ? 'All Time' : `This ${p.charAt(0).toUpperCase() + p.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead><tr><th>Rank</th><th>Employee</th><th>Deals</th><th>Calls</th><th>Contacts</th><th>Follow-ups</th><th>Score</th><th>Trend</th></tr></thead>
          <tbody>
            {sorted.map((e, i) => (
              <tr key={`${e.userId}-${i}`} style={e.userId === ctx?.user?.id ? { background: 'rgba(99,102,241,0.04)' } : {}}>
                <td>
                  {i < 3 ? (
                    <span style={{ fontSize: '1.4rem' }}>{medalColors[i].text}</span>
                  ) : (
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{i+1}</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `linear-gradient(135deg, hsl(${230 + i*25}, 70%, 65%), hsl(${250 + i*25}, 70%, 55%))`,
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
                <td><strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{e.score}</strong></td>
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
    </div>
  );
}
