import { FastifyInstance, FastifyRequest } from 'fastify';
import { GameEngineService } from './game-engine.service.js';
import { ProgressionService } from '../progression/progression.service.js';
import { AuthService } from '../auth/auth.service.js';

const PLAYER_COOKIE = 'kidsgo_player_token';

// Helper mengekstrak ID pemain dari sesi cookie atau guest token
function resolvePlayerId(req: FastifyRequest): string {
  const token =
    req.cookies[PLAYER_COOKIE] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (token) {
    const player = AuthService.getPlayerByToken(token);
    if (player) return player.id;
  }

  // Fallback demo/guest player jika belum login
  return 'ply-guest-demo';
}

export async function gameEngineRoutes(app: FastifyInstance): Promise<void> {
  // 1. Ambil Peta Progres & Status Unlock Level (Single Source of Truth)
  app.get<{
    Querystring: {
      grade?: string;
      semester?: number;
    };
  }>(
    '/api/game/progress',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            grade: { type: 'string' },
            semester: { type: 'integer', enum: [1, 2] },
          },
        },
      },
    },
    async (req, reply) => {
      const playerId = resolvePlayerId(req);
      const grade = req.query.grade || 'SD_1';
      const semester = req.query.semester ? Number(req.query.semester) : 1;

      const levels = ProgressionService.getCurriculumProgress(playerId, grade, semester);
      return reply.send({
        success: true,
        data: {
          playerId,
          grade,
          semester,
          levels,
        },
      });
    }
  );

  // 2. Mulai Sesi Bermain Level (Level Unlock Verification & Question Shuffling)
  app.post<{
    Body: {
      levelId: string;
      questionCount?: number;
    };
  }>(
    '/api/game/session/start',
    {
      schema: {
        body: {
          type: 'object',
          required: ['levelId'],
          properties: {
            levelId: { type: 'string' },
            questionCount: { type: 'integer', minimum: 1, maximum: 10 },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const playerId = resolvePlayerId(req);
        const { levelId, questionCount } = req.body;

        const session = GameEngineService.startSession(playerId, levelId, questionCount || 3);
        return reply.status(201).send({
          success: true,
          data: session,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal memulai sesi';
        return reply.status(400).send({
          success: false,
          message,
        });
      }
    }
  );

  // 3. Submit Jawaban & Penilaian di Server
  app.post<{
    Body: {
      sessionId: string;
      questionId: string;
      selectedAnswer: string;
    };
  }>(
    '/api/game/session/submit',
    {
      schema: {
        body: {
          type: 'object',
          required: ['sessionId', 'questionId', 'selectedAnswer'],
          properties: {
            sessionId: { type: 'string' },
            questionId: { type: 'string' },
            selectedAnswer: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const playerId = resolvePlayerId(req);
        const { sessionId, questionId, selectedAnswer } = req.body;

        const result = GameEngineService.submitAnswer(
          playerId,
          sessionId,
          questionId,
          selectedAnswer
        );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal memproses jawaban';
        return reply.status(400).send({
          success: false,
          message,
        });
      }
    }
  );
}
