import { getDb } from './index.js';

export function runMigrations(): void {
  const db = getDb();

  db.transaction(() => {
    // 1. Pemain (Anak)
    db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        nickname TEXT NOT NULL,
        avatar TEXT NOT NULL,
        pin_hash TEXT NOT NULL,
        grade TEXT NOT NULL,
        current_xp INTEGER NOT NULL DEFAULT 0,
        is_suspended INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_players_grade ON players(grade);
    `);

    // Migrasi kolom is_suspended jika tabel players sudah ada sebelumnya
    const playerCols = db.pragma('table_info(players)') as Array<{ name: string }>;
    if (!playerCols.some((c) => c.name === 'is_suspended')) {
      db.exec(`ALTER TABLE players ADD COLUMN is_suspended INTEGER NOT NULL DEFAULT 0;`);
    }

    // 2. Admin
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        pin_hash TEXT NOT NULL,
        is_default_pin INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 3. Sesi Login
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        account_type TEXT NOT NULL,
        user_id TEXT NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
    `);

    // 4. Batch Import Bank Soal
    db.exec(`
      CREATE TABLE IF NOT EXISTS question_import_batches (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        total_questions INTEGER NOT NULL,
        status TEXT NOT NULL,
        imported_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // 5. Topik Kurikulum
    db.exec(`
      CREATE TABLE IF NOT EXISTS topics (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL DEFAULT 'mathematics',
        education_level TEXT NOT NULL,
        semester INTEGER NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_topics_level_sem ON topics(education_level, semester);
    `);

    // 6. Level per Topik
    db.exec(`
      CREATE TABLE IF NOT EXISTS levels (
        id TEXT PRIMARY KEY,
        topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        level_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        required_xp INTEGER NOT NULL DEFAULT 50,
        passing_score INTEGER NOT NULL DEFAULT 100,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_levels_topic ON levels(topic_id);
    `);

    // 7. Bank Soal
    db.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        question_id TEXT UNIQUE NOT NULL,
        subject TEXT NOT NULL DEFAULT 'mathematics',
        education_level TEXT NOT NULL,
        semester INTEGER NOT NULL,
        topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
        level_id TEXT REFERENCES levels(id) ON DELETE SET NULL,
        difficulty INTEGER NOT NULL DEFAULT 1,
        type TEXT NOT NULL DEFAULT 'multiple_choice',
        question TEXT NOT NULL,
        visual TEXT,
        options_json TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        explanation TEXT NOT NULL,
        tags_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'draft',
        import_batch_id TEXT REFERENCES question_import_batches(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_questions_lookup ON questions(education_level, semester, status);
      CREATE INDEX IF NOT EXISTS idx_questions_qid ON questions(question_id);
    `);

    // 8. Progres Pemain per Level
    db.exec(`
      CREATE TABLE IF NOT EXISTS progress (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        level_id TEXT NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
        score INTEGER NOT NULL DEFAULT 0,
        is_completed INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        updated_at TEXT NOT NULL,
        UNIQUE(player_id, level_id)
      );
      CREATE INDEX IF NOT EXISTS idx_progress_player ON progress(player_id);
    `);

    // 9. Buku Besar XP (Anti-farming & idempotent)
    db.exec(`
      CREATE TABLE IF NOT EXISTS xp_ledger (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        reference_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(player_id, reference_id)
      );
      CREATE INDEX IF NOT EXISTS idx_xp_ledger_player ON xp_ledger(player_id);
    `);

    // 10. Badges
    db.exec(`
      CREATE TABLE IF NOT EXISTS badges (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        criteria_type TEXT NOT NULL,
        criteria_value TEXT NOT NULL
      );
    `);

    // 11. Badges yang Diperoleh Pemain
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_badges (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
        awarded_at TEXT NOT NULL,
        UNIQUE(player_id, badge_id)
      );
    `);

    // 12. Kartu Koleksi RPG
    db.exec(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        rarity TEXT NOT NULL,
        illustration TEXT NOT NULL,
        stats_json TEXT
      );
    `);

    // 13. Kartu yang Dimiliki Pemain
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_cards (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        obtained_at TEXT NOT NULL
      );
    `);

    // 14. Akun Tamu Demo Default (agar anak/pengunjung dapat mencoba bermain langsung)
    db.exec(`
      INSERT OR IGNORE INTO players (
        id, nickname, avatar, pin_hash, grade, current_xp, created_at, updated_at
      ) VALUES (
        'ply-guest-demo', 'Petualang Cilik', '🦊', '$2a$10$demo_guest_pin_placeholder_only', 'SD_1', 0, datetime('now'), datetime('now')
      );
    `);
  })();

  console.log('✅ SQLite migrations applied successfully.');
}

// Jalankan langsung jika dipanggil dari script CLI
if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations();
}
