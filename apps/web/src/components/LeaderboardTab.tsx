import React, { useEffect, useState } from 'react';
import { EDUCATION_LEVELS, LeaderboardEntry } from '@kidsgo/shared';

interface LeaderboardTabProps {
  currentUserId?: string;
  defaultGrade?: string;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ currentUserId, defaultGrade }) => {
  const [period, setPeriod] = useState<'weekly' | 'daily' | 'all'>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>(defaultGrade || 'all');
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const gradeQuery = selectedGrade !== 'all' ? `&grade=${selectedGrade}` : '';
    fetch(`/api/leaderboard?period=${period}${gradeQuery}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data?.leaderboard) {
          setLeaders(res.data.leaderboard);
        }
      })
      .catch((err) => {
        console.error('Failed to load leaderboard:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [period, selectedGrade]);

  const top1 = leaders[0];
  const top2 = leaders[1];
  const top3 = leaders[2];

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Header */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)' }}>
          Papan Peringkat Belajar 🏆
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
          Teman-teman petualang matematika terhebat berdasarkan perolehan XP sah!
        </p>
      </div>

      {/* 2. Filter Periode & Jenjang */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {(['daily', 'weekly', 'all'] as const).map((p) => {
            const labels = { daily: 'Harian', weekly: 'Mingguan', all: 'Semua' };
            const isActive = period === p;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={isActive ? 'btn-primary' : 'btn-secondary'}
                style={{
                  minHeight: '38px',
                  padding: '6px 8px',
                  fontSize: '0.8125rem',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Filter Jenjang */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)' }}>
            Filter Kelas:
          </span>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-input)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-paper)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: 'var(--color-ink)',
            }}
          >
            <option value="all">Semua Jenjang</option>
            {EDUCATION_LEVELS.map((g) => (
              <option key={g.code} value={g.code}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-muted)' }}>
          <span>Memuat peringkat...</span>
        </div>
      ) : leaders.length === 0 ? (
        <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌟</div>
          <p style={{ fontWeight: 700 }}>Belum ada skor di periode ini.</p>
          <span style={{ fontSize: '0.75rem' }}>Jadilah yang pertama menyelesaikan level!</span>
        </div>
      ) : (
        <>
          {/* 3. Kartu Top 3 Podium (Visual Ringkas) */}
          <div
            className="card"
            style={{
              backgroundColor: 'var(--color-primary-soft)',
              border: '1.5px solid #C7D8FC',
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'flex-end',
              padding: '18px 12px',
            }}
          >
            {/* Juara 2 */}
            <div style={{ textAlign: 'center', opacity: top2 ? 1 : 0.4 }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '4px' }}>
                🥈 {top2 ? top2.avatar : '—'}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                {top2 ? top2.nickname : 'Belum Ada'}
              </div>
              <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>
                {top2 ? `${top2.total_xp} XP` : '0 XP'}
              </span>
            </div>

            {/* Juara 1 */}
            <div style={{ textAlign: 'center', transform: 'translateY(-8px)', opacity: top1 ? 1 : 0.4 }}>
              <div style={{ fontSize: '2.25rem', marginBottom: '4px' }}>
                👑 {top1 ? top1.avatar : '—'}
              </div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 800 }}>
                {top1 ? top1.nickname : 'Belum Ada'}
              </div>
              <span className="badge badge-sunshine" style={{ fontSize: '0.75rem' }}>
                {top1 ? `${top1.total_xp} XP` : '0 XP'}
              </span>
            </div>

            {/* Juara 3 */}
            <div style={{ textAlign: 'center', opacity: top3 ? 1 : 0.4 }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '4px' }}>
                🥉 {top3 ? top3.avatar : '—'}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                {top3 ? top3.nickname : 'Belum Ada'}
              </div>
              <span className="badge badge-mint" style={{ fontSize: '0.6875rem' }}>
                {top3 ? `${top3.total_xp} XP` : '0 XP'}
              </span>
            </div>
          </div>

          {/* 4. Daftar Peringkat Lengkap */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {leaders.map((u) => {
              const isCurrentUser = currentUserId ? u.player_id === currentUserId : false;

              return (
                <div
                  key={u.player_id}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    border: isCurrentUser ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    backgroundColor: isCurrentUser ? 'var(--color-primary-soft)' : 'var(--color-paper)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        width: '24px',
                        fontSize: '0.9375rem',
                        fontWeight: 800,
                        color: u.rank <= 3 ? 'var(--color-primary)' : 'var(--color-muted)',
                      }}
                    >
                      #{u.rank}
                    </span>
                    <span style={{ fontSize: '1.5rem' }}>{u.avatar}</span>
                    <div>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                        {u.nickname} {isCurrentUser && '(Kamu)'}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                        {u.grade}
                      </span>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {u.total_xp} XP
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
