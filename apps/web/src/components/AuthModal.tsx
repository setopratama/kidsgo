import React, { useState } from 'react';
import { EDUCATION_LEVELS, EducationLevel, PlayerProfile } from '@kidsgo/shared';

const AVATARS = ['🦊', '🐱', '🐰', '🐼', '🦁', '🐯', '🐨', '🐸'];

interface AuthModalProps {
  initialMode?: 'login' | 'register';
  onSuccess: (player: PlayerProfile) => void;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode = 'login', onSuccess, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [nickname, setNickname] = useState(() => localStorage.getItem('kidsgo_remembered_name') || '');
  const [avatar, setAvatar] = useState('🦊');
  const [grade, setGrade] = useState<EducationLevel>('SD_1');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nickname.trim()) {
      setError('Yuk tulis nama panggilanmu dulu.');
      return;
    }
    if (pin.length !== 4) {
      setError('PIN harus tepat 4 angka.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = mode === 'register' ? '/api/auth/player/register' : '/api/auth/player/login';
      const payload = mode === 'register'
        ? { nickname: nickname.trim(), avatar, grade, pin }
        : { nickname: nickname.trim(), pin };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal masuk. Coba periksa PIN lagi.');
      }

      // Ingat nama di browser untuk memudahkan anak tanpa menyimpan PIN
      localStorage.setItem('kidsgo_remembered_name', nickname.trim());
      onSuccess(data.player);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kendala.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(32, 36, 44, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '380px',
          backgroundColor: 'var(--color-paper)',
          padding: '24px',
          borderRadius: 'var(--radius-panel)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-float)',
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)' }}>
              {mode === 'login' ? 'Masuk ke KidsGo! 🚀' : 'Daftar Petualang Cilik ✨'}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
              {mode === 'login' ? 'Tulis nama dan ketuk PIN 4 angkamu' : 'Pilih avatar dan buat PIN rahasiamu'}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                color: 'var(--color-muted)',
                padding: '4px',
                minHeight: 'auto',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab Beralih Masuk / Daftar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button
            type="button"
            className={mode === 'login' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => { setMode('login'); setError(null); }}
            style={{ minHeight: '38px', fontSize: '0.8125rem' }}
          >
            Sudah Punya PIN
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => { setMode('register'); setError(null); }}
            style={{ minHeight: '38px', fontSize: '0.8125rem' }}
          >
            Buat Akun Baru
          </button>
        </div>

        {/* Error Alert Suportif */}
        {error && (
          <div
            style={{
              backgroundColor: 'var(--color-coral-soft)',
              color: '#A33319',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>{error.includes('terkunci') ? '🔒' : '💡'}</span>
            <span>{error}</span>
          </div>
        )}

        {/* Mode Registrasi: Pilihan Avatar & Kelas */}
        {mode === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-muted)', display: 'block', marginBottom: '6px' }}>
                PILIH AVATAR KAMU:
              </label>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatar(av)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      fontSize: '1.4rem',
                      padding: 0,
                      backgroundColor: avatar === av ? 'var(--color-primary-soft)' : 'var(--color-surface-soft)',
                      border: avatar === av ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      flexShrink: 0,
                    }}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-muted)', display: 'block', marginBottom: '6px' }}>
                KELAS / JENJANG:
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as EducationLevel)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface-soft)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                {EDUCATION_LEVELS.map((lvl) => (
                  <option key={lvl.code} value={lvl.code}>
                    {lvl.name} ({lvl.age})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Input Nama Panggilan */}
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-muted)', display: 'block', marginBottom: '6px' }}>
            NAMA PANGGILAN:
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Contoh: Budi"
            maxLength={20}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-input)',
              border: '1.5px solid var(--color-border)',
              fontSize: '1rem',
              fontWeight: 700,
              backgroundColor: 'var(--color-paper)',
              outline: 'none',
            }}
          />
        </div>

        {/* Indikator Titik PIN 4 Angka (Tidak bocorkan angka) */}
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-muted)', display: 'block', marginBottom: '8px' }}>
            PIN 4 ANGKA RAHASIA:
          </label>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '14px' }}>
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: isFilled ? 'var(--color-primary)' : 'var(--color-border)',
                    border: '2px solid white',
                    boxShadow: isFilled ? '0 0 6px rgba(37, 99, 235, 0.4)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                />
              );
            })}
          </div>

          {/* Keypad Angka Ramah Sentuhan (DESIGN.md target sentuh 48px) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="btn-secondary"
                style={{
                  minHeight: '48px',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  borderRadius: 'var(--radius-btn)',
                }}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="btn-soft"
              style={{ minHeight: '48px', fontSize: '0.75rem', fontWeight: 800 }}
            >
              Hapus
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="btn-secondary"
              style={{ minHeight: '48px', fontSize: '1.25rem', fontWeight: 800 }}
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="btn-soft"
              style={{ minHeight: '48px', fontSize: '1.125rem' }}
            >
              ⌫
            </button>
          </div>
        </div>

        {/* Tombol Eksekusi Masuk */}
        <button
          type="button"
          className="btn-primary btn-primary-large"
          disabled={isLoading || pin.length !== 4 || !nickname.trim()}
          onClick={() => handleSubmit()}
          style={{ opacity: pin.length === 4 && nickname.trim() ? 1 : 0.6 }}
        >
          {isLoading ? 'Memeriksa...' : mode === 'register' ? 'Daftar & Mulai 🚀' : 'Masuk Petualangan ➔'}
        </button>
      </div>
    </div>
  );
};
