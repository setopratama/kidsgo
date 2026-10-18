import React, { useEffect, useState } from 'react';
import { EDUCATION_LEVELS, EducationLevel } from '@kidsgo/shared';

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

interface LevelMapTabProps {
  playerGrade?: EducationLevel;
  onStartLevel: (levelId: string) => void;
}

export const LevelMapTab: React.FC<LevelMapTabProps> = ({ playerGrade = 'SD_1', onStartLevel }) => {
  const [selectedGrade, setSelectedGrade] = useState<EducationLevel>(playerGrade);
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [levels, setLevels] = useState<LevelProgressItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/game/progress?grade=${selectedGrade}&semester=${selectedSemester}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data?.levels) {
          setLevels(res.data.levels);
        }
      })
      .catch((err) => {
        console.error('Failed to load level progress:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedGrade, selectedSemester]);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Pemilihan Jenjang & Semester */}
      <section className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-muted)' }}>
            PILIH KELAS / JENJANG:
          </span>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value as EducationLevel)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-input)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface-soft)',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--color-ink)',
            }}
          >
            {EDUCATION_LEVELS.map((lvl) => (
              <option key={lvl.code} value={lvl.code}>
                {lvl.name} ({lvl.age})
              </option>
            ))}
          </select>
        </div>

        {/* Tab Semester 1 & 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            className={selectedSemester === 1 ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setSelectedSemester(1)}
            style={{ minHeight: '38px', padding: '6px', fontSize: '0.875rem' }}
          >
            Semester 1
          </button>
          <button
            className={selectedSemester === 2 ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setSelectedSemester(2)}
            style={{ minHeight: '38px', padding: '6px', fontSize: '0.875rem' }}
          >
            Semester 2
          </button>
        </div>
      </section>

      {/* 2. Peta Jalur Level (Bab 7 C DESIGN.md) */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-ink)' }}>
            Jalur Petualangan Belajar
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600 }}>
            {levels.filter((l) => l.status === 'completed').length} / {levels.length} Level Tuntas
          </span>
        </div>

        {loading ? (
          <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-muted)' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }}>⏳</span>
            <span>Memuat petualangan belajar...</span>
          </div>
        ) : levels.length === 0 ? (
          <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-muted)' }}>
            <span>Belum ada level pada semester ini.</span>
          </div>
        ) : (
          levels.map((lvl) => {
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
                  padding: '16px',
                  border: isActive
                    ? '2px solid var(--color-primary)'
                    : isCompleted
                    ? '1.5px solid #C5EBE1'
                    : '1px dashed var(--color-border)',
                  backgroundColor: isLocked ? 'var(--color-surface-soft)' : 'var(--color-paper)',
                  opacity: isLocked ? 0.75 : 1,
                  transition: 'transform 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                  {/* Node Indicator */}
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      flexShrink: 0,
                      backgroundColor: isCompleted
                        ? 'var(--color-mint-soft)'
                        : isActive
                        ? 'var(--color-primary-soft)'
                        : '#E4E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                    }}
                  >
                    {isCompleted ? '⭐' : isActive ? '🎯' : '🔒'}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        color: isLocked ? 'var(--color-muted)' : 'var(--color-ink)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {lvl.level_name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      Topik: {lvl.topic_name}
                    </span>
                  </div>
                </div>

                {/* Status Action */}
                <div style={{ flexShrink: 0, marginLeft: '10px' }}>
                  {isCompleted && (
                    <button
                      className="btn-secondary"
                      onClick={() => onStartLevel(lvl.level_id)}
                      style={{ minHeight: '38px', padding: '6px 12px', fontSize: '0.8125rem' }}
                    >
                      Ulang ⭐
                    </button>
                  )}
                  {isActive && (
                    <button
                      className="btn-primary"
                      onClick={() => onStartLevel(lvl.level_id)}
                      style={{ minHeight: '38px', padding: '6px 16px', fontSize: '0.875rem' }}
                    >
                      Mulai ▶
                    </button>
                  )}
                  {isLocked && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-soft)', fontWeight: 600 }}>
                      Terkunci 🔒
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
};
