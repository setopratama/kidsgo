import { FastifyInstance } from 'fastify';
import { getDb } from '../../db/index.js';
import { EDUCATION_LEVELS } from '@kidsgo/shared';

export async function curriculumRoutes(app: FastifyInstance): Promise<void> {
  // 1. Ambil daftar jenjang pendidikan
  app.get('/api/curriculum/grades', async (_req, reply) => {
    return reply.send({
      success: true,
      data: EDUCATION_LEVELS,
    });
  });

  // 2. Ambil topik kurikulum berdasarkan jenjang dan semester
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

  // 3. Ambil daftar level dalam suatu topik
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
}
