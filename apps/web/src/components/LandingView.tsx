import React from 'react';
import { EDUCATION_LEVELS } from '@kidsgo/shared';

interface LandingViewProps {
  isOnline: boolean;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  isOnline,
  onOpenLogin,
  onOpenRegister,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-canvas)' }}>
      {/* 1. Header Landing Page */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: 'var(--color-paper)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 90,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.75rem' }}>🎒</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
                KidsGo!
              </span>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isOnline ? 'var(--color-mint)' : 'var(--color-muted-soft)',
                }}
                title={isOnline ? 'Server Online' : 'Server Offline'}
              />
            </div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-muted)' }}>
              Matematika TK & SD
            </span>
          </div>
        </div>

        <button
          className="btn-secondary"
          onClick={onOpenLogin}
          style={{ minHeight: '38px', padding: '6px 14px', fontSize: '0.8125rem' }}
        >
          Masuk 🔑
        </button>
      </header>

      {/* 2. Hero Section */}
      <main style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <section
          className="card"
          style={{
            backgroundColor: 'var(--color-primary-soft)',
            border: '1.5px solid #C7D8FC',
            padding: '24px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>
            🦊 📐 🍎 ⭐
          </div>

          <span className="badge badge-primary" style={{ marginBottom: '10px', fontSize: '0.75rem' }}>
            Belajar Seru, Naik Level! 🚀
          </span>

          <h1
            style={{
              fontSize: '1.375rem',
              fontWeight: 900,
              color: 'var(--color-ink)',
              lineHeight: 1.35,
              marginBottom: '10px',
            }}
          >
            Petualangan Matematika yang Menyenangkan untuk Anak
          </h1>

          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-muted)',
              lineHeight: 1.5,
              marginBottom: '20px',
              maxWidth: '360px',
            }}
          >
            Dirancang khusus untuk usia <strong>4–12 tahun (TK A hingga SD Kelas 6)</strong>. Belajar berhitung dan logika melalui jalur RPG seru, koleksi kartu pahlawan, dan penjelasan suportif tanpa rasa takut salah.
          </p>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              className="btn-primary btn-primary-large"
              onClick={onOpenRegister}
            >
              Mulai Petualangan Baru 🚀
            </button>

            <button
              className="btn-secondary"
              onClick={onOpenLogin}
              style={{ minHeight: '48px', width: '100%', fontSize: '0.9375rem' }}
            >
              Sudah Punya Akun? Masuk PIN 🔑
            </button>
          </div>
        </section>

        {/* 3. Fitur-Fitur Unggulan (Bab 2 & 8 DESIGN.md) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '2px' }}>
            Mengapa Belajar di KidsGo!?
          </h2>

          <div
            className="card"
            style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px' }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-primary-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                flexShrink: 0,
              }}
            >
              🗺️
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '2px' }}>
                Jalur Petualangan RPG
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.45 }}>
                Tuntaskan level bertahap per topik, kumpulkan XP, dan buka semester berikutnya seperti di dalam petualangan seru!
              </p>
            </div>
          </div>

          <div
            className="card"
            style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px' }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-sunshine-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                flexShrink: 0,
              }}
            >
              🃏
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '2px' }}>
                Koleksi Kartu Pahlawan
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.45 }}>
                Raih kartu karakter unik dengan tingkat kelangkaan <em>Common, Rare, Epic,</em> hingga <em>Legendary</em> sebagai bukti keberhasilan belajar.
              </p>
            </div>
          </div>

          <div
            className="card"
            style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px' }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-mint-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                flexShrink: 0,
              }}
            >
              💡
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '2px' }}>
                Umpan Balik Hangat & Suportif
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.45 }}>
                Tidak ada hukuman saat salah! KidsGo! memberikan penjelasan ramah dan soal pengganti agar anak selalu percaya diri.
              </p>
            </div>
          </div>

          <div
            className="card"
            style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px' }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-coral-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                flexShrink: 0,
              }}
            >
              🛡️
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '2px' }}>
                100% Aman & Privasi Terjaga
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.45 }}>
                Bebas iklan, tanpa pelacakan data pribadi anak. Cukup nama panggilan dan 4-digit PIN rahasia untuk masuk.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Kurikulum Jenjang yang Didukung */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-ink)' }}>
            Kurikulum Matematika Terstruktur
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {EDUCATION_LEVELS.map((lvl) => (
              <div
                key={lvl.code}
                className="card"
                style={{ padding: '10px 12px', textAlign: 'center' }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                  {lvl.name}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-muted)' }}>
                  {lvl.age}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Catatan Footer */}
        <footer style={{ textAlign: 'center', padding: '16px 0 32px 0', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            KidsGo! — Platform Belajar Anak Indonesia
          </p>
          <p style={{ fontSize: '0.6875rem', marginTop: '4px' }}>
            Versi MVP • Matematika TK s/d SD 6
          </p>
        </footer>
      </main>
    </div>
  );
};
