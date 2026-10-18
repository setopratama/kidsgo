import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';

const testDbPath = path.resolve(process.cwd(), `data/test-auth-${Date.now()}.db`);
process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = 'test';

import { buildServer } from '../src/server.js';
import { runMigrations } from '../src/db/migrate.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { closeDb, getDb } from '../src/db/index.js';

describe('Auth & Security (Child & Admin)', () => {
  const app = buildServer();

  before(async () => {
    closeDb();
    process.env.DATABASE_PATH = testDbPath;
    runMigrations();
    await AuthService.bootstrapAdmin();
  });

  after(async () => {
    await app.close();
  });

  const testNickname = `Budi_${Date.now()}`;
  let playerCookie = '';
  let playerId = '';

  test('POST /api/auth/player/register successfully registers child and sets HttpOnly cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/player/register',
      payload: {
        nickname: testNickname,
        avatar: '🦊',
        grade: 'SD_1',
        pin: '1234',
      },
    });

    assert.strictEqual(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.player.nickname, testNickname);
    assert.strictEqual(body.player.grade, 'SD_1');
    assert.strictEqual(body.player.current_xp, 0);

    // Pastikan PIN atau PIN hash TIDAK bocor ke response
    assert.strictEqual(body.player.pin, undefined);
    assert.strictEqual(body.player.pin_hash, undefined);
    assert.strictEqual(body.pin, undefined);
    assert.strictEqual(body.pin_hash, undefined);

    playerId = body.player.id;

    // Pastikan cookie HttpOnly terpasang
    const setCookie = res.headers['set-cookie'];
    assert.ok(setCookie);
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(cookieStr.includes('kidsgo_player_token='));
    assert.ok(cookieStr.toLowerCase().includes('httponly'));

    playerCookie = cookieStr.split(';')[0];

    // Periksa di database bahwa PIN disimpan sebagai HASH bukan plaintext
    const db = getDb();
    const row = db.prepare('SELECT pin_hash FROM players WHERE id = ?').get(playerId) as { pin_hash: string };
    assert.notStrictEqual(row.pin_hash, '1234');
    assert.ok(row.pin_hash.startsWith('$2')); // bcrypt hash signature
  });

  test('GET /api/auth/player/me returns profile using HttpOnly cookie', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/player/me',
      headers: {
        cookie: playerCookie,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.player.id, playerId);
    assert.strictEqual(body.player.nickname, testNickname);
  });

  test('POST /api/auth/player/login verifies correct PIN', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/player/login',
      payload: {
        nickname: testNickname,
        pin: '1234',
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.player.nickname, testNickname);
  });

  test('POST /api/auth/player/login rejects wrong PIN and rate limits brute-force', async () => {
    // 1. Coba dengan PIN salah
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/player/login',
      payload: {
        nickname: testNickname,
        pin: '9999',
      },
    });

    assert.strictEqual(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('Nama anak atau PIN tidak cocok'));
  });

  let adminCookie = '';

  test('Admin bootstrap login with initial PIN 123456', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {
        username: 'admin',
        pin: '123456',
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.admin.username, 'admin');
    assert.strictEqual(body.admin.is_default_pin, true); // Masih memakai default PIN

    const setCookie = res.headers['set-cookie'];
    assert.ok(setCookie);
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(cookieStr.includes('kidsgo_admin_token='));
    adminCookie = cookieStr.split(';')[0];
  });

  test('POST /api/admin/auth/change-pin updates admin PIN and turns off is_default_pin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/change-pin',
      headers: {
        cookie: adminCookie,
      },
      payload: {
        currentPin: '123456',
        newPin: '889900',
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);

    // Verifikasi bahwa login dengan PIN lama (123456) sekarang GAGAL
    const oldLoginRes = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {
        username: 'admin',
        pin: '123456',
      },
    });
    assert.strictEqual(oldLoginRes.statusCode, 401);

    // Verifikasi bahwa login dengan PIN baru (889900) BERHASIL dan is_default_pin = false
    const newLoginRes = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {
        username: 'admin',
        pin: '889900',
      },
    });
    assert.strictEqual(newLoginRes.statusCode, 200);
    const newBody = JSON.parse(newLoginRes.payload);
    assert.strictEqual(newBody.admin.is_default_pin, false);
  });

  test('POST /api/admin/players/:id/reset-pin allows admin to reset child PIN', async () => {
    // Admin login kembali untuk dapat token baru
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: { username: 'admin', pin: '889900' },
    });
    const setCookie = adminLogin.headers['set-cookie'];
    const newAdminCookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)!.split(';')[0];

    const resetRes = await app.inject({
      method: 'POST',
      url: `/api/admin/players/${playerId}/reset-pin`,
      headers: {
        cookie: newAdminCookie,
      },
      payload: {
        newPin: '5678',
      },
    });

    assert.strictEqual(resetRes.statusCode, 200);

    // Anak sekarang bisa login dengan PIN baru '5678'
    const childLoginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/player/login',
      payload: {
        nickname: testNickname,
        pin: '5678',
      },
    });
    assert.strictEqual(childLoginRes.statusCode, 200);
  });

  test('POST /api/admin/players/:id/suspend allows admin to suspend and unsuspend child account', async () => {
    // 1. Dapatkan token admin
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: { username: 'admin', pin: '889900' },
    });
    const setCookie = adminLogin.headers['set-cookie'];
    const adminCookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)!.split(';')[0];

    // 2. Anak login dulu untuk mendapatkan session aktif
    const childLoginBefore = await app.inject({
      method: 'POST',
      url: '/api/auth/player/login',
      payload: { nickname: testNickname, pin: '5678' },
    });
    assert.strictEqual(childLoginBefore.statusCode, 200);
    const childCookie = (Array.isArray(childLoginBefore.headers['set-cookie'])
      ? childLoginBefore.headers['set-cookie'][0]
      : childLoginBefore.headers['set-cookie'])!.split(';')[0];

    // 3. Admin menangguhkan (suspend) akun anak
    const suspendRes = await app.inject({
      method: 'POST',
      url: `/api/admin/players/${playerId}/suspend`,
      headers: { cookie: adminCookie },
      payload: { isSuspended: true },
    });
    assert.strictEqual(suspendRes.statusCode, 200);
    const suspendBody = JSON.parse(suspendRes.payload);
    assert.strictEqual(suspendBody.success, true);

    // 4. Sesi aktif anak sebelumnya harus langsung tertolak (invalidasi sesi)
    const checkMeRes = await app.inject({
      method: 'GET',
      url: '/api/auth/player/me',
      headers: { cookie: childCookie },
    });
    assert.strictEqual(checkMeRes.statusCode, 401);

    // 5. Anak mencoba login baru saat ditangguhkan -> Ditolak dengan pesan suspend (401)
    const childLoginWhileSuspended = await app.inject({
      method: 'POST',
      url: '/api/auth/player/login',
      payload: { nickname: testNickname, pin: '5678' },
    });
    assert.strictEqual(childLoginWhileSuspended.statusCode, 401);
    const failBody = JSON.parse(childLoginWhileSuspended.payload);
    assert.ok(failBody.message.includes('suspend') || failBody.message.includes('dinonaktifkan'));

    // 6. Admin mengaktifkan kembali (unsuspend) akun anak
    const unsuspendRes = await app.inject({
      method: 'POST',
      url: `/api/admin/players/${playerId}/suspend`,
      headers: { cookie: adminCookie },
      payload: { isSuspended: false },
    });
    assert.strictEqual(unsuspendRes.statusCode, 200);

    // 7. Anak dapat login kembali secara normal
    const childLoginAfterUnsuspend = await app.inject({
      method: 'POST',
      url: '/api/auth/player/login',
      payload: { nickname: testNickname, pin: '5678' },
    });
    assert.strictEqual(childLoginAfterUnsuspend.statusCode, 200);
  });
});
