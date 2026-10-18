import React, { useEffect, useState } from 'react';
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

  // Tabs: 'questions' | 'players' | 'settings'
  const [activeTab, setActiveTab] = useState<'questions' | 'players' | 'settings'>('questions');

  // Bank Soal State
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
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

  // 1. Periksa sesi Admin saat pertama kali dimuat
  const checkAdminSession = () => {
    fetch('/api/admin/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Not logged in as admin');
        return res.json();
      })
      .then((data) => {
        if (data.success && data.admin) {
          setAdmin(data.admin);
        }
      })
      .catch(() => {
        setAdmin(null);
      });
  };

  useEffect(() => {
    checkAdminSession();
  }, []);

  // 2. Load daftar soal saat tab questions aktif atau filter berubah
  const fetchQuestions = () => {
    if (!admin) return;
    setIsLoadingQuestions(true);

    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (levelFilter !== 'all') params.append('education_level', levelFilter);
    params.append('limit', '50');

    fetch(`/api/admin/questions?${params.toString()}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setQuestions(data.data || []);
          setTotalQuestions(data.total || 0);
        }
      })
      .catch((err) => console.error('Gagal mengambil daftar soal:', err))
      .finally(() => setIsLoadingQuestions(false));
  };

  // 3. Load daftar akun anak saat tab players aktif
  const fetchPlayers = () => {
    if (!admin) return;
    fetch('/api/admin/players', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPlayers(data.players || []);
        }
      })
      .catch((err) => console.error('Gagal mengambil daftar anak:', err));
  };

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
        checkAdminSession();
      } else {
        setPinChangeMsg({ type: 'error', text: data.message || 'Gagal mengubah PIN.' });
      }
    } catch (err: unknown) {
      setPinChangeMsg({ type: 'error', text: err instanceof Error ? err.message : 'Terjadi kesalahan.' });
    }
  };

  // Tampilan 1: Belum Login Admin (Form PIN Bootstrap 123456)
  if (!admin) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(32, 36, 44, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
      >
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '24px',
            backgroundColor: 'var(--color-paper)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-float)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.5rem' }}>🎓</span>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                Portal Admin & Guru
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                color: 'var(--color-muted)',
              }}
            >
              ✕
            </button>
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.4 }}>
            Area terpisah untuk pengelolaan kurikulum, verifikasi bank soal JSON, dan bantuan reset akun anak.
          </p>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--color-sunshine-soft)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #EAD498',
              fontSize: '0.75rem',
              color: '#7D5700',
            }}
          >
            💡 <strong>PIN Default Bootstrap:</strong> <code style={{ fontWeight: 800 }}>123456</code> (dapat diubah setelah masuk).
          </div>

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-ink)', display: 'block', marginBottom: '6px' }}>
                Masukkan 6-Digit PIN Admin:
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
                  padding: '12px 14px',
                  fontSize: '1.25rem',
                  letterSpacing: '0.25em',
                  textAlign: 'center',
                  borderRadius: 'var(--radius-input)',
                  border: '1.5px solid var(--color-border)',
                  outline: 'none',
                  backgroundColor: 'var(--color-canvas)',
                }}
              />
            </div>

            {loginError && (
              <div style={{ color: 'var(--color-danger)', fontSize: '0.8125rem', fontWeight: 700 }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={isLoggingIn || pinInput.length !== 6}
              style={{ minHeight: '46px', opacity: pinInput.length === 6 ? 1 : 0.6 }}
            >
              {isLoggingIn ? 'Memverifikasi...' : 'Masuk Dashboard Admin ➔'}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{ minHeight: '40px' }}
            >
              Kembali ke Beranda Belajar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Tampilan 2: Terautentikasi Sebagai Admin (Dashboard Penuh)
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--color-canvas)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Top Header Admin */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          backgroundColor: 'var(--color-paper)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>🎓</span>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-ink)' }}>
              KidsGo! Admin
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-primary)', fontWeight: 700 }}>
              {admin.role.toUpperCase()} • {admin.username}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleAdminLogout}
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              backgroundColor: 'var(--color-surface-soft)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Keluar 🚪
          </button>
          <button
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
          >
            Ke Beranda 🎒
          </button>
        </div>
      </header>

      {/* Warning Banner PIN Default */}
      {admin.is_default_pin && (
        <div
          style={{
            backgroundColor: '#FFF4E5',
            borderBottom: '1px solid #FFE2B8',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8125rem',
            color: '#8A5300',
          }}
        >
          <span>
            ⚠️ <strong>Perhatian Keamanan:</strong> Akun masih menggunakan default PIN (<code>123456</code>). Harap segera ganti PIN.
          </span>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              backgroundColor: 'var(--color-warning)',
              color: 'white',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Ganti Sekarang
          </button>
        </div>
      )}

      {/* Sub-Navigasi Tab Admin */}
      <div
        style={{
          display: 'flex',
          backgroundColor: 'var(--color-paper)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 20px',
          gap: '16px',
        }}
      >
        <button
          onClick={() => setActiveTab('questions')}
          style={{
            padding: '12px 0',
            borderBottom: activeTab === 'questions' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'questions' ? 'var(--color-primary)' : 'var(--color-muted)',
            fontWeight: 800,
            fontSize: '0.875rem',
            background: 'none',
            borderRadius: 0,
          }}
        >
          📚 Bank Soal
        </button>
        <button
          onClick={() => setActiveTab('players')}
          style={{
            padding: '12px 0',
            borderBottom: activeTab === 'players' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'players' ? 'var(--color-primary)' : 'var(--color-muted)',
            fontWeight: 800,
            fontSize: '0.875rem',
            background: 'none',
            borderRadius: 0,
          }}
        >
          👥 Akun Anak & Reset PIN
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '12px 0',
            borderBottom: activeTab === 'settings' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'settings' ? 'var(--color-primary)' : 'var(--color-muted)',
            fontWeight: 800,
            fontSize: '0.875rem',
            background: 'none',
            borderRadius: 0,
          }}
        >
          🔒 Keamanan & PIN Admin
        </button>
      </div>

      {/* Konten Tab Admin */}
      <main style={{ padding: '20px', flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto' }}>
        {/* TAB 1: BANK SOAL */}
        {activeTab === 'questions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                  Kelola Bank Soal ({totalQuestions})
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                  Status: Draft (baru impor) ➔ Disetujui (Admin OK) ➔ Aktif (Siap dimainkan anak)
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-secondary"
                  onClick={handleExportJson}
                  style={{ fontSize: '0.8125rem', minHeight: '36px', padding: '6px 12px' }}
                >
                  📥 Ekspor JSON (Untuk AI)
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setIsImportModalOpen(true)}
                  style={{ fontSize: '0.8125rem', minHeight: '36px', padding: '6px 14px' }}
                >
                  ➕ Impor JSON Soal
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div
              className="card"
              style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                flexWrap: 'wrap',
                alignItems: 'center',
                backgroundColor: 'var(--color-paper)',
              }}
            >
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', marginRight: '6px' }}>
                  Status:
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}
                >
                  <option value="all">Semua Status</option>
                  <option value="draft">Draft (Perlu Approval)</option>
                  <option value="approved">Disetujui (Siap Diaktifkan)</option>
                  <option value="active">Aktif (Live di Game)</option>
                  <option value="archived">Diarsipkan</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', marginRight: '6px' }}>
                  Jenjang:
                </label>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}
                >
                  <option value="all">Semua Jenjang</option>
                  {EDUCATION_LEVELS.map((lvl) => (
                    <option key={lvl.code} value={lvl.code}>
                      {lvl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Daftar Soal */}
            {isLoadingQuestions ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                Memuat bank soal...
              </div>
            ) : questions.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-muted)' }}>
                Tidak ada soal yang cocok dengan filter saat ini.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="card"
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--color-paper)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                          {q.question_id}
                        </code>
                        <span className="badge" style={{ fontSize: '0.6875rem' }}>
                          {q.education_level} • Sem {q.semester}
                        </span>
                      </div>

                      <span
                        className="badge"
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor:
                            q.status === 'active'
                              ? 'var(--color-mint-soft)'
                              : q.status === 'approved'
                              ? 'var(--color-sky-soft)'
                              : 'var(--color-sunshine-soft)',
                          color:
                            q.status === 'active'
                              ? '#0D6852'
                              : q.status === 'approved'
                              ? '#025E8C'
                              : '#825600',
                          fontWeight: 800,
                        }}
                      >
                        {q.status.toUpperCase()}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                      {q.question}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', margin: '4px 0' }}>
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-xs)',
                            backgroundColor: opt.id === q.correct_answer ? 'var(--color-mint-soft)' : 'var(--color-surface-soft)',
                            border: opt.id === q.correct_answer ? '1.5px solid var(--color-mint)' : '1px solid var(--color-border)',
                            fontSize: '0.8125rem',
                            display: 'flex',
                            gap: '6px',
                          }}
                        >
                          <strong>{opt.id}.</strong> {opt.text}
                          {opt.id === q.correct_answer && <span style={{ marginLeft: 'auto' }}>✅ Kunci</span>}
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', backgroundColor: 'var(--color-canvas)', padding: '6px 10px', borderRadius: 'var(--radius-xs)' }}>
                      💡 <strong>Penjelasan:</strong> {q.explanation}
                    </div>

                    {/* Action Bar Status */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', justifyContent: 'flex-end' }}>
                      {q.status === 'draft' && (
                        <button
                          onClick={() => handleUpdateStatus(q.question_id, 'approve')}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            backgroundColor: 'var(--color-sky)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-xs)',
                          }}
                        >
                          Setujui Soal ✅
                        </button>
                      )}
                      {q.status === 'approved' && (
                        <button
                          onClick={() => handleUpdateStatus(q.question_id, 'activate')}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            backgroundColor: 'var(--color-mint)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-xs)',
                          }}
                        >
                          Aktifkan ke Game 🚀
                        </button>
                      )}
                      {q.status !== 'archived' && (
                        <button
                          onClick={() => handleUpdateStatus(q.question_id, 'archive')}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            backgroundColor: 'transparent',
                            color: 'var(--color-muted)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-xs)',
                          }}
                        >
                          Arsipkan 📦
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AKUN ANAK & RESET PIN */}
        {activeTab === 'players' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                Kelola Akun Anak & Bantuan Orang Tua
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                Jika anak lupa 4-digit PIN rahasianya, orang tua/admin dapat melakukan reset PIN secara aman.
              </p>
            </div>

            {resetMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: resetMessage.startsWith('✅') ? 'var(--color-mint-soft)' : 'var(--color-danger-soft)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                {resetMessage}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {players.map((p) => (
                <div
                  key={p.id}
                  className="card"
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--color-paper)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.75rem' }}>{p.avatar}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--color-ink)' }}>
                        {p.nickname}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                        {p.grade} • {p.current_xp} XP
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setSelectedPlayerForReset(p);
                      setResetMessage(null);
                    }}
                    style={{ padding: '6px 12px', fontSize: '0.75rem', minHeight: '34px' }}
                  >
                    Reset PIN 🔑
                  </button>
                </div>
              ))}
            </div>

            {/* Modal Dialog Reset PIN Anak */}
            {selectedPlayerForReset && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(32, 36, 44, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1100,
                  padding: '20px',
                }}
              >
                <div
                  className="card"
                  style={{
                    width: '100%',
                    maxWidth: '380px',
                    padding: '20px',
                    backgroundColor: 'var(--color-paper)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>
                    Reset PIN untuk {selectedPlayerForReset.nickname} {selectedPlayerForReset.avatar}
                  </h3>
                  <form onSubmit={handleResetPlayerPin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                        Masukkan PIN 4-Digit Baru:
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="Contoh: 5678"
                        value={newPlayerPin}
                        onChange={(e) => setNewPlayerPin(e.target.value.replace(/\D/g, ''))}
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '1.25rem',
                          textAlign: 'center',
                          letterSpacing: '0.2em',
                          borderRadius: 'var(--radius-input)',
                          border: '1.5px solid var(--color-border)',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setSelectedPlayerForReset(null)}
                        style={{ flex: 1, minHeight: '40px' }}
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={newPlayerPin.length !== 4}
                        style={{ flex: 1, minHeight: '40px' }}
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

        {/* TAB 3: GANTI PIN ADMIN */}
        {activeTab === 'settings' && (
          <div style={{ maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                Keamanan & Ganti PIN Admin
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                PIN admin wajib terdiri dari 6 angka dan tidak boleh menggunakan default <code>123456</code>.
              </p>
            </div>

            {pinChangeMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: pinChangeMsg.type === 'success' ? 'var(--color-mint-soft)' : 'var(--color-danger-soft)',
                  color: pinChangeMsg.type === 'success' ? '#0D6852' : 'var(--color-danger)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                }}
              >
                {pinChangeMsg.text}
              </div>
            )}

            <form onSubmit={handleChangeAdminPin} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--color-paper)' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
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
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-input)',
                    border: '1.5px solid var(--color-border)',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  PIN Admin Baru (6 Digit):
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="PIN baru (tidak boleh 123456)"
                  value={newAdminPin}
                  onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-input)',
                    border: '1.5px solid var(--color-border)',
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={currentAdminPin.length < 6 || newAdminPin.length !== 6}
                style={{ minHeight: '44px', marginTop: '6px' }}
              >
                Perbarui PIN Admin
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Modal Import JSON Bank Soal */}
      {isImportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(32, 36, 44, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '20px',
              backgroundColor: 'var(--color-paper)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>
                Impor Bank Soal JSON (v1.0)
              </h3>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setValidationReport(null);
                  setImportStatus(null);
                }}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
              Tempel berkas JSON yang dihasilkan oleh AI eksternal (ChatGPT/Gemini) sesuai kontrak <code>docs/question-bank-schema-v1.md</code>.
            </p>

            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder={`{\n  "schema_version": "1.0",\n  "subject": "mathematics",\n  "education_level": "SD_1",\n  "semester": 1,\n  "topic": "addition",\n  "difficulty": 1,\n  "questions": [ ... ]\n}`}
              style={{
                width: '100%',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                borderRadius: 'var(--radius-input)',
                border: '1.5px solid var(--color-border)',
                backgroundColor: 'var(--color-canvas)',
              }}
            />

            {importStatus && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: importStatus.startsWith('✅') ? 'var(--color-mint-soft)' : 'var(--color-danger-soft)',
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
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: validationReport.is_valid ? 'var(--color-mint-soft)' : 'var(--color-danger-soft)',
                  fontSize: '0.8125rem',
                }}
              >
                <strong>Hasil Validasi: </strong>
                {validationReport.is_valid
                  ? `Lulus Validasi! Total ${validationReport.total_questions} soal valid.`
                  : `Ditemukan ${validationReport.errors.length} kesalahan validasi:`}
                {!validationReport.is_valid && (
                  <ul style={{ marginTop: '6px', paddingLeft: '18px' }}>
                    {validationReport.errors.map((err: any, idx: number) => (
                      <li key={idx}>
                        <code>{err.field}</code>: {err.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleValidateJson}
                disabled={!importJsonText.trim()}
                style={{ minHeight: '38px', fontSize: '0.8125rem' }}
              >
                🔍 Uji Validasi
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleImportJson}
                disabled={!validationReport?.is_valid}
                style={{ minHeight: '38px', fontSize: '0.8125rem' }}
              >
                💾 Simpan sebagai Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
