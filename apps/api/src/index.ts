import { buildServer } from './server.js';
import { runMigrations } from './db/migrate.js';
import { seedCurriculum } from './db/seed.js';
import { AuthService } from './modules/auth/auth.service.js';
import { closeDb } from './db/index.js';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  // Jalankan migrasi tabel, seed kurikulum, dan bootstrap admin
  runMigrations();
  seedCurriculum();
  await AuthService.bootstrapAdmin();

  const app = buildServer();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 KidsGo! API Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async () => {
    console.log('\nShutting down server...');
    await app.close();
    closeDb();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
