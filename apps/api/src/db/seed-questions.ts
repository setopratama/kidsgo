import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QuestionBankService } from '../modules/question-bank/question-bank.service.js';
import { closeDb } from './index.js';
import { QuestionBankFile } from '@kidsgo/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function seedSampleQuestions(): void {
  const filePath = path.resolve(__dirname, '../../../../storage/imports/sample-math-sd1-s1.json');
  if (!fs.existsSync(filePath)) {
    console.warn('⚠️ Sample question file not found:', filePath);
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw) as QuestionBankFile;

  try {
    const importRes = QuestionBankService.importQuestions(data, 'admin', 'sample-math-sd1-s1.json');
    console.log(`✅ Sample questions imported as draft (Batch: ${importRes.batch_id})`);

    // Setujui dan aktifkan soal awal untuk kebutuhan demo & game engine
    const approved = QuestionBankService.bulkApproveBatch(importRes.batch_id);
    for (const q of data.questions) {
      QuestionBankService.updateQuestionStatus(q.question_id, 'active');
    }
    console.log(`✅ ${approved} sample questions approved and activated.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('sudah ada di database')) {
      console.log('ℹ️ Sample questions already exist in database.');
    } else {
      console.error('❌ Failed to seed sample questions:', msg);
    }
  }
}

if (process.argv[1]?.endsWith('seed-questions.ts') || process.argv[1]?.endsWith('seed-questions.js')) {
  seedSampleQuestions();
  closeDb();
}
