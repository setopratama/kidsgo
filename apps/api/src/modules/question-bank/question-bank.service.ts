import { getDb } from '../../db/index.js';
import { QuestionBankFile, QuestionStatus, QuestionBankItem } from '@kidsgo/shared';

export interface ValidationIssue {
  question_id?: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationReport {
  is_valid: boolean;
  total_questions: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export class QuestionBankService {
  /**
   * Normalisasi teks untuk deteksi kesamaan/duplikasi
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s\d]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validasi domain mendalam untuk bank soal
   */
  static validateContent(content: QuestionBankFile): ValidationReport {
    const db = getDb();
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // 1. Validasi Schema Dasar
    if (content.schema_version !== '1.0') {
      errors.push({
        field: 'schema_version',
        message: `schema_version "${content.schema_version}" tidak didukung. Wajib "1.0".`,
        severity: 'error',
      });
    }

    if (content.subject !== 'mathematics') {
      errors.push({
        field: 'subject',
        message: `Mata pelajaran "${content.subject}" tidak aktif. MVP hanya mendukung "mathematics".`,
        severity: 'error',
      });
    }

    if (![1, 2].includes(content.semester)) {
      errors.push({
        field: 'semester',
        message: 'Semester harus bernilai 1 atau 2.',
        severity: 'error',
      });
    }

    if (!Array.isArray(content.questions) || content.questions.length === 0) {
      errors.push({
        field: 'questions',
        message: 'Berkas bank soal wajib berisi minimal 1 soal.',
        severity: 'error',
      });
      return { is_valid: false, total_questions: 0, errors, warnings };
    }

    const seenQuestionIdsInFile = new Set<string>();
    const seenQuestionTextsInFile = new Map<string, string>();

    // Query untuk memeriksa ID yang sudah ada di database
    const checkDbQidStmt = db.prepare('SELECT id, question_id FROM questions WHERE question_id = ?');
    // Query untuk memeriksa kemiripan teks pertanyaan yang sudah ada
    const allDbQuestions = db.prepare('SELECT question_id, question FROM questions').all() as {
      question_id: string;
      question: string;
    }[];
    const dbNormalizedTexts = new Map<string, string>();
    for (const q of allDbQuestions) {
      dbNormalizedTexts.set(this.normalizeText(q.question), q.question_id);
    }

    // 2. Validasi per Soal
    for (let i = 0; i < content.questions.length; i++) {
      const q = content.questions[i];
      const qId = q.question_id || `Index #${i}`;

      // A. Keunikan Question ID dalam file
      if (seenQuestionIdsInFile.has(q.question_id)) {
        errors.push({
          question_id: qId,
          field: 'question_id',
          message: `question_id "${q.question_id}" terduplikasi di dalam file yang sama.`,
          severity: 'error',
        });
      }
      seenQuestionIdsInFile.add(q.question_id);

      // B. Keunikan Question ID terhadap Database
      const existingDb = checkDbQidStmt.get(q.question_id);
      if (existingDb) {
        errors.push({
          question_id: qId,
          field: 'question_id',
          message: `question_id "${q.question_id}" sudah ada di database KidsGo!.`,
          severity: 'error',
        });
      }

      // C. Validasi Teks Soal & Deteksi Duplikasi
      if (!q.question || q.question.trim().length < 3) {
        errors.push({
          question_id: qId,
          field: 'question',
          message: 'Teks pertanyaan wajib diisi dan minimal 3 karakter.',
          severity: 'error',
        });
      } else {
        const norm = this.normalizeText(q.question);
        if (seenQuestionTextsInFile.has(norm)) {
          warnings.push({
            question_id: qId,
            field: 'question',
            message: `Teks soal sangat mirip dengan soal "${seenQuestionTextsInFile.get(norm)}" dalam file ini.`,
            severity: 'warning',
          });
        }
        seenQuestionTextsInFile.set(norm, q.question_id);

        if (dbNormalizedTexts.has(norm)) {
          warnings.push({
            question_id: qId,
            field: 'question',
            message: `Teks soal identik dengan soal yang sudah tersimpan di database (${dbNormalizedTexts.get(norm)}).`,
            severity: 'warning',
          });
        }
      }

      // D. Validasi Pilihan Jawaban
      if (q.type === 'multiple_choice') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          errors.push({
            question_id: qId,
            field: 'options',
            message: 'Soal pilihan ganda wajib memiliki minimal 2 opsi jawaban.',
            severity: 'error',
          });
        } else {
          const optionIds = new Set<string>();
          const optionTexts = new Set<string>();

          for (const opt of q.options) {
            if (!opt.id) {
              errors.push({
                question_id: qId,
                field: 'options.id',
                message: 'Setiap opsi wajib memiliki id (contoh: "A", "B").',
                severity: 'error',
              });
            } else if (optionIds.has(opt.id)) {
              errors.push({
                question_id: qId,
                field: 'options.id',
                message: `Opsi dengan id "${opt.id}" duplikat dalam soal ini.`,
                severity: 'error',
              });
            }
            optionIds.add(opt.id);

            const optTextNorm = opt.text?.trim().toLowerCase();
            if (!opt.text || optTextNorm.length === 0) {
              errors.push({
                question_id: qId,
                field: 'options.text',
                message: `Teks opsi untuk id "${opt.id}" tidak boleh kosong.`,
                severity: 'error',
              });
            } else if (optionTexts.has(optTextNorm)) {
              warnings.push({
                question_id: qId,
                field: 'options.text',
                message: `Opsi "${opt.text}" terduplikasi pada soal ini.`,
                severity: 'warning',
              });
            }
            optionTexts.add(optTextNorm);
          }

          // E. Validasi Correct Answer
          if (!q.correct_answer || !optionIds.has(q.correct_answer)) {
            errors.push({
              question_id: qId,
              field: 'correct_answer',
              message: `correct_answer "${q.correct_answer}" tidak ditemukan pada daftar id opsi (${Array.from(optionIds).join(', ')}).`,
              severity: 'error',
            });
          }
        }
      }

      // F. Validasi Penjelasan (Explanation)
      if (!q.explanation || q.explanation.trim().length < 3) {
        errors.push({
          question_id: qId,
          field: 'explanation',
          message: 'Penjelasan (explanation) wajib disediakan untuk mendidik anak saat salah.',
          severity: 'error',
        });
      }
    }

    return {
      is_valid: errors.length === 0,
      total_questions: content.questions.length,
      errors,
      warnings,
    };
  }

  /**
   * Impor berkas bank soal ke database dengan status awal 'draft'
   */
  static importQuestions(
    content: QuestionBankFile,
    importedBy = 'admin',
    filename = 'upload.json'
  ): {
    batch_id: string;
    total_imported: number;
    status: string;
    warnings: ValidationIssue[];
  } {
    const report = this.validateContent(content);
    if (!report.is_valid) {
      throw new Error(`Validasi gagal: ${report.errors.map((e) => e.message).join('; ')}`);
    }

    const db = getDb();
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    db.transaction(() => {
      // 1. Catat riwayat batch impor
      db.prepare(`
        INSERT INTO question_import_batches (id, filename, total_questions, status, imported_by, created_at)
        VALUES (?, ?, ?, 'imported', ?, ?)
      `).run(batchId, filename, content.questions.length, importedBy, now);

      // 2. Hubungkan ke topik kurikulum jika ada
      const topicRow = db.prepare(`
        SELECT id FROM topics 
        WHERE education_level = ? AND semester = ? AND (slug = ? OR name LIKE ?)
      `).get(
        content.education_level,
        content.semester,
        content.topic,
        `%${content.topic}%`
      ) as { id: string } | undefined;

      const topicId = topicRow ? topicRow.id : null;

      // 3. Masukkan soal dengan status 'draft'
      const insertStmt = db.prepare(`
        INSERT INTO questions (
          id, question_id, subject, education_level, semester, topic_id, difficulty,
          type, question, visual, options_json, correct_answer, explanation, tags_json,
          status, import_batch_id, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          'draft', ?, ?, ?
        )
      `);

      for (const q of content.questions) {
        const id = `q-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        insertStmt.run(
          id,
          q.question_id,
          content.subject,
          content.education_level,
          content.semester,
          topicId,
          content.difficulty,
          q.type,
          q.question,
          q.visual || null,
          JSON.stringify(q.options),
          q.correct_answer,
          q.explanation,
          JSON.stringify(q.tags || []),
          batchId,
          now,
          now
        );
      }
    })();

    return {
      batch_id: batchId,
      total_imported: content.questions.length,
      status: 'draft',
      warnings: report.warnings,
    };
  }

  /**
   * Mengambil daftar soal dengan filter dan pagination
   */
  static listQuestions(filters: {
    education_level?: string;
    semester?: number;
    status?: QuestionStatus;
    topic_id?: string;
    level_id?: string;
    page?: number;
    limit?: number;
  }) {
    const db = getDb();
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    let baseQuery = `
      FROM questions q
      LEFT JOIN topics t ON q.topic_id = t.id
      LEFT JOIN levels l ON q.level_id = l.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (filters.education_level) {
      baseQuery += ' AND q.education_level = ?';
      params.push(filters.education_level);
    }
    if (filters.semester) {
      baseQuery += ' AND q.semester = ?';
      params.push(Number(filters.semester));
    }
    if (filters.status) {
      baseQuery += ' AND q.status = ?';
      params.push(filters.status);
    }
    if (filters.topic_id) {
      baseQuery += ' AND q.topic_id = ?';
      params.push(filters.topic_id);
    }
    if (filters.level_id) {
      baseQuery += ' AND q.level_id = ?';
      params.push(filters.level_id);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total ${baseQuery}`).get(...params) as { total: number };
    const items = db
      .prepare(`
        SELECT q.*, t.name as topic_name, l.name as level_name, l.level_number
        ${baseQuery}
        ORDER BY q.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, limit, offset) as Record<string, unknown>[];

    const formatted = items.map((item) => ({
      ...item,
      options: JSON.parse(item.options_json as string),
      tags: JSON.parse(item.tags_json as string),
    }));

    return {
      data: formatted,
      pagination: {
        page,
        limit,
        total: countRow.total,
        total_pages: Math.ceil(countRow.total / limit),
      },
    };
  }

  /**
   * Detail satu soal untuk preview admin
   */
  static getQuestionDetail(questionIdOrId: string) {
    const db = getDb();
    const item = db.prepare(`
      SELECT q.*, t.name as topic_name, l.name as level_name, l.level_number 
      FROM questions q
      LEFT JOIN topics t ON q.topic_id = t.id
      LEFT JOIN levels l ON q.level_id = l.id
      WHERE q.id = ? OR q.question_id = ?
    `).get(questionIdOrId, questionIdOrId) as Record<string, unknown> | undefined;

    if (!item) return null;

    return {
      ...item,
      options: JSON.parse(item.options_json as string),
      tags: JSON.parse(item.tags_json as string),
    };
  }

  /**
   * Transisi status soal: draft -> approved, approved -> active, active -> archived, archived -> active / approved
   */
  static updateQuestionStatus(questionId: string, targetStatus: QuestionStatus) {
    const db = getDb();
    const q = db.prepare('SELECT id, status FROM questions WHERE id = ? OR question_id = ?').get(questionId, questionId) as {
      id: string;
      status: string;
    } | undefined;

    if (!q) {
      throw new Error('Soal tidak ditemukan');
    }

    // Validasi alur transisi status sesuai AGENTS.md
    const allowedTransitions: Record<string, QuestionStatus[]> = {
      draft: ['approved', 'archived'],
      approved: ['active', 'draft', 'archived'],
      active: ['archived', 'approved'],
      archived: ['active', 'approved', 'draft'],
    };

    if (!allowedTransitions[q.status]?.includes(targetStatus)) {
      throw new Error(`Transisi status dari "${q.status}" ke "${targetStatus}" tidak diperbolehkan.`);
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE questions SET status = ?, updated_at = ? WHERE id = ?').run(targetStatus, now, q.id);

    return { id: q.id, status: targetStatus };
  }

  /**
   * Atur penempatan level, topik, dan opsional semester untuk satu soal
   */
  static assignQuestionLevel(
    questionId: string,
    topicId: string | null,
    levelId: string | null,
    semester?: 1 | 2
  ) {
    const db = getDb();
    const q = db
      .prepare('SELECT id, semester FROM questions WHERE id = ? OR question_id = ?')
      .get(questionId, questionId) as { id: string; semester: number } | undefined;
    if (!q) {
      throw new Error('Soal tidak ditemukan');
    }

    let finalTopicId = topicId;
    let finalSemester = semester !== undefined ? semester : q.semester;

    if (levelId) {
      const lvl = db
        .prepare(`
          SELECT l.id, l.topic_id, t.semester 
          FROM levels l 
          JOIN topics t ON l.topic_id = t.id 
          WHERE l.id = ?
        `)
        .get(levelId) as { id: string; topic_id: string; semester: number } | undefined;
      if (!lvl) {
        throw new Error('Level tidak ditemukan');
      }
      finalTopicId = lvl.topic_id;
      finalSemester = lvl.semester;
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE questions 
      SET semester = ?, topic_id = ?, level_id = ?, updated_at = ?
      WHERE id = ?
    `).run(finalSemester, finalTopicId, levelId, now, q.id);

    return { id: q.id, semester: finalSemester, topic_id: finalTopicId, level_id: levelId };
  }

  /**
   * Mengubah semester soal (dan menyesuaikan/mereset topik & level jika semester berubah)
   */
  static updateQuestionSemester(
    questionId: string,
    newSemester: 1 | 2,
    topicId?: string | null,
    levelId?: string | null
  ) {
    if (newSemester !== 1 && newSemester !== 2) {
      throw new Error('Semester harus bernilai 1 atau 2.');
    }

    const db = getDb();
    const q = db
      .prepare('SELECT id, semester, topic_id, level_id FROM questions WHERE id = ? OR question_id = ?')
      .get(questionId, questionId) as {
        id: string;
        semester: number;
        topic_id: string | null;
        level_id: string | null;
      } | undefined;

    if (!q) {
      throw new Error('Soal tidak ditemukan');
    }

    let finalTopicId = topicId !== undefined ? topicId : (q.semester !== newSemester ? null : q.topic_id);
    let finalLevelId = levelId !== undefined ? levelId : (q.semester !== newSemester ? null : q.level_id);

    if (finalLevelId) {
      const lvl = db
        .prepare(`
          SELECT l.id, l.topic_id, t.semester 
          FROM levels l 
          JOIN topics t ON l.topic_id = t.id 
          WHERE l.id = ?
        `)
        .get(finalLevelId) as { id: string; topic_id: string; semester: number } | undefined;

      if (!lvl) {
        throw new Error('Level tidak ditemukan');
      }
      if (lvl.semester !== newSemester) {
        throw new Error(`Level yang dipilih berada di Semester ${lvl.semester}, tidak cocok dengan Semester ${newSemester}.`);
      }
      finalTopicId = lvl.topic_id;
    } else if (finalTopicId) {
      const topic = db
        .prepare('SELECT id, semester FROM topics WHERE id = ?')
        .get(finalTopicId) as { id: string; semester: number } | undefined;

      if (!topic || topic.semester !== newSemester) {
        finalTopicId = null;
      }
    }

    // Jika semester berubah dan topik/level tidak ditentukan secara eksplisit, periksa validitas topik/level lama
    if (q.semester !== newSemester && topicId === undefined && levelId === undefined) {
      if (q.topic_id) {
        const topic = db
          .prepare('SELECT id, semester FROM topics WHERE id = ?')
          .get(q.topic_id) as { id: string; semester: number } | undefined;
        if (!topic || topic.semester !== newSemester) {
          finalTopicId = null;
          finalLevelId = null;
        }
      } else {
        finalLevelId = null;
      }
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE questions 
      SET semester = ?, topic_id = ?, level_id = ?, updated_at = ?
      WHERE id = ?
    `).run(newSemester, finalTopicId, finalLevelId, now, q.id);

    return {
      id: q.id,
      semester: newSemester,
      topic_id: finalTopicId,
      level_id: finalLevelId,
    };
  }

  /**
   * Setujui seluruh soal dalam satu batch impor
   */
  static bulkApproveBatch(batchId: string): number {
    const db = getDb();
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE questions 
      SET status = 'approved', updated_at = ?
      WHERE import_batch_id = ? AND status = 'draft'
    `).run(now, batchId);

    return result.changes;
  }

  /**
   * Ekspor bank soal ke format JSON resmi v1.0
   */
  static exportQuestions(filters: {
    education_level: string;
    semester: number;
    topic_slug?: string;
  }): QuestionBankFile {
    const db = getDb();
    let query = `
      SELECT q.*, t.slug as topic_slug
      FROM questions q
      LEFT JOIN topics t ON q.topic_id = t.id
      WHERE q.education_level = ? AND q.semester = ? AND q.status IN ('approved', 'active')
    `;
    const params: (string | number)[] = [filters.education_level, filters.semester];

    if (filters.topic_slug) {
      query += ' AND t.slug = ?';
      params.push(filters.topic_slug);
    }

    query += ' ORDER BY q.question_id ASC';

    const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

    const questions: QuestionBankItem[] = rows.map((r) => ({
      question_id: r.question_id as string,
      type: r.type as 'multiple_choice' | 'number_input',
      question: r.question as string,
      visual: (r.visual as string | null) || null,
      options: JSON.parse(r.options_json as string),
      correct_answer: r.correct_answer as string,
      explanation: r.explanation as string,
      tags: JSON.parse(r.tags_json as string),
    }));

    return {
      schema_version: '1.0',
      subject: 'mathematics',
      education_level: filters.education_level as QuestionBankFile['education_level'],
      semester: filters.semester as 1 | 2,
      topic: filters.topic_slug || 'all',
      difficulty: 2,
      questions,
    };
  }
}
