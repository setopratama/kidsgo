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
  is_suspended?: boolean;
  created_at: string;
}

interface AdminLevel {
  id: string;
  topic_id: string;
  level_number: number;
  name: string;
  required_xp: number;
  passing_score: number;
  total_questions: number;
}

interface AdminTopic {
  id: string;
  subject: string;
  education_level: string;
  semester: number;
  name: string;
  slug: string;
  order_index: number;
  total_levels: number;
  total_questions: number;
  levels: AdminLevel[];
}

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Navigasi Menu Sisi Kiri (Sidebar): 'overview' | 'curriculum' | 'questions' | 'import' | 'players' | 'leaderboard' | 'settings'
  const [activeTab, setActiveTab] = useState<
    'overview' | 'curriculum' | 'questions' | 'import' | 'players' | 'leaderboard' | 'settings'
  >('overview');

  // Curriculum State
  const [curriculumTopics, setCurriculumTopics] = useState<AdminTopic[]>([]);
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(false);
  const [curriculumGradeFilter, setCurriculumGradeFilter] = useState<string>('all');
  const [curriculumSemesterFilter, setCurriculumSemesterFilter] = useState<string>('all');
  const [curriculumSearch, setCurriculumSearch] = useState('');
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<AdminTopic | null>(null);
  const [topicForm, setTopicForm] = useState<{
    name: string;
    education_level: string;
    semester: number;
    order_index: number;
  }>({
    name: '',
    education_level: 'SD_1',
    semester: 1,
    order_index: 1,
  });

  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [parentTopicForLevel, setParentTopicForLevel] = useState<AdminTopic | null>(null);
  const [editingLevel, setEditingLevel] = useState<AdminLevel | null>(null);
  const [levelForm, setLevelForm] = useState<{
    name: string;
    level_number: number;
    required_xp: number;
    passing_score: number;
  }>({
    name: '',
    level_number: 1,
    required_xp: 50,
    passing_score: 100,
  });

  const [curriculumDeleteItem, setCurriculumDeleteItem] = useState<{
    type: 'topic' | 'level';
    id: string;
    name: string;
    topicId?: string;
  } | null>(null);
  const [curriculumMsg, setCurriculumMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingCurriculum, setIsSavingCurriculum] = useState(false);

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
  const [selectedPlayerForSuspend, setSelectedPlayerForSuspend] = useState<PlayerItem | null>(null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [playerStatusFilter, setPlayerStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [playerGradeFilter, setPlayerGradeFilter] = useState<string>('all');
  const [newPlayerPin, setNewPlayerPin] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isProcessingSuspend, setIsProcessingSuspend] = useState(false);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<
    Array<{
      player_id: string;
      nickname: string;
      avatar: string;
      grade: string;
      total_xp: number;
      rank: number;
    }>
  >([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'all' | 'weekly' | 'daily'>('all');
  const [leaderboardGradeFilter, setLeaderboardGradeFilter] = useState<string>('all');
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Change PIN Admin State
  const [currentAdminPin, setCurrentAdminPin] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch data bank soal dari backend
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

  // 3. Fetch data leaderboard dari backend
  const fetchLeaderboard = (
    period: string = leaderboardPeriod,
    grade: string = leaderboardGradeFilter
  ) => {
    setIsLoadingLeaderboard(true);
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (grade !== 'all') params.append('grade', grade);

    fetch(`/api/leaderboard?${params.toString()}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.leaderboard) {
          setLeaderboard(data.data.leaderboard);
        } else {
          setLeaderboard([]);
        }
      })
      .catch((err) => {
        console.error('Gagal mengambil leaderboard:', err);
        setLeaderboard([]);
      })
      .finally(() => setIsLoadingLeaderboard(false));
  };

  // 4. Fetch data kurikulum & jalur level dari backend
  const fetchCurriculum = (
    grade: string = curriculumGradeFilter,
    semester: string = curriculumSemesterFilter
  ) => {
    setIsLoadingCurriculum(true);
    const params = new URLSearchParams();
    if (grade !== 'all') params.append('grade', grade);
    if (semester !== 'all') params.append('semester', semester);

    fetch(`/api/admin/curriculum/overview?${params.toString()}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setCurriculumTopics(data.data);
        } else {
          setCurriculumTopics([]);
        }
      })
      .catch((err) => {
        console.error('Gagal mengambil kurikulum:', err);
        setCurriculumTopics([]);
      })
      .finally(() => setIsLoadingCurriculum(false));
  };

  // 5. Periksa sesi Admin saat pertama kali dimuat
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
          fetchLeaderboard();
          fetchCurriculum();
        }
      })
      .catch(() => setAdmin(null));
  }, []);

  // 6. Update data saat tab atau filter berubah
  useEffect(() => {
    if (admin) {
      if (activeTab === 'curriculum' || activeTab === 'overview') {
        fetchCurriculum(curriculumGradeFilter, curriculumSemesterFilter);
      }
      if (activeTab === 'questions' || activeTab === 'overview') fetchQuestions();
      if (activeTab === 'players' || activeTab === 'overview') fetchPlayers();
      if (activeTab === 'leaderboard' || activeTab === 'overview') {
        fetchLeaderboard(leaderboardPeriod, leaderboardGradeFilter);
      }
    }
  }, [
    admin,
    activeTab,
    statusFilter,
    levelFilter,
    leaderboardPeriod,
    leaderboardGradeFilter,
    curriculumGradeFilter,
    curriculumSemesterFilter,
  ]);

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
      fetchCurriculum();
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

  // Handle Simpan Topik (Buat Baru atau Update)
  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicForm.name.trim()) return;
    setIsSavingCurriculum(true);
    setCurriculumMsg(null);

    try {
      const url = editingTopic
        ? `/api/admin/curriculum/topics/${editingTopic.id}`
        : '/api/admin/curriculum/topics';
      const method = editingTopic ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(topicForm),
      });
      const data = await res.json();
      if (data.success) {
        setCurriculumMsg({
          type: 'success',
          text: editingTopic
            ? `✅ Topik "${topicForm.name}" berhasil diperbarui!`
            : `✅ Topik baru "${topicForm.name}" berhasil ditambahkan!`,
        });
        setIsTopicModalOpen(false);
        setEditingTopic(null);
        fetchCurriculum();
      } else {
        setCurriculumMsg({ type: 'error', text: data.message || 'Gagal menyimpan topik.' });
      }
    } catch (err: unknown) {
      setCurriculumMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsSavingCurriculum(false);
    }
  };

  // Handle Simpan Level (Buat Baru atau Update)
  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelForm.name.trim()) return;
    setIsSavingCurriculum(true);
    setCurriculumMsg(null);

    try {
      const url = editingLevel
        ? `/api/admin/curriculum/levels/${editingLevel.id}`
        : `/api/admin/curriculum/topics/${parentTopicForLevel?.id}/levels`;
      const method = editingLevel ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(levelForm),
      });
      const data = await res.json();
      if (data.success) {
        setCurriculumMsg({
          type: 'success',
          text: editingLevel
            ? `✅ Level "${levelForm.name}" berhasil diperbarui!`
            : `✅ Level baru "${levelForm.name}" berhasil ditambahkan!`,
        });
        setIsLevelModalOpen(false);
        setEditingLevel(null);
        fetchCurriculum();
      } else {
        setCurriculumMsg({ type: 'error', text: data.message || 'Gagal menyimpan level.' });
      }
    } catch (err: unknown) {
      setCurriculumMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsSavingCurriculum(false);
    }
  };

  // Handle Hapus Topik atau Level
  const handleDeleteCurriculumItem = async () => {
    if (!curriculumDeleteItem) return;
    setIsSavingCurriculum(true);
    setCurriculumMsg(null);

    try {
      const url =
        curriculumDeleteItem.type === 'topic'
          ? `/api/admin/curriculum/topics/${curriculumDeleteItem.id}`
          : `/api/admin/curriculum/levels/${curriculumDeleteItem.id}`;

      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setCurriculumMsg({
          type: 'success',
          text: `✅ ${curriculumDeleteItem.type === 'topic' ? 'Topik' : 'Level'} "${curriculumDeleteItem.name}" berhasil dihapus.`,
        });
        setCurriculumDeleteItem(null);
        fetchCurriculum();
      } else {
        setCurriculumMsg({ type: 'error', text: data.message || 'Gagal menghapus item.' });
      }
    } catch (err: unknown) {
      setCurriculumMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsSavingCurriculum(false);
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

  // Handle Suspend / Unsuspend Akun Murid
  const handleToggleSuspend = async (player: PlayerItem) => {
    setIsProcessingSuspend(true);
    const targetSuspended = !player.is_suspended;
    try {
      const res = await fetch(`/api/admin/players/${player.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isSuspended: targetSuspended }),
      });
      const data = await res.json();
      if (data.success) {
        setResetMessage(
          targetSuspended
            ? `🚫 Akun ${player.nickname} berhasil ditangguhkan (suspend). Sesi aktif telah diakhiri.`
            : `✅ Akun ${player.nickname} berhasil diaktifkan kembali!`
        );
        fetchPlayers();
      } else {
        setResetMessage(`❌ Gagal: ${data.message}`);
      }
    } catch (err: unknown) {
      setResetMessage(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessingSuspend(false);
      setSelectedPlayerForSuspend(null);
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
    const activePlayers = players.filter((p) => !p.is_suspended).length;
    const suspendedPlayers = players.filter((p) => p.is_suspended).length;
    const totalCurriculumTopics = curriculumTopics.length;
    const totalCurriculumLevels = curriculumTopics.reduce((acc, t) => acc + (t.levels?.length || 0), 0);
    return {
      total: totalQuestions || questions.length,
      active,
      draft,
      approved,
      playersCount: players.length,
      activePlayers,
      suspendedPlayers,
      totalCurriculumTopics,
      totalCurriculumLevels,
    };
  }, [questions, totalQuestions, players, curriculumTopics]);

  // Filtered Topics dengan Search & Filter
  const filteredCurriculumTopics = useMemo(() => {
    return curriculumTopics.filter((t) => {
      if (curriculumGradeFilter !== 'all' && t.education_level !== curriculumGradeFilter) return false;
      if (curriculumSemesterFilter !== 'all' && String(t.semester) !== curriculumSemesterFilter) return false;
      if (curriculumSearch.trim()) {
        const q = curriculumSearch.toLowerCase();
        const matchTopic = t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
        const matchLevel = t.levels?.some((lvl) => lvl.name.toLowerCase().includes(q));
        if (!matchTopic && !matchLevel) return false;
      }
      return true;
    });
  }, [curriculumTopics, curriculumGradeFilter, curriculumSemesterFilter, curriculumSearch]);

  // Filtered Players dengan Search & Status
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (playerSearchQuery.trim()) {
        const q = playerSearchQuery.toLowerCase();
        if (!p.nickname.toLowerCase().includes(q) && !p.grade.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (playerStatusFilter === 'active' && p.is_suspended) return false;
      if (playerStatusFilter === 'suspended' && !p.is_suspended) return false;
      if (playerGradeFilter !== 'all' && p.grade !== playerGradeFilter) return false;
      return true;
    });
  }, [players, playerSearchQuery, playerStatusFilter, playerGradeFilter]);

  // Statistik Distribusi per Jenjang
  const levelStats = useMemo(() => {
    return EDUCATION_LEVELS.map((lvl) => {
      const list = questions.filter((q) => q.education_level === lvl.code);
      const active = list.filter((q) => q.status === 'active').length;
      const draft = list.filter((q) => q.status === 'draft').length;
      return {
        ...lvl,
        total: list.length,
        active,
        draft,
      };
    });
  }, [questions]);

  // Helper Template JSON v1.0
  const loadSampleJson = () => {
    setImportJsonText(
      JSON.stringify(
        {
          schema_version: '1.0',
          subject: 'mathematics',
          education_level: 'SD_1',
          semester: 1,
          topic: 'addition',
          difficulty: 2,
          questions: [
            {
              question_id: 'MATH-SD1-S1-0021',
              type: 'multiple_choice',
              question: 'Berapakah hasil dari 7 + 6?',
              visual: null,
              options: [
                { id: 'A', text: '11' },
                { id: 'B', text: '12' },
                { id: 'C', text: '13' },
                { id: 'D', text: '14' },
              ],
              correct_answer: 'C',
              explanation: 'Tujuh ditambah enam sama dengan tiga belas.',
              tags: ['addition', 'basic-math'],
            },
          ],
        },
        null,
        2
      )
    );
  };

  // JIKA BELUM LOGIN: MODAL LOGIN ADMIN BERSIH
  if (!admin) {
    return createPortal(
      <div
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            padding: '32px',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🎓</div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 900, color: '#1E293B' }}>
              Portal Admin & Guru
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '4px' }}>
              Area pengelolaan kurikulum, verifikasi bank soal JSON, dan bantuan akun anak.
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
            💡 <strong>Kredensial Default Bootstrap:</strong> Masukkan PIN <code style={{ fontWeight: 800, padding: '2px 6px', backgroundColor: '#FEF08A', borderRadius: '4px' }}>123456</code>.
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
      </div>,
      document.body
    );
  }

  // TAMPILAN DASHBOARD PC RESMI DENGAN MENU DI SISI KIRI (SIDEBAR LAYOUT)
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ========================================================
          SISI KIRI: SIDEBAR NAVIGASI DESKTOP (WIDTH: 260px)
          ======================================================== */}
      {/* ========================================================
          SISI KIRI: SIDEBAR NAVIGASI DESKTOP RESMI (WIDTH: 270px)
          ======================================================== */}
      <aside
        style={{
          width: '270px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          zIndex: 20,
          boxShadow: '1px 0 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        {/* Brand Header Sidebar */}
        <div
          style={{
            padding: '20px 18px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 900,
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.25)',
              flexShrink: 0,
            }}
          >
            🎓
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 900, color: '#1E293B', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              KidsGo! Admin
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                PC Dashboard
              </span>
              <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>v1.0</span>
            </div>
          </div>
        </div>

        {/* Menu Navigasi Sisi Kiri (Scrollable jika layar pendek) */}
        <nav
          style={{
            flex: 1,
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            overflowY: 'auto',
          }}
        >
          {/* GRUP 1: UTAMA */}
          <div
            style={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              color: '#94A3B8',
              padding: '8px 12px 4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Ringkasan & Analitik
          </div>

          {/* Menu 1: Ringkasan / Overview */}
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: activeTab === 'overview' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'overview' ? '#1D4ED8' : '#475569',
              border: 'none',
              borderLeft: activeTab === 'overview' ? '4px solid #2563EB' : '4px solid transparent',
              fontWeight: activeTab === 'overview' ? 800 : 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>📊</span>
              <span>Ringkasan</span>
            </div>
            {activeTab === 'overview' && (
              <span style={{ fontSize: '0.6875rem', color: '#2563EB', fontWeight: 800 }}>●</span>
            )}
          </button>

          {/* Menu 2: Papan Peringkat / Leaderboard */}
          <button
            onClick={() => setActiveTab('leaderboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: activeTab === 'leaderboard' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'leaderboard' ? '#1D4ED8' : '#475569',
              border: 'none',
              borderLeft: activeTab === 'leaderboard' ? '4px solid #2563EB' : '4px solid transparent',
              fontWeight: activeTab === 'leaderboard' ? 800 : 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>🏆</span>
              <span>Leaderboard XP</span>
            </div>
            <span
              style={{
                fontSize: '0.6875rem',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: activeTab === 'leaderboard' ? '#DBEAFE' : '#FEF3C7',
                color: activeTab === 'leaderboard' ? '#1E40AF' : '#B45309',
                fontWeight: 700,
              }}
            >
              XP Murid
            </span>
          </button>

          {/* GRUP 2: KURIKULUM & SOAL */}
          <div
            style={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              color: '#94A3B8',
              padding: '16px 12px 4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Kurikulum & Soal
          </div>

          {/* Menu 3: Jalur & Kurikulum */}
          <button
            onClick={() => setActiveTab('curriculum')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: activeTab === 'curriculum' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'curriculum' ? '#1D4ED8' : '#475569',
              border: 'none',
              borderLeft: activeTab === 'curriculum' ? '4px solid #2563EB' : '4px solid transparent',
              fontWeight: activeTab === 'curriculum' ? 800 : 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>🗺️</span>
              <span>Jalur & Kurikulum</span>
            </div>
            <span
              style={{
                fontSize: '0.6875rem',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: activeTab === 'curriculum' ? '#DBEAFE' : '#F1F5F9',
                color: activeTab === 'curriculum' ? '#1E40AF' : '#64748B',
                fontWeight: 700,
              }}
            >
              {stats.totalCurriculumTopics} Topik
            </span>
          </button>

          {/* Menu 4: Bank Soal */}
          <button
            onClick={() => setActiveTab('questions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: activeTab === 'questions' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'questions' ? '#1D4ED8' : '#475569',
              border: 'none',
              borderLeft: activeTab === 'questions' ? '4px solid #2563EB' : '4px solid transparent',
              fontWeight: activeTab === 'questions' ? 800 : 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>📚</span>
              <span>Bank Soal</span>
            </div>
            <span
              style={{
                fontSize: '0.6875rem',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: activeTab === 'questions' ? '#DBEAFE' : '#F1F5F9',
                color: activeTab === 'questions' ? '#1E40AF' : '#64748B',
                fontWeight: 700,
              }}
            >
              {stats.total}
            </span>
          </button>

          {/* Menu 4: Impor JSON Soal (v1.0) */}
          <button
            onClick={() => setActiveTab('import')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: activeTab === 'import' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'import' ? '#1D4ED8' : '#475569',
              border: 'none',
              borderLeft: activeTab === 'import' ? '4px solid #2563EB' : '4px solid transparent',
              fontWeight: activeTab === 'import' ? 800 : 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>📥</span>
              <span>Impor JSON (v1.0)</span>
            </div>
            <span
              style={{
                fontSize: '0.6875rem',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                fontWeight: 800,
              }}
            >
              AI Bank
            </span>
          </button>

          {/* GRUP 3: PENGGUNA */}
          <div
            style={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              color: '#94A3B8',
              padding: '16px 12px 4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Pengguna & Akun
          </div>

          {/* Menu 5: Data Murid */}
          <button
            onClick={() => setActiveTab('players')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: activeTab === 'players' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'players' ? '#1D4ED8' : '#475569',
              border: 'none',
              borderLeft: activeTab === 'players' ? '4px solid #2563EB' : '4px solid transparent',
              fontWeight: activeTab === 'players' ? 800 : 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>👥</span>
              <span>Data Murid & PIN</span>
            </div>
            <span
              style={{
                fontSize: '0.6875rem',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: activeTab === 'players' ? '#DBEAFE' : '#F1F5F9',
                color: activeTab === 'players' ? '#1E40AF' : '#64748B',
                fontWeight: 700,
              }}
            >
              {stats.playersCount}
            </span>
          </button>

          {/* GRUP 4: SISTEM */}
          <div
            style={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              color: '#94A3B8',
              padding: '16px 12px 4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Sistem & Keamanan
          </div>

          {/* Menu 6: Keamanan PIN Admin */}
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: activeTab === 'settings' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'settings' ? '#1D4ED8' : '#475569',
              border: 'none',
              borderLeft: activeTab === 'settings' ? '4px solid #2563EB' : '4px solid transparent',
              fontWeight: activeTab === 'settings' ? 800 : 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>🔒</span>
              <span>Keamanan PIN</span>
            </div>
            {admin.is_default_pin ? (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#EF4444',
                  boxShadow: '0 0 0 3px #FEE2E2',
                }}
                title="Wajib ganti PIN default 123456"
              />
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 800 }}>✓</span>
            )}
          </button>

          {/* Pemisah Menu Aksi Cepat */}
          <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '14px 6px 10px' }} />

          <div
            style={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              color: '#94A3B8',
              padding: '0 12px 6px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Aksi Cepat
          </div>

          <button
            onClick={handleExportJson}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#334155',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.1s ease',
            }}
          >
            <span>📥</span>
            <span>Ekspor Bank Soal</span>
          </button>

          <button
            onClick={() => {
              fetchQuestions();
              fetchPlayers();
              fetchLeaderboard();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#334155',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.1s ease',
            }}
          >
            <span>🔄</span>
            <span>Refresh Semua Data</span>
          </button>
        </nav>

        {/* Footer Sidebar: User Profile & Quick Actions */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#DBEAFE',
                color: '#1D4ED8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: 800,
              }}
            >
              👤
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {admin.username}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A' }} /> Online (Superadmin)
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              width: '100%',
              transition: 'background-color 0.1s ease',
            }}
            title="Kembali ke tampilan aplikasi anak"
          >
            🎒 Mode Belajar Anak (Mobile)
          </button>

          <button
            onClick={handleAdminLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: '#B91C1C',
              cursor: 'pointer',
              width: '100%',
              transition: 'background-color 0.1s ease',
            }}
          >
            Keluar Admin 🚪
          </button>
        </div>
      </aside>

      {/* ========================================================
          SISI KANAN: KONTEN UTAMA DESKTOP FULL AREA
          ======================================================== */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#F8FAFC',
        }}
      >
        {/* Top Breadcrumb & Quick Action Header */}
        <header
          style={{
            padding: '16px 32px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>KidsGo! Portal</span>
              <span>/</span>
              <span style={{ color: '#2563EB', fontWeight: 700 }}>
                {activeTab === 'overview' && 'Ringkasan & Analitik'}
                {activeTab === 'curriculum' && 'Jalur & Kurikulum'}
                {activeTab === 'questions' && 'Bank Soal Matematika'}
                {activeTab === 'import' && 'Impor JSON Soal (v1.0)'}
                {activeTab === 'players' && 'Data Murid & Bantuan PIN'}
                {activeTab === 'leaderboard' && 'Papan Peringkat (Leaderboard)'}
                {activeTab === 'settings' && 'Pengaturan Keamanan'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1E293B', marginTop: '2px' }}>
              {activeTab === 'overview' && 'Ringkasan Platform & Kurikulum KidsGo!'}
              {activeTab === 'curriculum' && 'Jalur Petualangan & Manajemen Kurikulum'}
              {activeTab === 'questions' && 'Manajemen Bank Soal Matematika'}
              {activeTab === 'import' && 'Impor Berkas Bank Soal JSON (v1.0)'}
              {activeTab === 'players' && 'Pengelolaan Akun Murid & Bantuan PIN'}
              {activeTab === 'leaderboard' && 'Papan Peringkat Belajar (Leaderboard)'}
              {activeTab === 'settings' && 'Pengaturan Keamanan & PIN Admin'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => {
                fetchQuestions();
                fetchPlayers();
                fetchLeaderboard();
                fetchCurriculum();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
              }}
              title="Refresh semua data"
            >
              🔄 Refresh Data
            </button>
          </div>
        </header>

        {/* Warning Banner PIN Default */}
        {admin.is_default_pin && (
          <div
            style={{
              backgroundColor: '#FEF3C7',
              borderBottom: '1px solid #FCD34D',
              padding: '10px 32px',
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

        {/* Scrollable Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {/* ========================================================
              TAB 0: RINGKASAN / OVERVIEW DASHBOARD
              ======================================================== */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* 4 Kartu Metrik Utama */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveTab('questions')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 700 }}>Total Soal Tersimpan</span>
                    <span style={{ fontSize: '1.25rem' }}>📚</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1E293B', marginTop: '6px' }}>
                    {stats.total} Soal
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#2563EB', marginTop: '4px', fontWeight: 600 }}>
                    Kurikulum Matematika TK & SD →
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setStatusFilter('active');
                    setActiveTab('questions');
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 700 }}>Soal Aktif di Game</span>
                    <span style={{ fontSize: '1.25rem' }}>🚀</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#16A34A', marginTop: '6px' }}>
                    {stats.active} Soal
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#16A34A', marginTop: '4px', fontWeight: 600 }}>
                    ✓ Siap dimainkan anak di game
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setStatusFilter('draft');
                    setActiveTab('questions');
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 700 }}>Soal Draft Menunggu Review</span>
                    <span style={{ fontSize: '1.25rem' }}>📝</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#D97706', marginTop: '6px' }}>
                    {stats.draft} Soal
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#D97706', marginTop: '4px', fontWeight: 600 }}>
                    Perlu persetujuan admin →
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveTab('players')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 700 }}>Total Murid Terdaftar</span>
                    <span style={{ fontSize: '1.25rem' }}>👥</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0284C7', marginTop: '6px' }}>
                    {stats.playersCount} Anak
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#0284C7', marginTop: '4px', fontWeight: 600 }}>
                    {stats.activePlayers} Aktif • {stats.suspendedPlayers} Ditangguhkan →
                  </div>
                </div>

                {/* Card Jalur & Kurikulum */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveTab('curriculum')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 700 }}>Jalur & Kurikulum</span>
                    <span style={{ fontSize: '1.25rem' }}>🗺️</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#7C3AED', marginTop: '6px' }}>
                    {stats.totalCurriculumTopics} Topik
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#7C3AED', marginTop: '4px', fontWeight: 600 }}>
                    {stats.totalCurriculumLevels} Level Petualangan →
                  </div>
                </div>
              </div>

              {/* Grid Distribusi Soal per Jenjang Pendidikan */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '24px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1E293B' }}>
                      Distribusi Bank Soal per Jenjang (TK A s/d SD 6)
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
                      Kurikulum Matematika KidsGo! mencakup 8 jenjang pendidikan dengan pembagian Semester 1 & 2.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('import')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      border: '1px solid #BFDBFE',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    ➕ Tambah Soal via JSON
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '14px',
                  }}
                >
                  {levelStats.map((lvl) => (
                    <div
                      key={lvl.code}
                      style={{
                        padding: '16px',
                        borderRadius: '10px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '4px' }}>
                            {lvl.code}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{lvl.age}</span>
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1E293B', marginTop: '8px' }}>
                          {lvl.name}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '0.75rem' }}>
                          <span style={{ color: '#15803D', fontWeight: 700 }}>
                            {lvl.active} Aktif
                          </span>
                          <span style={{ color: '#94A3B8' }}>•</span>
                          <span style={{ color: '#D97706', fontWeight: 700 }}>
                            {lvl.draft} Draft
                          </span>
                          <span style={{ color: '#94A3B8' }}>•</span>
                          <span style={{ color: '#475569' }}>
                            Total: <strong>{lvl.total}</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setLevelFilter(lvl.code);
                          setActiveTab('questions');
                        }}
                        style={{
                          marginTop: '12px',
                          padding: '6px 12px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#334155',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        Buka Soal Jenjang Ini ➔
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panduan Alur Bank Soal AI Eksternal (Sesuai AGENTS.md Section 6 & 17) */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '24px',
                }}
              >
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1E293B' }}>
                  Alur Workflow Bank Soal & AI Eksternal
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px', lineHeight: 1.5 }}>
                  KidsGo! adalah aplikasi belajar anak dan game engine independen. Pembuatan soal dilakukan secara eksternal (menggunakan ChatGPT/Gemini) lalu diimpor melalui format JSON terstandarisasi untuk menjamin validitas pedagogis, keamanan anak, dan performa tanpa biaya pemanggilan API AI di aplikasi.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    marginTop: '16px',
                  }}
                >
                  <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>1. 📥</div>
                    <strong style={{ fontSize: '0.875rem', color: '#1E293B', display: 'block' }}>Ekspor Referensi</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Ekspor soal eksisting dari KidsGo! sebagai prompt panduan schema AI.</span>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>2. 🤖</div>
                    <strong style={{ fontSize: '0.875rem', color: '#1E293B', display: 'block' }}>Generasi di Luar</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Admin meminta ChatGPT / Gemini membuat soal mengikuti schema v1.0.</span>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>3. 🔍</div>
                    <strong style={{ fontSize: '0.875rem', color: '#1E293B', display: 'block' }}>Validasi Otomatis</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Sistem KidsGo! memverifikasi keutuhan JSON, ID duplikat, dan opsi kunci.</span>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>4. 🚀</div>
                    <strong style={{ fontSize: '0.875rem', color: '#1E293B', display: 'block' }}>Aktivasi ke Game</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Admin menyetujui soal (status Approved) lalu mengaktifkannya (Active).</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB: JALUR PETUALANGAN & KURIKULUM (TOPIK & LEVEL)
              ======================================================== */}
          {activeTab === 'curriculum' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 1. Header Toolbar */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '20px 24px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Jalur Petualangan & Kurikulum
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#EDE9FE', color: '#6D28D9' }}>
                      {curriculumTopics.length} Topik
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>
                      {curriculumTopics.reduce((acc, t) => acc + (t.levels?.length || 0), 0)} Level
                    </span>
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '4px' }}>
                    Kelola topik pembelajaran, nomor urut semester, dan level petualangan anak. Soal pada Bank Soal dapat dihubungkan ke level ini.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingTopic(null);
                    setTopicForm({
                      name: '',
                      education_level: curriculumGradeFilter !== 'all' ? curriculumGradeFilter : 'SD_1',
                      semester: curriculumSemesterFilter !== 'all' ? (Number(curriculumSemesterFilter) as 1 | 2) : 1,
                      order_index: curriculumTopics.length + 1,
                    });
                    setIsTopicModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    backgroundColor: '#2563EB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                  }}
                >
                  <span>+</span> Tambah Topik Baru
                </button>
              </div>

              {/* Notifikasi Pesan */}
              {curriculumMsg && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: curriculumMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                    color: curriculumMsg.type === 'success' ? '#15803D' : '#991B1B',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                  }}
                >
                  {curriculumMsg.text}
                </div>
              )}

              {/* Filter & Pencarian Toolbar */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                  <input
                    type="text"
                    value={curriculumSearch}
                    onChange={(e) => setCurriculumSearch(e.target.value)}
                    placeholder="🔍 Cari nama topik atau level petualangan..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                  {curriculumSearch && (
                    <button
                      onClick={() => setCurriculumSearch('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569' }}>Jenjang:</label>
                  <select
                    value={curriculumGradeFilter}
                    onChange={(e) => setCurriculumGradeFilter(e.target.value)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFFFFF',
                      fontWeight: 600,
                      color: '#1E293B',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">Semua Jenjang</option>
                    {EDUCATION_LEVELS.map((lvl) => (
                      <option key={lvl.code} value={lvl.code}>
                        {lvl.name} ({lvl.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569' }}>Semester:</label>
                  <select
                    value={curriculumSemesterFilter}
                    onChange={(e) => setCurriculumSemesterFilter(e.target.value)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFFFFF',
                      fontWeight: 600,
                      color: '#1E293B',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">Semua Semester</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>
              </div>

              {/* Daftar Topik & Level */}
              {isLoadingCurriculum ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
                  <div>Memuat kurikulum dan jalur level...</div>
                </div>
              ) : filteredCurriculumTopics.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '50px 20px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    textAlign: 'center',
                    color: '#64748B',
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🗺️</div>
                  <div style={{ fontWeight: 800, fontSize: '1.125rem', color: '#1E293B' }}>Tidak ada topik yang ditemukan</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '6px', maxWidth: '420px', margin: '6px auto 16px' }}>
                    Belum ada topik yang sesuai dengan filter atau kata kunci pencarian.
                  </div>
                  <button
                    onClick={() => {
                      setEditingTopic(null);
                      setTopicForm({
                        name: '',
                        education_level: 'SD_1',
                        semester: 1,
                        order_index: 1,
                      });
                      setIsTopicModalOpen(true);
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#2563EB',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Buat Topik Pertama
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredCurriculumTopics.map((topic) => (
                    <div
                      key={topic.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      {/* Topik Header */}
                      <div
                        style={{
                          padding: '18px 22px',
                          borderBottom: '1px solid #F1F5F9',
                          backgroundColor: '#F8FAFC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#EFF6FF',
                                color: '#1D4ED8',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                              }}
                            >
                              {topic.education_level.replace('_', ' ')}
                            </span>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#F1F5F9',
                                color: '#475569',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              Semester {topic.semester}
                            </span>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#FEF3C7',
                                color: '#B45309',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              Urutan #{topic.order_index}
                            </span>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#DCFCE7',
                                color: '#15803D',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              {topic.levels?.length || 0} Level Petualangan
                            </span>
                          </div>
                          <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                            {topic.name}
                          </h4>
                          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px', fontFamily: 'monospace' }}>
                            ID: {topic.id}
                          </div>
                        </div>

                        {/* Aksi Topik */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setParentTopicForLevel(topic);
                              setEditingLevel(null);
                              setLevelForm({
                                name: '',
                                level_number: (topic.levels?.length || 0) + 1,
                                required_xp: 50,
                                passing_score: 100,
                              });
                              setIsLevelModalOpen(true);
                            }}
                            style={{
                              padding: '8px 14px',
                              backgroundColor: '#ECFDF5',
                              border: '1px solid #A7F3D0',
                              color: '#065F46',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>+</span> Tambah Level
                          </button>
                          <button
                            onClick={() => {
                              setEditingTopic(topic);
                              setTopicForm({
                                name: topic.name,
                                education_level: topic.education_level,
                                semester: topic.semester as 1 | 2,
                                order_index: topic.order_index,
                              });
                              setIsTopicModalOpen(true);
                            }}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              color: '#334155',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Edit ✏️
                          </button>
                          <button
                            onClick={() => {
                              setCurriculumDeleteItem({
                                type: 'topic',
                                id: topic.id,
                                name: topic.name,
                              });
                            }}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FECACA',
                              color: '#DC2626',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Hapus 🗑️
                          </button>
                        </div>
                      </div>

                      {/* Tabel Level di Dalam Topik */}
                      <div style={{ padding: '16px 20px' }}>
                        {!topic.levels || topic.levels.length === 0 ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem' }}>
                            Belum ada level pada topik ini. Klik <strong>"+ Tambah Level"</strong> untuk membuat level pertama.
                          </div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                            <thead>
                              <tr style={{ color: '#64748B', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                                <th style={{ padding: '8px 12px', fontWeight: 700, width: '80px' }}>LEVEL KE-</th>
                                <th style={{ padding: '8px 12px', fontWeight: 700 }}>NAMA LEVEL</th>
                                <th style={{ padding: '8px 12px', fontWeight: 700 }}>TARGET XP</th>
                                <th style={{ padding: '8px 12px', fontWeight: 700 }}>SOAL DI BANK</th>
                                <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>AKSI</th>
                              </tr>
                            </thead>
                            <tbody>
                              {topic.levels.map((lvl) => (
                                <tr key={lvl.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                  <td style={{ padding: '10px 12px' }}>
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        backgroundColor: '#EFF6FF',
                                        color: '#1D4ED8',
                                        fontWeight: 800,
                                        fontSize: '0.75rem',
                                      }}
                                    >
                                      {lvl.level_number}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1E293B' }}>
                                    {lvl.name}
                                  </td>
                                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#D97706' }}>
                                    ⭐ {lvl.required_xp} XP
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <span
                                      style={{
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        backgroundColor: lvl.total_questions > 0 ? '#DCFCE7' : '#FEF3C7',
                                        color: lvl.total_questions > 0 ? '#15803D' : '#B45309',
                                      }}
                                    >
                                      📝 {lvl.total_questions} Soal
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                      <button
                                        onClick={() => {
                                          setParentTopicForLevel(topic);
                                          setEditingLevel(lvl);
                                          setLevelForm({
                                            name: lvl.name,
                                            level_number: lvl.level_number,
                                            required_xp: lvl.required_xp,
                                            passing_score: lvl.passing_score,
                                          });
                                          setIsLevelModalOpen(true);
                                        }}
                                        style={{
                                          padding: '4px 8px',
                                          backgroundColor: '#F8FAFC',
                                          border: '1px solid #CBD5E1',
                                          borderRadius: '4px',
                                          fontSize: '0.6875rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Edit ✏️
                                      </button>
                                      <button
                                        onClick={() => {
                                          setCurriculumDeleteItem({
                                            type: 'level',
                                            id: lvl.id,
                                            name: lvl.name,
                                            topicId: topic.id,
                                          });
                                        }}
                                        style={{
                                          padding: '4px 8px',
                                          backgroundColor: '#FEF2F2',
                                          border: '1px solid #FECACA',
                                          color: '#DC2626',
                                          borderRadius: '4px',
                                          fontSize: '0.6875rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Hapus 🗑️
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Modal Dialog Tambah / Edit Topik */}
              {isTopicModalOpen && (
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
                      maxWidth: '460px',
                      padding: '24px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                      {editingTopic ? 'Edit Topik Kurikulum' : 'Tambah Topik Kurikulum Baru'}
                    </h3>

                    <form onSubmit={handleSaveTopic} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                          Nama Topik Pembelajaran:
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Operasi Hitung Perkalian Dasar"
                          value={topicForm.name}
                          onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                          autoFocus
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            fontSize: '0.875rem',
                            borderRadius: '8px',
                            border: '1.5px solid #CBD5E1',
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                            Jenjang Kelas:
                          </label>
                          <select
                            value={topicForm.education_level}
                            onChange={(e) => setTopicForm({ ...topicForm, education_level: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              fontSize: '0.875rem',
                              borderRadius: '8px',
                              border: '1.5px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                            }}
                          >
                            {EDUCATION_LEVELS.map((lvl) => (
                              <option key={lvl.code} value={lvl.code}>
                                {lvl.name} ({lvl.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                            Semester:
                          </label>
                          <select
                            value={topicForm.semester}
                            onChange={(e) => setTopicForm({ ...topicForm, semester: Number(e.target.value) as 1 | 2 })}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              fontSize: '0.875rem',
                              borderRadius: '8px',
                              border: '1.5px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                            }}
                          >
                            <option value={1}>Semester 1</option>
                            <option value={2}>Semester 2</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                          Nomor Urutan Topik:
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={topicForm.order_index}
                          onChange={(e) => setTopicForm({ ...topicForm, order_index: Number(e.target.value) })}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            fontSize: '0.875rem',
                            borderRadius: '8px',
                            border: '1.5px solid #CBD5E1',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsTopicModalOpen(false);
                            setEditingTopic(null);
                          }}
                          disabled={isSavingCurriculum}
                          style={{
                            flex: 1,
                            padding: '10px',
                            backgroundColor: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#475569',
                          }}
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingCurriculum || !topicForm.name.trim()}
                          style={{
                            flex: 1.2,
                            padding: '10px',
                            backgroundColor: '#2563EB',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {isSavingCurriculum ? 'Menyimpan...' : 'Simpan Topik'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Modal Dialog Tambah / Edit Level */}
              {isLevelModalOpen && (
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
                      maxWidth: '460px',
                      padding: '24px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                        {editingLevel ? 'Edit Level Petualangan' : 'Tambah Level Petualangan Baru'}
                      </h3>
                      {parentTopicForLevel && (
                        <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '4px 0 0' }}>
                          Topik: <strong>{parentTopicForLevel.name}</strong> ({parentTopicForLevel.education_level.replace('_', ' ')} - Sem {parentTopicForLevel.semester})
                        </p>
                      )}
                    </div>

                    <form onSubmit={handleSaveLevel} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                            Level Ke:
                          </label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={levelForm.level_number}
                            onChange={(e) => setLevelForm({ ...levelForm, level_number: Number(e.target.value) })}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              fontSize: '0.875rem',
                              borderRadius: '8px',
                              border: '1.5px solid #CBD5E1',
                              textAlign: 'center',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                            Nama Level Petualangan:
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Mengalikan Bilangan 1-5"
                            value={levelForm.name}
                            onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              fontSize: '0.875rem',
                              borderRadius: '8px',
                              border: '1.5px solid #CBD5E1',
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                            Target XP Kelulusan:
                          </label>
                          <input
                            type="number"
                            min={10}
                            max={500}
                            required
                            value={levelForm.required_xp}
                            onChange={(e) => setLevelForm({ ...levelForm, required_xp: Number(e.target.value) })}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              fontSize: '0.875rem',
                              borderRadius: '8px',
                              border: '1.5px solid #CBD5E1',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                            Passing Score (%):
                          </label>
                          <input
                            type="number"
                            min={50}
                            max={100}
                            required
                            value={levelForm.passing_score}
                            onChange={(e) => setLevelForm({ ...levelForm, passing_score: Number(e.target.value) })}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              fontSize: '0.875rem',
                              borderRadius: '8px',
                              border: '1.5px solid #CBD5E1',
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsLevelModalOpen(false);
                            setEditingLevel(null);
                          }}
                          disabled={isSavingCurriculum}
                          style={{
                            flex: 1,
                            padding: '10px',
                            backgroundColor: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#475569',
                          }}
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingCurriculum || !levelForm.name.trim()}
                          style={{
                            flex: 1.2,
                            padding: '10px',
                            backgroundColor: '#16A34A',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {isSavingCurriculum ? 'Menyimpan...' : 'Simpan Level'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Modal Konfirmasi Hapus (Topik / Level) */}
              {curriculumDeleteItem && (
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
                      maxWidth: '440px',
                      padding: '24px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          backgroundColor: '#FEE2E2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          flexShrink: 0,
                        }}
                      >
                        🗑️
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                          Hapus {curriculumDeleteItem.type === 'topic' ? 'Topik' : 'Level'}?
                        </h3>
                        <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '2px 0 0' }}>
                          <strong>{curriculumDeleteItem.name}</strong>
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#FEF2F2',
                        borderRadius: '8px',
                        border: '1px solid #FECACA',
                        fontSize: '0.8125rem',
                        color: '#991B1B',
                        lineHeight: 1.5,
                      }}
                    >
                      {curriculumDeleteItem.type === 'topic' ? (
                        <>
                          Peringatan: Menghapus topik ini juga akan menghapus <strong>seluruh level di bawahnya</strong>. Soal-soal yang ada di Bank Soal akan tetap aman namun keterkaitan topik dan levelnya akan diatur ulang menjadi kosong.
                        </>
                      ) : (
                        <>
                          Peringatan: Level ini akan dihapus dari peta jalur petualangan. Soal yang terhubung dengan level ini akan dilepaskan (level_id diset null).
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setCurriculumDeleteItem(null)}
                        disabled={isSavingCurriculum}
                        style={{
                          flex: 1,
                          padding: '10px',
                          backgroundColor: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          color: '#475569',
                        }}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteCurriculumItem}
                        disabled={isSavingCurriculum}
                        style={{
                          flex: 1.2,
                          padding: '10px',
                          backgroundColor: '#DC2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        {isSavingCurriculum ? 'Menghapus...' : 'Ya, Hapus'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 1: BANK SOAL & KURIKULUM
              ======================================================== */}
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
                      placeholder="🔍 Cari teks soal, ID, atau penjelasan..."
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
                    📥 Ekspor JSON
                  </button>
                  <button
                    onClick={() => setActiveTab('import')}
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
                    ➕ Impor JSON Soal
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
                          Tidak ada soal yang ditemukan untuk filter ini. Klik <strong>"➕ Impor JSON Soal"</strong> untuk menambahkan soal baru.
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

          {/* ========================================================
              TAB 2: IMPOR & UJI VALIDASI JSON (v1.0)
              ======================================================== */}
          {activeTab === 'import' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '960px' }}>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1E293B' }}>
                      Workspace Impor Bank Soal JSON (v1.0)
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '4px', lineHeight: 1.5 }}>
                      Tempel berkas JSON yang telah digenerasi dari ChatGPT atau Gemini. Sistem KidsGo! akan memeriksa integritas schema JSON, keunikan ID soal, serta validitas opsi kunci jawaban sebelum disimpan ke database dengan status <strong>draft</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadSampleJson}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#2563EB',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    📋 Muat Contoh JSON v1.0
                  </button>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '8px' }}>
                    Editor JSON Bank Soal:
                  </label>
                  <textarea
                    rows={14}
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    placeholder={`{\n  "schema_version": "1.0",\n  "subject": "mathematics",\n  "education_level": "SD_1",\n  "semester": 1,\n  "topic": "addition",\n  "difficulty": 1,\n  "questions": [\n    {\n      "question_id": "MATH-SD1-S1-0021",\n      "type": "multiple_choice",\n      "question": "Berapakah 5 + 5?",\n      "options": [\n        { "id": "A", "text": "9" },\n        { "id": "B", "text": "10" },\n        { "id": "C", "text": "11" }\n      ],\n      "correct_answer": "B",\n      "explanation": "Lima ditambah lima sama dengan sepuluh.",\n      "tags": ["addition"]\n    }\n  ]\n}`}
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontFamily: 'monospace',
                      fontSize: '0.8125rem',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      backgroundColor: '#0F172A',
                      color: '#F8FAFC',
                      lineHeight: 1.5,
                      outline: 'none',
                    }}
                  />
                </div>

                {importStatus && (
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: importStatus.startsWith('✅') ? '#DCFCE7' : '#FEE2E2',
                      color: importStatus.startsWith('✅') ? '#15803D' : '#991B1B',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                    }}
                  >
                    {importStatus}
                  </div>
                )}

                {validationReport && (
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '16px',
                      borderRadius: '8px',
                      backgroundColor: validationReport.is_valid ? '#DCFCE7' : '#FEE2E2',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <strong style={{ color: validationReport.is_valid ? '#15803D' : '#991B1B', fontSize: '0.875rem' }}>
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

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleValidateJson}
                    disabled={!importJsonText.trim()}
                    style={{
                      padding: '10px 18px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: '#334155',
                      cursor: importJsonText.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    🔍 Uji Validasi Schema JSON
                  </button>

                  <button
                    type="button"
                    onClick={handleImportJson}
                    disabled={!validationReport?.is_valid}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: validationReport?.is_valid ? '#2563EB' : '#94A3B8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                      cursor: validationReport?.is_valid ? 'pointer' : 'not-allowed',
                      boxShadow: validationReport?.is_valid ? '0 2px 4px rgba(37, 99, 235, 0.25)' : 'none',
                    }}
                  >
                    💾 Simpan ke Bank Soal (Draft)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: DATA MURID & RESET PIN
              ======================================================== */}
          {activeTab === 'players' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '20px 24px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Daftar Murid Terdaftar ({players.length})
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#DCFCE7', color: '#15803D' }}>
                      {stats.activePlayers} Aktif
                    </span>
                    {stats.suspendedPlayers > 0 && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
                        {stats.suspendedPlayers} Ditangguhkan
                      </span>
                    )}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '4px' }}>
                    Kelola data murid, tangguhkan akun (suspend) untuk keamanan atau pembatasan akses, serta reset PIN 4-digit secara instan.
                  </p>
                </div>
              </div>

              {/* Toolbar Pencarian & Filter Status Akun */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Kotak Pencarian */}
                <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                  <input
                    type="text"
                    value={playerSearchQuery}
                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                    placeholder="🔍 Cari nickname atau kelas..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                  {playerSearchQuery && (
                    <button
                      onClick={() => setPlayerSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Status Akun */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569' }}>Status:</label>
                  <select
                    value={playerStatusFilter}
                    onChange={(e) => setPlayerStatusFilter(e.target.value as 'all' | 'active' | 'suspended')}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFFFFF',
                      fontWeight: 600,
                      color: '#1E293B',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">Semua Status ({players.length})</option>
                    <option value="active">✓ Hanya Aktif ({stats.activePlayers})</option>
                    <option value="suspended">🚫 Hanya Ditangguhkan ({stats.suspendedPlayers})</option>
                  </select>
                </div>

                {/* Filter Jenjang Kelas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569' }}>Kelas:</label>
                  <select
                    value={playerGradeFilter}
                    onChange={(e) => setPlayerGradeFilter(e.target.value)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFFFFF',
                      fontWeight: 600,
                      color: '#1E293B',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">Semua Jenjang</option>
                    {EDUCATION_LEVELS.map((lvl) => (
                      <option key={lvl.code} value={lvl.code}>
                        {lvl.name} ({lvl.code})
                      </option>
                    ))}
                  </select>
                </div>
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
                      <th style={{ padding: '12px 18px', fontWeight: 800 }}>STATUS AKUN</th>
                      <th style={{ padding: '12px 18px', fontWeight: 800 }}>TANGGAL MENDAFTAR</th>
                      <th style={{ padding: '12px 18px', fontWeight: 800, textAlign: 'right' }}>AKSI KELOLA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
                          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
                          <div style={{ fontWeight: 700, color: '#1E293B' }}>Tidak ada murid yang ditemukan</div>
                          <div style={{ fontSize: '0.8125rem', marginTop: '4px' }}>
                            Coba ubah kata kunci pencarian atau sesuaikan filter status dan jenjang.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPlayers.map((p) => {
                        const isSuspended = !!p.is_suspended;
                        return (
                          <tr
                            key={p.id}
                            style={{
                              borderBottom: '1px solid #F1F5F9',
                              backgroundColor: isSuspended ? '#FFF5F5' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.5rem', filter: isSuspended ? 'grayscale(0.8)' : 'none' }}>
                                  {p.avatar}
                                </span>
                                <div>
                                  <span
                                    style={{
                                      fontWeight: 800,
                                      color: isSuspended ? '#991B1B' : '#1E293B',
                                      textDecoration: isSuspended ? 'line-through' : 'none',
                                    }}
                                  >
                                    {p.nickname}
                                  </span>
                                  {isSuspended && (
                                    <div style={{ fontSize: '0.6875rem', color: '#DC2626', fontWeight: 600 }}>
                                      Akses Dinonaktifkan
                                    </div>
                                  )}
                                </div>
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
                            <td style={{ padding: '14px 18px' }}>
                              {isSuspended ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    backgroundColor: '#FEE2E2',
                                    color: '#B91C1C',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    border: '1px solid #FECACA',
                                  }}
                                >
                                  🚫 Ditangguhkan
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    backgroundColor: '#DCFCE7',
                                    color: '#15803D',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    border: '1px solid #BBF7D0',
                                  }}
                                >
                                  ✓ Aktif
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '14px 18px', color: '#64748B', fontSize: '0.8125rem' }}>
                              {new Date(p.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                                <button
                                  onClick={() => {
                                    setSelectedPlayerForReset(p);
                                    setResetMessage(null);
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#EFF6FF',
                                    border: '1px solid #BFDBFE',
                                    color: '#2563EB',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                  title="Reset PIN murid jika lupa"
                                >
                                  Reset PIN 🔑
                                </button>
                                {isSuspended ? (
                                  <button
                                    onClick={() => {
                                      setSelectedPlayerForSuspend(p);
                                      setResetMessage(null);
                                    }}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#F0FDF4',
                                      border: '1px solid #BBF7D0',
                                      color: '#16A34A',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                    title="Aktifkan kembali akun murid"
                                  >
                                    Aktifkan 🟢
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedPlayerForSuspend(p);
                                      setResetMessage(null);
                                    }}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#FEF2F2',
                                      border: '1px solid #FECACA',
                                      color: '#DC2626',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                    title="Tangguhkan akun murid dan putus sesi aktif"
                                  >
                                    Suspend 🚫
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
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

              {/* Modal Dialog Konfirmasi Suspend / Unsuspend */}
              {selectedPlayerForSuspend && (
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
                      maxWidth: '440px',
                      padding: '24px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          backgroundColor: selectedPlayerForSuspend.is_suspended ? '#DCFCE7' : '#FEE2E2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          flexShrink: 0,
                        }}
                      >
                        {selectedPlayerForSuspend.is_suspended ? '🟢' : '🚫'}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                          {selectedPlayerForSuspend.is_suspended
                            ? `Aktifkan Kembali Akun Murid?`
                            : `Tangguhkan Akun Murid?`}
                        </h3>
                        <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '2px 0 0' }}>
                          Murid: <strong>{selectedPlayerForSuspend.nickname}</strong> {selectedPlayerForSuspend.avatar} ({selectedPlayerForSuspend.grade})
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '0.8125rem',
                        color: '#475569',
                        lineHeight: 1.5,
                      }}
                    >
                      {selectedPlayerForSuspend.is_suspended ? (
                        <>
                          Jika diaktifkan kembali, murid <strong>{selectedPlayerForSuspend.nickname}</strong> akan dapat login lagi menggunakan PIN miliknya, melanjutkan materi pelajaran, dan nilainya akan kembali ditampilkan di Papan Peringkat (Leaderboard).
                        </>
                      ) : (
                        <>
                          Jika ditangguhkan, murid <strong>{selectedPlayerForSuspend.nickname}</strong> tidak akan dapat masuk ke aplikasi. Seluruh sesi aktif murid akan langsung <strong>diputus (logout paksa)</strong> dan namanya disembunyikan sementara dari Papan Peringkat (Leaderboard).
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedPlayerForSuspend(null)}
                        disabled={isProcessingSuspend}
                        style={{
                          flex: 1,
                          padding: '10px',
                          backgroundColor: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          fontWeight: 700,
                          cursor: isProcessingSuspend ? 'not-allowed' : 'pointer',
                          color: '#475569',
                        }}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSuspend(selectedPlayerForSuspend)}
                        disabled={isProcessingSuspend}
                        style={{
                          flex: 1.2,
                          padding: '10px',
                          backgroundColor: selectedPlayerForSuspend.is_suspended ? '#16A34A' : '#DC2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 800,
                          cursor: isProcessingSuspend ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        {isProcessingSuspend ? (
                          'Memproses...'
                        ) : selectedPlayerForSuspend.is_suspended ? (
                          'Ya, Aktifkan Kembali'
                        ) : (
                          'Ya, Tangguhkan Akun'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 4: PAPAN PERINGKAT / LEADERBOARD
              ======================================================== */}
          {activeTab === 'leaderboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header Filter Leaderboard */}
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
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1E293B' }}>
                    Papan Peringkat Belajar Anak (Leaderboard)
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
                    Urutan dihitung dari perolehan XP sah pada buku besar ledger (AGENTS.md Section 10).
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {/* Period Filter */}
                  <select
                    value={leaderboardPeriod}
                    onChange={(e) => setLeaderboardPeriod(e.target.value as any)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="all">Sepanjang Waktu (All Time)</option>
                    <option value="weekly">Mingguan (Weekly)</option>
                    <option value="daily">Harian (Daily)</option>
                  </select>

                  {/* Grade Filter */}
                  <select
                    value={leaderboardGradeFilter}
                    onChange={(e) => setLeaderboardGradeFilter(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      backgroundColor: '#FFFFFF',
                    }}
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

              {/* Leaderboard Table */}
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
                      <th style={{ padding: '12px 18px', fontWeight: 800, width: '100px' }}>PERINGKAT</th>
                      <th style={{ padding: '12px 18px', fontWeight: 800 }}>NICKNAME & AVATAR</th>
                      <th style={{ padding: '12px 18px', fontWeight: 800 }}>JENJANG</th>
                      <th style={{ padding: '12px 18px', fontWeight: 800, textAlign: 'right' }}>TOTAL XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingLeaderboard ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                          Memuat data leaderboard...
                        </td>
                      </tr>
                    ) : leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                          Belum ada skor untuk periode ini.
                        </td>
                      </tr>
                    ) : (
                      leaderboard.map((item, index) => {
                        const rankNum = item.rank || index + 1;
                        const medal = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : null;

                        return (
                          <tr key={item.player_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '1rem' }}>
                                {medal && <span>{medal}</span>}
                                <span>#{rankNum}</span>
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.5rem' }}>{item.avatar}</span>
                                <span style={{ fontWeight: 800, color: '#1E293B' }}>{item.nickname}</span>
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{ padding: '4px 8px', backgroundColor: '#F1F5F9', borderRadius: '6px', fontWeight: 700 }}>
                                {item.grade}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 900, color: '#D97706', fontSize: '1rem' }}>
                              ⭐ {item.total_xp} XP
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Privacy Notice Card */}
              <div
                style={{
                  padding: '14px 18px',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '10px',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.8125rem',
                  color: '#1E40AF',
                  lineHeight: 1.5,
                }}
              >
                🔒 <strong>Privasi & Keamanan Anak:</strong> Sesuai dokumen panduan <code>AGENTS.md Section 8 & 10</code>, leaderboard hanya menampilkan avatar dan nama panggilan (nickname). Data pribadi anak, nama lengkap, atau PIN tidak pernah ditampilkan demi keamanan anak.
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 5: KEAMANAN & GANTI PIN ADMIN
              ======================================================== */}
          {activeTab === 'settings' && (
            <div
              style={{
                maxWidth: '560px',
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
                <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px', lineHeight: 1.5 }}>
                  PIN admin wajib berupa 6 digit angka dan tidak boleh menggunakan PIN default <code>123456</code>. Sesuai AGENTS.md Section 8, sistem menggunakan password hashing standar industri (Argon2 / bcrypt) dan anti brute-force lock.
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
                      letterSpacing: '0.15em',
                      fontSize: '1.1rem',
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
                      letterSpacing: '0.15em',
                      fontSize: '1.1rem',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={currentAdminPin.length < 6 || newAdminPin.length !== 6}
                  style={{
                    marginTop: '6px',
                    padding: '12px',
                    backgroundColor: currentAdminPin.length >= 6 && newAdminPin.length === 6 ? '#2563EB' : '#94A3B8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: currentAdminPin.length >= 6 && newAdminPin.length === 6 ? 'pointer' : 'not-allowed',
                  }}
                >
                  Simpan Perubahan PIN Admin
                </button>
              </form>

              {/* Status Sistem Keamanan */}
              <div
                style={{
                  marginTop: '10px',
                  padding: '14px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.75rem',
                  color: '#475569',
                  lineHeight: 1.6,
                }}
              >
                <div>🛡️ <strong>Sistem Perlindungan Akun:</strong></div>
                <div>• Proteksi Brute-force: Jeda kunci otomatis 1 menit setelah percobaan salah berulang.</div>
                <div>• Enkripsi PIN: Hash password satu arah (Argon2 / bcrypt) tanpa penyimpanan plaintext.</div>
                <div>• Manajemen Sesi: Cookie <code>HttpOnly</code> aman yang tidak dapat dibaca oleh JavaScript jahat.</div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL DESKTOP IMPOR SOAL JSON (Side-by-Side View) */}
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
