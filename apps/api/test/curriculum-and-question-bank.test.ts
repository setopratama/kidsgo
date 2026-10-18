import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';

const testDbPath = path.resolve(process.cwd(), `data/test-qb-${Date.now()}.db`);
process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = 'test';

import { buildServer } from '../src/server.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedCurriculum } from '../src/db/seed.js';
import { closeDb, getDb } from '../src/db/index.js';
import { QuestionBankFile } from '@kidsgo/shared';

describe('Curriculum & Question Bank Engine', () => {
  const app = buildServer();

  before(() => {
    closeDb();
    process.env.DATABASE_PATH = testDbPath;
    runMigrations();
    seedCurriculum();
  });

  after(async () => {
    await app.close();
  });

  test('GET /api/curriculum/grades returns all education levels', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/curriculum/grades',
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.length, 8);
    assert.strictEqual(body.data[0].code, 'TK_A');
    assert.strictEqual(body.data[2].code, 'SD_1');
  });

  test('GET /api/curriculum/topics returns filtered topics with level counts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/curriculum/topics?grade=SD_1&semester=1',
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 1);
    assert.strictEqual(body.data[0].education_level, 'SD_1');
    assert.strictEqual(body.data[0].semester, 1);
    assert.ok(body.data[0].total_levels > 0);
  });

  test('POST /api/admin/questions/validate rejects invalid schema', async () => {
    const invalidPayload = {
      schema_version: '2.0', // versi salah
      subject: 'physics', // subjek belum aktif
      education_level: 'SD_1',
      semester: 1,
      topic: 'force',
      difficulty: 1,
      questions: [],
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/questions/validate',
      payload: invalidPayload,
    });

    assert.strictEqual(res.statusCode, 400); // ditolak oleh Fastify JSON Schema bawaan
  });

  test('POST /api/admin/questions/validate rejects options without valid correct_answer', async () => {
    const invalidDomainPayload: QuestionBankFile = {
      schema_version: '1.0',
      subject: 'mathematics',
      education_level: 'SD_1',
      semester: 1,
      topic: 'addition',
      difficulty: 1,
      questions: [
        {
          question_id: 'TEST-MATH-INVALID-1',
          type: 'multiple_choice',
          question: '1 + 1 = ?',
          options: [
            { id: 'A', text: '2' },
            { id: 'B', text: '3' },
          ],
          correct_answer: 'Z', // ID tidak ada di options
          explanation: 'Satu ditambah satu adalah dua.',
          tags: ['math'],
        },
      ],
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/questions/validate',
      payload: invalidDomainPayload,
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.report.is_valid, false);
    assert.ok(body.report.errors.some((e: { field: string }) => e.field === 'correct_answer'));
  });

  let importedBatchId = '';
  let testQuestionId = `TEST-MATH-SD1-${Date.now()}`;

  test('POST /api/admin/questions/import saves questions with initial status "draft"', async () => {
    const validPayload: QuestionBankFile = {
      schema_version: '1.0',
      subject: 'mathematics',
      education_level: 'SD_1',
      semester: 1,
      topic: 'addition',
      difficulty: 2,
      questions: [
        {
          question_id: testQuestionId,
          type: 'multiple_choice',
          question: 'Berapakah hasil 4 + 4?',
          visual: '🍎🍎🍎🍎 + 🍎🍎🍎🍎',
          options: [
            { id: 'A', text: '7' },
            { id: 'B', text: '8' },
            { id: 'C', text: '9' },
          ],
          correct_answer: 'B',
          explanation: 'Empat ditambah empat sama dengan delapan.',
          tags: ['addition', 'test'],
        },
      ],
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/questions/import',
      payload: validPayload,
    });

    assert.strictEqual(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'draft');
    assert.strictEqual(body.data.total_imported, 1);
    assert.ok(body.data.batch_id);

    importedBatchId = body.data.batch_id;

    // Pastikan status di database benar-benar 'draft'
    const db = getDb();
    const row = db.prepare('SELECT status FROM questions WHERE question_id = ?').get(testQuestionId) as { status: string };
    assert.strictEqual(row.status, 'draft');
  });

  test('POST /api/admin/questions/import rejects duplicate question_id', async () => {
    const duplicatePayload: QuestionBankFile = {
      schema_version: '1.0',
      subject: 'mathematics',
      education_level: 'SD_1',
      semester: 1,
      topic: 'addition',
      difficulty: 2,
      questions: [
        {
          question_id: testQuestionId, // duplikat dengan yang baru saja diimpor
          type: 'multiple_choice',
          question: 'Pertanyaan lain tapi ID sama',
          options: [
            { id: 'A', text: '1' },
            { id: 'B', text: '2' },
          ],
          correct_answer: 'A',
          explanation: 'Penjelasan.',
          tags: ['test'],
        },
      ],
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/questions/import',
      payload: duplicatePayload,
    });

    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('sudah ada'));
  });

  test('Question status transition: draft -> approved -> active', async () => {
    // 1. Approve
    const approveRes = await app.inject({
      method: 'POST',
      url: `/api/admin/questions/${testQuestionId}/approve`,
    });
    assert.strictEqual(approveRes.statusCode, 200);

    // 2. Activate
    const activateRes = await app.inject({
      method: 'POST',
      url: `/api/admin/questions/${testQuestionId}/activate`,
    });
    assert.strictEqual(activateRes.statusCode, 200);

    const db = getDb();
    const row = db.prepare('SELECT status FROM questions WHERE question_id = ?').get(testQuestionId) as { status: string };
    assert.strictEqual(row.status, 'active');
  });

  test('GET /api/admin/questions/export exports valid schema_version 1.0 JSON', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/questions/export?education_level=SD_1&semester=1',
    });

    assert.strictEqual(res.statusCode, 200);
    const exported: QuestionBankFile = JSON.parse(res.payload);
    assert.strictEqual(exported.schema_version, '1.0');
    assert.strictEqual(exported.subject, 'mathematics');
    assert.strictEqual(exported.education_level, 'SD_1');
    assert.strictEqual(exported.semester, 1);
    assert.ok(Array.isArray(exported.questions));
    assert.ok(exported.questions.some((q) => q.question_id === testQuestionId));
  });
});
