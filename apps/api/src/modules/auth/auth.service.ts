import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getDb } from '../../db/index.js';
import { EducationLevel } from '@kidsgo/shared';

export interface PlayerPublicProfile {
  id: string;
  nickname: string;
  avatar: string;
  grade: EducationLevel;
  current_xp: number;
  created_at: string;
}

export interface AdminPublicProfile {
  id: string;
  username: string;
  is_default_pin: boolean;
}

interface RateLimitEntry {
  attempts: number;
  lockedUntil: number;
}

export class AuthService {
  // In-memory rate limit store: key -> { attempts, lockedUntil }
  private static rateLimitMap = new Map<string, RateLimitEntry>();

  // Aturan proteksi brute-force PIN
  private static MAX_ATTEMPTS = 5;
  private static LOCK_DURATION_MS = 15 * 60 * 1000; // 15 menit

  /**
   * Cek & terapkan rate limiting berdasarkan identitas pengguna / IP
   */
  private static checkRateLimit(key: string): void {
    const entry = this.rateLimitMap.get(key);
    if (!entry) return;

    const now = Date.now();
    if (entry.lockedUntil > now) {
      const waitSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      throw new Error(
        `Terlalu banyak percobaan PIN yang salah. Silakan coba lagi dalam ${waitSeconds} detik.`
      );
    }

    if (entry.lockedUntil <= now && entry.attempts >= this.MAX_ATTEMPTS) {
      // Reset setelah periode jeda selesai
      this.rateLimitMap.delete(key);
    }
  }

  private static recordFailedAttempt(key: string): void {
    const now = Date.now();
    const entry = this.rateLimitMap.get(key) || { attempts: 0, lockedUntil: 0 };
    entry.attempts += 1;

    if (entry.attempts >= this.MAX_ATTEMPTS) {
      entry.lockedUntil = now + this.LOCK_DURATION_MS;
    }

    this.rateLimitMap.set(key, entry);
  }

  private static resetFailedAttempts(key: string): void {
    this.rateLimitMap.delete(key);
  }

  /**
   * Hash token sesi menggunakan SHA-256 untuk disimpan di database
   */
  private static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Buat sesi baru di database
   */
  private static createSession(
    accountType: 'player' | 'admin',
    userId: string,
    durationDays = 7
  ): string {
    const db = getDb();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const sessionId = `sess-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO sessions (id, account_type, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, accountType, userId, tokenHash, expiresAt, createdAt);

    return rawToken;
  }

  // ==========================================
  // AUTENTIKASI ANAK (PLAYERS)
  // ==========================================

  /**
   * Registrasi profil anak baru
   */
  static async registerPlayer(params: {
    nickname: string;
    avatar: string;
    grade: EducationLevel;
    pin: string;
  }): Promise<{ player: PlayerPublicProfile; sessionToken: string }> {
    const db = getDb();
    const nickname = params.nickname.trim();

    if (!nickname || nickname.length < 2 || nickname.length > 20) {
      throw new Error('Nama/nickname anak harus terdiri dari 2 hingga 20 karakter.');
    }

    // Validasi 4-digit PIN
    if (!/^\d{4}$/.test(params.pin)) {
      throw new Error('PIN anak harus berupa tepat 4 digit angka (contoh: 1234).');
    }

    // Cek apakah nickname sudah dipakai
    const existing = db.prepare('SELECT id FROM players WHERE LOWER(nickname) = LOWER(?)').get(nickname);
    if (existing) {
      throw new Error(`Nama panggilan "${nickname}" sudah digunakan. Silakan gunakan nama panggilan lain.`);
    }

    const pinHash = await bcrypt.hash(params.pin, 10);
    const playerId = `ply-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO players (id, nickname, avatar, pin_hash, grade, current_xp, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).run(playerId, nickname, params.avatar || '🦊', pinHash, params.grade, now, now);

    const sessionToken = this.createSession('player', playerId, 14);

    return {
      player: {
        id: playerId,
        nickname,
        avatar: params.avatar || '🦊',
        grade: params.grade,
        current_xp: 0,
        created_at: now,
      },
      sessionToken,
    };
  }

  /**
   * Login anak menggunakan nickname & PIN
   */
  static async loginPlayer(params: {
    nickname: string;
    pin: string;
    clientIp?: string;
  }): Promise<{ player: PlayerPublicProfile; sessionToken: string }> {
    const db = getDb();
    const nickname = params.nickname.trim();
    const rateLimitKey = `player:${nickname.toLowerCase()}:${params.clientIp || 'local'}`;

    this.checkRateLimit(rateLimitKey);

    const row = db.prepare(`
      SELECT id, nickname, avatar, pin_hash, grade, current_xp, created_at 
      FROM players 
      WHERE LOWER(nickname) = LOWER(?)
    `).get(nickname) as (PlayerPublicProfile & { pin_hash: string }) | undefined;

    if (!row) {
      this.recordFailedAttempt(rateLimitKey);
      throw new Error('Nama anak atau PIN tidak cocok.');
    }

    const isMatch = await bcrypt.compare(params.pin, row.pin_hash);
    if (!isMatch) {
      this.recordFailedAttempt(rateLimitKey);
      throw new Error('Nama anak atau PIN tidak cocok.');
    }

    this.resetFailedAttempts(rateLimitKey);
    const sessionToken = this.createSession('player', row.id, 14);

    return {
      player: {
        id: row.id,
        nickname: row.nickname,
        avatar: row.avatar,
        grade: row.grade,
        current_xp: row.current_xp,
        created_at: row.created_at,
      },
      sessionToken,
    };
  }

  /**
   * Ambil profil anak dari session token
   */
  static getPlayerByToken(rawToken: string): PlayerPublicProfile | null {
    const db = getDb();
    const tokenHash = this.hashToken(rawToken);
    const now = new Date().toISOString();

    const row = db.prepare(`
      SELECT p.id, p.nickname, p.avatar, p.grade, p.current_xp, p.created_at
      FROM sessions s
      JOIN players p ON s.user_id = p.id
      WHERE s.token_hash = ? AND s.account_type = 'player' AND s.expires_at > ?
    `).get(tokenHash, now) as PlayerPublicProfile | undefined;

    return row || null;
  }

  // ==========================================
  // AUTENTIKASI ADMIN
  // ==========================================

  /**
   * Bootstrap Admin awal dengan default PIN 123456 sesuai AGENTS.md
   */
  static async bootstrapAdmin(): Promise<void> {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');

    if (!existing) {
      const pinHash = await bcrypt.hash('123456', 10);
      const adminId = 'adm-root';
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO admin_users (id, username, pin_hash, is_default_pin, created_at, updated_at)
        VALUES (?, 'admin', ?, 1, ?, ?)
      `).run(adminId, pinHash, now, now);

      console.log('✅ Admin bootstrap account initialized (default PIN: 123456).');
    }
  }

  /**
   * Login Admin Dashboard menggunakan PIN
   */
  static async loginAdmin(params: {
    username?: string;
    pin: string;
    clientIp?: string;
  }): Promise<{ admin: AdminPublicProfile; sessionToken: string }> {
    const db = getDb();
    const username = (params.username || 'admin').trim();
    const rateLimitKey = `admin:${username}:${params.clientIp || 'local'}`;

    this.checkRateLimit(rateLimitKey);

    const row = db.prepare(`
      SELECT id, username, pin_hash, is_default_pin
      FROM admin_users 
      WHERE username = ?
    `).get(username) as {
      id: string;
      username: string;
      pin_hash: string;
      is_default_pin: number;
    } | undefined;

    if (!row) {
      this.recordFailedAttempt(rateLimitKey);
      throw new Error('Kredensial admin tidak valid.');
    }

    const isMatch = await bcrypt.compare(params.pin, row.pin_hash);
    if (!isMatch) {
      this.recordFailedAttempt(rateLimitKey);
      throw new Error('Kredensial admin tidak valid.');
    }

    this.resetFailedAttempts(rateLimitKey);
    // Admin session expires in 12 hours
    const sessionToken = this.createSession('admin', row.id, 0.5);

    return {
      admin: {
        id: row.id,
        username: row.username,
        is_default_pin: Boolean(row.is_default_pin),
      },
      sessionToken,
    };
  }

  /**
   * Ambil admin dari session token
   */
  static getAdminByToken(rawToken: string): AdminPublicProfile | null {
    const db = getDb();
    const tokenHash = this.hashToken(rawToken);
    const now = new Date().toISOString();

    const row = db.prepare(`
      SELECT a.id, a.username, a.is_default_pin
      FROM sessions s
      JOIN admin_users a ON s.user_id = a.id
      WHERE s.token_hash = ? AND s.account_type = 'admin' AND s.expires_at > ?
    `).get(tokenHash, now) as { id: string; username: string; is_default_pin: number } | undefined;

    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      is_default_pin: Boolean(row.is_default_pin),
    };
  }

  /**
   * Mengubah PIN Admin (Wajib di production agar is_default_pin = 0)
   */
  static async changeAdminPin(params: {
    adminId: string;
    currentPin: string;
    newPin: string;
  }): Promise<void> {
    const db = getDb();

    if (!/^\d{6}$/.test(params.newPin)) {
      throw new Error('PIN baru admin wajib terdiri dari tepat 6 digit angka.');
    }

    if (params.newPin === '123456') {
      throw new Error('PIN baru tidak boleh menggunakan PIN default 123456.');
    }

    const admin = db.prepare('SELECT id, pin_hash FROM admin_users WHERE id = ?').get(params.adminId) as {
      id: string;
      pin_hash: string;
    } | undefined;

    if (!admin) {
      throw new Error('Akun admin tidak ditemukan.');
    }

    const isMatch = await bcrypt.compare(params.currentPin, admin.pin_hash);
    if (!isMatch) {
      throw new Error('PIN saat ini tidak cocok.');
    }

    const newPinHash = await bcrypt.hash(params.newPin, 10);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE admin_users 
      SET pin_hash = ?, is_default_pin = 0, updated_at = ?
      WHERE id = ?
    `).run(newPinHash, now, params.adminId);
  }

  /**
   * Reset PIN akun anak oleh Admin/Orang tua yang berwenang
   */
  static async resetPlayerPin(playerId: string, newPin: string): Promise<void> {
    const db = getDb();

    if (!/^\d{4}$/.test(newPin)) {
      throw new Error('PIN baru anak harus terdiri dari 4 digit angka.');
    }

    const pinHash = await bcrypt.hash(newPin, 10);
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE players 
      SET pin_hash = ?, updated_at = ?
      WHERE id = ?
    `).run(pinHash, now, playerId);

    if (result.changes === 0) {
      throw new Error('Akun anak tidak ditemukan.');
    }
  }

  /**
   * Logout dan hapus sesi
   */
  static logout(rawToken: string): void {
    const db = getDb();
    const tokenHash = this.hashToken(rawToken);
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  }
}
