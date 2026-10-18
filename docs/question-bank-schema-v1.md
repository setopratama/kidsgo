# Kontrak Skema Bank Soal v1.0 (KidsGo!)

Dokumen ini mendefinisikan struktur dan aturan validasi untuk berkas JSON Bank Soal KidsGo! sesuai ketentuan di [AGENTS.md](file:///home/setopratama/Projects/kidsgo/AGENTS.md).

---

## 1. Spesifikasi Format

Setiap berkas JSON bank soal mewakili satu kumpulan soal untuk topik dan tingkat kesulitan tertentu dalam satu semester kurikulum.

```json
{
  "schema_version": "1.0",
  "subject": "mathematics",
  "education_level": "SD_1",
  "semester": 1,
  "topic": "addition",
  "difficulty": 2,
  "questions": [
    {
      "question_id": "MATH-SD1-S1-0001",
      "type": "multiple_choice",
      "question": "Berapakah hasil 5 + 3?",
      "visual": "🍎🍎🍎🍎🍎 + 🍎🍎🍎",
      "options": [
        { "id": "A", "text": "6" },
        { "id": "B", "text": "7" },
        { "id": "C", "text": "8" },
        { "id": "D", "text": "9" }
      ],
      "correct_answer": "C",
      "explanation": "Lima buah apel ditambah tiga apel sama dengan delapan apel.",
      "tags": ["addition", "basic-math"]
    }
  ]
}
```

---

## 2. Definisi Field Header

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `schema_version` | String | Ya | Wajib bernilai persis `"1.0"`. |
| `subject` | String | Ya | MVP hanya mendukung `"mathematics"`. |
| `education_level` | String | Ya | Salah satu dari: `TK_A`, `TK_B`, `SD_1`, `SD_2`, `SD_3`, `SD_4`, `SD_5`, `SD_6`. |
| `semester` | Integer | Ya | Bernilai `1` atau `2`. |
| `topic` | String | Ya | Slug topik kurikulum (contoh: `addition`, `counting`, `shapes`). |
| `difficulty` | Integer | Ya | Skala kesulitan `1` (sangat mudah) hingga `5` (menantang). |
| `level_number` | Integer | Tidak (Opsional) | Nomor level petualangan (contoh: `1` untuk Level 1). Jika diisi, seluruh soal dalam file otomatis langsung dipasang ke Jalur Petualangan kurikulum tersebut! (Alias opsional: `level`). |
| `questions` | Array | Ya | Daftar soal (minimal 1 soal per berkas). |

---

## 3. Definisi Field Objek Soal (`questions[]`)

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `question_id` | String | Ya | ID unik soal (format standar: `MATH-[JENJANG]-S[SEMESTER]-[NOMOR]`, contoh: `MATH-SD1-S1-0001`). Harus unik di seluruh sistem. |
| `type` | String | Ya | `"multiple_choice"` atau `"number_input"`. |
| `question` | String | Ya | Teks pertanyaan ramah anak dalam Bahasa Indonesia. |
| `visual` | String / Null | Tidak | Representasi visual opsional (emoji konkret, teks format gambar, atau null). |
| `options` | Array | Ya* | Daftar opsi jawaban (wajib untuk tipe `"multiple_choice"`, minimal 2 opsi, ideal 4 opsi). |
| `options[].id` | String | Ya | Kode opsi (contoh: `"A"`, `"B"`, `"C"`, `"D"`). Tidak boleh duplikat dalam satu soal. |
| `options[].text` | String | Ya | Teks pilihan jawaban. Tidak boleh ada teks opsi duplikat dalam satu soal. |
| `correct_answer` | String | Ya | Harus mengacu persis pada salah satu `id` opsi yang ada di dalam `options`. |
| `explanation` | String | Ya | Penjelasan suportif dan ramah anak mengapa jawaban tersebut benar. |
| `tags` | Array of String | Ya | Tag penanda topik/subtopik (contoh: `["addition", "counting"]`). |

---

## 4. Siklus Hidup & Status Soal

Soal yang diimpor melewati transisi status berikut sebelum dapat disajikan ke anak:

```
[Import JSON] ➔ draft ➔ (Admin Review & Approval) ➔ approved ➔ (Admin Activation) ➔ active
                                                                                   ↓
                                                                                archived
```

1. **`draft`**: Status awal setelah file JSON diimpor dan lolos validasi otomatis. Soal tidak dapat dimainkan anak.
2. **`approved`**: Soal telah diperiksa dan disetujui secara pedagogis oleh admin.
3. **`active`**: Soal aktif dan dapat diambil oleh Game Engine untuk sesi belajar anak.
4. **`archived`**: Soal dinonaktifkan tanpa menghapus riwayat sesi belajar yang pernah menggunakan soal tersebut.
