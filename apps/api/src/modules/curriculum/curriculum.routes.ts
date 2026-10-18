import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../../db/index.js';
import { EDUCATION_LEVELS, EducationLevel, SemesterNumber } from '@kidsgo/shared';
import { CurriculumService } from './curriculum.service.js';
import { AuthService } from '../auth/auth.service.js';

const ADMIN_COOKIE = 'kidsgo_admin_token';

function requireAdmin(req: FastifyRequest, reply: FastifyReply): boolean {
  const token = req.cookies[ADMIN_COOKIE];
  const admin = token ? AuthService.getAdminByToken(token) : null;
  if (!admin) {
    reply.status(401).send({ success: false, message: 'Akses ditolak. Silakan login admin terlebih dahulu.' });
    return false;
  }
  return true;
}

export async function curriculumRoutes(app: FastifyInstance): Promise<void> {
  // ==========================================
  // 1. RUTE PUBLIK (UNTUK ANAK & FRONTEND)
  // ==========================================

  // 1.1 Ambil daftar jenjang pendidikan
  app.get('/api/curriculum/grades', async (_req, reply) => {
    return reply.send({
      success: true,
      data: EDUCATION_LEVELS,
    });
  });

  // 1.2 Ambil topik kurikulum berdasarkan jenjang dan semester
  app.get<{
    Querystring: {
      grade?: string;
      semester?: number;
    };
  }>(
    '/api/curriculum/topics',
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
      const db = getDb();
      const { grade, semester } = req.query;

      let query = `
        SELECT t.*, 
          (SELECT COUNT(*) FROM levels l WHERE l.topic_id = t.id) as total_levels
        FROM topics t
        WHERE t.subject = 'mathematics'
      `;
      const params: (string | number)[] = [];

      if (grade) {
        query += ' AND t.education_level = ?';
        params.push(grade);
      }
      if (semester) {
        query += ' AND t.semester = ?';
        params.push(Number(semester));
      }

      query += ' ORDER BY t.order_index ASC';

      const topics = db.prepare(query).all(...params);
      return reply.send({
        success: true,
        data: topics,
      });
    }
  );

  // 1.3 Ambil daftar level dalam suatu topik
  app.get<{
    Params: {
      topicId: string;
    };
  }>('/api/curriculum/topics/:topicId/levels', async (req, reply) => {
    const db = getDb();
    const { topicId } = req.params;

    const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId);
    if (!topic) {
      return reply.status(404).send({
        success: false,
        message: 'Topik tidak ditemukan',
      });
    }

    const levels = db
      .prepare('SELECT * FROM levels WHERE topic_id = ? ORDER BY level_number ASC')
      .all(topicId);

    return reply.send({
      success: true,
      data: {
        topic,
        levels,
      },
    });
  });

  // ==========================================
  // 2. RUTE ADMIN (MANAJEMEN TOPIK & LEVEL)
  // ==========================================

  // 2.1 Ikhtisar Seluruh Topik & Level untuk Dashboard Admin
  app.get<{
    Querystring: {
      grade?: string;
      semester?: number;
    };
  }>('/api/admin/curriculum/overview', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const grade = req.query.grade;
    const semester = req.query.semester ? Number(req.query.semester) : undefined;
    const data = CurriculumService.getCurriculumOverview(grade, semester);

    return reply.send({
      success: true,
      data,
    });
  });

  // 2.2 Buat Topik Pembelajaran Baru
  app.post<{
    Body: {
      education_level: EducationLevel;
      semester: SemesterNumber;
      name: string;
      slug?: string;
      order_index?: number;
    };
  }>(
    '/api/admin/curriculum/topics',
    {
      schema: {
        body: {
          type: 'object',
          required: ['education_level', 'semester', 'name'],
          properties: {
            education_level: {
              type: 'string',
              enum: ['TK_A', 'TK_B', 'SD_1', 'SD_2', 'SD_3', 'SD_4', 'SD_5', 'SD_6'],
            },
            semester: { type: 'integer', enum: [1, 2] },
            name: { type: 'string', minLength: 2, maxLength: 80 },
            slug: { type: 'string' },
            order_index: { type: 'integer', minimum: 1 },
          },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;

      try {
        const topic = CurriculumService.createTopic(req.body);
        return reply.status(201).send({
          success: true,
          message: 'Topik baru berhasil ditambahkan.',
          data: topic,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal membuat topik';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 2.3 Ubah Topik Pembelajaran
  app.put<{
    Params: { id: string };
    Body: {
      name?: string;
      order_index?: number;
      semester?: SemesterNumber;
      education_level?: EducationLevel;
    };
  }>(
    '/api/admin/curriculum/topics/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 80 },
            order_index: { type: 'integer', minimum: 1 },
            semester: { type: 'integer', enum: [1, 2] },
            education_level: {
              type: 'string',
              enum: ['TK_A', 'TK_B', 'SD_1', 'SD_2', 'SD_3', 'SD_4', 'SD_5', 'SD_6'],
            },
          },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;

      try {
        const topic = CurriculumService.updateTopic(req.params.id, req.body);
        return reply.send({
          success: true,
          message: 'Topik berhasil diperbarui.',
          data: topic,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal memperbarui topik';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 2.4 Hapus Topik Pembelajaran
  app.delete<{
    Params: { id: string };
  }>(
    '/api/admin/curriculum/topics/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;

      try {
        CurriculumService.deleteTopic(req.params.id);
        return reply.send({
          success: true,
          message: 'Topik beserta seluruh level di dalamnya berhasil dihapus.',
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal menghapus topik';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 2.5 Buat Level Baru di Bawah Topik
  app.post<{
    Params: { topicId: string };
    Body: {
      name: string;
      level_number?: number;
      required_xp?: number;
      passing_score?: number;
    };
  }>(
    '/api/admin/curriculum/topics/:topicId/levels',
    {
      schema: {
        params: {
          type: 'object',
          required: ['topicId'],
          properties: { topicId: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 80 },
            level_number: { type: 'integer', minimum: 1 },
            required_xp: { type: 'integer', minimum: 10, maximum: 500 },
            passing_score: { type: 'integer', minimum: 50, maximum: 100 },
          },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;

      try {
        const level = CurriculumService.createLevel(req.params.topicId, req.body);
        return reply.status(201).send({
          success: true,
          message: 'Level baru berhasil ditambahkan.',
          data: level,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal membuat level';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 2.6 Ubah Level
  app.put<{
    Params: { id: string };
    Body: {
      name?: string;
      level_number?: number;
      required_xp?: number;
      passing_score?: number;
    };
  }>(
    '/api/admin/curriculum/levels/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 80 },
            level_number: { type: 'integer', minimum: 1 },
            required_xp: { type: 'integer', minimum: 10, maximum: 500 },
            passing_score: { type: 'integer', minimum: 50, maximum: 100 },
          },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;

      try {
        const level = CurriculumService.updateLevel(req.params.id, req.body);
        return reply.send({
          success: true,
          message: 'Level berhasil diperbarui.',
          data: level,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal memperbarui level';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 2.7 Hapus Level
  app.delete<{
    Params: { id: string };
  }>(
    '/api/admin/curriculum/levels/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;

      try {
        CurriculumService.deleteLevel(req.params.id);
        return reply.send({
          success: true,
          message: 'Level berhasil dihapus.',
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal menghapus level';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 2.8 Ambil daftar soal yang terpasang di level tertentu
  app.get<{
    Params: { id: string };
  }>(
    '/api/admin/curriculum/levels/:id/questions',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;

      try {
        const questions = CurriculumService.getLevelQuestions(req.params.id);
        return reply.send({
          success: true,
          data: questions,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal mengambil soal level';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 2.9 Ambil daftar kandidat soal dari bank soal untuk level ini
  app.get<{
    Params: { id: string };
  }>(
    '/api/admin/curriculum/levels/:id/candidates',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;

      try {
        const result = CurriculumService.getCandidateQuestionsForLevel(req.params.id);
        return reply.send({
          success: true,
          ...result,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal mengambil kandidat soal level';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 2.10 Tambahkan soal ke level
  app.post<{
    Params: { id: string };
    Body: { question_ids: string[] };
  }>(
    '/api/admin/curriculum/levels/:id/questions',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['question_ids'],
          properties: {
            question_ids: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;

      try {
        const result = CurriculumService.addQuestionsToLevel(req.params.id, req.body.question_ids);
        return reply.send({
          success: true,
          message: `${result.count} soal berhasil dimasukkan ke level.`,
          data: result,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal menambahkan soal ke level';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 2.11 Keluarkan soal dari level
  app.delete<{
    Params: { id: string; questionId: string };
  }>(
    '/api/admin/curriculum/levels/:id/questions/:questionId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'questionId'],
          properties: {
            id: { type: 'string' },
            questionId: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;

      try {
        CurriculumService.removeQuestionFromLevel(req.params.id, req.params.questionId);
        return reply.send({
          success: true,
          message: 'Soal berhasil dikeluarkan dari level.',
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal mengeluarkan soal dari level';
        return reply.status(400).send({ success: false, message });
      }
    }
  );
}

