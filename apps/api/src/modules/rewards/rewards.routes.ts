import { FastifyInstance, FastifyRequest } from 'fastify';
import { RewardsService } from './rewards.service.js';
import { AuthService } from '../auth/auth.service.js';

const PLAYER_COOKIE = 'kidsgo_player_token';

function resolvePlayerId(req: FastifyRequest): string {
  const token =
    req.cookies[PLAYER_COOKIE] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (token) {
    const player = AuthService.getPlayerByToken(token);
    if (player) return player.id;
  }

  return 'ply-guest-demo';
}

export async function rewardsRoutes(app: FastifyInstance): Promise<void> {
  // 1. Ambil Semua Lencana & Status Unlocked Pemain
  app.get('/api/rewards/badges', async (req, reply) => {
    const playerId = resolvePlayerId(req);
    // Jalankan auto-check untuk memberi badge jika kriteria sudah tercapai
    RewardsService.checkAndAwardBadges(playerId);
    const badges = RewardsService.getUserBadges(playerId);

    return reply.send({
      success: true,
      data: {
        playerId,
        badges,
        unlocked_count: badges.filter((b) => b.unlocked).length,
        total_count: badges.length,
      },
    });
  });

  // 2. Ambil Semua Kartu RPG Koleksi Pemain
  app.get('/api/rewards/cards', async (req, reply) => {
    const playerId = resolvePlayerId(req);
    const cards = RewardsService.getUserCards(playerId);

    return reply.send({
      success: true,
      data: {
        playerId,
        cards,
        owned_count: cards.filter((c) => c.obtained).length,
        total_count: cards.length,
      },
    });
  });
}
