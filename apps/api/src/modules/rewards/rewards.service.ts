import { getDb } from '../../db/index.js';
import { CardRarity } from '@kidsgo/shared';

export interface UserBadgeItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  awarded_at: string | null;
}

export interface UserCardItem {
  id: string;
  slug: string;
  name: string;
  rarity: CardRarity;
  illustration: string;
  stats: Record<string, unknown>;
  obtained: boolean;
  obtained_at: string | null;
}

export class RewardsService {
  /**
   * Mengambil semua lencana beserta status kepemilikan pemain
   */
  static getUserBadges(playerId: string): UserBadgeItem[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT b.id, b.slug, b.name, b.description, b.icon,
             pb.awarded_at
      FROM badges b
      LEFT JOIN player_badges pb ON b.id = pb.badge_id AND pb.player_id = ?
      ORDER BY b.rowid ASC
    `).all(playerId) as {
      id: string;
      slug: string;
      name: string;
      description: string;
      icon: string;
      awarded_at: string | null;
    }[];

    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      icon: r.icon,
      unlocked: Boolean(r.awarded_at),
      awarded_at: r.awarded_at,
    }));
  }

  /**
   * Mengambil semua kartu RPG koleksi beserta status kepemilikan pemain
   */
  static getUserCards(playerId: string): UserCardItem[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT c.id, c.slug, c.name, c.rarity, c.illustration, c.stats_json,
             pc.obtained_at
      FROM cards c
      LEFT JOIN player_cards pc ON c.id = pc.card_id AND pc.player_id = ?
      ORDER BY 
        CASE c.rarity
          WHEN 'legendary' THEN 1
          WHEN 'epic' THEN 2
          WHEN 'rare' THEN 3
          ELSE 4
        END, c.rowid ASC
    `).all(playerId) as {
      id: string;
      slug: string;
      name: string;
      rarity: string;
      illustration: string;
      stats_json: string | null;
      obtained_at: string | null;
    }[];

    return rows.map((r) => {
      let stats = {};
      if (r.stats_json) {
        try {
          stats = JSON.parse(r.stats_json);
        } catch {
          stats = {};
        }
      }

      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        rarity: r.rarity as CardRarity,
        illustration: r.illustration,
        stats,
        obtained: Boolean(r.obtained_at),
        obtained_at: r.obtained_at,
      };
    });
  }

  /**
   * Evaluasi kriteria dan berikan badge baru secara idempoten
   */
  static checkAndAwardBadges(playerId: string): UserBadgeItem[] {
    const db = getDb();
    const now = new Date().toISOString();

    // 1. Hitung metrik capaian pemain saat ini
    const completedLevelsRow = db.prepare(`
      SELECT COUNT(*) as cnt FROM progress WHERE player_id = ? AND is_completed = 1
    `).get(playerId) as { cnt: number };
    const completedLevels = completedLevelsRow.cnt;

    const perfectLevelsRow = db.prepare(`
      SELECT COUNT(*) as cnt FROM progress WHERE player_id = ? AND score >= 100
    `).get(playerId) as { cnt: number };
    const perfectLevels = perfectLevelsRow.cnt;

    const playerRow = db.prepare(`
      SELECT current_xp FROM players WHERE id = ?
    `).get(playerId) as { current_xp: number } | undefined;
    const totalXp = playerRow ? playerRow.current_xp : 0;

    // 2. Ambil seluruh badge yang belum dimiliki pemain
    const unearnedBadges = db.prepare(`
      SELECT b.* FROM badges b
      LEFT JOIN player_badges pb ON b.id = pb.badge_id AND pb.player_id = ?
      WHERE pb.id IS NULL
    `).all(playerId) as {
      id: string;
      slug: string;
      name: string;
      description: string;
      icon: string;
      criteria_type: string;
      criteria_value: string;
    }[];

    const newlyAwarded: UserBadgeItem[] = [];

    db.transaction(() => {
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO player_badges (id, player_id, badge_id, awarded_at)
        VALUES (?, ?, ?, ?)
      `);

      for (const badge of unearnedBadges) {
        let earned = false;
        const targetVal = Number(badge.criteria_value);

        if (badge.criteria_type === 'level_complete' && completedLevels >= targetVal) {
          earned = true;
        } else if (badge.criteria_type === 'total_xp' && totalXp >= targetVal) {
          earned = true;
        } else if (badge.criteria_type === 'perfect_level' && perfectLevels >= targetVal) {
          earned = true;
        }

        if (earned) {
          const pbId = `pb-${playerId}-${badge.id}`;
          const res = insertStmt.run(pbId, playerId, badge.id, now);
          if (res.changes > 0) {
            newlyAwarded.push({
              id: badge.id,
              slug: badge.slug,
              name: badge.name,
              description: badge.description,
              icon: badge.icon,
              unlocked: true,
              awarded_at: now,
            });
          }
        }
      }
    })();

    return newlyAwarded;
  }

  /**
   * Berikan kartu koleksi RPG saat level selesai 100% secara idempoten
   */
  static awardCardOnLevelComplete(playerId: string, levelId: string): UserCardItem | null {
    const db = getDb();
    const now = new Date().toISOString();

    // Pastikan pemberian kartu idempoten per penuntasan level
    const cardRefId = `pc-${playerId}-${levelId}`;
    const existing = db.prepare('SELECT id FROM player_cards WHERE id = ?').get(cardRefId);
    if (existing) {
      return null; // Kartu untuk level ini sudah pernah diberikan
    }

    // Prioritaskan kartu yang belum dimiliki pemain
    let candidateCards = db.prepare(`
      SELECT c.* FROM cards c
      LEFT JOIN player_cards pc ON c.id = pc.card_id AND pc.player_id = ?
      WHERE pc.id IS NULL
    `).all(playerId) as {
      id: string;
      slug: string;
      name: string;
      rarity: string;
      illustration: string;
      stats_json: string | null;
    }[];

    // Jika seluruh kartu sudah dimiliki, ambil dari seluruh kartu (duplikat koleksi)
    if (candidateCards.length === 0) {
      candidateCards = db.prepare('SELECT * FROM cards').all() as typeof candidateCards;
    }

    if (candidateCards.length === 0) return null;

    // Pilih kartu (misal acak atau berurutan)
    const chosen = candidateCards[Math.floor(Math.random() * candidateCards.length)];

    db.prepare(`
      INSERT OR IGNORE INTO player_cards (id, player_id, card_id, obtained_at)
      VALUES (?, ?, ?, ?)
    `).run(cardRefId, playerId, chosen.id, now);

    let stats = {};
    if (chosen.stats_json) {
      try {
        stats = JSON.parse(chosen.stats_json);
      } catch {
        stats = {};
      }
    }

    return {
      id: chosen.id,
      slug: chosen.slug,
      name: chosen.name,
      rarity: chosen.rarity as CardRarity,
      illustration: chosen.illustration,
      stats,
      obtained: true,
      obtained_at: now,
    };
  }
}
