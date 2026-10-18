import React from 'react';

interface HeaderProps {
  nickname: string;
  avatar?: string;
  grade: string;
  xp: number;
  streak: number;
  isOnline: boolean;
  onClickProfile?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  nickname,
  avatar = '🦊',
  grade,
  xp,
  streak,
  isOnline,
  onClickProfile,
  onLogout,
}) => {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px 12px 20px',
        backgroundColor: 'var(--color-paper)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      {/* Profil Anak */}
      <div
        onClick={onClickProfile}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: onClickProfile ? 'pointer' : 'default',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-btn)',
            backgroundColor: 'var(--color-primary-soft)',
            border: '1.5px solid #C7D8FC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            position: 'relative',
          }}
        >
          {avatar}
          {/* Status Dot */}
          <span
            title={isOnline ? 'Terhubung ke server' : 'Mode offline'}
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isOnline ? 'var(--color-mint)' : 'var(--color-muted-soft)',
              border: '2px solid white',
            }}
          />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-ink)' }}>
              {nickname}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600 }}>
            {grade}
          </span>
        </div>
      </div>

      {/* Stats Anak: Streak & XP */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          className="badge"
          style={{
            backgroundColor: 'var(--color-coral-soft)',
            color: '#B83A1B',
            padding: '5px 9px',
          }}
          title="Hari belajar berturut-turut"
        >
          <span style={{ fontSize: '0.875rem' }}>🔥</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{streak}</span>
        </div>
        <div
          className="badge"
          style={{
            backgroundColor: 'var(--color-sunshine-soft)',
            color: '#875C00',
            padding: '5px 9px',
          }}
          title="Total Poin Pengalaman"
        >
          <span style={{ fontSize: '0.875rem' }}>⭐</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{xp} XP</span>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              fontSize: '0.75rem',
              color: 'var(--color-muted)',
              cursor: 'pointer',
              minHeight: '32px',
            }}
            title="Keluar / Ganti Akun"
          >
            Keluar 🚪
          </button>
        )}
      </div>
    </header>
  );
};
