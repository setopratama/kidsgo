import { FastifyInstance } from 'fastify';
import { LeaderboardService, LeaderboardPeriod } from './leaderboard.service.js';

export async function leaderboardRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: {
      period?: LeaderboardPeriod;
      grade?: string;
      limit?: number;
    };
  }>(
    '/api/leaderboard',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['daily', 'weekly', 'all'] },
            grade: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 50 },
          },
        },
      },
    },
    async (req, reply) => {
      const { period, grade, limit } = req.query;
      const entries = LeaderboardService.getLeaderboard({
        period,
        grade,
        limit: limit ? Number(limit) : 20,
      });

      return reply.send({
        success: true,
        data: {
          period: period || 'all',
          grade: grade || null,
          leaderboard: entries,
        },
      });
    }
  );
}
