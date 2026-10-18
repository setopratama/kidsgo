import { FastifyInstance } from 'fastify';
import { QuestionBankService } from './question-bank.service.js';
import { questionBankFileSchema } from './schema.js';
import { QuestionBankFile, QuestionStatus } from '@kidsgo/shared';

export async function questionBankRoutes(app: FastifyInstance): Promise<void> {
  // 1. Validasi Pratinjau (Dry-run / Preview sebelum simpan)
  app.post<{ Body: QuestionBankFile }>(
    '/api/admin/questions/validate',
    {
      schema: {
        body: questionBankFileSchema,
      },
    },
    async (req, reply) => {
      const report = QuestionBankService.validateContent(req.body);
      return reply.send({
        success: true,
        report,
      });
    }
  );

  // 2. Impor Berkas Bank Soal JSON (Status awal 'draft')
  app.post<{ Body: QuestionBankFile }>(
    '/api/admin/questions/import',
    {
      schema: {
        body: questionBankFileSchema,
      },
    },
    async (req, reply) => {
      try {
        const result = QuestionBankService.importQuestions(req.body, 'admin', 'import.json');
        return reply.status(201).send({
          success: true,
          message: 'Berkas soal berhasil diimpor sebagai draft',
          data: result,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal mengimpor soal';
        return reply.status(400).send({
          success: false,
          message,
        });
      }
    }
  );

  // 3. Daftar Soal untuk Admin (dengan Filter & Paginasi)
  app.get<{
    Querystring: {
      education_level?: string;
      semester?: number;
      status?: QuestionStatus;
      topic_id?: string;
      level_id?: string;
      page?: number;
      limit?: number;
    };
  }>(
    '/api/admin/questions',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            education_level: { type: 'string' },
            semester: { type: 'integer' },
            status: { type: 'string', enum: ['draft', 'approved', 'active', 'archived'] },
            topic_id: { type: 'string' },
            level_id: { type: 'string' },
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
          },
        },
      },
    },
    async (req, reply) => {
      const result = QuestionBankService.listQuestions(req.query);
      return reply.send({
        success: true,
        ...result,
      });
    }
  );

  // 4. Detail Soal
  app.get<{ Params: { id: string } }>(
    '/api/admin/questions/:id',
    async (req, reply) => {
      const detail = QuestionBankService.getQuestionDetail(req.params.id);
      if (!detail) {
        return reply.status(404).send({
          success: false,
          message: 'Soal tidak ditemukan',
        });
      }
      return reply.send({
        success: true,
        data: detail,
      });
    }
  );

  // 5. Setujui Soal Tunggal (draft -> approved)
  app.post<{ Params: { id: string } }>(
    '/api/admin/questions/:id/approve',
    async (req, reply) => {
      try {
        const result = QuestionBankService.updateQuestionStatus(req.params.id, 'approved');
        return reply.send({
          success: true,
          message: 'Soal berhasil disetujui',
          data: result,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal menyetujui soal';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 6. Aktivasi Soal (approved -> active)
  app.post<{ Params: { id: string } }>(
    '/api/admin/questions/:id/activate',
    async (req, reply) => {
      try {
        const result = QuestionBankService.updateQuestionStatus(req.params.id, 'active');
        return reply.send({
          success: true,
          message: 'Soal berhasil diaktifkan untuk game engine',
          data: result,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal mengaktifkan soal';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 7. Arsipkan / Nonaktifkan Soal (active -> archived)
  app.post<{ Params: { id: string } }>(
    '/api/admin/questions/:id/archive',
    async (req, reply) => {
      try {
        const result = QuestionBankService.updateQuestionStatus(req.params.id, 'archived');
        return reply.send({
          success: true,
          message: 'Soal berhasil diarsipkan',
          data: result,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal mengarsipkan soal';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 8. Bulk Approval untuk seluruh Batch Impor
  app.post<{ Params: { batchId: string } }>(
    '/api/admin/questions/batch/:batchId/approve',
    async (req, reply) => {
      const approvedCount = QuestionBankService.bulkApproveBatch(req.params.batchId);
      return reply.send({
        success: true,
        message: `${approvedCount} soal dalam batch berhasil disetujui`,
        data: { approved_count: approvedCount },
      });
    }
  );

  // 9. Ekspor Bank Soal ke format JSON v1.0 (Untuk referensi prompt AI eksternal)
  app.get<{
    Querystring: {
      education_level: string;
      semester: number;
      topic_slug?: string;
    };
  }>(
    '/api/admin/questions/export',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['education_level', 'semester'],
          properties: {
            education_level: { type: 'string' },
            semester: { type: 'integer' },
            topic_slug: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const exportedJson = QuestionBankService.exportQuestions(req.query);
      reply.header(
        'Content-Disposition',
        `attachment; filename="kidsgo-${req.query.education_level}-s${req.query.semester}.json"`
      );
      return reply.send(exportedJson);
    }
  );

  // 10. Atur penempatan level, topik, dan semester untuk soal
  app.post<{
    Params: { id: string };
    Body: { topic_id?: string | null; level_id?: string | null; semester?: 1 | 2 };
  }>(
    '/api/admin/questions/:id/assign-level',
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
            topic_id: { type: ['string', 'null'] },
            level_id: { type: ['string', 'null'] },
            semester: { type: 'integer', enum: [1, 2] },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const result = QuestionBankService.assignQuestionLevel(
          req.params.id,
          req.body.topic_id ?? null,
          req.body.level_id ?? null,
          req.body.semester
        );
        return reply.send({
          success: true,
          message: 'Penempatan level soal berhasil diperbarui',
          data: result,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal mengatur level soal';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 11. Ubah semester soal
  app.post<{
    Params: { id: string };
    Body: { semester: 1 | 2; topic_id?: string | null; level_id?: string | null };
  }>(
    '/api/admin/questions/:id/update-semester',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['semester'],
          properties: {
            semester: { type: 'integer', enum: [1, 2] },
            topic_id: { type: ['string', 'null'] },
            level_id: { type: ['string', 'null'] },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const result = QuestionBankService.updateQuestionSemester(
          req.params.id,
          req.body.semester,
          req.body.topic_id,
          req.body.level_id
        );
        return reply.send({
          success: true,
          message: `Semester soal berhasil diubah menjadi Semester ${req.body.semester}`,
          data: result,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal mengubah semester soal';
        return reply.status(400).send({ success: false, message });
      }
    }
  );
}

