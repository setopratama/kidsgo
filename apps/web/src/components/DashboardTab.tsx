import React, { useEffect, useState } from 'react';
import { EducationLevel } from '@kidsgo/shared';

interface LevelProgressItem {
  level_id: string;
  level_number: number;
  level_name: string;
  topic_id: string;
  topic_name: string;
  status: 'completed' | 'active' | 'locked';
  score: number;
  required_xp: number;
}

interface DashboardTabProps {
  nickname: string;
  grade?: EducationLevel;
  onStartLearning: (levelId?: string) => void;
  onOpenMap: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  nickname,
  grade = 'SD_1',
  onStartLearning,
  onOpenMap,
}) => {
  const [levels, setLevels] = useState<LevelProgressItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/game/progress?grade=${grade}&semester=1`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data?.levels) {
          setLevels(res.data.levels);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard progress:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [grade]);

  const activeLevel = levels.find((l) => l.status === 'active') || levels[0];
  const completedCount = levels.filter((l) => l.status === 'completed').length;
  const totalCount = levels.length || 5;
  const overallPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Sapaan & Hero Card (DESIGN.md Bab 7 A) */}
      <section
        className="card"
        style={{
          backgroundColor: 'var(--color-primary-soft)',
          border: '1.5px solid #C7D8FC',
          padding: '22px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <span className="badge badge-primary" style={{ marginBottom: '6px' }}>
              {activeLevel ? `Level ${activeLevel.level_number} • Siap Dimainkan` : 'Petualangan Baru'}
            </span>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-ink)' }}>
              Halo, {nickname}! 👋
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginTop: '2px' }}>
              {activeLevel ? activeLevel.level_name : 'Yuk lanjutkan petualangan Matematika hari ini!'}
            </p>
          </div>
          <span style={{ fontSize: '2.5rem' }}>🎯</span>
        </div>

        {/* Progress Bar Level Aktif */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
            <span style={{ color: 'var(--color-muted)' }}>Progres Semester 1</span>
            <span style={{ color: 'var(--color-primary)' }}>{overallPercent}%</span>
          </div>
          <div className="progress-track" style={{ height: '8px' }}>
            <div className="progress-fill" style={{ width: `${overallPercent}%` }} />
          </div>
        </div>

        {/* Tombol Utama Belajar */}
        <button
          className="btn-primary btn-primary-large"
          onClick={() => onStartLearning(activeLevel?.level_id)}
        >
          {completedCount > 0 ? 'Lanjut Belajar ➔' : 'Mulai Petualangan ➔'}
        </button>
      </section>

      {/* 2. Materi Hari Ini / Jalur Cepat */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-ink)' }}>
            Materi Semester 1
          </h2>
          <button
            onClick={onOpenMap}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              padding: 0,
              minHeight: 'auto',
              cursor: 'pointer',
            }}
          >
            Lihat Semua Peta ➔
          </button>
        </div>

        {loading ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-muted)' }}>
            <span>Memuat materi...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {levels.slice(0, 3).map((lvl) => {
              const isCompleted = lvl.status === 'completed';
              const isActive = lvl.status === 'active';
              const isLocked = lvl.status === 'locked';

              return (
                <div
                  key={lvl.level_id}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    border: isActive
                      ? '2px solid var(--color-primary)'
                      : isCompleted
                      ? '1px solid #C5EBE1'
                      : '1px solid var(--color-border)',
                    backgroundColor: isLocked ? 'var(--color-surface-soft)' : 'var(--color-paper)',
                    opacity: isLocked ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: isCompleted
                          ? 'var(--color-mint-soft)'
                          : isActive
                          ? 'var(--color-primary-soft)'
                          : '#E4E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.125rem',
                      }}
                    >
                      {isCompleted ? '⭐' : isActive ? '🎯' : '🔒'}
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          color: isLocked ? 'var(--color-muted)' : 'var(--color-ink)',
                        }}
                      >
                        {lvl.level_number}. {lvl.level_name}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                        {isCompleted
                          ? 'Selesai • 100% tuntas'
                          : isActive
                          ? 'Level Aktif • Siap Main'
                          : 'Terkunci'}
                      </span>
                    </div>
                  </div>

                  <div>
                    {isCompleted && (
                      <button
                        className="btn-secondary"
                        onClick={() => onStartLearning(lvl.level_id)}
                        style={{ padding: '4px 12px', minHeight: '34px', fontSize: '0.75rem' }}
                      >
                        Ulang ⭐
                      </button>
                    )}
                    {isActive && (
                      <button
                        className="btn-primary"
                        onClick={() => onStartLearning(lvl.level_id)}
                        style={{ padding: '6px 14px', minHeight: '36px', fontSize: '0.8125rem' }}
                      >
                        Main ▶
                      </button>
                    )}
                    {isLocked && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-soft)', fontWeight: 600 }}>
                        🔒
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Tantangan Harian (Daily Challenge) */}
      <section
        className="card"
        style={{
          backgroundColor: 'var(--color-surface-soft)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px',
        }}
      >
        <span style={{ fontSize: '2rem' }}>🎁</span>
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-ink)' }}>
            Misi Belajar Hari Ini
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '2px' }}>
            Selesaikan 1 level matematika untuk mendapatkan bonus <strong>+30 XP</strong>!
          </p>
        </div>
      </section>
    </div>
  );
};
