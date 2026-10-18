import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { EDUCATION_LEVELS } from '@kidsgo/shared';

interface AdminUser {
  id: string;
  username: string;
  role: string;
  is_default_pin: boolean;
}

interface QuestionItem {
  id: string;
  question_id: string;
  education_level: string;
  semester: number;
  question: string;
  visual?: string | null;
  status: 'draft' | 'approved' | 'active' | 'archived';
  options: Array<{ id: string; text: string }>;
  correct_answer: string;
  explanation: string;
}

interface PlayerItem {
  id: string;
  nickname: string;
  avatar: string;
  grade: string;
  current_xp: number;
  created_at: string;
}

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Navigasi Tab Desktop: 'questions' | 'players' | 'settings'
  const [activeTab, setActiveTab] = useState<'questions' | 'players' | 'settings'>('questions');

  // Bank Soal State
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Import JSON State
  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [validationReport, setValidationReport] = useState<any | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Players State
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [selectedPlayerForReset, setSelectedPlayerForReset] = useState<PlayerItem | null>(null);
  const [newPlayerPin, setNewPlayerPin] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Change PIN Admin State
  const [currentAdminPin, setCurrentAdminPin] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch data soal dari backend
  const fetchQuestions = () => {
    setIsLoadingQuestions(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (levelFilter !== 'all') params.append('education_level', levelFilter);
    params.append('limit', '100');

    fetch(`/api/admin/questions?${params.toString()}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setQuestions(data.data);
          const total = data.pagination?.total ?? data.total ?? data.data.length;
          setTotalQuestions(total);
        } else {
          setQuestions([]);
          setTotalQuestions(0);
        }
      })
      .catch((err) => {
        console.error('Gagal mengambil daftar soal:', err);
        setQuestions([]);
      })
      .finally(() => setIsLoadingQuestions(false));
  };

  // 2. Fetch data murid dari backend
  const fetchPlayers = () => {
    fetch('/api/admin/players', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.players)) {
          setPlayers(data.players);
        }
      })
      .catch((err) => console.error('Gagal mengambil data anak:', err));
  };

  // 3. Periksa sesi Admin saat pertama kali dimuat
  useEffect(() => {
    fetch('/api/admin/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Not logged in as admin');
        return res.json();
      })
      .then((data) => {
        if (data.success && data.admin) {
          setAdmin(data.admin);
          fetchQuestions();
          fetchPlayers();
        }
      })
      .catch(() => setAdmin(null));
  }, []);

  // 4. Update data saat filter berubah
  useEffect(() => {
    if (admin) {
      if (activeTab === 'questions') fetchQuestions();
      if (activeTab === 'players') fetchPlayers();
    }
  }, [admin, activeTab, statusFilter, levelFilter]);

  // Handle Login Admin
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setLoginError('Masukkan PIN Admin');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pin: pinInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'PIN Admin salah.');
      }

      setAdmin(data.admin);
      setPinInput('');
      fetchQuestions();
      fetchPlayers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk sebagai admin';
      setLoginError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout Admin
  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      setAdmin(null);
    }
  };

  // Handle Update Status Soal (Approve / Activate / Archive)
  const handleUpdateStatus = async (questionId: string, action: 'approve' | 'activate' | 'archive') => {
    try {
      const res = await fetch(`/api/admin/questions/${questionId}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        fetchQuestions();
      } else {
        alert(data.message || 'Gagal mengubah status soal');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan');
    }
  };

  // Handle Validasi JSON Bank Soal
  const handleValidateJson = async () => {
    setValidationReport(null);
    setImportStatus(null);
    try {
      const parsed = JSON.parse(importJsonText);
      const res = await fetch('/api/admin/questions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (data.success) {
        setValidationReport(data.report);
      } else {
        setImportStatus(`❌ Validasi gagal: ${data.message}`);
      }
    } catch (err: unknown) {
      setImportStatus(`❌ Format JSON tidak valid: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Handle Simpan Impor JSON
  const handleImportJson = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (data.success) {
        setImportStatus(`✅ Berhasil mengimpor ${data.data.total_imported} soal sebagai draft!`);
        setImportJsonText('');
        setValidationReport(null);
        fetchQuestions();
      } else {
        setImportStatus(`❌ Impor gagal: ${data.message}`);
      }
    } catch (err: unknown) {
      setImportStatus(`❌ Error impor: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Handle Ekspor Bank Soal JSON
  const handleExportJson = () => {
    const params = new URLSearchParams();
    if (levelFilter !== 'all') params.append('education_level', levelFilter);
    params.append('semester', '1');

    fetch(`/api/admin/questions/export?${params.toString()}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kidsgo-bank-soal-${levelFilter}-s1.json`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => alert('Gagal mengekspor bank soal: ' + err.message));
  };

  // Handle Reset PIN Anak
  const handleResetPlayerPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerForReset) return;
    if (!/^\d{4}$/.test(newPlayerPin)) {
      setResetMessage('❌ PIN anak harus tepat 4 angka.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/players/${selectedPlayerForReset.id}/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPin: newPlayerPin }),
      });
      const data = await res.json();
      if (data.success) {
        setResetMessage(`✅ PIN untuk ${selectedPlayerForReset.nickname} berhasil direset ke: ${newPlayerPin}`);
        setNewPlayerPin('');
      } else {
        setResetMessage(`❌ Gagal: ${data.message}`);
      }
    } catch (err: unknown) {
      setResetMessage(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Handle Ganti PIN Admin
  const handleChangeAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeMsg(null);

    if (newAdminPin.length !== 6 || !/^\d{6}$/.test(newAdminPin)) {
      setPinChangeMsg({ type: 'error', text: 'PIN baru admin harus tepat 6 angka.' });
      return;
    }
    if (newAdminPin === '123456') {
      setPinChangeMsg({ type: 'error', text: 'PIN baru tidak boleh menggunakan default 123456.' });
      return;
    }

    try {
      const res = await fetch('/api/admin/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPin: currentAdminPin,
          newPin: newAdminPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPinChangeMsg({ type: 'success', text: 'PIN Admin berhasil diubah!' });
        setCurrentAdminPin('');
        setNewAdminPin('');
      } else {
        setPinChangeMsg({ type: 'error', text: data.message || 'Gagal mengubah PIN.' });
      }
    } catch (err: unknown) {
      setPinChangeMsg({ type: 'error', text: err instanceof Error ? err.message : 'Terjadi kesalahan.' });
    }
  };

  // Filtered Questions dengan Search
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const q = searchQuery.toLowerCase();
    return questions.filter(
      (item) =>
        item.question_id.toLowerCase().includes(q) ||
        item.question.toLowerCase().includes(q) ||
        item.education_level.toLowerCase().includes(q) ||
        item.explanation.toLowerCase().includes(q)
    );
  }, [questions, searchQuery]);

  // Statistik Ringkasan
  const stats = useMemo(() => {
    const active = questions.filter((q) => q.status === 'active').length;
    const draft = questions.filter((q) => q.status === 'draft').length;
    const approved = questions.filter((q) => q.status === 'approved').length;
    return {
      total: totalQuestions || questions.length,
      active,
      draft,
      approved,
      playersCount: players.length,
    };
  }, [questions, totalQuestions, players]);

  // RENDER DENGAN REACT PORTAL LANGSUNG KE BODY (Agar full-screen Desktop 100vw, bukan 440px mobile box)
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#F1F5F9',
        color: '#0F172A',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* 1. TOP HEADER KHUSUS DESKTOP PC */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 28px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#2563EB',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 900,
            }}
          >
            🎓
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1E293B', letterSpacing: '-0.02em' }}>
                KidsGo! Admin Portal
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid #BFDBFE',
                  textTransform: 'uppercase',
                }}
              >
                PC Dashboard
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
              Sistem Manajemen Bank Soal Matematika, Kurikulum & Akun Belajar
            </span>
          </div>
        </div>

        {/* Kontrol Kanan Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {admin && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#334155',
              }}
            >
              <span>👤</span>
              <span>{admin.username}</span>
              <span style={{ color: '#94A3B8' }}>•</span>
              <span style={{ color: '#2563EB', textTransform: 'capitalize' }}>{admin.role}</span>
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
            }}
            title="Kembali ke tampilan aplikasi anak"
          >
            🎒 Tampilan Anak (Mobile Mode)
          </button>

          {admin && (
            <button
              onClick={handleAdminLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#B91C1C',
                cursor: 'pointer',
              }}
            >
              Keluar Admin 🚪
            </button>
          )}
        </div>
      </header>

      {/* 2. JIKA BELUM LOGIN ADMIN: TAMPILAN LOGIN MODAL DESKTOP BERSIH */}
      {!admin ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '32px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🎓</div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 900, color: '#1E293B' }}>
                Masuk Portal Admin & Guru
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '6px' }}>
                Khusus pengelolaan bank soal, verifikasi JSON AI, dan bantuan reset PIN akun anak.
              </p>
            </div>

            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#FEF9C3',
                borderRadius: '10px',
                border: '1px solid #FDE047',
                fontSize: '0.8125rem',
                color: '#854D0E',
                lineHeight: 1.5,
              }}
            >
              💡 <strong>Kredensial Bootstrap Default:</strong> Masukkan PIN <code style={{ fontWeight: 800, padding: '2px 6px', backgroundColor: '#FEF08A', borderRadius: '4px' }}>123456</code> untuk masuk ke dasbor.
            </div>

            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '8px' }}>
                  6-Digit PIN Admin:
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '1.5rem',
                    letterSpacing: '0.3em',
                    textAlign: 'center',
                    borderRadius: '10px',
                    border: '2px solid #CBD5E1',
                    outline: 'none',
                    backgroundColor: '#F8FAFC',
                    fontWeight: 800,
                  }}
                />
              </div>

              {loginError && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: loginError.includes('terkunci') ? '#FEE2E2' : '#FEF3C7',
                    border: loginError.includes('terkunci') ? '1.5px solid #EF4444' : '1px solid #FCD34D',
                    color: loginError.includes('terkunci') ? '#991B1B' : '#92400E',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    lineHeight: 1.45,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                    {loginError.includes('terkunci') ? '🔒' : '⚠️'}
                  </span>
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn || pinInput.length !== 6}
                style={{
                  width: '100%',
                  minHeight: '48px',
                  backgroundColor: pinInput.length === 6 ? '#2563EB' : '#94A3B8',
                  color: 'white',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.9375rem',
                  border: 'none',
                  cursor: pinInput.length === 6 ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {isLoggingIn ? 'Memverifikasi...' : 'Buka Dashboard Admin ➔'}
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  minHeight: '42px',
                  backgroundColor: 'transparent',
                  color: '#64748B',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                }}
              >
                Kembali ke Beranda Belajar Anak
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* 3. JIKA SUDAH LOGIN: TAMPILAN DASHBOARD PC FULL WIDTH & PENUH FITUR */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Warning Banner PIN Default */}
          {admin.is_default_pin && (
            <div
              style={{
                backgroundColor: '#FEF3C7',
                borderBottom: '1px solid #FCD34D',
                padding: '10px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8125rem',
                color: '#92400E',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span>
                <span>
                  <strong>Perhatian Keamanan:</strong> Akun masih menggunakan PIN bawaan bootstrap (<code>123456</code>). Harap segera ubah ke PIN 6-digit pribadi.
                </span>
              </div>
              <button
                onClick={() => setActiveTab('settings')}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  backgroundColor: '#D97706',
                  color: 'white',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Ubah PIN Sekarang
              </button>
            </div>
          )}

          {/* Desktop Sub-Navigasi Tab Bar */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              padding: '0 28px',
              gap: '24px',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setActiveTab('questions')}
              style={{
                padding: '14px 4px',
                borderBottom: activeTab === 'questions' ? '3px solid #2563EB' : '3px solid transparent',
                color: activeTab === 'questions' ? '#2563EB' : '#64748B',
                fontWeight: 800,
                fontSize: '0.9375rem',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>📚</span> Bank Soal & Kurikulum
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: activeTab === 'questions' ? '#EFF6FF' : '#F1F5F9',
                  color: activeTab === 'questions' ? '#2563EB' : '#64748B',
                }}
              >
                {stats.total}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('players')}
              style={{
                padding: '14px 4px',
                borderBottom: activeTab === 'players' ? '3px solid #2563EB' : '3px solid transparent',
                color: activeTab === 'players' ? '#2563EB' : '#64748B',
                fontWeight: 800,
                fontSize: '0.9375rem',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>👥</span> Data Murid & Reset PIN
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: activeTab === 'players' ? '#EFF6FF' : '#F1F5F9',
                  color: activeTab === 'players' ? '#2563EB' : '#64748B',
                }}
              >
                {stats.playersCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              style={{
                padding: '14px 4px',
                borderBottom: activeTab === 'settings' ? '3px solid #2563EB' : '3px solid transparent',
                color: activeTab === 'settings' ? '#2563EB' : '#64748B',
                fontWeight: 800,
                fontSize: '0.9375rem',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🔒</span> Keamanan & PIN Admin
            </button>
          </div>

          {/* Area Konten Utama Desktop (Scrollable) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            {/* STATISTIK OVERVIEW CARDS GRID */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '18px 20px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 700 }}>
                  Total Soal Tersimpan
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1E293B', marginTop: '4px' }}>
                  {stats.total} Soal
                </div>
                <div style={{ fontSize: '0.75rem', color: '#2563EB', marginTop: '4px', fontWeight: 600 }}>
                  Kurikulum Matematika TK & SD
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '18px 20px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 700 }}>
                  Soal Aktif di Game
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#16A34A', marginTop: '4px' }}>
                  {stats.active} Soal
                </div>
                <div style={{ fontSize: '0.75rem', color: '#16A34A', marginTop: '4px', fontWeight: 600 }}>
                  ✓ Siap disajikan ke anak
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '18px 20px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 700 }}>
                  Soal Draft (Menunggu Review)
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#D97706', marginTop: '4px' }}>
                  {stats.draft} Soal
                </div>
                <div style={{ fontSize: '0.75rem', color: '#D97706', marginTop: '4px', fontWeight: 600 }}>
                  Perlu persetujuan admin
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '18px 20px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 700 }}>
                  Total Murid Terdaftar
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0284C7', marginTop: '4px' }}>
                  {stats.playersCount} Anak
                </div>
                <div style={{ fontSize: '0.75rem', color: '#0284C7', marginTop: '4px', fontWeight: 600 }}>
                  Akun aktif dengan PIN
                </div>
              </div>
            </div>

            {/* TAB 1: BANK SOAL */}
            {activeTab === 'questions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Action & Filter Toolbar Desktop */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    backgroundColor: '#FFFFFF',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                    {/* Search Input */}
                    <div style={{ position: 'relative', minWidth: '240px' }}>
                      <input
                        type="text"
                        placeholder="🔍 Cari teks soal, ID, atau topik..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.8125rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {/* Filter Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748B' }}>Status:</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.8125rem',
                          backgroundColor: '#FFFFFF',
                          fontWeight: 600,
                        }}
                      >
                        <option value="all">Semua Status</option>
                        <option value="active">Aktif (Live di Game)</option>
                        <option value="draft">Draft (Belum Disetujui)</option>
                        <option value="approved">Disetujui (Ready)</option>
                        <option value="archived">Diarsipkan</option>
                      </select>
                    </div>

                    {/* Filter Jenjang */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748B' }}>Jenjang:</span>
                      <select
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.8125rem',
                          backgroundColor: '#FFFFFF',
                          fontWeight: 600,
                        }}
                      >
                        <option value="all">Semua Jenjang (TK A - SD 6)</option>
                        {EDUCATION_LEVELS.map((lvl) => (
                          <option key={lvl.code} value={lvl.code}>
                            {lvl.name} ({lvl.age})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={fetchQuestions}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#F8FAFC',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                      title="Refresh data bank soal"
                    >
                      🔄 Refresh
                    </button>
                  </div>

                  {/* Tombol Impor & Ekspor */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleExportJson}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '9px 16px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      📥 Ekspor JSON (AI)
                    </button>
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '9px 18px',
                        backgroundColor: '#2563EB',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        fontWeight: 800,
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                      }}
                    >
                      ➕ Impor Bank Soal JSON
                    </button>
                  </div>
                </div>

                {/* DESKTOP DATA TABLE BANK SOAL */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                        <th style={{ padding: '12px 18px', fontWeight: 800, width: '170px' }}>KODE SOAL</th>
                        <th style={{ padding: '12px 18px', fontWeight: 800, width: '130px' }}>JENJANG</th>
                        <th style={{ padding: '12px 18px', fontWeight: 800 }}>PERTANYAAN & OPSI JAWABAN</th>
                        <th style={{ padding: '12px 18px', fontWeight: 800, width: '110px' }}>STATUS</th>
                        <th style={{ padding: '12px 18px', fontWeight: 800, width: '190px', textAlign: 'right' }}>
                          AKSI MANAJEMEN
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingQuestions ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                            Memuat data bank soal...
                          </td>
                        </tr>
                      ) : filteredQuestions.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                            Tidak ada soal yang ditemukan untuk filter ini. Klik <strong>"➕ Impor Bank Soal JSON"</strong> untuk menambahkan soal.
                          </td>
                        </tr>
                      ) : (
                        filteredQuestions.map((q) => (
                          <tr
                            key={q.id}
                            style={{
                              borderBottom: '1px solid #F1F5F9',
                              transition: 'background-color 0.1s ease',
                            }}
                          >
                            {/* 1. Kode Soal */}
                            <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 800, color: '#2563EB', fontFamily: 'monospace' }}>
                                {q.question_id}
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                Semester {q.semester}
                              </span>
                            </td>

                            {/* 2. Jenjang */}
                            <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  backgroundColor: '#F1F5F9',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  color: '#334155',
                                }}
                              >
                                {q.education_level}
                              </span>
                            </td>

                            {/* 3. Pertanyaan & Opsi */}
                            <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.9375rem', marginBottom: '6px' }}>
                                {q.question}
                              </div>

                              {q.visual && (
                                <div
                                  style={{
                                    display: 'inline-block',
                                    padding: '4px 8px',
                                    backgroundColor: '#FEF9C3',
                                    borderRadius: '6px',
                                    fontSize: '0.8125rem',
                                    marginBottom: '8px',
                                  }}
                                >
                                  {q.visual}
                                </div>
                              )}

                              {/* Opsi Jawaban Grid */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', marginTop: '4px' }}>
                                {q.options.map((opt) => (
                                  <div
                                    key={opt.id}
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      backgroundColor: opt.id === q.correct_answer ? '#DCFCE7' : '#F8FAFC',
                                      border: opt.id === q.correct_answer ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                                      fontSize: '0.8125rem',
                                      color: opt.id === q.correct_answer ? '#14532D' : '#334155',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                    }}
                                  >
                                    <span>
                                      <strong>{opt.id}.</strong> {opt.text}
                                    </span>
                                    {opt.id === q.correct_answer && (
                                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803D' }}>
                                        ✓ Kunci
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Penjelasan */}
                              <div
                                style={{
                                  marginTop: '8px',
                                  fontSize: '0.75rem',
                                  color: '#64748B',
                                  backgroundColor: '#F8FAFC',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                }}
                              >
                                💡 <strong>Penjelasan:</strong> {q.explanation}
                              </div>
                            </td>

                            {/* 4. Status Badge */}
                            <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  backgroundColor:
                                    q.status === 'active'
                                      ? '#DCFCE7'
                                      : q.status === 'approved'
                                      ? '#E0F2FE'
                                      : '#FEF3C7',
                                  color:
                                    q.status === 'active'
                                      ? '#15803D'
                                      : q.status === 'approved'
                                      ? '#0369A1'
                                      : '#B45309',
                                }}
                              >
                                {q.status}
                              </span>
                            </td>

                            {/* 5. Aksi Manajemen */}
                            <td style={{ padding: '14px 18px', verticalAlign: 'top', textAlign: 'right' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                {q.status === 'draft' && (
                                  <button
                                    onClick={() => handleUpdateStatus(q.question_id, 'approve')}
                                    style={{
                                      padding: '5px 12px',
                                      backgroundColor: '#0284C7',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Setujui Soal ✓
                                  </button>
                                )}

                                {q.status === 'approved' && (
                                  <button
                                    onClick={() => handleUpdateStatus(q.question_id, 'activate')}
                                    style={{
                                      padding: '5px 12px',
                                      backgroundColor: '#16A34A',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Aktifkan ke Game 🚀
                                  </button>
                                )}

                                {q.status !== 'archived' && (
                                  <button
                                    onClick={() => handleUpdateStatus(q.question_id, 'archive')}
                                    style={{
                                      padding: '4px 10px',
                                      backgroundColor: 'transparent',
                                      color: '#94A3B8',
                                      border: '1px solid #E2E8F0',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Arsipkan 📦
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: DATA MURID & RESET PIN */}
            {activeTab === 'players' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1E293B' }}>
                    Daftar Murid Terdaftar ({players.length})
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
                    Jika murid lupa 4-digit PIN rahasianya, guru atau admin dapat melakukan reset PIN secara instan.
                  </p>
                </div>

                {resetMessage && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: resetMessage.startsWith('✅') ? '#DCFCE7' : '#FEE2E2',
                      color: resetMessage.startsWith('✅') ? '#15803D' : '#991B1B',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                    }}
                  >
                    {resetMessage}
                  </div>
                )}

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                        <th style={{ padding: '12px 18px', fontWeight: 800 }}>NAMA ANAK / NICKNAME</th>
                        <th style={{ padding: '12px 18px', fontWeight: 800 }}>JENJANG KELAS</th>
                        <th style={{ padding: '12px 18px', fontWeight: 800 }}>PENGALAMAN (XP)</th>
                        <th style={{ padding: '12px 18px', fontWeight: 800 }}>TANGGAL MENDAFTAR</th>
                        <th style={{ padding: '12px 18px', fontWeight: 800, textAlign: 'right' }}>BANTUAN PIN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1.5rem' }}>{p.avatar}</span>
                              <span style={{ fontWeight: 800, color: '#1E293B' }}>{p.nickname}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ padding: '4px 8px', backgroundColor: '#F1F5F9', borderRadius: '6px', fontWeight: 700 }}>
                              {p.grade}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', fontWeight: 800, color: '#D97706' }}>
                            ⭐ {p.current_xp} XP
                          </td>
                          <td style={{ padding: '14px 18px', color: '#64748B', fontSize: '0.8125rem' }}>
                            {new Date(p.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setSelectedPlayerForReset(p);
                                setResetMessage(null);
                              }}
                              style={{
                                padding: '6px 14px',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#2563EB',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Reset PIN 🔑
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Modal Dialog Reset PIN Anak */}
                {selectedPlayerForReset && (
                  <div
                    style={{
                      position: 'fixed',
                      inset: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 100000,
                      padding: '20px',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '400px',
                        padding: '24px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1E293B' }}>
                        Reset PIN untuk {selectedPlayerForReset.nickname} {selectedPlayerForReset.avatar}
                      </h3>
                      <form onSubmit={handleResetPlayerPin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                            PIN Baru (4 Digit Angka):
                          </label>
                          <input
                            type="password"
                            maxLength={4}
                            placeholder="Contoh: 1234"
                            value={newPlayerPin}
                            onChange={(e) => setNewPlayerPin(e.target.value.replace(/\D/g, ''))}
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              fontSize: '1.25rem',
                              textAlign: 'center',
                              letterSpacing: '0.25em',
                              borderRadius: '8px',
                              border: '1.5px solid #CBD5E1',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedPlayerForReset(null)}
                            style={{
                              flex: 1,
                              padding: '10px',
                              backgroundColor: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              borderRadius: '8px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            disabled={newPlayerPin.length !== 4}
                            style={{
                              flex: 1,
                              padding: '10px',
                              backgroundColor: newPlayerPin.length === 4 ? '#2563EB' : '#94A3B8',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 700,
                              cursor: newPlayerPin.length === 4 ? 'pointer' : 'not-allowed',
                            }}
                          >
                            Simpan PIN Baru
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: KEAMANAN & GANTI PIN ADMIN */}
            {activeTab === 'settings' && (
              <div
                style={{
                  maxWidth: '540px',
                  backgroundColor: '#FFFFFF',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1E293B' }}>
                    Pengaturan Keamanan & PIN Admin
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
                    PIN admin wajib terdiri dari 6 digit angka dan tidak boleh menggunakan PIN default <code>123456</code>.
                  </p>
                </div>

                {pinChangeMsg && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: pinChangeMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                      color: pinChangeMsg.type === 'success' ? '#15803D' : '#991B1B',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                    }}
                  >
                    {pinChangeMsg.text}
                  </div>
                )}

                <form onSubmit={handleChangeAdminPin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      PIN Admin Saat Ini:
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="PIN lama (misal: 123456)"
                      value={currentAdminPin}
                      onChange={(e) => setCurrentAdminPin(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      PIN Admin Baru (6 Digit):
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="PIN baru (contoh: 789123)"
                      value={newAdminPin}
                      onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={currentAdminPin.length < 6 || newAdminPin.length !== 6}
                    style={{
                      marginTop: '6px',
                      padding: '12px',
                      backgroundColor: '#2563EB',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Simpan Perubahan PIN Admin
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL DESKTOP IMPOR SOAL JSON (Side-by-Side View) */}
      {isImportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '30px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '880px',
              maxHeight: '90vh',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1E293B' }}>
                  Impor Berkas Bank Soal JSON (v1.0)
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Format kompatibel dengan hasil generasi AI eksternal (ChatGPT/Gemini)
                </span>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setValidationReport(null);
                  setImportStatus(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#94A3B8',
                }}
              >
                ✕
              </button>
            </div>

            {/* Isi Editor & Preview */}
            <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.8125rem', color: '#475569' }}>
                Tempel format JSON sesuai kontrak schema di <code>docs/question-bank-schema-v1.md</code>. Sistem akan memvalidasi keutuhan schema, ID unik, dan referensi kunci jawaban sebelum disimpan ke status <strong>draft</strong>.
              </p>

              <textarea
                rows={12}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder={`{\n  "schema_version": "1.0",\n  "subject": "mathematics",\n  "education_level": "SD_1",\n  "semester": 1,\n  "topic": "addition",\n  "difficulty": 1,\n  "questions": [\n    {\n      "question_id": "MATH-SD1-S1-NEW",\n      "type": "multiple_choice",\n      "question": "Berapakah 5 + 5?",\n      "options": [\n        { "id": "A", "text": "9" },\n        { "id": "B", "text": "10" },\n        { "id": "C", "text": "11" }\n      ],\n      "correct_answer": "B",\n      "explanation": "Lima ditambah lima sama dengan sepuluh.",\n      "tags": ["addition"]\n    }\n  ]\n}`}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontFamily: 'monospace',
                  fontSize: '0.8125rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  backgroundColor: '#0F172A',
                  color: '#F8FAFC',
                  lineHeight: 1.5,
                }}
              />

              {importStatus && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: importStatus.startsWith('✅') ? '#DCFCE7' : '#FEE2E2',
                    color: importStatus.startsWith('✅') ? '#15803D' : '#991B1B',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                  }}
                >
                  {importStatus}
                </div>
              )}

              {validationReport && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: validationReport.is_valid ? '#DCFCE7' : '#FEE2E2',
                    fontSize: '0.8125rem',
                  }}
                >
                  <strong style={{ color: validationReport.is_valid ? '#15803D' : '#991B1B' }}>
                    {validationReport.is_valid
                      ? `✓ Format Valid! Total ${validationReport.total_questions} soal siap diimpor sebagai draft.`
                      : `✕ Validasi Gagal: Ditemukan ${validationReport.errors.length} masalah.`}
                  </strong>
                  {!validationReport.is_valid && (
                    <ul style={{ marginTop: '8px', paddingLeft: '18px', color: '#991B1B' }}>
                      {validationReport.errors.map((err: any, idx: number) => (
                        <li key={idx} style={{ marginTop: '4px' }}>
                          <code>{err.field}</code>: {err.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '14px 24px',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={handleValidateJson}
                disabled={!importJsonText.trim()}
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: importJsonText.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                🔍 Uji Validasi Format
              </button>

              <button
                type="button"
                onClick={handleImportJson}
                disabled={!validationReport?.is_valid}
                style={{
                  padding: '9px 20px',
                  backgroundColor: validationReport?.is_valid ? '#2563EB' : '#94A3B8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  fontWeight: 800,
                  cursor: validationReport?.is_valid ? 'pointer' : 'not-allowed',
                }}
              >
                💾 Simpan Soal ke Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
