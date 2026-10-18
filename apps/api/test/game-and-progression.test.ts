import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';

const testDbPath = path.resolve(process.cwd(), `data/test-game-${Date.now()}.db`);
process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = 'test';

import { buildServer } from '../src/server.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedCurriculum } from '../src/db/seed.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { QuestionBankService } from '../src/modules/question-bank/question-bank.service.js';
import { GameEngineService } from '../src/modules/game-engine/game-engine.service.js';
import { closeDb, getDb } from '../src/db/index.js';
import { QuestionBankFile } from '@kidsgo/shared';

describe('Game Engine & Progression Core', () => {
  const app = buildServer();

  let playerId = '';
  let playerCookie = '';
  let level1Id = '';
  let level2Id = '';

  before(async () => {
    closeDb();
    process.env.DATABASE_PATH = testDbPath;
    runMigrations();
    seedCurriculum();

    // 1. Daftarkan anak untuk pengujian
    const reg = await AuthService.registerPlayer({
      nickname: 'Andi_Juara',
      avatar: '🦊',
      grade: 'SD_1',
      pin: '1234',
    });
    playerId = reg.player.id;
    playerCookie = `kidsgo_player_token=${reg.sessionToken}`;

    // 2. Ambil ID Level 1 dan Level 2 pada topik SD 1 Semester 1
    const db = getDb();
    const l1 = db.prepare(`
      SELECT l.id FROM levels l
      JOIN topics t ON l.topic_id = t.id
      WHERE t.education_level = 'SD_1' AND t.semester = 1 AND l.level_number = 1
    `).get() as { id: string };
    level1Id = l1.id;

    const l2 = db.prepare(`
      SELECT l.id FROM levels l
      JOIN topics t ON l.topic_id = t.id
      WHERE t.education_level = 'SD_1' AND t.semester = 1 AND l.level_number = 2
    `).get() as { id: string };
    level2Id = l2.id;

    // 3. Masukkan & aktifkan bank soal SD 1 Semester 1 untuk topik ini
    const sampleBank: QuestionBankFile = {
      schema_version: '1.0',
      subject: 'mathematics',
      education_level: 'SD_1',
      semester: 1,
      topic: 'tambah-kurang',
      difficulty: 1,
      questions: [
        {
          question_id: 'MATH-SD1-TEST-01',
          type: 'multiple_choice',
          question: 'Berapakah 2 + 2?',
          options: [
            { id: 'A', text: '3' },
            { id: 'B', text: '4' },
            { id: 'C', text: '5' },
          ],
          correct_answer: 'B',
          explanation: 'Dua ditambah dua sama dengan empat.',
          tags: ['basic'],
        },
        {
          question_id: 'MATH-SD1-TEST-02',
          type: 'multiple_choice',
          question: 'Berapakah 3 + 1?',
          options: [
            { id: 'A', text: '4' },
            { id: 'B', text: '5' },
            { id: 'C', text: '6' },
          ],
          correct_answer: 'A',
          explanation: 'Tiga ditambah satu sama dengan empat.',
          tags: ['basic'],
        },
      ],
    };

    const imp = QuestionBankService.importQuestions(sampleBank, 'admin', 'test.json');
    QuestionBankService.bulkApproveBatch(imp.batch_id);
    QuestionBankService.updateQuestionStatus('MATH-SD1-TEST-01', 'active');
    QuestionBankService.updateQuestionStatus('MATH-SD1-TEST-02', 'active');
  });

  after(async () => {
    await app.close();
  });

  test('Aturan 1: Anak TIDAK BISA membuka level 2 sebelum level 1 selesai', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/game/session/start',
      headers: { cookie: playerCookie },
      payload: {
        levelId: level2Id,
      },
    });

    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('belum memenuhi syarat'));
  });

  let activeSessionId = '';
  let firstQuestionId = '';

  test('Aturan 2: Memulai level 1 berhasil dan KUNCI JAWABAN TIDAK BOCOR ke frontend', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/game/session/start',
      headers: { cookie: playerCookie },
      payload: {
        levelId: level1Id,
        questionCount: 2,
      },
    });

    assert.strictEqual(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.sessionId);
    assert.strictEqual(body.data.totalQuestions, 2);

    const q = body.data.currentQuestion;
    assert.ok(q.question_id);
    assert.ok(q.question);
    assert.ok(Array.isArray(q.options));

    // KUNCI JAWABAN & PENJELASAN TIDAK BOLEH ADA DI PAYLOAD SOAL
    assert.strictEqual(q.correct_answer, undefined);
    assert.strictEqual(q.explanation, undefined);

    activeSessionId = body.data.sessionId;
    firstQuestionId = q.question_id;
  });

  test('Aturan 3: Jawaban salah tidak mengurangi progres benar dan memberikan penjelasan suportif', async () => {
    const db = getDb();
    const correctRow = db.prepare('SELECT correct_answer FROM questions WHERE question_id = ?').get(firstQuestionId) as {
      correct_answer: string;
    };

    // Pilih opsi yang sengaja SALAH
    const wrongAnswer = correctRow.correct_answer === 'A' ? 'B' : 'A';

    const res = await app.inject({
      method: 'POST',
      url: '/api/game/session/submit',
      headers: { cookie: playerCookie },
      payload: {
        sessionId: activeSessionId,
        questionId: firstQuestionId,
        selectedAnswer: wrongAnswer,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.is_correct, false);
    assert.strictEqual(body.data.xp_awarded, 0);
    assert.strictEqual(body.data.correct_answer, correctRow.correct_answer); // baru dikirim setelah anak menjawab
    assert.ok(body.data.explanation.length > 0);
  });

  test('Aturan 4: Jawaban benar menambah XP ke xp_ledger & idempoten (anti-farming)', async () => {
    // Mulai sesi baru untuk menyelesaikan soal dengan benar
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/game/session/start',
      headers: { cookie: playerCookie },
      payload: { levelId: level1Id, questionCount: 2 },
    });
    const sessionData = JSON.parse(startRes.payload).data;

    const q1 = sessionData.currentQuestion;
    const db = getDb();
    const correctQ1 = (db.prepare('SELECT correct_answer FROM questions WHERE question_id = ?').get(q1.question_id) as { correct_answer: string }).correct_answer;

    // Jawab benar soal 1
    const submit1 = await app.inject({
      method: 'POST',
      url: '/api/game/session/submit',
      headers: { cookie: playerCookie },
      payload: {
        sessionId: sessionData.sessionId,
        questionId: q1.question_id,
        selectedAnswer: correctQ1,
      },
    });
    const sub1Body = JSON.parse(submit1.payload).data;
    assert.strictEqual(sub1Body.is_correct, true);
    assert.strictEqual(sub1Body.xp_awarded, 10);

    // Verifikasi catatan di tabel xp_ledger
    const ledgerRow = db.prepare('SELECT amount FROM xp_ledger WHERE player_id = ?').all(playerId);
    assert.ok(ledgerRow.length > 0);

    // Jawab benar soal 2 untuk menyelesaikan level (100% target)
    const q2 = sub1Body.next_question;
    const correctQ2 = (db.prepare('SELECT correct_answer FROM questions WHERE question_id = ?').get(q2.question_id) as { correct_answer: string }).correct_answer;

    const submit2 = await app.inject({
      method: 'POST',
      url: '/api/game/session/submit',
      headers: { cookie: playerCookie },
      payload: {
        sessionId: sessionData.sessionId,
        questionId: q2.question_id,
        selectedAnswer: correctQ2,
      },
    });
    const sub2Body = JSON.parse(submit2.payload).data;
    assert.strictEqual(sub2Body.is_correct, true);
    assert.strictEqual(sub2Body.is_level_completed, true);
    assert.strictEqual(sub2Body.progression.next_level_unlocked, true);
  });

  test('Aturan 5: Level 2 sekarang TERBUKA setelah Level 1 tuntas 100%', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/game/session/start',
      headers: { cookie: playerCookie },
      payload: {
        levelId: level2Id,
      },
    });

    assert.strictEqual(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.sessionId);
  });

  test('Aturan 6: Jawaban salah memberikan soal pengganti sehingga anak tetap dapat tuntas 100%', async () => {
    // Mulai sesi level 2
    const start = await app.inject({
      method: 'POST',
      url: '/api/game/session/start',
      headers: { cookie: playerCookie },
      payload: { levelId: level2Id, questionCount: 2 },
    });
    const session = JSON.parse(start.payload).data;
    const db = getDb();

    // Soal 1 dijawab BENAR
    const q1 = session.currentQuestion;
    const ans1 = (db.prepare('SELECT correct_answer FROM questions WHERE question_id = ?').get(q1.question_id) as { correct_answer: string }).correct_answer;
    const sub1 = await app.inject({
      method: 'POST',
      url: '/api/game/session/submit',
      headers: { cookie: playerCookie },
      payload: {
        sessionId: session.sessionId,
        questionId: q1.question_id,
        selectedAnswer: ans1,
      },
    });
    const sub1Body = JSON.parse(sub1.payload).data;
    assert.strictEqual(sub1Body.is_correct, true);

    // Soal 2 dijawab SALAH
    const q2 = sub1Body.next_question;
    const ans2 = (db.prepare('SELECT correct_answer FROM questions WHERE question_id = ?').get(q2.question_id) as { correct_answer: string }).correct_answer;
    const wrongAns2 = ans2 === 'A' ? 'B' : 'A';
    const sub2 = await app.inject({
      method: 'POST',
      url: '/api/game/session/submit',
      headers: { cookie: playerCookie },
      payload: {
        sessionId: session.sessionId,
        questionId: q2.question_id,
        selectedAnswer: wrongAns2,
      },
    });
    const sub2Body = JSON.parse(sub2.payload).data;
    assert.strictEqual(sub2Body.is_correct, false);
    // Soal pengganti disediakan
    assert.ok(sub2Body.next_question !== null);

    // Jawab soal pengganti dengan BENAR
    const qReplacement = sub2Body.next_question;
    const ansRepl = (db.prepare('SELECT correct_answer FROM questions WHERE question_id = ?').get(qReplacement.question_id) as { correct_answer: string }).correct_answer;
    const sub3 = await app.inject({
      method: 'POST',
      url: '/api/game/session/submit',
      headers: { cookie: playerCookie },
      payload: {
        sessionId: session.sessionId,
        questionId: qReplacement.question_id,
        selectedAnswer: ansRepl,
      },
    });
    const sub3Body = JSON.parse(sub3.payload).data;
    assert.strictEqual(sub3Body.is_correct, true);
    assert.strictEqual(sub3Body.is_level_completed, true);
  });

  test('Aturan 7: Semester 2 terkunci jika Semester 1 belum selesai 100%', async () => {
    const db = getDb();
    const sem2Level = db.prepare(`
      SELECT l.id FROM levels l
      JOIN topics t ON l.topic_id = t.id
      WHERE t.education_level = 'SD_1' AND t.semester = 2
      ORDER BY l.level_number ASC LIMIT 1
    `).get() as { id: string };

    const res = await app.inject({
      method: 'POST',
      url: '/api/game/session/start',
      headers: { cookie: playerCookie },
      payload: {
        levelId: sem2Level.id,
      },
    });

    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('belum memenuhi syarat'));
  });

  test('Aturan 8: Jenjang SD 2 terkunci jika jenjang SD 1 belum selesai 100%', async () => {
    const db = getDb();
    const sd2Level = db.prepare(`
      SELECT l.id FROM levels l
      JOIN topics t ON l.topic_id = t.id
      WHERE t.education_level = 'SD_2' AND t.semester = 1
      ORDER BY l.level_number ASC LIMIT 1
    `).get() as { id: string };

    const res = await app.inject({
      method: 'POST',
      url: '/api/game/session/start',
      headers: { cookie: playerCookie },
      payload: {
        levelId: sd2Level.id,
      },
    });

    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('belum memenuhi syarat'));
  });

  test('Aturan 9: Pengacakan opsi (Fisher-Yates) menjaga keutuhan ID dan teks pilihan', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/game/session/start',
      headers: { cookie: playerCookie },
      payload: { levelId: level1Id, questionCount: 1 },
    });

    const body = JSON.parse(res.payload);
    const returnedQuestion = body.data.currentQuestion;
    const shuffledOptions = returnedQuestion.options as Array<{ id: string; text: string }>;

    const db = getDb();
    const dbQuestion = db.prepare('SELECT options_json FROM questions WHERE question_id = ?').get(returnedQuestion.question_id) as { options_json: string };
    const originalOptions = JSON.parse(dbQuestion.options_json) as Array<{ id: string; text: string }>;

    // Jumlah opsi sama
    assert.strictEqual(shuffledOptions.length, originalOptions.length);

    // Semua ID asli tetap ada dan teksnya identik
    for (const opt of shuffledOptions) {
      const match = originalOptions.find((o) => o.id === opt.id);
      assert.ok(match, `Option id ${opt.id} harus ditemukan pada opsi asli`);
      assert.strictEqual(opt.text, match.text);
    }
  });

  test('Aturan 10: Soal tidak berulang dalam satu sesi', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/game/session/start',
      headers: { cookie: playerCookie },
      payload: { levelId: level1Id, questionCount: 2 },
    });

    const body = JSON.parse(res.payload);
    const session = GameEngineService.getActiveSession(body.data.sessionId);
    assert.ok(session, 'Sesi bermain aktif harus ada');

    const qIds = session.questions.map((q) => q.question_id);
    const uniqueSet = new Set(qIds);
    assert.strictEqual(uniqueSet.size, qIds.length, 'Tidak boleh ada ID soal yang duplikat dalam satu sesi');
  });
});
