import { getDb } from '../../db/index.js';
import { EDUCATION_LEVELS } from '@kidsgo/shared';
import { RewardsService, UserCardItem, UserBadgeItem } from '../rewards/rewards.service.js';

export interface LevelProgressItem {
  level_id: string;
  level_number: number;
  level_name: string;
  topic_id: string;
  topic_name: string;
  status: 'completed' | 'active' | 'locked';
  score: number;
  required_xp: number;
}

export class ProgressionService {
  /**
   * Cek apakah suatu level terbuka untuk dimainkan anak (Single Source of Truth)
   * Aturan AGENTS.md:
   * 1. Level 1 di Semester 1 selalu terbuka.
   * 2. Level K terbuka setelah Level K-1 selesai 100%.
   * 3. Semester 2 terbuka setelah seluruh level di Semester 1 selesai 100%.
   * 4. Jenjang berikutnya terbuka setelah Semester 1 & 2 di jenjang saat ini selesai 100%.
   */
  static isLevelUnlocked(playerId: string, levelId: string): boolean {
    const db = getDb();

    // 1. Ambil informasi level dan topik
    const target = db.prepare(`
      SELECT l.id as level_id, l.level_number, l.topic_id,
             t.education_level, t.semester, t.order_index
      FROM levels l
      JOIN topics t ON l.topic_id = t.id
      WHERE l.id = ?
    `).get(levelId) as {
      level_id: string;
      level_number: number;
      topic_id: string;
      education_level: string;
      semester: number;
      order_index: number;
    } | undefined;

    if (!target) return false;

    // 2. Cek Jenjang (Grade):
    // Anak dapat memulai langsung di jenjangnya sendiri (player.grade).
    // Jenjang yang lebih tinggi hanya terbuka jika seluruh semester 1 & 2 di jenjang saat ini tuntas 100%.
    const player = db.prepare('SELECT grade FROM players WHERE id = ?').get(playerId) as { grade: string } | undefined;
    const playerGradeCode = player ? player.grade : target.education_level;
    const playerGradeIndex = EDUCATION_LEVELS.findIndex((g) => g.code === playerGradeCode);
    const targetGradeIndex = EDUCATION_LEVELS.findIndex((g) => g.code === target.education_level);

    if (targetGradeIndex > playerGradeIndex) {
      for (let i = playerGradeIndex; i < targetGradeIndex; i++) {
        const gradeToCheck = EDUCATION_LEVELS[i].code;
        const incompleteCount = db.prepare(`
          SELECT COUNT(*) as cnt
          FROM levels l
          JOIN topics t ON l.topic_id = t.id
          LEFT JOIN progress p ON l.id = p.level_id AND p.player_id = ?
          WHERE t.education_level = ? AND (p.is_completed IS NULL OR p.is_completed = 0)
        `).get(playerId, gradeToCheck) as { cnt: number };

        if (incompleteCount.cnt > 0) {
          return false; // Jenjang sebelumnya belum tuntas
        }
      }
    }

    // 3. Cek Semester 1 jika target berada di Semester 2
    if (target.semester === 2) {
      const sem1Incomplete = db.prepare(`
        SELECT COUNT(*) as cnt
        FROM levels l
        JOIN topics t ON l.topic_id = t.id
        LEFT JOIN progress p ON l.id = p.level_id AND p.player_id = ?
        WHERE t.education_level = ? AND t.semester = 1 AND (p.is_completed IS NULL OR p.is_completed = 0)
      `).get(playerId, target.education_level) as { cnt: number };

      if (sem1Incomplete.cnt > 0) {
        return false; // Semester 1 belum tuntas 100%
      }
    }

    // 4. Cek Level Sebelumnya di Topik / Semester yang sama
    if (target.level_number === 1) {
      // Jika level pertama di topik pertama semester 1 -> Terbuka otomatis
      if (target.order_index === 1) {
        return true;
      }
      // Jika level pertama di topik berikutnya, cek apakah topik sebelumnya sudah tuntas
      const prevTopicIncomplete = db.prepare(`
        SELECT COUNT(*) as cnt
        FROM levels l
        JOIN topics t ON l.topic_id = t.id
        LEFT JOIN progress p ON l.id = p.level_id AND p.player_id = ?
        WHERE t.education_level = ? AND t.semester = ? AND t.order_index < ? 
          AND (p.is_completed IS NULL OR p.is_completed = 0)
      `).get(playerId, target.education_level, target.semester, target.order_index) as { cnt: number };

      return prevTopicIncomplete.cnt === 0;
    }

    // Level > 1: Level sebelumnya (level_number - 1) pada topik ini wajib 100% tuntas
    const prevLevel = db.prepare(`
      SELECT l.id
      FROM levels l
      WHERE l.topic_id = ? AND l.level_number = ?
    `).get(target.topic_id, target.level_number - 1) as { id: string } | undefined;

    if (!prevLevel) return true;

    const prevProg = db.prepare(`
      SELECT is_completed, score
      FROM progress
      WHERE player_id = ? AND level_id = ?
    `).get(playerId, prevLevel.id) as { is_completed: number; score: number } | undefined;

    return Boolean(prevProg && prevProg.is_completed === 1 && prevProg.score >= 100);
  }

  /**
   * Mengambil peta jalur level lengkap untuk UI
   */
  static getCurriculumProgress(
    playerId: string,
    educationLevel: string,
    semester: number
  ): LevelProgressItem[] {
    const db = getDb();

    const rows = db.prepare(`
      SELECT l.id as level_id, l.level_number, l.name as level_name, l.required_xp,
             t.id as topic_id, t.name as topic_name,
             COALESCE(p.score, 0) as score,
             COALESCE(p.is_completed, 0) as is_completed
      FROM levels l
      JOIN topics t ON l.topic_id = t.id
      LEFT JOIN progress p ON l.id = p.level_id AND p.player_id = ?
      WHERE t.education_level = ? AND t.semester = ?
      ORDER BY t.order_index ASC, l.level_number ASC
    `).all(playerId, educationLevel, semester) as {
      level_id: string;
      level_number: number;
      level_name: string;
      required_xp: number;
      topic_id: string;
      topic_name: string;
      score: number;
      is_completed: number;
    }[];

    const result: LevelProgressItem[] = [];

    for (const row of rows) {
      let status: 'completed' | 'active' | 'locked';

      if (row.is_completed === 1) {
        status = 'completed';
      } else {
        const unlocked = this.isLevelUnlocked(playerId, row.level_id);
        status = unlocked ? 'active' : 'locked';
      }

      result.push({
        level_id: row.level_id,
        level_number: row.level_number,
        level_name: row.level_name,
        topic_id: row.topic_id,
        topic_name: row.topic_name,
        status,
        score: row.score,
        required_xp: row.required_xp,
      });
    }

    return result;
  }

  /**
   * Catat XP ke ledger secara atomik & idempoten (anti-farming / anti duplikasi)
   */
  static awardXp(
    playerId: string,
    amount: number,
    reason: string,
    referenceId: string
  ): { awarded: boolean; amount: number; total_xp: number } {
    const db = getDb();
    const now = new Date().toISOString();
    const ledgerId = `xp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    let awarded = false;

    db.transaction(() => {
      const insertResult = db.prepare(`
        INSERT OR IGNORE INTO xp_ledger (id, player_id, amount, reason, reference_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(ledgerId, playerId, amount, reason, referenceId, now);

      if (insertResult.changes > 0) {
        db.prepare(`
          UPDATE players 
          SET current_xp = current_xp + ?, updated_at = ?
          WHERE id = ?
        `).run(amount, now, playerId);
        awarded = true;
      }
    })();

    const player = db.prepare('SELECT current_xp FROM players WHERE id = ?').get(playerId) as { current_xp: number };

    return {
      awarded,
      amount: awarded ? amount : 0,
      total_xp: player ? player.current_xp : 0,
    };
  }

  /**
   * Tuntaskan level saat target 100% tercapai
   */
  static completeLevel(playerId: string, levelId: string): {
    level_completed: boolean;
    next_level_unlocked: boolean;
    next_semester_unlocked: boolean;
    completion_xp: number;
  } {
    const db = getDb();
    const now = new Date().toISOString();
    const progId = `prog-${playerId}-${levelId}`;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO progress (id, player_id, level_id, score, is_completed, completed_at, updated_at)
        VALUES (?, ?, ?, 100, 1, ?, ?)
        ON CONFLICT(player_id, level_id) DO UPDATE SET
          is_completed = 1,
          score = 100,
          completed_at = COALESCE(progress.completed_at, excluded.completed_at),
          updated_at = excluded.updated_at
      `).run(progId, playerId, levelId, now, now);
    })();

    // Beri bonus XP penyelesaian level secara idempoten
    const xpRes = this.awardXp(
      playerId,
      30,
      'Bonus Penyelesaian Level 100%',
      `lvl-comp-${playerId}-${levelId}`
    );

    // Cek apakah ada level berikutnya di semester ini yang terbuka
    const target = db.prepare(`
      SELECT l.level_number, l.topic_id, t.education_level, t.semester
      FROM levels l
      JOIN topics t ON l.topic_id = t.id
      WHERE l.id = ?
    `).get(levelId) as {
      level_number: number;
      topic_id: string;
      education_level: string;
      semester: number;
    } | undefined;

    let nextLevelUnlocked = false;
    let nextSemesterUnlocked = false;

    if (target) {
      // Cari level berikutnya (level_number + 1)
      const nextLevel = db.prepare(`
        SELECT id FROM levels WHERE topic_id = ? AND level_number = ?
      `).get(target.topic_id, target.level_number + 1) as { id: string } | undefined;

      if (nextLevel) {
        nextLevelUnlocked = this.isLevelUnlocked(playerId, nextLevel.id);
      }

      // Cek apakah semester 2 sekarang terbuka
      if (target.semester === 1) {
        const sem1Remaining = db.prepare(`
          SELECT COUNT(*) as cnt
          FROM levels l
          JOIN topics t ON l.topic_id = t.id
          LEFT JOIN progress p ON l.id = p.level_id AND p.player_id = ?
          WHERE t.education_level = ? AND t.semester = 1 AND (p.is_completed IS NULL OR p.is_completed = 0)
        `).get(playerId, target.education_level) as { cnt: number };

        nextSemesterUnlocked = sem1Remaining.cnt === 0;
      }
    }

    // Berikan kartu koleksi RPG & evaluasi badge baru secara idempoten
    const awardedCard = RewardsService.awardCardOnLevelComplete(playerId, levelId);
    const newBadges = RewardsService.checkAndAwardBadges(playerId);

    return {
      level_completed: true,
      next_level_unlocked: nextLevelUnlocked,
      next_semester_unlocked: nextSemesterUnlocked,
      completion_xp: xpRes.amount,
      awarded_card: awardedCard,
      new_badges: newBadges,
    };
  }
}
