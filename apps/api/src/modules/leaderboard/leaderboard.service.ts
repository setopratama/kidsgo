import { getDb } from '../../db/index.js';
import { LeaderboardEntry } from '@kidsgo/shared';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'all';

export class LeaderboardService {
  /**
   * Mengambil peringkat leaderboard anak secara aman (AGENTS.md Section 10)
   * Hanya data publik (nickname, avatar, grade, total_xp) yang disajikan.
   * Dihitung langsung dari buku besar xp_ledger di database.
   */
  static getLeaderboard(params: {
    period?: LeaderboardPeriod;
    grade?: string;
    limit?: number;
  }): LeaderboardEntry[] {
    const db = getDb();
    const period = params.period || 'all';
    const limit = Math.min(params.limit || 20, 50);

    let dateFilter = '';
    if (period === 'daily') {
      dateFilter = "AND xl.created_at >= datetime('now', '-1 day')";
    } else if (period === 'weekly') {
      dateFilter = "AND xl.created_at >= datetime('now', '-7 days')";
    }

    let gradeFilter = '';
    const queryParams: unknown[] = [];

    if (params.grade) {
      gradeFilter = 'AND p.grade = ?';
      queryParams.push(params.grade);
    }

    // Query agregasi dari xp_ledger untuk memastikan konsistensi dan anti-farming
    let sql = '';
    if (period === 'all') {
      // Jika all-time, sertakan juga pemain yang memiliki current_xp dari tabel players
      sql = `
        SELECT p.id as player_id, p.nickname, p.avatar, p.grade,
               COALESCE(SUM(xl.amount), p.current_xp, 0) as total_xp
        FROM players p
        LEFT JOIN xp_ledger xl ON p.id = xl.player_id
        WHERE p.id != 'ply-guest-demo' ${gradeFilter}
        GROUP BY p.id
        ORDER BY total_xp DESC, p.created_at ASC
        LIMIT ?
      `;
      queryParams.push(limit);
    } else {
      sql = `
        SELECT p.id as player_id, p.nickname, p.avatar, p.grade,
               COALESCE(SUM(xl.amount), 0) as total_xp
        FROM players p
        JOIN xp_ledger xl ON p.id = xl.player_id
        WHERE p.id != 'ply-guest-demo' ${dateFilter} ${gradeFilter}
        GROUP BY p.id
        ORDER BY total_xp DESC
        LIMIT ?
      `;
      queryParams.push(limit);
    }

    const rows = db.prepare(sql).all(...queryParams) as {
      player_id: string;
      nickname: string;
      avatar: string;
      grade: string;
      total_xp: number;
    }[];

    return rows.map((r, idx) => ({
      rank: idx + 1,
      player_id: r.player_id,
      nickname: r.nickname,
      avatar: r.avatar,
      grade: r.grade as LeaderboardEntry['grade'],
      total_xp: Number(r.total_xp),
    }));
  }
}
