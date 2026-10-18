import { getDb } from './index.js';
import { runMigrations } from './migrate.js';

interface CurriculumSeedItem {
  education_level: string;
  semester: number;
  topic_name: string;
  topic_slug: string;
  order_index: number;
  levels: {
    level_number: number;
    name: string;
    required_xp: number;
  }[];
}

export const INITIAL_CURRICULUM: CurriculumSeedItem[] = [
  // TK A
  {
    education_level: 'TK_A',
    semester: 1,
    topic_name: 'Mengenal Angka Ceria',
    topic_slug: 'tk-a-s1-angka-ceria',
    order_index: 1,
    levels: [
      { level_number: 1, name: 'Mengenal Angka 1 sampai 3', required_xp: 30 },
      { level_number: 2, name: 'Mengenal Angka 4 dan 5', required_xp: 30 },
      { level_number: 3, name: 'Membilang Buah dan Benda', required_xp: 40 },
    ],
  },
  {
    education_level: 'TK_A',
    semester: 2,
    topic_name: 'Bentuk dan Perbandingan',
    topic_slug: 'tk-a-s2-bentuk-perbandingan',
    order_index: 2,
    levels: [
      { level_number: 1, name: 'Mengenal Bentuk Geometri Dasar', required_xp: 30 },
      { level_number: 2, name: 'Membandingkan Banyak dan Sedikit', required_xp: 40 },
    ],
  },

  // TK B
  {
    education_level: 'TK_B',
    semester: 1,
    topic_name: 'Berhitung Angka 1-10',
    topic_slug: 'tk-b-s1-hitung-1-10',
    order_index: 1,
    levels: [
      { level_number: 1, name: 'Menghitung Benda 1 sampai 10', required_xp: 40 },
      { level_number: 2, name: 'Urutan Bilangan Maju dan Mundur', required_xp: 40 },
    ],
  },
  {
    education_level: 'TK_B',
    semester: 2,
    topic_name: 'Penjumlahan Gambar Konkret',
    topic_slug: 'tk-b-s2-tambah-konkret',
    order_index: 2,
    levels: [
      { level_number: 1, name: 'Gabung Benda (Tambah Sederhana)', required_xp: 40 },
      { level_number: 2, name: 'Ambil Benda (Kurang Sederhana)', required_xp: 40 },
    ],
  },

  // SD Kelas 1
  {
    education_level: 'SD_1',
    semester: 1,
    topic_name: 'Penjumlahan dan Pengurangan Dasar',
    topic_slug: 'sd-1-s1-tambah-kurang',
    order_index: 1,
    levels: [
      { level_number: 1, name: 'Mengenal Angka 1 sampai 10', required_xp: 50 },
      { level_number: 2, name: 'Menghitung Benda Nyata', required_xp: 50 },
      { level_number: 3, name: 'Penjumlahan Bilangan 1-10', required_xp: 50 },
      { level_number: 4, name: 'Pengurangan Bilangan 1-10', required_xp: 50 },
      { level_number: 5, name: 'Tantangan Campuran Tambah Kurang', required_xp: 60 },
    ],
  },
  {
    education_level: 'SD_1',
    semester: 2,
    topic_name: 'Bilangan Cacah Sampai 99 & Waktu',
    topic_slug: 'sd-1-s2-cacah-99-waktu',
    order_index: 2,
    levels: [
      { level_number: 1, name: 'Mengenal Puluhan dan Satuan', required_xp: 50 },
      { level_number: 2, name: 'Membaca Jam Dinding', required_xp: 50 },
      { level_number: 3, name: 'Pengukuran Panjang dengan Jengkal', required_xp: 50 },
    ],
  },

  // SD Kelas 2
  {
    education_level: 'SD_2',
    semester: 1,
    topic_name: 'Operasi Bersusun Ratusan',
    topic_slug: 'sd-2-s1-operasi-ratusan',
    order_index: 1,
    levels: [
      { level_number: 1, name: 'Nilai Tempat Ratusan', required_xp: 50 },
      { level_number: 2, name: 'Penjumlahan Bersusun Menyimpan', required_xp: 60 },
      { level_number: 3, name: 'Pengurangan Bersusun Meminjam', required_xp: 60 },
    ],
  },
  {
    education_level: 'SD_2',
    semester: 2,
    topic_name: 'Dasar Perkalian dan Pembagian',
    topic_slug: 'sd-2-s2-kali-bagi-dasar',
    order_index: 2,
    levels: [
      { level_number: 1, name: 'Perkalian Sebagai Penjumlahan Berulang', required_xp: 60 },
      { level_number: 2, name: 'Tabel Perkalian 2, 5, dan 10', required_xp: 60 },
      { level_number: 3, name: 'Pembagian Sebagai Pengurangan Berulang', required_xp: 60 },
    ],
  },

  // SD Kelas 3
  {
    education_level: 'SD_3',
    semester: 1,
    topic_name: 'Perkalian dan Pembagian Ribuan',
    topic_slug: 'sd-3-s1-kali-bagi-ribuan',
    order_index: 1,
    levels: [
      { level_number: 1, name: 'Perkalian Bersusun Panjang', required_xp: 60 },
      { level_number: 2, name: 'Pembagian Porogapit Dasar', required_xp: 70 },
    ],
  },
  {
    education_level: 'SD_3',
    semester: 2,
    topic_name: 'Pecahan Sederhana & Bangun Datar',
    topic_slug: 'sd-3-s2-pecahan-bangun-datar',
    order_index: 2,
    levels: [
      { level_number: 1, name: 'Mengenal Pecahan 1/2, 1/3, 1/4', required_xp: 60 },
      { level_number: 2, name: 'Keliling Persegi dan Persegi Panjang', required_xp: 70 },
    ],
  },

  // SD Kelas 4
  {
    education_level: 'SD_4',
    semester: 1,
    topic_name: 'Pecahan Senilai, FPB & KPK',
    topic_slug: 'sd-4-s1-pecahan-fpb-kpk',
    order_index: 1,
    levels: [
      { level_number: 1, name: 'Menyederhanakan Pecahan', required_xp: 70 },
      { level_number: 2, name: 'Faktor dan Kelipatan Bilangan', required_xp: 70 },
      { level_number: 3, name: 'Menentukan FPB dan KPK', required_xp: 80 },
    ],
  },
  {
    education_level: 'SD_4',
    semester: 2,
    topic_name: 'Luas Bangun Datar dan Sudut',
    topic_slug: 'sd-4-s2-luas-sudut',
    order_index: 2,
    levels: [
      { level_number: 1, name: 'Luas Persegi, Persegi Panjang, Segitiga', required_xp: 70 },
      { level_number: 2, name: 'Mengukur Sudut dengan Busur', required_xp: 70 },
    ],
  },

  // SD Kelas 5
  {
    education_level: 'SD_5',
    semester: 1,
    topic_name: 'Operasi Pecahan & Perbandingan',
    topic_slug: 'sd-5-s1-pecahan-skala',
    order_index: 1,
    levels: [
      { level_number: 1, name: 'Penjumlahan dan Pengurangan Beda Penyebut', required_xp: 80 },
      { level_number: 2, name: 'Perbandingan dan Skala Peta', required_xp: 80 },
    ],
  },
  {
    education_level: 'SD_5',
    semester: 2,
    topic_name: 'Volume Bangun Ruang',
    topic_slug: 'sd-5-s2-volume-kubus-balok',
    order_index: 2,
    levels: [
      { level_number: 1, name: 'Pangkat Tiga dan Akar Pangkat Tiga', required_xp: 80 },
      { level_number: 2, name: 'Volume Kubus dan Balok', required_xp: 80 },
    ],
  },

  // SD Kelas 6
  {
    education_level: 'SD_6',
    semester: 1,
    topic_name: 'Bilangan Bulat Negatif & Lingkaran',
    topic_slug: 'sd-6-s1-bulat-negatif-lingkaran',
    order_index: 1,
    levels: [
      { level_number: 1, name: 'Garis Bilangan dan Bilangan Negatif', required_xp: 80 },
      { level_number: 2, name: 'Keliling dan Luas Lingkaran', required_xp: 90 },
    ],
  },
  {
    education_level: 'SD_6',
    semester: 2,
    topic_name: 'Statistika & Rata-rata Data',
    topic_slug: 'sd-6-s2-statistika-data',
    order_index: 2,
    levels: [
      { level_number: 1, name: 'Membaca Diagram Batang dan Lingkaran', required_xp: 80 },
      { level_number: 2, name: 'Menghitung Rata-rata (Mean) dan Modus', required_xp: 90 },
    ],
  },
];

export const STARTER_QUESTIONS = [
  // TK A - Semester 1
  {
    question_id: 'MATH-TKA-S1-001',
    subject: 'mathematics',
    education_level: 'TK_A',
    semester: 1,
    topic_slug: 'tk-a-s1-angka-ceria',
    level_number: 1,
    difficulty: 1,
    type: 'multiple_choice',
    question: 'Ada berapa buah apel merah ini?',
    visual: '🍎 🍎',
    options: [
      { id: 'A', text: '1' },
      { id: 'B', text: '2' },
      { id: 'C', text: '3' },
    ],
    correct_answer: 'B',
    explanation: 'Ada satu, dua! Totalnya ada 2 buah apel merah.',
    tags: ['counting', 'tk-a'],
  },
  {
    question_id: 'MATH-TKA-S1-002',
    subject: 'mathematics',
    education_level: 'TK_A',
    semester: 1,
    topic_slug: 'tk-a-s1-angka-ceria',
    level_number: 1,
    difficulty: 1,
    type: 'multiple_choice',
    question: 'Berapa banyak anak kucing yang manis ini?',
    visual: '🐱',
    options: [
      { id: 'A', text: '1' },
      { id: 'B', text: '2' },
      { id: 'C', text: '3' },
    ],
    correct_answer: 'A',
    explanation: 'Hanya ada 1 anak kucing yang lucu.',
    tags: ['counting', 'tk-a'],
  },
  {
    question_id: 'MATH-TKA-S1-003',
    subject: 'mathematics',
    education_level: 'TK_A',
    semester: 1,
    topic_slug: 'tk-a-s1-angka-ceria',
    level_number: 1,
    difficulty: 1,
    type: 'multiple_choice',
    question: 'Hitung semua balon warna-warni yang terbang:',
    visual: '🎈 🎈 🎈',
    options: [
      { id: 'A', text: '2' },
      { id: 'B', text: '3' },
      { id: 'C', text: '4' },
    ],
    correct_answer: 'B',
    explanation: 'Satu, dua, tiga! Ada 3 balon warna-warni.',
    tags: ['counting', 'tk-a'],
  },
  {
    question_id: 'MATH-TKA-S1-004',
    subject: 'mathematics',
    education_level: 'TK_A',
    semester: 1,
    topic_slug: 'tk-a-s1-angka-ceria',
    level_number: 2,
    difficulty: 1,
    type: 'multiple_choice',
    question: 'Ada berapa bintang kecil yang bersinar?',
    visual: '⭐ ⭐ ⭐ ⭐',
    options: [
      { id: 'A', text: '3' },
      { id: 'B', text: '4' },
      { id: 'C', text: '5' },
    ],
    correct_answer: 'B',
    explanation: 'Ada 4 bintang kecil yang bersinar terang.',
    tags: ['counting', 'tk-a'],
  },
  {
    question_id: 'MATH-TKA-S1-005',
    subject: 'mathematics',
    education_level: 'TK_A',
    semester: 1,
    topic_slug: 'tk-a-s1-angka-ceria',
    level_number: 2,
    difficulty: 1,
    type: 'multiple_choice',
    question: 'Hitung stroberi manis di piring:',
    visual: '🍓 🍓 🍓 🍓 🍓',
    options: [
      { id: 'A', text: '4' },
      { id: 'B', text: '5' },
      { id: 'C', text: '6' },
    ],
    correct_answer: 'B',
    explanation: 'Satu, dua, tiga, empat, lima! Ada 5 stroberi.',
    tags: ['counting', 'tk-a'],
  },

  // TK B - Semester 1
  {
    question_id: 'MATH-TKB-S1-001',
    subject: 'mathematics',
    education_level: 'TK_B',
    semester: 1,
    topic_slug: 'tk-b-s1-hitung-1-10',
    level_number: 1,
    difficulty: 1,
    type: 'multiple_choice',
    question: 'Berapa jumlah mobil mainan berikut?',
    visual: '🚗 🚗 🚗 🚗 🚗 🚗',
    options: [
      { id: 'A', text: '5' },
      { id: 'B', text: '6' },
      { id: 'C', text: '7' },
    ],
    correct_answer: 'B',
    explanation: 'Ada 6 mobil mainan berjejer rapi.',
    tags: ['counting', 'tk-b'],
  },
  {
    question_id: 'MATH-TKB-S1-002',
    subject: 'mathematics',
    education_level: 'TK_B',
    semester: 1,
    topic_slug: 'tk-b-s1-hitung-1-10',
    level_number: 1,
    difficulty: 1,
    type: 'multiple_choice',
    question: 'Angka berapa yang datang setelah angka 4?',
    visual: '1 - 2 - 3 - 4 - ...',
    options: [
      { id: 'A', text: '5' },
      { id: 'B', text: '6' },
      { id: 'C', text: '3' },
    ],
    correct_answer: 'A',
    explanation: 'Setelah empat adalah lima (5).',
    tags: ['sequence', 'tk-b'],
  },
  {
    question_id: 'MATH-TKB-S1-003',
    subject: 'mathematics',
    education_level: 'TK_B',
    semester: 1,
    topic_slug: 'tk-b-s1-hitung-1-10',
    level_number: 1,
    difficulty: 1,
    type: 'multiple_choice',
    question: 'Ada 3 ikan berenang, datang lagi 2 ikan. Berapa semuanya?',
    visual: '🐟 🐟 🐟   +   🐟 🐟',
    options: [
      { id: 'A', text: '4' },
      { id: 'B', text: '5' },
      { id: 'C', text: '6' },
    ],
    correct_answer: 'B',
    explanation: 'Tiga ikan ditambah dua ikan menjadi 5 ikan.',
    tags: ['addition', 'tk-b'],
  },

  // SD 1 - Semester 1
  {
    question_id: 'MATH-SD1-S1-001',
    subject: 'mathematics',
    education_level: 'SD_1',
    semester: 1,
    topic_slug: 'sd-1-s1-tambah-kurang',
    level_number: 1,
    difficulty: 1,
    type: 'multiple_choice',
    question: 'Berapakah hasil dari 5 + 3?',
    visual: '🍎🍎🍎🍎🍎  +  🍎🍎🍎',
    options: [
      { id: 'A', text: '6' },
      { id: 'B', text: '7' },
      { id: 'C', text: '8' },
      { id: 'D', text: '9' },
    ],
    correct_answer: 'C',
    explanation: 'Lima buah apel ditambah tiga buah apel sama dengan delapan (8) apel.',
    tags: ['addition', 'sd-1'],
  },
  {
    question_id: 'MATH-SD1-S1-002',
    subject: 'mathematics',
    education_level: 'SD_1',
    semester: 1,
    topic_slug: 'sd-1-s1-tambah-kurang',
    level_number: 1,
    difficulty: 1,
    type: 'multiple_choice',
    question: 'Ada 4 kelinci, lalu datang lagi 2 kelinci. Ada berapa kelinci sekarang?',
    visual: '🐇🐇🐇🐇  +  🐇🐇',
    options: [
      { id: 'A', text: '5' },
      { id: 'B', text: '6' },
      { id: 'C', text: '7' },
      { id: 'D', text: '8' },
    ],
    correct_answer: 'B',
    explanation: 'Empat kelinci ditambah dua kelinci menjadi 6 kelinci.',
    tags: ['addition', 'word-problem'],
  },
  {
    question_id: 'MATH-SD1-S1-003',
    subject: 'mathematics',
    education_level: 'SD_1',
    semester: 1,
    topic_slug: 'sd-1-s1-tambah-kurang',
    level_number: 1,
    difficulty: 1,
    type: 'multiple_choice',
    question: 'Berapakah hasil dari 7 + 2?',
    visual: '⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐  +  ⭐ ⭐',
    options: [
      { id: 'A', text: '8' },
      { id: 'B', text: '9' },
      { id: 'C', text: '10' },
      { id: 'D', text: '7' },
    ],
    correct_answer: 'B',
    explanation: 'Tujuh ditambah dua langkah ke depan sama dengan sembilan (9).',
    tags: ['addition', 'sd-1'],
  },
  {
    question_id: 'MATH-SD1-S1-004',
    subject: 'mathematics',
    education_level: 'SD_1',
    semester: 1,
    topic_slug: 'sd-1-s1-tambah-kurang',
    level_number: 1,
    difficulty: 1,
    type: 'multiple_choice',
    question: 'Ibu membeli 6 buah donat, adik memakan 2 donat. Sisa berapa donat Ibu?',
    visual: '🍩🍩🍩🍩🍩🍩  -  🍩🍩',
    options: [
      { id: 'A', text: '3' },
      { id: 'B', text: '4' },
      { id: 'C', text: '5' },
      { id: 'D', text: '6' },
    ],
    correct_answer: 'B',
    explanation: 'Enam donat dikurangi dua donat yang dimakan bersisa 4 donat.',
    tags: ['subtraction', 'word-problem'],
  },
  {
    question_id: 'MATH-SD1-S1-005',
    subject: 'mathematics',
    education_level: 'SD_1',
    semester: 1,
    topic_slug: 'sd-1-s1-tambah-kurang',
    level_number: 2,
    difficulty: 1,
    type: 'multiple_choice',
    question: 'Berapakah hasil dari 9 - 4?',
    visual: '🎈🎈🎈🎈🎈🎈🎈🎈🎈  -  🎈🎈🎈🎈',
    options: [
      { id: 'A', text: '4' },
      { id: 'B', text: '5' },
      { id: 'C', text: '6' },
      { id: 'D', text: '7' },
    ],
    correct_answer: 'B',
    explanation: 'Sembilan dikurangi empat sama dengan 5.',
    tags: ['subtraction', 'sd-1'],
  },
  {
    question_id: 'MATH-SD1-S1-006',
    subject: 'mathematics',
    education_level: 'SD_1',
    semester: 1,
    topic_slug: 'sd-1-s1-tambah-kurang',
    level_number: 2,
    difficulty: 1,
    type: 'multiple_choice',
    question: 'Berapakah hasil dari 3 + 4?',
    visual: '🌸🌸🌸  +  🌸🌸🌸🌸',
    options: [
      { id: 'A', text: '6' },
      { id: 'B', text: '7' },
      { id: 'C', text: '8' },
      { id: 'D', text: '9' },
    ],
    correct_answer: 'B',
    explanation: 'Tiga bunga ditambah empat bunga sama dengan tujuh (7) bunga.',
    tags: ['addition', 'sd-1'],
  },
];

export const STARTER_BADGES = [
  {
    id: 'badge-first-step',
    slug: 'first-step',
    name: 'Langkah Pertama',
    description: 'Menyelesaikan level matematika pertama',
    icon: '🌱',
    criteria_type: 'level_complete',
    criteria_value: '1',
  },
  {
    id: 'badge-math-whiz',
    slug: 'math-whiz',
    name: 'Bintang Berhitung',
    description: 'Menyelesaikan 3 level matematika',
    icon: '⭐',
    criteria_type: 'level_complete',
    criteria_value: '3',
  },
  {
    id: 'badge-xp-hunter',
    slug: 'xp-hunter',
    name: 'Kolektor XP',
    description: 'Mengumpulkan total 100 XP dari belajar',
    icon: '💎',
    criteria_type: 'total_xp',
    criteria_value: '100',
  },
  {
    id: 'badge-perfect-score',
    slug: 'perfect-score',
    name: 'Juara Sempurna',
    description: 'Menuntaskan level dengan target 100%',
    icon: '🏆',
    criteria_type: 'perfect_level',
    criteria_value: '1',
  },
];

export const STARTER_CARDS = [
  {
    id: 'card-rubah-cerdik',
    slug: 'rubah-cerdik',
    name: 'Rubah Cerdik Aritmatika',
    rarity: 'common',
    illustration: '🦊',
    stats: { power: 'Hitung Cepat +5', attack: 10 },
  },
  {
    id: 'card-kelinci-lincah',
    slug: 'kelinci-lincah',
    name: 'Kelinci Lincah Penjumlahan',
    rarity: 'common',
    illustration: '🐇',
    stats: { power: 'Langkah Gesit +5', attack: 12 },
  },
  {
    id: 'card-kura-tangguh',
    slug: 'kura-tangguh',
    name: 'Kura-kura Logika Tangguh',
    rarity: 'common',
    illustration: '🐢',
    stats: { power: 'Fokus Ekstra +8', attack: 15 },
  },
  {
    id: 'card-kucing-bintang',
    slug: 'kucing-bintang',
    name: 'Kucing Pembilang Bintang',
    rarity: 'rare',
    illustration: '🐱',
    stats: { power: 'Akurasi Bintang +15', attack: 25 },
  },
  {
    id: 'card-kancil-bijak',
    slug: 'kancil-bijak',
    name: 'Kancil Pengukur Ruang',
    rarity: 'rare',
    illustration: '🦌',
    stats: { power: 'Cerdik Ruang +18', attack: 28 },
  },
  {
    id: 'card-singa-penjaga',
    slug: 'singa-penjaga',
    name: 'Singa Pelindung Angka',
    rarity: 'epic',
    illustration: '🦁',
    stats: { power: 'Keberanian +30', attack: 45 },
  },
  {
    id: 'card-naga-emas',
    slug: 'naga-emas',
    name: 'Naga Aritmatika Nusantara',
    rarity: 'legendary',
    illustration: '🐲',
    stats: { power: 'Master Aritmatika +50', attack: 80 },
  },
];

export function seedCurriculum(): void {
  const db = getDb();
  runMigrations();

  const insertTopicStmt = db.prepare(`
    INSERT OR IGNORE INTO topics (id, subject, education_level, semester, name, slug, order_index, created_at)
    VALUES (?, 'mathematics', ?, ?, ?, ?, ?, ?)
  `);

  const insertLevelStmt = db.prepare(`
    INSERT OR IGNORE INTO levels (id, topic_id, level_number, name, required_xp, passing_score, created_at)
    VALUES (?, ?, ?, ?, ?, 100, ?)
  `);

  const insertQuestionStmt = db.prepare(`
    INSERT OR IGNORE INTO questions (
      id, import_batch_id, question_id, subject, education_level, semester,
      topic_id, level_id, difficulty, type, question, visual,
      options_json, correct_answer, explanation, tags_json, status,
      created_at, updated_at
    ) VALUES (
      ?, NULL, ?, 'mathematics', ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, 'active',
      ?, ?
    )
  `);

  const insertBadgeStmt = db.prepare(`
    INSERT OR IGNORE INTO badges (id, slug, name, description, icon, criteria_type, criteria_value)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCardStmt = db.prepare(`
    INSERT OR IGNORE INTO cards (id, slug, name, rarity, illustration, stats_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    const now = new Date().toISOString();

    for (const item of INITIAL_CURRICULUM) {
      const topicId = `topic-${item.topic_slug}`;
      insertTopicStmt.run(
        topicId,
        item.education_level,
        item.semester,
        item.topic_name,
        item.topic_slug,
        item.order_index,
        now
      );

      for (const lvl of item.levels) {
        const levelId = `lvl-${item.topic_slug}-${lvl.level_number}`;
        insertLevelStmt.run(
          levelId,
          topicId,
          lvl.level_number,
          lvl.name,
          lvl.required_xp,
          now
        );
      }
    }

    for (const q of STARTER_QUESTIONS) {
      const qId = `q-${q.question_id.toLowerCase()}`;
      const topicId = `topic-${q.topic_slug}`;
      const levelId = `lvl-${q.topic_slug}-${q.level_number}`;

      insertQuestionStmt.run(
        qId,
        q.question_id,
        q.education_level,
        q.semester,
        topicId,
        levelId,
        q.difficulty,
        q.type,
        q.question,
        q.visual || null,
        JSON.stringify(q.options),
        q.correct_answer,
        q.explanation,
        JSON.stringify(q.tags),
        now,
        now
      );
    }

    for (const b of STARTER_BADGES) {
      insertBadgeStmt.run(b.id, b.slug, b.name, b.description, b.icon, b.criteria_type, b.criteria_value);
    }

    for (const c of STARTER_CARDS) {
      insertCardStmt.run(c.id, c.slug, c.name, c.rarity, c.illustration, JSON.stringify(c.stats));
    }
  })();

  console.log('✅ Curriculum, starter questions, badges & cards seed successfully inserted.');
}

// Jalankan jika dipanggil via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedCurriculum();
}
