/**
 * @kidsgo/shared
 * Definisi tipe bersama, konstanta kurikulum, dan kontrak skema data untuk KidsGo!
 */

// ==========================================
// 1. Kurikulum & Jenjang Pendidikan
// ==========================================

export type EducationLevel =
  | 'TK_A'
  | 'TK_B'
  | 'SD_1'
  | 'SD_2'
  | 'SD_3'
  | 'SD_4'
  | 'SD_5'
  | 'SD_6';

export interface EducationLevelInfo {
  code: EducationLevel;
  name: string;
  age: string;
  order: number;
}

export const EDUCATION_LEVELS: readonly EducationLevelInfo[] = [
  { code: 'TK_A', name: 'TK A', age: '4–5 tahun', order: 1 },
  { code: 'TK_B', name: 'TK B', age: '5–6 tahun', order: 2 },
  { code: 'SD_1', name: 'SD Kelas 1', age: '7 tahun', order: 3 },
  { code: 'SD_2', name: 'SD Kelas 2', age: '8 tahun', order: 4 },
  { code: 'SD_3', name: 'SD Kelas 3', age: '9 tahun', order: 5 },
  { code: 'SD_4', name: 'SD Kelas 4', age: '10 tahun', order: 6 },
  { code: 'SD_5', name: 'SD Kelas 5', age: '11 tahun', order: 7 },
  { code: 'SD_6', name: 'SD Kelas 6', age: '12 tahun', order: 8 },
] as const;

export type SemesterNumber = 1 | 2;

export type SubjectCode = 'mathematics';

// ==========================================
// 2. Bank Soal & Schema v1.0
// ==========================================

export type QuestionType = 'multiple_choice' | 'number_input';

export type QuestionStatus = 'draft' | 'approved' | 'active' | 'archived';

export interface QuestionOption {
  id: string; // e.g. "A", "B", "C", "D"
  text: string;
  visual?: string | null;
}

export interface QuestionBankItem {
  question_id: string;
  type: QuestionType;
  question: string;
  visual?: string | null;
  options: QuestionOption[];
  correct_answer: string;
  explanation: string;
  tags: string[];
}

export interface QuestionBankFile {
  schema_version: '1.0';
  subject: SubjectCode;
  education_level: EducationLevel;
  semester: SemesterNumber;
  topic: string;
  difficulty: number;
  questions: QuestionBankItem[];
}

// ==========================================
// 3. Game Engine & Soal untuk Klien
// ==========================================

// Payload soal yang aman dikirim ke frontend (KUNCI JAWABAN TIDAK DISERTAKAN)
export interface ClientQuestionOption {
  id: string;
  text: string;
  visual?: string | null;
}

export interface ClientQuestion {
  question_id: string;
  type: QuestionType;
  question: string;
  visual?: string | null;
  options: ClientQuestionOption[];
  tags: string[];
}

export interface SubmitAnswerPayload {
  question_id: string;
  selected_answer: string;
}

export interface SubmitAnswerResult {
  is_correct: boolean;
  explanation: string;
  correct_answer?: string; // Dikirim HANYA setelah dijawab oleh server
  xp_awarded: number;
  level_completed: boolean;
  next_unlocked: boolean;
}

// ==========================================
// 4. Akun & Pemain
// ==========================================

export interface PlayerProfile {
  id: string;
  nickname: string;
  avatar: string;
  grade: EducationLevel;
  current_xp: number;
  is_suspended?: boolean;
  created_at: string;
}

// ==========================================
// 5. Reward & Koleksi (Kartu & Badge)
// ==========================================

export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CollectibleCard {
  id: string;
  slug: string;
  name: string;
  rarity: CardRarity;
  illustration: string;
  stats?: Record<string, unknown>;
}

export interface AchievementBadge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
}

// ==========================================
// 6. Leaderboard
// ==========================================

export interface LeaderboardEntry {
  rank: number;
  player_id: string;
  nickname: string;
  avatar: string;
  grade: EducationLevel;
  total_xp: number;
}
