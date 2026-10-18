import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { getDb } from './db/index.js';

import { curriculumRoutes } from './modules/curriculum/curriculum.routes.js';
import { questionBankRoutes } from './modules/question-bank/question-bank.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { gameEngineRoutes } from './modules/game-engine/game-engine.routes.js';
import { rewardsRoutes } from './modules/rewards/rewards.routes.js';
import { leaderboardRoutes } from './modules/leaderboard/leaderboard.routes.js';

export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : true,
  });

  // CORS support
  app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Cookie support
  app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'kidsgo-cookie-secret-dev-random-string-999',
  });

  // Health check endpoint
  app.get('/api/health', async (_req, reply) => {
    try {
      const db = getDb();
      // Test query sederhana ke database
      const row = db.prepare('SELECT 1 as is_alive').get() as { is_alive: number };

      return reply.status(200).send({
        status: 'ok',
        database: row.is_alive === 1 ? 'connected' : 'error',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
      });
    } catch (err: unknown) {
      app.log.error(err);
      return reply.status(500).send({
        status: 'error',
        message: 'Database check failed',
      });
    }
  });

  // Registrasi modul rute
  app.register(curriculumRoutes);
  app.register(questionBankRoutes);
  app.register(authRoutes);
  app.register(gameEngineRoutes);
  app.register(rewardsRoutes);
  app.register(leaderboardRoutes);

  return app;
}
