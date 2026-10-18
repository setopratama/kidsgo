import crypto from 'node:crypto';
import { getDb } from '../../db/index.js';
import { ProgressionService } from '../progression/progression.service.js';
import { ClientQuestion, ClientQuestionOption } from '@kidsgo/shared';

interface ShuffledQuestion {
  question_id: string;
  type: string;
  question: string;
  visual: string | null;
  options: ClientQuestionOption[];
  correct_answer: string;
  explanation: string;
}

interface ActiveGameSession {
  sessionId: string;
  playerId: string;
  levelId: string;
  questions: ShuffledQuestion[];
  currentIndex: number;
  correctAnswersCount: number;
  totalRequired: number;
  createdAt: number;
}

export class GameEngineService {
  // Penyimpanan sesi bermain aktif di memori
  private static sessions = new Map<string, ActiveGameSession>();

  /**
   * Acak urutan array secara aman (Fisher-Yates)
   */
  private static shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Format soal untuk dikirim ke frontend:
   * KUNCI JAWABAN & PENJELASAN DIHAPUS agar tidak bocor ke browser (AGENTS.md Section 5)
   */
  private static toClientQuestion(
    q: ShuffledQuestion,
    index: number,
    total: number
  ): ClientQuestion & { index: number; total: number } {
    return {
      question_id: q.question_id,
      type: q.type as ClientQuestion['type'],
      question: q.question,
      visual: q.visual,
      options: q.options,
      tags: [],
      index: index + 1,
      total,
    };
  }

  /**
   * Mulai Sesi Belajar / Game Sesi pada Level Tertentu
   */
  static startSession(
    playerId: string,
    levelId: string,
    questionCount = 3
  ): {
    sessionId: string;
    levelId: string;
    currentQuestion: ClientQuestion & { index: number; total: number };
    totalQuestions: number;
  } {
    const db = getDb();

    // 1. Validasi Aturan Unlock di Backend (Single Source of Truth)
    const isUnlocked = ProgressionService.isLevelUnlocked(playerId, levelId);
    if (!isUnlocked) {
      throw new Error('Level ini belum memenuhi syarat untuk dibuka. Selesaikan level sebelumnya terlebih dahulu.');
    }

    // 2. Ambil informasi level & topik
    const levelInfo = db.prepare(`
      SELECT l.*, t.education_level, t.semester, t.id as topic_id
      FROM levels l
      JOIN topics t ON l.topic_id = t.id
      WHERE l.id = ?
    `).get(levelId) as {
      id: string;
      level_number: number;
      education_level: string;
      semester: number;
      topic_id: string;
    } | undefined;

    if (!levelInfo) {
      throw new Error('Level tidak ditemukan');
    }

    // 3. Ambil soal yang berstatus 'active' (Soal 'draft' TIDAK BOLEH disajikan)
    // Prioritas 1: Soal yang secara spesifik di-assign ke level_id ini
    let candidateRows = db.prepare(`
      SELECT * FROM questions 
      WHERE status = 'active' AND level_id = ?
    `).all(levelInfo.id) as Record<string, unknown>[];

    // Prioritas 2: Soal dari topik yang sama jika belum ada soal khusus level
    if (candidateRows.length === 0) {
      candidateRows = db.prepare(`
        SELECT * FROM questions 
        WHERE status = 'active' AND education_level = ? AND semester = ? AND topic_id = ?
      `).all(levelInfo.education_level, levelInfo.semester, levelInfo.topic_id) as Record<string, unknown>[];
    }

    // Prioritas 3: Fallback ke soal aktif jenjang & semester ini
    if (candidateRows.length === 0) {
      candidateRows = db.prepare(`
        SELECT * FROM questions 
        WHERE status = 'active' AND education_level = ? AND semester = ?
      `).all(levelInfo.education_level, levelInfo.semester) as Record<string, unknown>[];
    }

    if (candidateRows.length === 0) {
      throw new Error('Belum ada soal aktif yang disetujui untuk level ini. Hubungi guru/admin.');
    }

    // 4. Acak pemilihan soal agar tidak berulang & acak urutan pilihan jawaban
    const selectedRows = this.shuffle(candidateRows).slice(0, questionCount);

    const shuffledQuestions: ShuffledQuestion[] = selectedRows.map((r) => {
      const rawOptions = JSON.parse(r.options_json as string) as ClientQuestionOption[];
      // Acak pilihan jawaban tanpa mengubah pasangan id dan text
      const shuffledOptions = this.shuffle(rawOptions);

      return {
        question_id: r.question_id as string,
        type: r.type as string,
        question: r.question as string,
        visual: (r.visual as string | null) || null,
        options: shuffledOptions,
        correct_answer: r.correct_answer as string,
        explanation: r.explanation as string,
      };
    });

    const sessionId = `game-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const sessionObj: ActiveGameSession = {
      sessionId,
      playerId,
      levelId,
      questions: shuffledQuestions,
      currentIndex: 0,
      correctAnswersCount: 0,
      totalRequired: shuffledQuestions.length,
      createdAt: Date.now(),
    };

    this.sessions.set(sessionId, sessionObj);

    return {
      sessionId,
      levelId,
      currentQuestion: this.toClientQuestion(shuffledQuestions[0], 0, shuffledQuestions.length),
      totalQuestions: shuffledQuestions.length,
    };
  }

  /**
   * Submit Jawaban Anak & Penilaian Server
   */
  static submitAnswer(
    playerId: string,
    sessionId: string,
    questionId: string,
    selectedAnswer: string
  ): {
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
      awarded_card?: unknown;
      new_badges?: unknown[];
    } | null;
  } {
    const session = this.sessions.get(sessionId);
    if (!session || session.playerId !== playerId) {
      throw new Error('Sesi bermain tidak valid atau telah kedaluwarsa.');
    }

    const currentQ = session.questions[session.currentIndex];
    if (!currentQ || currentQ.question_id !== questionId) {
      throw new Error('Pertanyaan yang dijawab tidak sesuai dengan urutan sesi.');
    }

    const isCorrect = selectedAnswer === currentQ.correct_answer;
    let xpAwarded = 0;

    if (isCorrect) {
      session.correctAnswersCount += 1;

      // Berikan XP jawaban benar secara atomik & idempoten
      const xpRes = ProgressionService.awardXp(
        playerId,
        10,
        'Jawaban Benar',
        `ans-${sessionId}-${questionId}`
      );
      xpAwarded = xpRes.amount;
    } else {
      // Jawaban salah: Berikan kesempatan menjawab soal pengganti (AGENTS.md Section 4)
      const usedIds = new Set(session.questions.map((q) => q.question_id));
      const db = getDb();
      const levelInfo = db.prepare(`
        SELECT l.*, t.education_level, t.semester, t.id as topic_id
        FROM levels l JOIN topics t ON l.topic_id = t.id WHERE l.id = ?
      `).get(session.levelId) as { education_level: string; semester: number; topic_id: string } | undefined;

      let replacement: ShuffledQuestion | null = null;
      if (levelInfo) {
        const idList = Array.from(usedIds);
        const placeholders = idList.map(() => '?').join(',');
        const unused = db.prepare(`
          SELECT * FROM questions
          WHERE status = 'active' AND education_level = ? AND semester = ?
          ${idList.length > 0 ? `AND question_id NOT IN (${placeholders})` : ''}
        `).all(levelInfo.education_level, levelInfo.semester, ...idList) as Record<string, unknown>[];

        if (unused.length > 0) {
          const picked = unused[Math.floor(Math.random() * unused.length)];
          const rawOptions = JSON.parse(picked.options_json as string) as ClientQuestionOption[];
          replacement = {
            question_id: picked.question_id as string,
            type: picked.type as string,
            question: picked.question as string,
            visual: (picked.visual as string | null) || null,
            options: this.shuffle(rawOptions),
            correct_answer: picked.correct_answer as string,
            explanation: picked.explanation as string,
          };
        }
      }

      // Jika semua soal aktif sudah ada di sesi ini, re-queue soal ini dengan urutan opsi baru di akhir sesi
      if (!replacement) {
        replacement = {
          ...currentQ,
          options: this.shuffle(currentQ.options),
        };
      }

      session.questions.push(replacement);
    }

    // Hitung persentase capaian saat ini (0 - 100%)
    const currentScore = Math.min(100, Math.round((session.correctAnswersCount / session.totalRequired) * 100));

    // Update progres parsial di database (jawaban salah tidak menghapus progres benar yang sudah ada)
    const db = getDb();
    const existingProgress = db.prepare(`
      SELECT score FROM progress WHERE player_id = ? AND level_id = ?
    `).get(playerId, session.levelId) as { score: number } | undefined;

    if (!existingProgress || currentScore > existingProgress.score) {
      const progId = `prog-${playerId}-${session.levelId}`;
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO progress (id, player_id, level_id, score, is_completed, updated_at)
        VALUES (?, ?, ?, ?, 0, ?)
        ON CONFLICT(player_id, level_id) DO UPDATE SET
          score = MAX(progress.score, excluded.score),
          updated_at = excluded.updated_at
      `).run(progId, playerId, session.levelId, currentScore, now);
    }

    session.currentIndex += 1;
    const isFinished = session.currentIndex >= session.questions.length;

    let progressionResult = null;
    let isLevelCompleted = false;

    // Jika seluruh soal selesai dan mencapai target 100%
    if (isFinished && currentScore >= 100) {
      isLevelCompleted = true;
      const comp = ProgressionService.completeLevel(playerId, session.levelId);
      progressionResult = {
        next_level_unlocked: comp.next_level_unlocked,
        next_semester_unlocked: comp.next_semester_unlocked,
        completion_bonus_xp: comp.completion_xp,
        awarded_card: comp.awarded_card,
        new_badges: comp.new_badges,
      };
      // Hapus sesi setelah tuntas
      this.sessions.delete(sessionId);
    }

    const nextQ = !isFinished
      ? this.toClientQuestion(
          session.questions[session.currentIndex],
          session.currentIndex,
          session.questions.length
        )
      : null;

    return {
      is_correct: isCorrect,
      correct_answer: currentQ.correct_answer, // Dikirim HANYA setelah dijawab
      explanation: currentQ.explanation,
      xp_awarded: xpAwarded,
      current_score: currentScore,
      is_level_completed: isLevelCompleted,
      next_question: nextQ,
      progression: progressionResult,
    };
  }

  static getActiveSession(sessionId: string): ActiveGameSession | undefined {
    return this.sessions.get(sessionId);
  }
}
