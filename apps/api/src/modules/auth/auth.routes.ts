import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';
import { EducationLevel } from '@kidsgo/shared';

const PLAYER_COOKIE = 'kidsgo_player_token';
const ADMIN_COOKIE = 'kidsgo_admin_token';

// Helper cookie options
const getCookieOptions = () => ({
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 14 * 24 * 60 * 60, // 14 hari
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ==========================================
  // RUTE ANAK (PLAYERS)
  // ==========================================

  // 1. Registrasi Akun Anak Baru
  app.post<{
    Body: {
      nickname: string;
      avatar: string;
      grade: EducationLevel;
      pin: string;
    };
  }>(
    '/api/auth/player/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['nickname', 'avatar', 'grade', 'pin'],
          properties: {
            nickname: { type: 'string', minLength: 2, maxLength: 20 },
            avatar: { type: 'string' },
            grade: { type: 'string', enum: ['TK_A', 'TK_B', 'SD_1', 'SD_2', 'SD_3', 'SD_4', 'SD_5', 'SD_6'] },
            pin: { type: 'string', pattern: '^\\d{4}$' },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const { player, sessionToken } = await AuthService.registerPlayer(req.body);

        reply.setCookie(PLAYER_COOKIE, sessionToken, getCookieOptions());

        return reply.status(201).send({
          success: true,
          message: 'Akun berhasil dibuat!',
          player,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Registrasi gagal';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 2. Login Anak dengan Nickname & PIN
  app.post<{
    Body: {
      nickname: string;
      pin: string;
    };
  }>(
    '/api/auth/player/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['nickname', 'pin'],
          properties: {
            nickname: { type: 'string' },
            pin: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const clientIp = req.ip;
        const { player, sessionToken } = await AuthService.loginPlayer({
          nickname: req.body.nickname,
          pin: req.body.pin,
          clientIp,
        });

        reply.setCookie(PLAYER_COOKIE, sessionToken, getCookieOptions());

        return reply.send({
          success: true,
          message: 'Berhasil masuk!',
          player,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Login gagal';
        return reply.status(401).send({ success: false, message });
      }
    }
  );

  // 3. Ambil Profil Sesi Anak yang Sedang Login
  app.get('/api/auth/player/me', async (req: FastifyRequest, reply: FastifyReply) => {
    const token =
      req.cookies[PLAYER_COOKIE] ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return reply.status(401).send({
        success: false,
        message: 'Belum masuk ke akun.',
      });
    }

    const player = AuthService.getPlayerByToken(token);
    if (!player) {
      reply.clearCookie(PLAYER_COOKIE, { path: '/' });
      return reply.status(401).send({
        success: false,
        message: 'Sesi telah kedaluwarsa. Silakan masuk kembali.',
      });
    }

    return reply.send({
      success: true,
      player,
    });
  });

  // 4. Logout Anak
  app.post('/api/auth/player/logout', async (req, reply) => {
    const token = req.cookies[PLAYER_COOKIE];
    if (token) {
      AuthService.logout(token);
    }
    reply.clearCookie(PLAYER_COOKIE, { path: '/' });
    return reply.send({ success: true, message: 'Berhasil keluar.' });
  });

  // ==========================================
  // RUTE ADMIN
  // ==========================================

  // 5. Login Admin Dashboard
  app.post<{
    Body: {
      username?: string;
      pin: string;
    };
  }>(
    '/api/admin/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['pin'],
          properties: {
            username: { type: 'string' },
            pin: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const clientIp = req.ip;
        const { admin, sessionToken } = await AuthService.loginAdmin({
          username: req.body.username || 'admin',
          pin: req.body.pin,
          clientIp,
        });

        reply.setCookie(ADMIN_COOKIE, sessionToken, {
          ...getCookieOptions(),
          maxAge: 12 * 60 * 60, // 12 jam
        });

        return reply.send({
          success: true,
          message: 'Admin berhasil masuk!',
          admin,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Kredensial salah';
        return reply.status(401).send({ success: false, message });
      }
    }
  );

  // 6. Cek Sesi Admin
  app.get('/api/admin/auth/me', async (req, reply) => {
    const token =
      req.cookies[ADMIN_COOKIE] ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return reply.status(401).send({ success: false, message: 'Akses ditolak.' });
    }

    const admin = AuthService.getAdminByToken(token);
    if (!admin) {
      reply.clearCookie(ADMIN_COOKIE, { path: '/' });
      return reply.status(401).send({ success: false, message: 'Sesi admin kedaluwarsa.' });
    }

    return reply.send({ success: true, admin });
  });

  // 7. Ganti PIN Admin (Wajib di Production)
  app.post<{
    Body: {
      currentPin: string;
      newPin: string;
    };
  }>(
    '/api/admin/auth/change-pin',
    {
      schema: {
        body: {
          type: 'object',
          required: ['currentPin', 'newPin'],
          properties: {
            currentPin: { type: 'string' },
            newPin: { type: 'string', pattern: '^\\d{6}$' },
          },
        },
      },
    },
    async (req, reply) => {
      const token = req.cookies[ADMIN_COOKIE];
      const admin = token ? AuthService.getAdminByToken(token) : null;

      if (!admin) {
        return reply.status(401).send({ success: false, message: 'Akses ditolak.' });
      }

      try {
        await AuthService.changeAdminPin({
          adminId: admin.id,
          currentPin: req.body.currentPin,
          newPin: req.body.newPin,
        });

        return reply.send({
          success: true,
          message: 'PIN admin berhasil diperbarui!',
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal mengganti PIN';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 8. Reset PIN Akun Anak oleh Admin
  app.post<{
    Params: { id: string };
    Body: { newPin: string };
  }>(
    '/api/admin/players/:id/reset-pin',
    {
      schema: {
        body: {
          type: 'object',
          required: ['newPin'],
          properties: {
            newPin: { type: 'string', pattern: '^\\d{4}$' },
          },
        },
      },
    },
    async (req, reply) => {
      const token = req.cookies[ADMIN_COOKIE];
      const admin = token ? AuthService.getAdminByToken(token) : null;

      if (!admin) {
        return reply.status(401).send({ success: false, message: 'Akses ditolak.' });
      }

      try {
        await AuthService.resetPlayerPin(req.params.id, req.body.newPin);
        return reply.send({
          success: true,
          message: 'PIN akun anak berhasil direset oleh admin.',
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal mereset PIN';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // 9. Daftar Akun Anak untuk Admin
  app.get('/api/admin/players', async (req, reply) => {
    const token = req.cookies[ADMIN_COOKIE];
    const admin = token ? AuthService.getAdminByToken(token) : null;
    if (!admin) {
      return reply.status(401).send({ success: false, message: 'Akses ditolak.' });
    }
    const players = AuthService.listPlayers();
    return reply.send({ success: true, players });
  });

  // 10. Logout Admin
  app.post('/api/admin/auth/logout', async (req, reply) => {
    const token = req.cookies[ADMIN_COOKIE];
    if (token) {
      AuthService.logout(token);
    }
    reply.clearCookie(ADMIN_COOKIE, { path: '/' });
    return reply.send({ success: true, message: 'Admin keluar.' });
  });
}

