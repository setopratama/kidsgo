import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';

const testDbPath = path.resolve(process.cwd(), `data/test-rewards-${Date.now()}.db`);
process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = 'test';

import { buildServer } from '../src/server.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedCurriculum } from '../src/db/seed.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { closeDb, getDb } from '../src/db/index.js';

describe('Rewards (Badges, Cards) & Leaderboard Engine', () => {
  const app = buildServer();

  let player1Id = '';
  let player1Cookie = '';
  let player2Id = '';
  let level1Id = '';

  before(async () => {
    closeDb();
    process.env.DATABASE_PATH = testDbPath;
    runMigrations();
    seedCurriculum();

    // 1. Daftarkan 2 pemain anak
    const p1 = await AuthService.registerPlayer({
      nickname: 'Budi_Cilik',
      avatar: '🦊',
      grade: 'SD_1',
      pin: '1234',
    });
    player1Id = p1.player.id;
    player1Cookie = `kidsgo_player_token=${p1.sessionToken}`;

    const p2 = await AuthService.registerPlayer({
      nickname: 'Siti_Bintang',
      avatar: '🐱',
      grade: 'SD_1',
      pin: '5678',
    });
    player2Id = p2.player.id;

    // 2. Ambil Level 1 SD 1 Semester 1
    const db = getDb();
    const l1 = db.prepare(`
      SELECT l.id FROM levels l
      JOIN topics t ON l.topic_id = t.id
      WHERE t.education_level = 'SD_1' AND t.semester = 1 AND l.level_number = 1
    `).get() as { id: string };
    level1Id = l1.id;
  });

  after(async () => {
    await app.close();
  });

  test('Aturan 1: GET /api/rewards/badges mengembalikan daftar lencana awal', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/rewards/badges',
      headers: { cookie: player1Cookie },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.badges));
    assert.ok(body.data.total_count > 0);
    // Belum ada lencana yang terbuka di awal
    assert.strictEqual(body.data.unlocked_count, 0);
  });

  test('Aturan 2: GET /api/rewards/cards mengembalikan album kartu RPG', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/rewards/cards',
      headers: { cookie: player1Cookie },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.cards));
    assert.ok(body.data.total_count >= 7);
    assert.strictEqual(body.data.owned_count, 0);
  });

  test('Aturan 3: Menuntaskan level 100% memberikan kartu RPG & membuka lencana', async () => {
    // Mulai sesi bermain
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/game/session/start',
      headers: { cookie: player1Cookie },
      payload: { levelId: level1Id, questionCount: 1 },
    });
    const sessionData = JSON.parse(startRes.payload).data;
    const q = sessionData.currentQuestion;

    const db = getDb();
    const correctAns = (db.prepare('SELECT correct_answer FROM questions WHERE question_id = ?').get(q.question_id) as { correct_answer: string }).correct_answer;

    // Submit jawaban benar
    const subRes = await app.inject({
      method: 'POST',
      url: '/api/game/session/submit',
      headers: { cookie: player1Cookie },
      payload: {
        sessionId: sessionData.sessionId,
        questionId: q.question_id,
        selectedAnswer: correctAns,
      },
    });

    assert.strictEqual(subRes.statusCode, 200);
    const subBody = JSON.parse(subRes.payload).data;
    assert.strictEqual(subBody.is_correct, true);
    assert.strictEqual(subBody.is_level_completed, true);
    assert.ok(subBody.progression.awarded_card !== null);

    // Verifikasi lencana ter-unlock
    const badgeRes = await app.inject({
      method: 'GET',
      url: '/api/rewards/badges',
      headers: { cookie: player1Cookie },
    });
    const badgeBody = JSON.parse(badgeRes.payload).data;
    assert.ok(badgeBody.unlocked_count >= 1);
    const firstStep = badgeBody.badges.find((b: { slug: string }) => b.slug === 'first-step');
    assert.strictEqual(firstStep.unlocked, true);

    // Verifikasi kartu dimiliki di album
    const cardRes = await app.inject({
      method: 'GET',
      url: '/api/rewards/cards',
      headers: { cookie: player1Cookie },
    });
    const cardBody = JSON.parse(cardRes.payload).data;
    assert.strictEqual(cardBody.owned_count, 1);
  });

  test('Aturan 4: Pemberian reward bersifat IDEMPOTENT (tidak ada duplikasi kartu untuk level yang sama)', async () => {
    // Mulai lagi level 1 dan tuntas lagi
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/game/session/start',
      headers: { cookie: player1Cookie },
      payload: { levelId: level1Id, questionCount: 1 },
    });
    const sessionData = JSON.parse(startRes.payload).data;
    const q = sessionData.currentQuestion;

    const db = getDb();
    const correctAns = (db.prepare('SELECT correct_answer FROM questions WHERE question_id = ?').get(q.question_id) as { correct_answer: string }).correct_answer;

    const subRes = await app.inject({
      method: 'POST',
      url: '/api/game/session/submit',
      headers: { cookie: player1Cookie },
      payload: {
        sessionId: sessionData.sessionId,
        questionId: q.question_id,
        selectedAnswer: correctAns,
      },
    });
    const subBody = JSON.parse(subRes.payload).data;
    assert.strictEqual(subBody.is_level_completed, true);
    // Kartu tidak bertambah ganda karena level ini sudah pernah memberikan kartu
    assert.strictEqual(subBody.progression.awarded_card, null);

    const cardRes = await app.inject({
      method: 'GET',
      url: '/api/rewards/cards',
      headers: { cookie: player1Cookie },
    });
    assert.strictEqual(JSON.parse(cardRes.payload).data.owned_count, 1);
  });

  test('Aturan 5: Leaderboard menghitung peringkat konsisten dari XP ledger & privasi aman (tanpa PIN/hash/email)', async () => {
    // Beri Siti Bintang XP lebih banyak secara resmi
    const db = getDb();
    db.prepare(`
      INSERT INTO xp_ledger (id, player_id, amount, reason, reference_id, created_at)
      VALUES ('xp-siti-1', ?, 150, 'Ujian Juara', 'ref-siti-1', datetime('now'))
    `).run(player2Id);
    db.prepare('UPDATE players SET current_xp = 150 WHERE id = ?').run(player2Id);

    const res = await app.inject({
      method: 'GET',
      url: '/api/leaderboard?period=all',
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    const list = body.data.leaderboard;
    assert.ok(list.length >= 2);

    // Siti Bintang (150 XP) harus berada di Rank 1
    assert.strictEqual(list[0].nickname, 'Siti_Bintang');
    assert.strictEqual(list[0].rank, 1);
    assert.strictEqual(list[0].total_xp, 150);

    // Budi Cilik harus berada di Rank 2
    assert.strictEqual(list[1].nickname, 'Budi_Cilik');
    assert.strictEqual(list[1].rank, 2);

    // JAMINAN PRIVASI (AGENTS.md Section 8 & 10):
    for (const entry of list) {
      assert.strictEqual(entry.pin_hash, undefined);
      assert.strictEqual(entry.pin, undefined);
      assert.strictEqual(entry.email, undefined);
      assert.strictEqual(entry.token, undefined);
      assert.ok(entry.nickname);
      assert.ok(entry.avatar);
      assert.ok(entry.grade);
      assert.ok(typeof entry.total_xp === 'number');
    }
  });

  test('Aturan 6: Leaderboard filter berdasarkan jenjang pendidikan (grade)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/leaderboard?period=all&grade=SD_1',
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.grade, 'SD_1');
    assert.ok(body.data.leaderboard.every((e: { grade: string }) => e.grade === 'SD_1'));
  });
});
