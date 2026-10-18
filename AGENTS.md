# AGENTS.md — KidsGo!

Dokumen ini adalah pedoman utama untuk AI coding agent yang mengembangkan **KidsGo!**. Baca seluruh instruksi sebelum melakukan perubahan kode. Jika instruksi tugas bertentangan dengan dokumen ini, tanyakan klarifikasi sebelum mengubah keputusan arsitektur atau aturan produk yang sudah ditetapkan.

## 1. Ringkasan Produk

**KidsGo!** adalah platform belajar anak berbasis gamifikasi dengan pendekatan seperti kombinasi Duolingo dan permainan RPG/koleksi kartu.

- Tagline: **Belajar Seru, Naik Level!**
- Target usia: 4–12 tahun.
- Pengguna: anak TK A/B hingga SD kelas 6.
- Bahasa antarmuka dan konten utama: Bahasa Indonesia.
- MVP hanya mengaktifkan mata pelajaran **Matematika**.
- Arsitektur harus siap mendukung mata pelajaran lain di masa depan:
  - Membaca dan menulis.
  - Bahasa Inggris.

Fokus produk adalah pengalaman belajar yang menyenangkan, progres yang jelas, materi sesuai tahap pendidikan, dan keamanan anak.

## 2. Keputusan Produk yang Tidak Boleh Diubah Sepihak

Frontend resmi KidsGo! adalah React + Vite + TypeScript dalam mode CSR/SPA. Jangan menggunakan SSR atau Next.js untuk MVP.

1. Backend menggunakan **Node.js**.
2. Framework backend: **Fastify**.
3. Database MVP: **SQLite**.
4. ORM: **better-sqlite3**.
5. Validasi data: **JSON Schema bawaan Fastify**.
6. Frontend: **React + Vite + TypeScript** dengan arsitektur **Client-Side Rendering (CSR)**.
7. **Semua berjalan menggunakan Vite dan Node.js secara langsung tanpa Docker.** Jangan menambahkan Dockerfile, docker-compose, container virtualization, atau VM container overhead.
8. **Kompatibilitas dan desain UI/UX berfokus utama pada ukuran layar mobile (Mobile-First / Smartphone viewport).** Tampilan dioptimalkan untuk perangkat mobile anak.
9. Bank soal menggunakan berkas **JSON** dengan schema dan versi yang konsisten.
10. Game engine dibuat khusus untuk KidsGo!.
11. **Tidak ada integrasi AI/API generatif di dalam aplikasi KidsGo!.**
12. Pembuatan soal menggunakan ChatGPT atau Gemini secara manual di luar aplikasi. KidsGo! hanya mengimpor, memvalidasi, menyimpan, mengelola, mengekspor, dan menyajikan soal.
13. Jangan menambahkan API key AI, token manager, prompt builder, AI generator service, inference worker, atau biaya pemanggilan model ke dalam aplikasi.
14. Jangan membuat folder atau modul `ai-generator/`.

Jangan mengganti teknologi inti atau memperluas scope MVP tanpa persetujuan pemilik produk.

## 3. Jenjang Pendidikan dan Kurikulum

Jenjang yang harus dapat direpresentasikan:

| Kode | Jenjang | Usia sasaran |
|---|---|---:|
| `TK_A` | TK A | 4–5 |
| `TK_B` | TK B | 5–6 |
| `SD_1` | SD kelas 1 | 7 |
| `SD_2` | SD kelas 2 | 8 |
| `SD_3` | SD kelas 3 | 9 |
| `SD_4` | SD kelas 4 | 10 |
| `SD_5` | SD kelas 5 | 11 |
| `SD_6` | SD kelas 6 | 12 |

Setiap jenjang memiliki tepat **dua semester**.

Semester berisi level, dan level berisi soal. Jumlah level dan jumlah soal per level harus dikonfigurasi, bukan ditanam permanen di kode. Angka seperti 10 level per semester atau 10 soal per level hanya boleh menjadi nilai awal konfigurasi, bukan asumsi yang tersebar di seluruh aplikasi.

Setiap soal wajib memiliki jenjang, semester, topik, dan tingkat kesulitan yang jelas. Soal acak tetap harus sesuai kurikulum dan kemampuan jenjang tersebut. Jangan mengambil soal dari jenjang lain hanya untuk memenuhi jumlah soal.

## 4. Aturan Progres dan Unlock

Model progres yang diharapkan:

- Jawaban benar menambah progres level dan memberikan XP sesuai aturan reward.
- Jawaban salah menampilkan penjelasan yang mudah dipahami anak, lalu memberikan kesempatan menjawab soal pengganti.
- Jawaban salah tidak menghapus progres benar yang sudah diperoleh.
- Level berikutnya terbuka setelah target level saat ini tercapai 100%.
- Semester berikutnya terbuka setelah seluruh level pada semester berjalan selesai.
- Jenjang/kelas berikutnya terbuka setelah kedua semester pada jenjang saat ini selesai.
- Progres yang sudah selesai harus tersimpan. Anak tidak boleh diminta mengulang level yang sudah tuntas hanya karena keluar atau login kembali.

Aturan persentase progres, jumlah soal yang menjadi denominator, dan kondisi penyelesaian harus konsisten di backend. Jangan mempercayai nilai progres atau status unlock yang dikirim langsung oleh browser. Backend adalah sumber kebenaran.

Gunakan transaksi database untuk operasi yang mengubah jawaban, XP, progres, dan reward agar tidak terjadi penghitungan ganda atau kondisi data setengah tersimpan.

## 5. Sistem Soal dan Randomisasi

Game engine mengambil soal dari bank soal yang sudah berstatus layak digunakan.

Randomisasi dapat mencakup:
- Pemilihan soal dari kumpulan soal yang sesuai jenjang, semester, topik, level, dan kesulitan.
- Pengacakan urutan pilihan jawaban.
- Variasi angka, objek visual, atau konteks jika variasi tersebut memang disediakan dan tervalidasi.
- Pencegahan pengulangan soal dalam satu sesi.
- Pengurangan kemungkinan soal yang sama muncul berulang pada sesi-sesi terbaru.

Jangan mengandalkan randomisasi untuk menciptakan soal baru secara bebas saat anak bermain. Gunakan soal yang sudah diimpor dan disetujui. Jika diperlukan variasi parametrik, implementasikan hanya setelah format, batas nilai, dan validatornya ditentukan secara eksplisit.

Urutan pilihan jawaban boleh diacak, tetapi identitas opsi dan jawaban benar harus tetap konsisten. Jangan mengirim kunci jawaban ke frontend sebelum jawaban anak dikirim dan dinilai server.

## 6. Question Bank: Workflow Eksternal

Alur konten soal:

1. Admin mengekspor soal yang sudah ada dari KidsGo! ke JSON.
2. Admin memberikan JSON tersebut kepada ChatGPT atau Gemini melalui percakapan terpisah.
3. AI eksternal membuat variasi soal baru dengan mengikuti schema dan batas kurikulum.
4. Admin mengunduh JSON hasil generasi.
5. Admin mengimpor file ke KidsGo!.
6. KidsGo! memeriksa schema, referensi jawaban, metadata, duplikasi, dan validitas konten yang dapat diperiksa otomatis.
7. Admin melihat preview dan hasil validasi.
8. Admin menyetujui soal sebelum soal dapat digunakan oleh game engine.

KidsGo! tidak berkomunikasi dengan ChatGPT atau Gemini. Tidak ada proses generasi AI otomatis di dalam aplikasi.

### Fitur admin Question Bank

Rancang modul agar mendukung:
- Export semua soal.
- Export berdasarkan jenjang.
- Export berdasarkan semester.
- Export berdasarkan level, topik, atau kesulitan.
- Export sebagai file referensi untuk AI eksternal.
- Import JSON.
- Preview sebelum import.
- Validasi schema dan isi menggunakan JSON Schema serta pemeriksaan domain khusus.
- Deteksi ID duplikat dan konten duplikat.
- Riwayat import/batch.
- Persetujuan admin.
- Aktivasi atau penonaktifan soal.

Soal yang baru diimpor tidak boleh langsung tersedia untuk anak. Gunakan status yang eksplisit, misalnya `draft`, `approved`, dan `active`. Definisikan transisi status secara konsisten; jangan membuat status yang tumpang tindih tanpa alasan.

Jangan menghapus soal yang sudah direferensikan oleh riwayat sesi atau progres. Gunakan penonaktifan atau versioning agar histori tetap dapat dibaca.

## 7. Kontrak JSON Bank Soal

Gunakan schema berversi. Perubahan struktur harus menaikkan atau memperbarui `schema_version` dan disertai migrasi/kompatibilitas yang jelas.

Contoh format awal:

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
      "visual": null,
      "options": [
        { "id": "A", "text": "6" },
        { "id": "B", "text": "7" },
        { "id": "C", "text": "8" },
        { "id": "D", "text": "9" }
      ],
      "correct_answer": "C",
      "explanation": "Lima ditambah tiga sama dengan delapan.",
      "tags": ["addition", "basic-math"]
    }
  ]
}
```

Ini adalah contoh kontrak awal, bukan izin untuk mengubah schema sesuka hati. Sebelum implementasi import/export, tetapkan schema final dalam satu lokasi sumber kebenaran, misalnya `docs/question-bank-schema-v1.md` dan validator JSON Schema bawaan Fastify yang sesuai.

Validasi minimum:
- `schema_version` dikenali.
- `subject` aktif dan valid.
- Jenjang, semester, topik, dan kesulitan valid.
- `question_id` unik dalam file dan tidak bentrok dengan data yang sudah ada.
- Tipe soal didukung.
- Pilihan jawaban tidak duplikat.
- `correct_answer` menunjuk ke ID opsi yang tersedia.
- Penjelasan tersedia jika tipe soal membutuhkannya.
- Konten sesuai batas usia dan jenjang.
- Tidak ada field atau media yang tidak didukung.
- Deteksi duplikasi berdasarkan normalisasi teks, opsi, dan jawaban. Deteksi kesamaan matematis yang lebih canggih dapat ditambahkan kemudian, tetapi jangan membuat false positive yang menghapus soal berbeda.

Validasi otomatis tidak selalu dapat membuktikan kebenaran pedagogis atau seluruh penjelasan matematika. Tampilkan hasil validasi dan sediakan pemeriksaan admin; jangan mengklaim seluruh konten pasti benar hanya karena lolos schema.

## 8. Akun Anak dan Keamanan

Alur login awal yang direncanakan:
- Anak memasukkan nama atau nickname dan PIN.
- Login berikutnya meminta nama/nickname dan PIN.
- Browser boleh mengingat nama/nickname untuk mengurangi pengetikan.
- **Jangan menyimpan PIN dalam localStorage, sessionStorage, cookie yang dapat dibaca JavaScript, atau plaintext.**
- Simpan hash PIN menggunakan algoritma password hashing yang sesuai seperti Argon2id atau bcrypt.
- Gunakan session cookie yang aman: `HttpOnly`, `Secure` pada HTTPS, dan `SameSite` yang sesuai.
- Batasi percobaan PIN dan terapkan jeda/rate limit untuk mencegah brute force.
- Sediakan mekanisme reset PIN oleh orang tua/admin yang berwenang.

Jangan meminta atau menampilkan informasi pribadi anak yang tidak diperlukan. Leaderboard publik hanya menggunakan nickname dan avatar, bukan nama lengkap atau informasi identitas.

Jangan pernah mengirim PIN hash, kunci jawaban, token sesi, atau data sensitif ke frontend.


### PIN Dashboard Admin

- Dashboard admin menggunakan PIN awal/default **`123456`** sesuai keputusan produk.
- PIN ini hanya boleh digunakan sebagai kredensial bootstrap untuk instalasi awal atau lingkungan development.
- Jangan menanam PIN plaintext di source code, frontend bundle, atau repository. Sediakan proses bootstrap yang membuat hash PIN di database menggunakan password-hashing library yang teruji.
- Pada deployment production, wajib minta admin mengganti PIN default sebelum dapat menggunakan dashboard. Jangan izinkan dashboard production tetap memakai PIN `123456`.
- Simpan hanya hash PIN, bukan PIN plaintext. Terapkan rate limit, jeda setelah percobaan gagal, dan session cookie `HttpOnly`.
- PIN dashboard admin harus terpisah dari PIN akun anak. Jangan gunakan satu kredensial untuk kedua jenis akun.
- Jika PIN admin sudah pernah diubah, proses login harus menggunakan PIN terbaru; jangan otomatis mengembalikannya ke nilai default saat aplikasi restart atau migration berjalan.

## 9. XP, Reward, Badge, dan Kartu

KidsGo! menggunakan XP dan koleksi reward untuk meningkatkan motivasi belajar.

Reward yang direncanakan:
- XP dari aktivitas belajar yang sah.
- Badge/lencana pencapaian.
- Kartu koleksi dengan tingkat kelangkaan seperti Common, Rare, Epic, dan Legendary.
- Reward berdasarkan pencapaian belajar, bukan pembelian.

Buat aturan XP terpusat dan terdokumentasi. Hindari farming XP melalui pengulangan soal mudah atau pengiriman jawaban yang sama berulang kali. Catat perubahan XP sebagai transaksi/ledger agar audit dan koreksi memungkinkan.

Pemberian reward harus idempotent: satu pencapaian yang sama tidak boleh menghasilkan reward berulang akibat retry request.

## 10. Leaderboard

Leaderboard tampil di halaman utama dan dapat mendukung:
- Harian.
- Mingguan.
- Sepanjang waktu.
- Berdasarkan jenjang/kelas.

Urutkan berdasarkan XP sesuai periode yang dipilih. Gunakan nickname dan avatar. Jangan menampilkan nama lengkap, PIN, email, tanggal lahir, atau data pribadi anak.

Pastikan perhitungan leaderboard konsisten dengan ledger XP dan aturan anti-farming. Jangan menerima skor leaderboard dari browser sebagai sumber kebenaran.

## Arsitektur Frontend: Client-Side Rendering (CSR)

Frontend KidsGo! menggunakan **React + Vite sebagai Single-Page Application (SPA) dengan Client-Side Rendering (CSR)**.

Ketentuan:
- **Tanpa Docker (Native Vite & Node.js):** Seluruh aplikasi berjalan langsung menggunakan script npm/Vite dan Node.js tanpa Docker atau container runtime.
- **Fokus Ukuran Layar Mobile (Mobile-First):** Desain tata letak, ukuran tombol, dan alur interaksi berfokus pada layar smartphone. Jika diakses melalui layar desktop/lebar, UI disajikan dalam layout responsif dengan frame container mobile yang terpusat agar nuansa bermain tetap fokus dan konsisten.
- Vite digunakan untuk development server dan build frontend; Vite bukan server-side rendering framework untuk aplikasi ini.
- React merender halaman dan komponen di browser pengguna.
- Setelah aplikasi dimuat, navigasi antarhalaman dilakukan di sisi client tanpa full page reload.
- Frontend berkomunikasi dengan backend Fastify melalui HTTP API (REST/JSON).
- Backend Fastify tetap menjadi sumber kebenaran untuk autentikasi, kunci jawaban, penilaian, XP, progres, unlock, dan reward.
- Jangan menambahkan SSR, SSG, ISR, Next.js, atau server rendering framework untuk MVP.
- Jangan menaruh aturan bisnis penting hanya di frontend. Validasi UI di browser hanya untuk pengalaman pengguna; backend wajib memvalidasi dan memutuskan hasil.
- Jangan mengakses SQLite langsung dari browser. Semua akses database harus melalui API backend.
- Simpan hanya data non-rahasia yang memang diperlukan di browser. Jangan menyimpan PIN, hash PIN, kunci jawaban, atau token sesi yang dapat dibaca JavaScript.
- Untuk sesi login, prioritaskan cookie `HttpOnly` yang dikelola backend. Konfigurasikan CORS dan credential requests secara benar jika frontend dan API memakai origin berbeda.
- Siapkan konfigurasi URL API melalui environment variable Vite, misalnya `VITE_API_BASE_URL`. Ingat bahwa seluruh variabel `VITE_` dapat terlihat oleh browser dan tidak boleh berisi secret.
- Sediakan loading state, error state, empty state, dan penanganan sesi kedaluwarsa pada UI.
- Pastikan build produksi menghasilkan aset statis yang dapat disajikan oleh static hosting atau web server biasa.

## 11. Prinsip Arsitektur dan Struktur Proyek

Gunakan modular monolith untuk MVP. Pisahkan domain berdasarkan tanggung jawab, tetapi jangan membuat microservices sebelum ada kebutuhan nyata.

Struktur awal yang disarankan:

```text
kidsgo/
├── apps/
│   ├── web/                    # React + Vite SPA (CSR)
│   └── api/                    # Fastify backend
├── packages/
│   └── shared/                 # Tipe dan kontrak bersama bila diperlukan
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/
│   ├── architecture.md
│   ├── product-rules.md
│   └── question-bank-schema-v1.md
├── storage/
│   └── imports/                # File import sementara, bukan source code
├── tests/
└── README.md
```

Modul backend yang disarankan:
- `players`
- `auth`
- `curriculum`
- `subjects`
- `question-bank`
- `game-engine`
- `progression`
- `rewards`
- `leaderboard`
- `admin`

Struktur final boleh disesuaikan dengan kondisi repository yang sudah ada. Jangan memindahkan atau mengganti file besar-besaran hanya demi mengikuti contoh struktur ini.

SQLite:
- Aktifkan foreign key enforcement.
- Gunakan WAL mode bila sesuai dengan pola deployment.
- Gunakan transaksi untuk operasi multi-tabel.
- Buat indeks pada kolom yang sering dipakai untuk pencarian dan leaderboard.
- Hindari transaksi panjang.
- Jangan mengasumsikan SQLite cocok untuk semua skala. Pertimbangkan PostgreSQL hanya jika kebutuhan konkurensi, deployment, atau operasional sudah membenarkannya.

`better-sqlite3` menjadi jalur akses database utama. Gunakan prepared statements untuk seluruh input pengguna, transaksi untuk operasi multi-tabel, dan SQL yang eksplisit serta teruji. Jangan menambahkan ORM.

## Kebijakan Dependency Minimal

Jaga dependency aplikasi sesedikit mungkin.

Dependency inti backend:
- `fastify`
- `better-sqlite3`

Gunakan fitur bawaan Fastify untuk JSON Schema validation. Jangan memasang Zod, Prisma, Drizzle, Sequelize, TypeORM, atau ORM/query-builder lain.

Tambahkan plugin Fastify hanya jika ada kebutuhan nyata, misalnya cookie atau CORS. Untuk autentikasi, gunakan library password hashing yang teruji; jangan membuat algoritma hashing sendiri. Sebelum menambah dependency, periksa apakah kebutuhan tersebut dapat dipenuhi oleh Node.js atau Fastify yang sudah digunakan.

## 12. Standar Implementasi

- Gunakan JavaScript atau TypeScript secara konsisten dengan pola repository yang ada. Untuk proyek baru, prioritaskan TypeScript.
- Validasi seluruh input eksternal di backend menggunakan JSON Schema yang terpasang pada route Fastify. Validasi juga file import JSON sebelum data disimpan.
- Pisahkan route/controller, service, dan akses data sesuai kompleksitas.
- Gunakan nama variabel, fungsi, dan modul yang deskriptif.
- Tangani error secara eksplisit; jangan menelan error.
- Jangan menyimpan konfigurasi rahasia di repository.
- Sediakan `.env.example` tanpa secret.
- Jangan menambahkan dependency hanya untuk fungsi sederhana yang dapat ditangani secara native.
- Jangan membuat abstraksi berlebihan untuk kebutuhan MVP.
- Semua endpoint yang mengubah data harus memeriksa autentikasi dan otorisasi.
- Gunakan pagination untuk daftar yang dapat berkembang.
- Terapkan logging tanpa PIN, hash, token, atau data pribadi anak.
- Perhatikan aksesibilitas: ukuran teks, kontras, fokus keyboard, dan target sentuh yang memadai untuk anak.

## 13. Pengujian Wajib

Tambahkan test untuk logika bisnis, khususnya:

1. Anak tidak dapat membuka level yang belum memenuhi syarat.
2. Level terbuka setelah target 100% tercapai.
3. Progres benar tidak hilang karena jawaban salah.
4. Semester berikutnya terbuka setelah seluruh level semester selesai.
5. Jenjang berikutnya terbuka setelah kedua semester selesai.
6. Login PIN menggunakan hash dan rate limit.
7. Kunci jawaban tidak bocor melalui endpoint soal.
8. Pengacakan opsi tidak mengubah jawaban yang benar.
9. Soal tidak berulang dalam satu sesi.
10. Import menolak JSON invalid dan ID duplikat.
11. Soal draft tidak disajikan ke game engine.
12. XP dan reward tidak terduplikasi saat request diulang.
13. Leaderboard hanya menampilkan data publik yang diizinkan.

Gunakan unit test untuk fungsi domain dan integration test untuk route/database yang kritis.

## 14. UX dan Konten untuk Anak

- **Mobile-First & Kompatibilitas Layar Smartphone:** Seluruh tata letak, ukuran tombol, dan kartu dioptimalkan untuk ukuran layar ponsel pintar (layar sentuh, orientasi potret, target sentuh minimal 44–48px) agar nyaman digunakan oleh jemari anak.
- Antarmuka harus sederhana, visual, konsisten, dan mudah dipahami anak usia 4–12 tahun.
- Instruksi menggunakan kalimat Bahasa Indonesia yang pendek dan jelas.
- Hindari pesan error teknis kepada anak.
- Saat jawaban salah, berikan koreksi yang suportif dan penjelasan sederhana; jangan mempermalukan atau menghukum anak.
- Sesuaikan kompleksitas visual dan interaksi dengan jenjang.
- Jangan menggunakan mekanisme yang mendorong penggunaan kompulsif, tekanan sosial, atau pembelian impulsif.
- Orang tua/admin membutuhkan area pengelolaan yang terpisah dari pengalaman bermain anak.

## 15. Aturan Kerja AI Coding Agent

Sebelum mulai mengerjakan tugas:

1. Periksa struktur repository dan file konfigurasi yang benar-benar ada.
2. Baca dokumentasi proyek yang relevan.
3. Identifikasi modul dan pola implementasi yang sudah digunakan.
4. Cocokkan tugas dengan keputusan produk dan arsitektur di dokumen ini.
5. Jika ada konflik atau keputusan produk yang belum ditetapkan, jelaskan dan minta klarifikasi sebelum membuat perubahan besar.

Saat mengerjakan:

- Kerjakan dalam perubahan kecil dan terukur.
- Utamakan solusi paling sederhana yang memenuhi kebutuhan.
- Jangan mengarang file, endpoint, tabel, atau fitur yang belum ada.
- Jangan mengubah kontrak API atau schema JSON tanpa memperbarui dokumentasi dan test.
- Jangan menghapus data, migration, atau fitur yang sudah ada tanpa persetujuan.
- Jangan menambahkan integrasi AI ke KidsGo!.
- Jangan mengubah scope MVP dari Matematika tanpa persetujuan.
- Jangan menandai pekerjaan selesai sebelum menjalankan pemeriksaan yang relevan.

Setelah mengerjakan:

1. Jalankan formatter dan linter yang tersedia.
2. Jalankan test yang relevan.
3. Jalankan type check/build jika tersedia.
4. Laporkan file yang diubah, keputusan penting, hasil test, dan pekerjaan yang belum selesai.
5. Jika test tidak dapat dijalankan, jelaskan penyebabnya. Jangan mengklaim test berhasil.

## 16. Prioritas MVP

Urutan implementasi yang disarankan:

1. Fondasi repository, konfigurasi, dan database.
2. Model jenjang, semester, level, dan topik matematika.
3. Akun anak, PIN hash, session, dan pengelolaan admin.
4. Question Bank JSON: schema, import, validasi, preview, export, dan approval.
5. Game engine: pemilihan soal, pengacakan opsi, submit jawaban, dan penilaian server.
6. Progression: XP, progres level, unlock semester, dan unlock jenjang.
7. UI pengalaman bermain anak.
8. Badge dan kartu koleksi.
9. Leaderboard.
10. Hardening keamanan, aksesibilitas, observability, dan pengujian menyeluruh.

Jangan membangun seluruh fitur sekaligus. Selesaikan satu irisan fitur dari database hingga UI dan test sebelum melanjutkan ke fitur berikutnya.

## 17. Prinsip Utama

**KidsGo! adalah aplikasi belajar dan game engine, bukan aplikasi pembuat konten AI.**

Konten soal dibuat secara eksternal dan dimasukkan melalui Question Bank JSON. Aplikasi harus memastikan soal sesuai jenjang, tervalidasi, aman, dan disetujui sebelum dimainkan.

Jika ragu, prioritaskan keamanan anak, integritas progres belajar, validitas konten, dan kesederhanaan implementasi.
