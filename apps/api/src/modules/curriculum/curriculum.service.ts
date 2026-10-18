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
}
