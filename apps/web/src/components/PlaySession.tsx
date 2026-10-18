import React, { useEffect, useState } from 'react';
import { ClientQuestion, ClientQuestionOption } from '@kidsgo/shared';

interface PlaySessionProps {
  levelId: string;
  onClose: () => void;
  onComplete: (earnedXp: number) => void;
}

interface ServerAnswerFeedback {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  xp_awarded: number;
  current_score: number;
  is_level_completed: boolean;
  next_question: (ClientQuestion & { index: number; total: number }) | null;
  progression: {
    next_level_unlocked: boolean;
    next_semester_unlocked: boolean;
    completion_bonus_xp: number;
    awarded_card?: {
      id: string;
      name: string;
      rarity: string;
      illustration: string;
    } | null;
    new_badges?: {
      id: string;
      name: string;
      icon: string;
    }[] | null;
  } | null;
}

export const PlaySession: React.FC<PlaySessionProps> = ({ levelId, onClose, onComplete }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [currentQ, setCurrentQ] = useState<(ClientQuestion & { index: number; total: number }) | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(3);

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<ServerAnswerFeedback | null>(null);
  const [earnedTotalXp, setEarnedTotalXp] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // 1. Mulai Sesi Bermain di Backend
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch('/api/game/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        levelId,
        questionCount: 3,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (!res.success) {
          throw new Error(res.message || 'Gagal memulai sesi belajar');
        }
        setSessionId(res.data.sessionId);
        setCurrentQ(res.data.currentQuestion);
        setTotalQuestions(res.data.totalQuestions);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [levelId]);

  const handleSelectOption = (optionId: string) => {
    if (isAnswered || isSubmitting) return;
    setSelectedAnswer(optionId);
  };

  // 2. Submit Jawaban ke Backend untuk Dinilai Server (Single Source of Truth)
  const handleCheckAnswer = async () => {
    if (!selectedAnswer || isAnswered || isSubmitting || !currentQ || !sessionId) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/game/session/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          questionId: currentQ.question_id,
          selectedAnswer,
        }),
      });

      const resData = await res.json();
      if (!resData.success) {
        throw new Error(resData.message || 'Gagal mengirim jawaban');
      }

      const data: ServerAnswerFeedback = resData.data;
      setFeedback(data);
      setIsAnswered(true);

      if (data.is_correct && data.xp_awarded > 0) {
        setEarnedTotalXp((prev) => prev + data.xp_awarded);
      }
      const bonusXp = data.progression?.completion_bonus_xp;
      if (bonusXp) {
        setEarnedTotalXp((prev) => prev + bonusXp);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan saat memeriksa jawaban');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Lanjut ke Soal Berikutnya atau Selesai
  const handleNext = () => {
    if (!feedback) return;

    if (feedback.is_level_completed || !feedback.next_question) {
      setIsFinished(true);
    } else {
      setCurrentQ(feedback.next_question);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setFeedback(null);
    }
  };

  // State: Loading
  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'var(--color-canvas)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          maxWidth: '440px',
          margin: '0 auto',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎲</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)' }}>
          Menyiapkan Tantangan...
        </h3>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
          Game engine sedang memilih soal terbaik untukmu.
        </p>
      </div>
    );
  }

  // State: Error
  if (error || !currentQ) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'var(--color-canvas)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          maxWidth: '440px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '8px' }}>
          Tidak Dapat Memulai Sesi
        </h3>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
          {error || 'Soal untuk level ini belum tersedia.'}
        </p>
        <button className="btn-secondary" onClick={onClose} style={{ minHeight: '44px', padding: '0 24px' }}>
          Kembali ke Peta Belajar
        </button>
      </div>
    );
  }

  // State: Layar Sukses / Level Tuntas (100% Target)
  if (isFinished) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'var(--color-canvas)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          maxWidth: '440px',
          margin: '0 auto',
        }}
      >
        <div style={{ fontSize: '4.5rem', marginBottom: '16px' }}>🎉</div>
        <span className="badge badge-mint" style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
          Level Selesai!
        </span>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px', color: 'var(--color-ink)' }}>
          Luar Biasa, Kamu Berhasil!
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'var(--color-muted)', marginBottom: '24px' }}>
          Kamu telah menyelesaikan level ini dan membuka tantangan berikutnya!
        </p>

        {/* Hadiah Kartu RPG Baru */}
        {feedback?.progression?.awarded_card && (
          <div
            className="card"
            style={{
              width: '100%',
              backgroundColor: 'var(--color-sunshine-soft)',
              border: '1.5px solid #F5C451',
              padding: '14px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '2.25rem' }}>
              {feedback.progression.awarded_card.illustration}
            </span>
            <div>
              <span className="badge badge-sunshine" style={{ fontSize: '0.6875rem', marginBottom: '2px' }}>
                Kartu Baru Terbuka! ({feedback.progression.awarded_card.rarity.toUpperCase()})
              </span>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                {feedback.progression.awarded_card.name}
              </h4>
            </div>
          </div>
        )}

        {/* Lencana Baru */}
        {feedback?.progression?.new_badges && feedback.progression.new_badges.length > 0 && (
          <div
            className="card"
            style={{
              width: '100%',
              backgroundColor: 'var(--color-mint-soft)',
              border: '1.5px solid var(--color-mint)',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '2rem' }}>
              {feedback.progression.new_badges[0].icon}
            </span>
            <div>
              <span className="badge badge-mint" style={{ fontSize: '0.6875rem', marginBottom: '2px' }}>
                Lencana Baru!
              </span>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                {feedback.progression.new_badges[0].name}
              </h4>
            </div>
          </div>
        )}

        {/* Kartu Reward Perolehan */}
        <div
          className="card"
          style={{
            width: '100%',
            backgroundColor: 'var(--color-paper)',
            padding: '20px',
            marginBottom: '32px',
            display: 'flex',
            justifyContent: 'space-around',
          }}
        >
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              +{earnedTotalXp}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600 }}>XP Diperoleh</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--color-border)' }} />
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-mint)' }}>
              100%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600 }}>Level Selesai</div>
          </div>
        </div>

        <button
          className="btn-primary btn-primary-large"
          onClick={() => onComplete(earnedTotalXp)}
        >
          Lanjut ke Peta Petualangan 🚀
        </button>
      </div>
    );
  }

  const isCorrect = feedback ? feedback.is_correct : false;
  const progressPercent = Math.min(100, (currentQ.index / totalQuestions) * 100);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--color-canvas)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '440px',
        margin: '0 auto',
      }}
    >
      {/* 1. Header Sesi Bermain */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          backgroundColor: 'var(--color-paper)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            color: 'var(--color-muted)',
            cursor: 'pointer',
            padding: '4px',
            minHeight: 'auto',
          }}
          aria-label="Tutup Sesi"
        >
          ✕
        </button>

        {/* Progress Bar Sesi */}
        <div style={{ flex: 1 }}>
          <div className="progress-track" style={{ height: '8px' }}>
            <div
              className="progress-fill progress-fill-mint"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)' }}>
          {currentQ.index} / {totalQuestions}
        </span>
      </div>

      {/* 2. Area Soal Utama */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <span
          className="badge badge-primary"
          style={{ alignSelf: 'flex-start', marginBottom: '16px' }}
        >
          Tantangan Matematika
        </span>

        <h2
          style={{
            fontSize: '1.375rem',
            fontWeight: 800,
            lineHeight: 1.4,
            marginBottom: '16px',
            color: 'var(--color-ink)',
          }}
        >
          {currentQ.question}
        </h2>

        {/* Visual Benda Pendukung */}
        {currentQ.visual && (
          <div
            style={{
              backgroundColor: 'var(--color-surface-soft)',
              borderRadius: 'var(--radius-card)',
              padding: '20px',
              textAlign: 'center',
              fontSize: '1.5rem',
              letterSpacing: '4px',
              marginBottom: '28px',
              border: '1px solid var(--color-border)',
            }}
          >
            {currentQ.visual}
          </div>
        )}

        {/* Pilihan Jawaban (A, B, C, D) dengan Urutan Diacak oleh Game Engine */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: 'auto' }}>
          {currentQ.options.map((opt: ClientQuestionOption) => {
            const isSelected = selectedAnswer === opt.id;
            let bgColor = 'var(--color-paper)';
            let borderColor = 'var(--color-border)';
            let textColor = 'var(--color-ink)';

            if (isSelected) {
              bgColor = 'var(--color-primary-soft)';
              borderColor = 'var(--color-primary)';
              textColor = 'var(--color-primary)';
            }

            if (isAnswered && feedback) {
              if (opt.id === feedback.correct_answer) {
                bgColor = 'var(--color-mint-soft)';
                borderColor = 'var(--color-mint)';
                textColor = 'var(--color-success)';
              } else if (isSelected && !isCorrect) {
                bgColor = 'var(--color-danger-soft)';
                borderColor = 'var(--color-danger)';
                textColor = 'var(--color-danger)';
              }
            }

            return (
              <button
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                disabled={isAnswered || isSubmitting}
                style={{
                  minHeight: '56px',
                  backgroundColor: bgColor,
                  border: `2px solid ${borderColor}`,
                  color: textColor,
                  borderRadius: 'var(--radius-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  padding: '0 18px',
                  gap: '14px',
                  textAlign: 'left',
                  fontSize: '1.0625rem',
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                  cursor: isAnswered ? 'default' : 'pointer',
                }}
              >
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-surface-soft)',
                    color: isSelected ? 'white' : 'var(--color-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 800,
                  }}
                >
                  {opt.id}
                </span>
                <span>{opt.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Feedback Banner & Action Footer */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: isAnswered
            ? isCorrect
              ? 'var(--color-mint-soft)'
              : 'var(--color-coral-soft)'
            : 'var(--color-paper)',
          borderTop: '1px solid var(--color-border)',
          transition: 'background-color 0.2s ease',
        }}
      >
        {isAnswered && feedback && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.25rem' }}>{isCorrect ? '🌟' : '💡'}</span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '1rem',
                  color: isCorrect ? 'var(--color-success)' : '#A33319',
                }}
              >
                {isCorrect ? 'Hebat! Jawabanmu benar.' : 'Belum tepat, yuk cermati.'}
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: isCorrect ? '#0F6141' : '#732613' }}>
              {feedback.explanation}
            </p>
          </div>
        )}

        {!isAnswered ? (
          <button
            className="btn-primary btn-primary-large"
            disabled={!selectedAnswer || isSubmitting}
            onClick={handleCheckAnswer}
            style={{ opacity: selectedAnswer && !isSubmitting ? 1 : 0.6 }}
          >
            {isSubmitting ? 'Memeriksa...' : 'Periksa Jawaban ✓'}
          </button>
        ) : (
          <button
            className="btn-primary btn-primary-large"
            onClick={handleNext}
            style={{
              backgroundColor: isCorrect ? 'var(--color-mint)' : 'var(--color-primary)',
            }}
          >
            {feedback?.is_level_completed || !feedback?.next_question
              ? 'Lihat Hasil Belajar 🏆'
              : 'Lanjut Soal Berikutnya ➔'}
          </button>
        )}
      </div>
    </div>
  );
};
