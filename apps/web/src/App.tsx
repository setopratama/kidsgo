import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { BottomNav, TabKey } from './components/BottomNav';
import { DashboardTab } from './components/DashboardTab';
import { LevelMapTab } from './components/LevelMapTab';
import { CollectionTab } from './components/CollectionTab';
import { LeaderboardTab } from './components/LeaderboardTab';
import { PlaySession } from './components/PlaySession';
import { AuthModal } from './components/AuthModal';
import { LandingView } from './components/LandingView';
import { AdminDashboard } from './components/AdminDashboard';
import { PlayerProfile, EducationLevel } from '@kidsgo/shared';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabKey>('learn');
  const [activeLevelId, setActiveLevelId] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [streak] = useState(3);
  const [isOnline, setIsOnline] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const fetchProfile = () => {
    return fetch('/api/auth/player/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Not logged in');
        return res.json();
      })
      .then((data) => {
        if (data.success && data.player) {
          setPlayer(data.player);
        } else {
          setPlayer(null);
        }
      })
      .catch(() => {
        setPlayer(null);
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });
  };

  // 1. Periksa koneksi backend & sesi login anak
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'ok') {
          setIsOnline(true);
        }
      })
      .catch(() => setIsOnline(false));

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/player/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setPlayer(null);
      setActiveLevelId(null);
      setCurrentTab('learn');
    }
  };

  const handleStartLevel = (levelId?: string) => {
    if (levelId) {
      setActiveLevelId(levelId);
    } else {
      // Default level awal sesuai jenjang anak
      const defaultGrade = player?.grade || 'SD_1';
      if (defaultGrade === 'TK_A') {
        setActiveLevelId('lvl-tk-a-s1-angka-ceria-1');
      } else if (defaultGrade === 'TK_B') {
        setActiveLevelId('lvl-tk-b-s1-hitung-1-10-1');
      } else {
        setActiveLevelId('lvl-sd-1-s1-tambah-kurang-1');
      }
    }
  };

  const handlePlayComplete = (earnedXp: number) => {
    if (player) {
      setPlayer({
        ...player,
        current_xp: player.current_xp + earnedXp,
      });
    }
    setActiveLevelId(null);
    fetchProfile();
  };

  const handleAuthSuccess = (newPlayer: PlayerProfile) => {
    setPlayer(newPlayer);
    setIsAuthModalOpen(false);
  };

  // 2. Loading state saat memeriksa session
  if (isCheckingAuth) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--color-canvas)',
          gap: '16px',
        }}
      >
        <span style={{ fontSize: '3rem', animation: 'bounce 1s infinite' }}>🎒</span>
        <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.25rem' }}>
          KidsGo!
        </div>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Memuat petualanganmu...</p>
      </div>
    );
  }

  // 3. Tampilan Halaman Depan / Landing Page jika anak BELUM login
  if (!player) {
    return (
      <div style={{ minHeight: '100vh', position: 'relative' }}>
        <LandingView
          isOnline={isOnline}
          onOpenLogin={() => {
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
          }}
          onOpenRegister={() => {
            setAuthModalMode('register');
            setIsAuthModalOpen(true);
          }}
          onOpenAdmin={() => setIsAdminOpen(true)}
        />

        {/* Modal Login / Register PIN Anak */}
        {isAuthModalOpen && (
          <AuthModal
            initialMode={authModalMode}
            onSuccess={handleAuthSuccess}
            onClose={() => setIsAuthModalOpen(false)}
          />
        )}

        {/* Modal / Panel Dashboard Admin */}
        {isAdminOpen && (
          <AdminDashboard onClose={() => setIsAdminOpen(false)} />
        )}
      </div>
    );
  }

  // 4. Tampilan Aplikasi / Dashboard Belajar SETELAH anak login
  const currentNickname = player.nickname;
  const currentAvatar = player.avatar || '🦊';
  const currentGrade = `${player.grade} • Semester 1`;
  const currentXp = player.current_xp || 0;
  const playerEducationLevel = (player.grade as EducationLevel) || 'SD_1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      {/* Header Konsisten (dengan Tombol Keluar & Profil) */}
      <Header
        nickname={currentNickname}
        avatar={currentAvatar}
        grade={currentGrade}
        xp={currentXp}
        streak={streak}
        isOnline={isOnline}
        onClickProfile={() => {
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Konten Halaman Belajar Berdasarkan Tab Aktif */}
      <main style={{ flex: 1, paddingBottom: '20px' }}>
        {currentTab === 'learn' && (
          <DashboardTab
            nickname={currentNickname}
            grade={playerEducationLevel}
            onStartLearning={(lvlId) => handleStartLevel(lvlId)}
            onOpenMap={() => setCurrentTab('map')}
          />
        )}

        {currentTab === 'map' && (
          <LevelMapTab
            playerGrade={playerEducationLevel}
            onStartLevel={(lvlId) => handleStartLevel(lvlId)}
          />
        )}

        {currentTab === 'cards' && <CollectionTab />}

        {currentTab === 'rank' && (
          <LeaderboardTab currentUserId={player.id} defaultGrade={player.grade} />
        )}
      </main>

      {/* Bottom Navigation Mobile-First */}
      <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Layar Bermain Soal Matematika Interaktif (Live Game Engine) */}
      {activeLevelId && (
        <PlaySession
          levelId={activeLevelId}
          onClose={() => setActiveLevelId(null)}
          onComplete={handlePlayComplete}
        />
      )}

      {/* Modal Ganti Akun / Info Autentikasi */}
      {isAuthModalOpen && (
        <AuthModal
          initialMode={authModalMode}
          onSuccess={handleAuthSuccess}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      {/* Modal / Panel Dashboard Admin */}
      {isAdminOpen && (
        <AdminDashboard onClose={() => setIsAdminOpen(false)} />
      )}
    </div>
  );
}
