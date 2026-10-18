import { getDb } from '../../db/index.js';
import { TopicItem, LevelItem, EducationLevel, SemesterNumber } from '@kidsgo/shared';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface TopicWithLevels extends TopicItem {
  levels: (LevelItem & { total_questions: number })[];
}

export class CurriculumService {
  /**
   * Mengambil ikhtisar lengkap topik dan level untuk dashboard admin
   */
  static getCurriculumOverview(grade?: string, semester?: number): TopicWithLevels[] {
    const db = getDb();

    let query = `
      SELECT t.*,
        (SELECT COUNT(*) FROM levels l WHERE l.topic_id = t.id) as total_levels,
        (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id) as total_questions
      FROM topics t
      WHERE t.subject = 'mathematics'
    `;
    const params: (string | number)[] = [];

    if (grade && grade !== 'all') {
      query += ' AND t.education_level = ?';
      params.push(grade);
    }
    if (semester && (semester === 1 || semester === 2)) {
      query += ' AND t.semester = ?';
      params.push(semester);
    }

    query += ' ORDER BY t.education_level ASC, t.semester ASC, t.order_index ASC';

    const topics = db.prepare(query).all(...params) as (TopicItem & {
      total_levels: number;
      total_questions: number;
    })[];

    const getLevelsStmt = db.prepare(`
      SELECT l.*,
        (SELECT COUNT(*) FROM questions q WHERE q.level_id = l.id) as total_questions
      FROM levels l
      WHERE l.topic_id = ?
      ORDER BY l.level_number ASC
    `);

    return topics.map((t) => {
      const levels = getLevelsStmt.all(t.id) as (LevelItem & { total_questions: number })[];
      return {
        ...t,
        levels,
      };
    });
  }

  /**
   * Membuat topik pembelajaran baru
   */
  static createTopic(data: {
    education_level: EducationLevel;
    semester: SemesterNumber;
    name: string;
    slug?: string;
    order_index?: number;
    subject?: string;
  }): TopicItem {
    const db = getDb();
    const cleanName = data.name.trim();
    if (!cleanName) {
      throw new Error('Nama topik tidak boleh kosong.');
    }

    const baseSlug = data.slug ? slugify(data.slug) : slugify(cleanName);
    const fullSlug = `${data.education_level.toLowerCase()}-s${data.semester}-${baseSlug}`;

    let orderIndex = data.order_index;
    if (orderIndex === undefined || orderIndex === null) {
      const maxOrder = db
        .prepare(
          'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM topics WHERE education_level = ? AND semester = ?'
        )
        .get(data.education_level, data.semester) as { next_order: number };
      orderIndex = maxOrder.next_order;
    }

    const topicId = `topic-${fullSlug}-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const subject = data.subject || 'mathematics';

    db.prepare(`
      INSERT INTO topics (id, subject, education_level, semester, name, slug, order_index, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(topicId, subject, data.education_level, data.semester, cleanName, fullSlug, orderIndex, now);

    return {
      id: topicId,
      subject,
      education_level: data.education_level,
      semester: data.semester,
      name: cleanName,
      slug: fullSlug,
      order_index: orderIndex,
      total_levels: 0,
      total_questions: 0,
      created_at: now,
    };
  }

  /**
   * Mengubah data topik
   */
  static updateTopic(
    id: string,
    data: {
      name?: string;
      order_index?: number;
      semester?: SemesterNumber;
      education_level?: EducationLevel;
    }
  ): TopicItem {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as TopicItem | undefined;
    if (!existing) {
      throw new Error('Topik tidak ditemukan.');
    }

    const name = data.name !== undefined ? data.name.trim() : existing.name;
    const orderIndex = data.order_index !== undefined ? Number(data.order_index) : existing.order_index;
    const semester = data.semester !== undefined ? Number(data.semester) as SemesterNumber : existing.semester;
    const educationLevel = data.education_level !== undefined ? data.education_level : existing.education_level;

    db.prepare(`
      UPDATE topics
      SET name = ?, order_index = ?, semester = ?, education_level = ?
      WHERE id = ?
    `).run(name, orderIndex, semester, educationLevel, id);

    return {
      ...existing,
      name,
      order_index: orderIndex,
      semester,
      education_level: educationLevel,
    };
  }

  /**
   * Menghapus topik kurikulum beserta level di bawahnya
   */
  static deleteTopic(id: string): boolean {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as TopicItem | undefined;
    if (!existing) {
      throw new Error('Topik tidak ditemukan.');
    }

    db.transaction(() => {
      // Lepaskan keterkaitan pertanyaan agar tidak invalid
      db.prepare('UPDATE questions SET topic_id = NULL, level_id = NULL WHERE topic_id = ?').run(id);
      // Hapus level di topik ini
      db.prepare('DELETE FROM levels WHERE topic_id = ?').run(id);
      // Hapus topik
      db.prepare('DELETE FROM topics WHERE id = ?').run(id);
    })();

    return true;
  }

  /**
   * Membuat level baru di bawah suatu topik
   */
  static createLevel(
    topicId: string,
    data: {
      name: string;
      level_number?: number;
      required_xp?: number;
      passing_score?: number;
    }
  ): LevelItem {
    const db = getDb();
    const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId) as TopicItem | undefined;
    if (!topic) {
      throw new Error('Topik tidak ditemukan.');
    }

    const cleanName = data.name.trim();
    if (!cleanName) {
      throw new Error('Nama level tidak boleh kosong.');
    }

    let levelNumber = data.level_number;
    if (levelNumber === undefined || levelNumber === null) {
      const maxLvl = db
        .prepare('SELECT COALESCE(MAX(level_number), 0) + 1 as next_lvl FROM levels WHERE topic_id = ?')
        .get(topicId) as { next_lvl: number };
      levelNumber = maxLvl.next_lvl;
    }

    const requiredXp = data.required_xp && data.required_xp > 0 ? Number(data.required_xp) : 50;
    const passingScore = data.passing_score && data.passing_score > 0 ? Number(data.passing_score) : 100;

    const levelId = `lvl-${topic.slug}-${levelNumber}-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO levels (id, topic_id, level_number, name, required_xp, passing_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(levelId, topicId, levelNumber, cleanName, requiredXp, passingScore, now);

    return {
      id: levelId,
      topic_id: topicId,
      level_number: levelNumber,
      name: cleanName,
      required_xp: requiredXp,
      passing_score: passingScore,
      total_questions: 0,
      created_at: now,
    };
  }

  /**
   * Mengubah data level
   */
  static updateLevel(
    id: string,
    data: {
      name?: string;
      level_number?: number;
      required_xp?: number;
      passing_score?: number;
    }
  ): LevelItem {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM levels WHERE id = ?').get(id) as LevelItem | undefined;
    if (!existing) {
      throw new Error('Level tidak ditemukan.');
    }

    const name = data.name !== undefined ? data.name.trim() : existing.name;
    const levelNumber = data.level_number !== undefined ? Number(data.level_number) : existing.level_number;
    const requiredXp = data.required_xp !== undefined ? Number(data.required_xp) : existing.required_xp;
    const passingScore = data.passing_score !== undefined ? Number(data.passing_score) : existing.passing_score;

    db.prepare(`
      UPDATE levels
      SET name = ?, level_number = ?, required_xp = ?, passing_score = ?
      WHERE id = ?
    `).run(name, levelNumber, requiredXp, passingScore, id);

    return {
      ...existing,
      name,
      level_number: levelNumber,
      required_xp: requiredXp,
      passing_score: passingScore,
    };
  }

  /**
   * Menghapus level
   */
  static deleteLevel(id: string): boolean {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM levels WHERE id = ?').get(id) as LevelItem | undefined;
    if (!existing) {
      throw new Error('Level tidak ditemukan.');
    }

    db.transaction(() => {
      // Lepaskan keterkaitan pertanyaan
      db.prepare('UPDATE questions SET level_id = NULL WHERE level_id = ?').run(id);
      // Hapus riwayat progres level ini
      db.prepare('DELETE FROM progress WHERE level_id = ?').run(id);
      // Hapus level
      db.prepare('DELETE FROM levels WHERE id = ?').run(id);
    })();

    return true;
  }

  /**
   * Mengambil daftar soal yang terpasang di level tertentu
   */
  static getLevelQuestions(levelId: string) {
    const db = getDb();
    const rows = db
      .prepare(`
        SELECT q.*, t.name as topic_name, l.name as level_name, l.level_number
        FROM questions q
        LEFT JOIN topics t ON q.topic_id = t.id
        LEFT JOIN levels l ON q.level_id = l.id
        WHERE q.level_id = ?
        ORDER BY q.created_at ASC
      `)
      .all(levelId) as Record<string, unknown>[];

    return rows.map((r) => ({
      ...r,
      options: JSON.parse(r.options_json as string),
      tags: JSON.parse(r.tags_json as string),
    }));
  }

  /**
   * Mengambil kandidat soal dari bank soal yang sesuai jenjang dan semester untuk dimasukkan ke level
   */
  static getCandidateQuestionsForLevel(levelId: string) {
    const db = getDb();
    const levelInfo = db
      .prepare(`
        SELECT l.*, t.education_level, t.semester, t.id as topic_id, t.name as topic_name
        FROM levels l
        JOIN topics t ON l.topic_id = t.id
        WHERE l.id = ?
      `)
      .get(levelId) as {
        id: string;
        level_number: number;
        name: string;
        education_level: string;
        semester: number;
        topic_id: string;
        topic_name: string;
      } | undefined;

    if (!levelInfo) {
      throw new Error('Level tidak ditemukan');
    }

    const rows = db
      .prepare(`
        SELECT q.*, t.name as topic_name, l.name as level_name, l.level_number
        FROM questions q
        LEFT JOIN topics t ON q.topic_id = t.id
        LEFT JOIN levels l ON q.level_id = l.id
        WHERE q.education_level = ? AND q.semester = ?
          AND (q.level_id IS NULL OR q.level_id != ?)
        ORDER BY (q.topic_id = ?) DESC, q.created_at DESC
        LIMIT 100
      `)
      .all(
        levelInfo.education_level,
        levelInfo.semester,
        levelInfo.id,
        levelInfo.topic_id
      ) as Record<string, unknown>[];

    return {
      level: levelInfo,
      candidates: rows.map((r) => ({
        ...r,
        options: JSON.parse(r.options_json as string),
        tags: JSON.parse(r.tags_json as string),
      })),
    };
  }

  /**
   * Menambahkan/mengaitkan satu atau banyak soal ke level tertentu
   */
  static addQuestionsToLevel(levelId: string, questionIds: string[]) {
    if (!questionIds || questionIds.length === 0) {
      return { success: true, count: 0 };
    }

    const db = getDb();
    const levelInfo = db
      .prepare('SELECT l.id, l.topic_id FROM levels l WHERE l.id = ?')
      .get(levelId) as { id: string; topic_id: string } | undefined;

    if (!levelInfo) {
      throw new Error('Level tidak ditemukan');
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE questions 
      SET level_id = ?, topic_id = ?, updated_at = ?
      WHERE id = ? OR question_id = ?
    `);

    db.transaction(() => {
      for (const qId of questionIds) {
        updateStmt.run(levelInfo.id, levelInfo.topic_id, now, qId, qId);
      }
    })();

    return { success: true, count: questionIds.length };
  }

  /**
   * Mengeluarkan satu soal dari level (unassign level)
   */
  static removeQuestionFromLevel(levelId: string, questionId: string) {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE questions 
      SET level_id = NULL, updated_at = ?
      WHERE (id = ? OR question_id = ?) AND level_id = ?
    `).run(now, questionId, questionId, levelId);

    return { success: true };
  }
}

