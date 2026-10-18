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
import { AuthService } from '../src/modules/auth/auth.service.js';
import { closeDb, getDb } from '../src/db/index.js';
import { QuestionBankFile } from '@kidsgo/shared';

describe('Curriculum & Question Bank Engine', () => {
  const app = buildServer();

  before(async () => {
    closeDb();
    process.env.DATABASE_PATH = testDbPath;
    runMigrations();
    seedCurriculum();
    await AuthService.bootstrapAdmin();
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

  test('Question status transition: active -> archived -> active (unarchive)', async () => {
    // 1. Archive
    const archiveRes = await app.inject({
      method: 'POST',
      url: `/api/admin/questions/${testQuestionId}/archive`,
    });
    assert.strictEqual(archiveRes.statusCode, 200);

    const db = getDb();
    let row = db.prepare('SELECT status FROM questions WHERE question_id = ?').get(testQuestionId) as { status: string };
    assert.strictEqual(row.status, 'archived');

    // 2. Unarchive back to active
    const reactivateRes = await app.inject({
      method: 'POST',
      url: `/api/admin/questions/${testQuestionId}/activate`,
    });
    assert.strictEqual(reactivateRes.statusCode, 200);

    row = db.prepare('SELECT status FROM questions WHERE question_id = ?').get(testQuestionId) as { status: string };
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

  test('Admin Curriculum CRUD: Topic & Level management', async () => {
    // 1. Unauthenticated request should be rejected (401)
    const unauthRes = await app.inject({
      method: 'GET',
      url: '/api/admin/curriculum/overview',
    });
    assert.strictEqual(unauthRes.statusCode, 401);

    // 2. Login as admin to get cookie
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: { pin: '123456' },
    });
    assert.strictEqual(loginRes.statusCode, 200);
    const adminCookie = loginRes.cookies.find((c) => c.name === 'kidsgo_admin_token');
    assert.ok(adminCookie);

    const authHeaders = {
      cookie: `kidsgo_admin_token=${adminCookie.value}`,
    };

    // 3. Create a new topic
    const createTopicRes = await app.inject({
      method: 'POST',
      url: '/api/admin/curriculum/topics',
      headers: authHeaders,
      payload: {
        education_level: 'SD_1',
        semester: 1,
        name: 'Mengenal Bangun Ruang Sederhana',
      },
    });
    assert.strictEqual(createTopicRes.statusCode, 201);
    const topicBody = JSON.parse(createTopicRes.payload);
    assert.strictEqual(topicBody.success, true);
    assert.strictEqual(topicBody.data.name, 'Mengenal Bangun Ruang Sederhana');
    const createdTopicId = topicBody.data.id;

    // 4. Create a new level in this topic
    const createLevelRes = await app.inject({
      method: 'POST',
      url: `/api/admin/curriculum/topics/${createdTopicId}/levels`,
      headers: authHeaders,
      payload: {
        name: 'Balok dan Kubus Ceria',
        level_number: 1,
        required_xp: 45,
      },
    });
    assert.strictEqual(createLevelRes.statusCode, 201);
    const levelBody = JSON.parse(createLevelRes.payload);
    assert.strictEqual(levelBody.success, true);
    assert.strictEqual(levelBody.data.name, 'Balok dan Kubus Ceria');
    assert.strictEqual(levelBody.data.required_xp, 45);
    const createdLevelId = levelBody.data.id;

    // 5. Update level
    const updateLevelRes = await app.inject({
      method: 'PUT',
      url: `/api/admin/curriculum/levels/${createdLevelId}`,
      headers: authHeaders,
      payload: {
        name: 'Balok, Kubus, dan Bola Ceria',
        required_xp: 60,
      },
    });
    assert.strictEqual(updateLevelRes.statusCode, 200);
    const updatedLevelBody = JSON.parse(updateLevelRes.payload);
    assert.strictEqual(updatedLevelBody.data.name, 'Balok, Kubus, dan Bola Ceria');
    assert.strictEqual(updatedLevelBody.data.required_xp, 60);

    // 6. Update topic
    const updateTopicRes = await app.inject({
      method: 'PUT',
      url: `/api/admin/curriculum/topics/${createdTopicId}`,
      headers: authHeaders,
      payload: {
        name: 'Geometri dan Bangun Ruang',
      },
    });
    assert.strictEqual(updateTopicRes.statusCode, 200);
    const updatedTopicBody = JSON.parse(updateTopicRes.payload);
    assert.strictEqual(updatedTopicBody.data.name, 'Geometri dan Bangun Ruang');

    // 7. Get curriculum overview
    const overviewRes = await app.inject({
      method: 'GET',
      url: '/api/admin/curriculum/overview?grade=SD_1&semester=1',
      headers: authHeaders,
    });
    assert.strictEqual(overviewRes.statusCode, 200);
    const overviewBody = JSON.parse(overviewRes.payload);
    assert.ok(overviewBody.data.some((t: any) => t.id === createdTopicId));

    // 8. Delete level
    const deleteLevelRes = await app.inject({
      method: 'DELETE',
      url: `/api/admin/curriculum/levels/${createdLevelId}`,
      headers: authHeaders,
    });
    assert.strictEqual(deleteLevelRes.statusCode, 200);

    // 9. Delete topic
    const deleteTopicRes = await app.inject({
      method: 'DELETE',
      url: `/api/admin/curriculum/topics/${createdTopicId}`,
      headers: authHeaders,
    });
    assert.strictEqual(deleteTopicRes.statusCode, 200);
  });

  test('Admin Assign Level to Question and Manage Questions per Level', async () => {
    // Login as admin
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: { pin: '123456' },
    });
    const setCookie = loginRes.headers['set-cookie'] as string;
    const cookieVal = setCookie.split(';')[0];
    const authHeaders = { cookie: cookieVal };

    const db = getDb();
    const levelRow = db.prepare('SELECT id FROM levels LIMIT 1').get() as { id: string };
    assert.ok(levelRow);

    // 1. Assign level via POST /api/admin/questions/:id/assign-level
    const assignRes = await app.inject({
      method: 'POST',
      url: `/api/admin/questions/${testQuestionId}/assign-level`,
      payload: { level_id: levelRow.id },
    });
    assert.strictEqual(assignRes.statusCode, 200);

    // 2. GET level questions
    const lvlQuestionsRes = await app.inject({
      method: 'GET',
      url: `/api/admin/curriculum/levels/${levelRow.id}/questions`,
      headers: authHeaders,
    });
    assert.strictEqual(lvlQuestionsRes.statusCode, 200);
    const lvlQuestionsBody = JSON.parse(lvlQuestionsRes.payload);
    assert.ok(lvlQuestionsBody.data.some((q: any) => q.question_id === testQuestionId));

    // 3. GET candidates
    const candidatesRes = await app.inject({
      method: 'GET',
      url: `/api/admin/curriculum/levels/${levelRow.id}/candidates`,
      headers: authHeaders,
    });
    assert.strictEqual(candidatesRes.statusCode, 200);

    // 4. Remove question from level
    const removeRes = await app.inject({
      method: 'DELETE',
      url: `/api/admin/curriculum/levels/${levelRow.id}/questions/${testQuestionId}`,
      headers: authHeaders,
    });
    assert.strictEqual(removeRes.statusCode, 200);

    // Verify it is removed from level
    const verifyLvlQRes = await app.inject({
      method: 'GET',
      url: `/api/admin/curriculum/levels/${levelRow.id}/questions`,
      headers: authHeaders,
    });
    const verifyBody = JSON.parse(verifyLvlQRes.payload);
    assert.ok(!verifyBody.data.some((q: any) => q.question_id === testQuestionId));

    // 5. Add back to level via POST /api/admin/curriculum/levels/:id/questions
    const addBackRes = await app.inject({
      method: 'POST',
      url: `/api/admin/curriculum/levels/${levelRow.id}/questions`,
      headers: authHeaders,
      payload: { question_ids: [testQuestionId] },
    });
    assert.strictEqual(addBackRes.statusCode, 200);
  });

  test('Admin Update Question Semester (Ganti Semester Soal)', async () => {
    // 1. Update semester from 1 to 2
    const updateSemRes = await app.inject({
      method: 'POST',
      url: `/api/admin/questions/${testQuestionId}/update-semester`,
      payload: { semester: 2 },
    });
    assert.strictEqual(updateSemRes.statusCode, 200);
    const body = JSON.parse(updateSemRes.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.semester, 2);

    const db = getDb();
    let row = db
      .prepare('SELECT semester, topic_id, level_id FROM questions WHERE question_id = ?')
      .get(testQuestionId) as { semester: number; topic_id: string | null; level_id: string | null };
    assert.strictEqual(row.semester, 2);
    // Karena levelRow lama berasal dari semester 1, level_id harus otomatis di-reset saat pindah semester
    assert.strictEqual(row.level_id, null);

    // 2. Reject invalid semester value
    const invalidSemRes = await app.inject({
      method: 'POST',
      url: `/api/admin/questions/${testQuestionId}/update-semester`,
      payload: { semester: 3 },
    });
    assert.strictEqual(invalidSemRes.statusCode, 400);

    // 3. Update back to semester 1
    const backToSem1Res = await app.inject({
      method: 'POST',
      url: `/api/admin/questions/${testQuestionId}/update-semester`,
      payload: { semester: 1 },
    });
    assert.strictEqual(backToSem1Res.statusCode, 200);
    row = db
      .prepare('SELECT semester FROM questions WHERE question_id = ?')
      .get(testQuestionId) as { semester: number };
    assert.strictEqual(row.semester, 1);
  });

  test('Impor Bank Soal dengan Jalur/Level langsung mengaitkan soal ke level dan kurikulum', async () => {
    const importPayload = {
      schema_version: '1.0',
      subject: 'mathematics',
      education_level: 'TK_B',
      semester: 1,
      topic: 'all',
      level_number: 1,
      difficulty: 2,
      questions: [
        {
          question_id: 'MATH-TKB-DIRECT-0001',
          type: 'multiple_choice',
          question: 'Hitunglah ada berapa jari di satu tangan?',
          visual: '🖐️',
          options: [
            { id: 'A', text: '4' },
            { id: 'B', text: '5' },
            { id: 'C', text: '6' },
          ],
          correct_answer: 'B',
          explanation: 'Satu tangan manusia normal memiliki 5 jari.',
          tags: ['counting', 'tk-b'],
        },
      ],
    };

    // 1. Validasi mengidentifikasi target level
    const valRes = await app.inject({
      method: 'POST',
      url: '/api/admin/questions/validate',
      payload: importPayload,
    });
    assert.strictEqual(valRes.statusCode, 200);
    const valBody = JSON.parse(valRes.payload);
    assert.strictEqual(valBody.report.is_valid, true);
    assert.ok(valBody.report.matched_level);
    assert.strictEqual(valBody.report.matched_level.level_number, 1);

    // 2. Impor langsung mengaitkan soal ke level dan topik kurikulum
    const importRes = await app.inject({
      method: 'POST',
      url: '/api/admin/questions/import',
      payload: importPayload,
    });
    assert.strictEqual(importRes.statusCode, 201);
    const impBody = JSON.parse(importRes.payload);
    assert.strictEqual(impBody.success, true);
    assert.ok(impBody.data.matched_level);
    assert.strictEqual(impBody.data.matched_level.level_number, 1);

    const db = getDb();
    const qRow = db.prepare(`
      SELECT q.id, q.question_id, q.level_id, q.topic_id, l.level_number, t.slug as topic_slug
      FROM questions q
      JOIN levels l ON q.level_id = l.id
      JOIN topics t ON q.topic_id = t.id
      WHERE q.question_id = 'MATH-TKB-DIRECT-0001'
    `).get() as any;

    assert.ok(qRow, 'Soal harus berhasil disimpan dan terhubung ke tabel levels dan topics');
    assert.strictEqual(qRow.level_number, 1);
    assert.strictEqual(qRow.topic_slug, 'tk-b-s1-hitung-1-10');
  });
});

