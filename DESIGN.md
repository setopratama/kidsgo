# DESIGN.md — KidsGo!

> Design system untuk KidsGo!
> Arah visual: **Playful Industrial Minimalism · Warm White · Friendly Geometry · Learning First**
> Tagline: **Belajar Seru, Naik Level!**

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menetapkan bahasa visual, perilaku UI, pola komponen, aksesibilitas, dan batasan implementasi frontend KidsGo!.

KidsGo! adalah platform belajar anak usia 4–12 tahun dengan gamifikasi. MVP berfokus pada matematika untuk jenjang TK A/B hingga SD kelas 6. Tampilan harus membuat anak merasa nyaman, percaya diri, dan tertarik belajar tanpa terlihat terlalu ramai atau kekanak-kanakan.

Dokumen ini mengatur tampilan dan interaksi. Aturan bisnis, autentikasi, database, API, kurikulum, dan game engine tetap diatur dalam `AGENTS.md` atau dokumentasi teknis terkait.

## 2. Filosofi Desain

### Prinsip utama

1. **Playful industrial minimalism:** tata letak rapi, presisi, dan fungsional; sentuhan ramah anak hadir melalui warna aksen, ilustrasi sederhana, dan micro-interaction yang terukur.
2. **Warm white-first:** gunakan latar putih hangat atau off-white agar nyaman dilihat dalam sesi belajar.
3. **Friendly, not childish:** visual terasa menyenangkan dan modern, tetapi tidak penuh ornamen, maskot berlebihan, atau dekorasi yang mengganggu fokus.
4. **Learning first:** soal, instruksi, dan progres belajar menjadi fokus utama layar.
5. **Clear hierarchy:** anak harus cepat memahami apa yang perlu dilakukan, apa progresnya, dan apa langkah selanjutnya.
6. **Consistent geometry:** gunakan grid rapi, border jelas, sudut membulat secukupnya, dan jarak yang konsisten.
7. **Age-aware UI:** kebutuhan anak TK berbeda dari anak SD kelas 4–6. Skala teks, kompleksitas navigasi, dan kepadatan konten harus dapat disesuaikan.
8. **Encouraging feedback:** kesalahan adalah bagian dari belajar. Hindari nada menghakimi, hukuman visual, atau tekanan kompetitif yang berlebihan.
9. **Accessible by default:** kontras, navigasi keyboard, fokus yang terlihat, label, ukuran target sentuh, dan reduced motion adalah persyaratan.

### Karakter visual

KidsGo! harus terasa seperti **ruang belajar modern yang menyenangkan**: bersih dan terstruktur seperti produk industrial, tetapi hangat seperti alat belajar anak yang dirancang dengan perhatian.

Hindari dua ekstrem:
- Terlalu korporat: monochrome kaku, tabel padat, tipografi kecil, dan tampilan seperti dashboard bisnis.
- Terlalu ramai: warna pelangi di semua elemen, gradient berlebihan, banyak emoji, karakter dekoratif di setiap sudut, dan animasi yang terus bergerak.

## 3. Sistem Warna

Gunakan warm white dan warna netral sebagai fondasi. Gunakan biru sebagai warna brand/action utama, serta aksen ceria dalam jumlah terbatas untuk progres, reward, dan kategori. Warna aksen tidak boleh mengambil alih seluruh halaman.

### Token warna

| Token | Nilai | Penggunaan |
|---|---|---|
| `color-ink` | `#20242C` | Teks utama, ikon utama |
| `color-paper` | `#FFFFFF` | Permukaan utama |
| `color-canvas` | `#F7F8FA` | Latar halaman |
| `color-surface-soft` | `#F1F4F7` | Panel lembut, area ilustrasi |
| `color-border` | `#E3E7EC` | Border dan separator |
| `color-muted` | `#657080` | Teks sekunder |
| `color-muted-soft` | `#8792A0` | Metadata non-esensial; jangan untuk teks kecil berkontras rendah |
| `color-primary` | `#2563EB` | CTA utama, link, fokus, elemen aktif |
| `color-primary-soft` | `#EAF1FF` | Background pilihan aktif dan highlight lembut |
| `color-sky` | `#38BDF8` | Aksen ilustrasi atau variasi informasi |
| `color-mint` | `#34BFA3` | Indikator progres positif dan pencapaian |
| `color-sunshine` | `#F5C451` | Bintang, reward, highlight terbatas |
| `color-coral` | `#F28B72` | Aksen karakter/ilustrasi, bukan error |
| `color-success` | `#16845B` | Status berhasil |
| `color-warning` | `#A96008` | Peringatan yang perlu perhatian |
| `color-danger` | `#C83F49` | Error dan aksi destruktif |

### Aturan penggunaan warna

- Halaman utama menggunakan `color-canvas`; kartu dan area soal menggunakan `color-paper`.
- Biru adalah warna aksi utama. Gunakan secara konsisten untuk tombol utama, link, dan state terpilih.
- Mint, sunshine, sky, dan coral adalah aksen. Gunakan maksimal satu atau dua aksen pada satu area UI.
- Jangan menjadikan semua tombol atau kartu memiliki warna berbeda.
- Warna status harus tetap disertai teks, ikon, atau bentuk indikator. Jangan mengandalkan warna saja.
- Merah hanya untuk error, peringatan serius, dan aksi destruktif; bukan warna aksen dekoratif.
- Hindari gradient neon, glow, glassmorphism, dan background warna jenuh yang luas.
- Jangan memakai warna pastel pucat untuk teks. Aksen pastel hanya untuk permukaan/background.
- Selalu gunakan token warna terpusat, bukan menyebarkan nilai hex mentah di seluruh komponen.

## 4. Tipografi

Pilih satu keluarga sans-serif yang sangat terbaca. Prioritaskan font yang sudah tersedia di proyek. Jangan menambah dependency font tanpa alasan yang jelas.

### Font roles

- **UI dan heading:** Inter, Nunito Sans, atau system sans-serif yang sudah digunakan proyek.
- **Angka dan data progres:** gunakan sans-serif dengan angka yang jelas; `font-variant-numeric: tabular-nums` bila sesuai.
- **Monospace:** tidak dibutuhkan untuk UI anak. Gunakan hanya di area admin/metadata teknis bila memang berguna.

CSS stack yang disarankan:

```css
--font-sans: Inter, "Nunito Sans", ui-sans-serif, system-ui, -apple-system,
  BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Jangan mengasumsikan font eksternal tersedia. Gunakan fallback jika font pilihan belum dimuat.

### Skala tipografi

Skala ini adalah dasar desktop; ukuran dapat dinaikkan untuk mode anak usia TK dan layar kecil.

| Token | Ukuran | Penggunaan |
|---|---:|---|
| `text-xs` | 12px | Metadata singkat; hindari untuk instruksi anak |
| `text-sm` | 14px | Label sekunder dan metadata |
| `text-base` | 16px | Body dan kontrol standar |
| `text-lg` | 18px | Instruksi dan teks pendukung |
| `text-xl` | 20px | Judul kartu dan subjudul |
| `text-2xl` | 24px | Judul bagian |
| `text-3xl` | 30px | Judul halaman |
| `text-4xl` | 36px | Hero atau sambutan, digunakan seperlunya |
| `text-question` | 28–40px | Pertanyaan utama, disesuaikan jenjang dan viewport |

### Aturan tipografi

- Instruksi untuk anak harus singkat, langsung, dan menggunakan Bahasa Indonesia sederhana.
- Utamakan sentence case. Jangan menulis semua teks dengan huruf kapital.
- Hindari paragraf panjang di layar bermain.
- Gunakan bold/semibold untuk hierarki; jangan mengandalkan warna saja.
- Jaga line-height body agar nyaman dibaca (sekitar 1.45–1.6).
- Angka matematika harus cukup besar, jelas, dan tidak mudah tertukar.
- Jangan memakai font dekoratif untuk soal, tombol, atau instruksi.

## 5. Geometri, Border, dan Spacing

### Geometri

KidsGo! memakai geometri yang rapi, tetapi tidak sekaku sistem industrial murni.

| Elemen | Radius |
|---|---:|
| Tombol utama | 12px |
| Input | 10px |
| Kartu konten | 16px |
| Kartu reward/ilustrasi | 16–20px |
| Modal/panel | 18px |
| Badge kecil | 8px |

Aturan:
- Hindari pill radius untuk semua komponen. Gunakan bentuk pill hanya untuk chip/status kecil bila diperlukan.
- Border standar `1px solid var(--color-border)`.
- Gunakan shadow sangat halus hanya untuk elemen yang perlu terangkat dari permukaan, seperti modal atau menu mengambang.
- Jangan gunakan shadow besar, glow, bevel, atau efek 3D berat.
- Hindari border tebal di setiap sisi komponen. Hierarki utama dibentuk oleh spacing, tipografi, dan permukaan.

### Skala spacing

Gunakan basis 4px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`.

| Token | Nilai | Penggunaan |
|---|---:|---|
| `space-1` | 4px | Jarak ikon dan label |
| `space-2` | 8px | Gap rapat |
| `space-3` | 12px | Padding komponen kecil |
| `space-4` | 16px | Padding standar |
| `space-5` | 20px | Gap antar elemen dalam kartu |
| `space-6` | 24px | Jarak bagian |
| `space-8` | 32px | Pemisah section |
| `space-10` | 40px | Jarak section besar |
| `space-12` | 48px | Pemisah layout utama |
| `space-16` | 64px | Spasi besar pada desktop |

### Aturan anti-cramping

1. Judul section harus memiliki jarak yang jelas dari divider, toolbar, atau section sebelumnya.
2. Kartu level, pilihan jawaban, dan tombol tidak boleh saling menempel.
3. Area soal harus memiliki whitespace cukup agar anak dapat fokus.
4. Jangan memadatkan dashboard anak seperti dashboard analytics.
5. Pada mobile, pertahankan padding layar minimal 16px dan jarak antar target sentuh yang memadai.
6. Jangan memakai margin negatif untuk menumpuk komponen kecuali ada pola desain yang disengaja dan terdokumentasi.

## 6. Layout dan Responsiveness

- Gunakan mobile-first layout.
- Gunakan container yang konsisten dengan gutter responsif.
- Dashboard anak harus memiliki satu fokus utama dan maksimal beberapa informasi pendukung yang benar-benar berguna.
- Hindari sidebar padat pada tampilan anak. Navigasi utama sebaiknya sederhana dan mudah ditemukan.
- Dashboard admin boleh lebih padat dan lebih utilitarian, tetapi tetap menggunakan token, kontras, dan komponen yang sama.
- Gunakan CSS Grid untuk kumpulan level/kartu dan Flexbox untuk toolbar, navigasi, serta kelompok kontrol.
- Jangan menetapkan lebar tetap yang menyebabkan overflow.
- Navigasi mobile dapat menggunakan bottom navigation dengan label teks dan target sentuh besar.
- Pastikan area bermain soal tidak terganggu oleh navigasi atau elemen dekoratif.

### Panduan breakpoint

| Viewport | Breakpoint | Panduan |
|---|---|---|
| Small mobile | `< 360px` | Satu kolom untuk konten utama; kontrol tetap terbaca |
| Mobile | `360–599px` | Layout satu kolom; bottom navigation bila diperlukan |
| Tablet | `600–899px` | Dua kolom untuk dashboard/kartu bila sesuai |
| Desktop | `900–1199px` | Konten terpusat, ruang lebih lega |
| Wide desktop | `1200px+` | Batasi lebar konten agar tidak melebar tanpa manfaat |

Breakpoint adalah panduan, bukan aturan kaku. Gunakan kebutuhan konten untuk menentukan layout akhir.

## 7. Pola Halaman Utama

### A. Dashboard Anak

Prioritaskan urutan visual berikut:

1. Sapaan personal menggunakan nickname.
2. Ringkasan progres belajar saat ini.
3. Tombol aksi utama: **Lanjut Belajar**.
4. Peta level atau materi yang tersedia.
5. Reward/badge terbaru atau target kecil berikutnya.

Jangan menampilkan semua statistik sekaligus. Total XP, streak, badge, rank, dan informasi lain tidak boleh mengalahkan CTA belajar.

### B. Layar Bermain / Soal

Layar bermain adalah area paling penting di KidsGo!.

Susunan yang disarankan:
- Header ringkas: keluar/kembali, nama topik, dan progres sesi.
- Progress indicator yang mudah dipahami.
- Area pertanyaan yang paling dominan.
- Visual pendukung jika dibutuhkan soal.
- Pilihan jawaban dengan area klik besar.
- Feedback setelah submit.
- Tombol lanjut yang jelas.

Aturan:
- Satu soal menjadi fokus utama layar.
- Jangan tampilkan kunci jawaban sebelum anak menjawab.
- Hindari timer yang memberi tekanan kecuali ada kebutuhan pedagogis yang telah disetujui.
- Jangan menggunakan animasi yang menghalangi anak membaca atau memilih.
- Setelah jawaban benar, beri feedback positif yang singkat.
- Setelah jawaban salah, jelaskan dengan ramah dan beri kesempatan mencoba soal pengganti sesuai aturan game.
- Jangan memakai suara otomatis. Audio harus memiliki kontrol yang jelas dan tidak wajib.

### C. Peta Level

- Tampilkan status level secara konsisten: terkunci, tersedia, sedang berjalan, dan selesai.
- Gunakan ikon/bentuk dan label teks bersama warna.
- Level yang belum terbuka harus terlihat nonaktif tetapi tetap dapat dipahami alasannya.
- Hindari peta yang terlalu kompleks atau membutuhkan gesture sulit.
- Anak harus mudah menemukan level berikutnya.

### D. Reward dan Koleksi

- Kartu reward harus terasa istimewa tetapi tidak terlalu ramai.
- Rarity dapat memakai aksen warna terbatas dan label teks.
- Jangan membuat rarity hanya bisa dibedakan melalui warna.
- Animasi reward singkat, opsional, dan dapat dihentikan melalui reduced motion.
- Jangan mengarahkan anak untuk membeli item atau melakukan transaksi.

### E. Dashboard Admin

Dashboard admin ditujukan untuk orang dewasa:
- Lebih padat dan informatif daripada dashboard anak.
- Gunakan tabel, filter, status, dan form dengan label jelas.
- Tetap gunakan warna, tipografi, spacing, dan komponen KidsGo!.
- Bedakan area admin dari pengalaman bermain anak melalui struktur navigasi dan label, bukan dengan membuat design system kedua.

## 8. Spesifikasi Komponen

### Buttons

- **Primary:** background biru, teks putih, label aksi jelas.
- **Secondary:** background putih, border netral, teks gelap.
- **Tertiary:** transparan atau permukaan lembut untuk aksi sekunder.
- **Destructive:** merah hanya untuk tindakan destruktif yang nyata.
- Tombol anak harus memiliki target sentuh minimal 44 × 44 CSS px; untuk aksi utama di layar bermain, utamakan tinggi 48–56px.
- Label tombol menggunakan kata kerja sederhana: "Mulai", "Lanjut", "Coba Lagi", "Kembali".
- Sediakan state default, hover, focus, active, disabled, dan loading.
- Jangan membuat tombol hanya berupa ikon jika label teks akan lebih jelas untuk anak.

### Inputs

- Background putih, border jelas, teks cukup besar.
- Label harus terlihat; placeholder tidak menggantikan label.
- PIN input harus memiliki affordance yang mudah dipahami dan tidak membocorkan PIN.
- Fokus memakai outline/border biru dengan kontras cukup.
- Error ditulis sederhana dan menjelaskan cara memperbaiki.
- Jangan menghapus input yang sudah diisi saat terjadi error yang dapat dipulihkan.

### Cards

- Gunakan permukaan putih dengan border halus.
- Radius 16px sebagai default.
- Susun hierarki memakai spacing dan tipografi.
- Hover boleh mengubah border atau background secara halus.
- Jangan memperbesar kartu secara dramatis saat hover.
- Kartu level dan reward harus memiliki status yang terbaca tanpa bergantung pada warna.

### Progress bars

- Gunakan track netral dengan fill biru atau mint.
- Tampilkan persentase atau hitungan jika membantu pemahaman.
- Jangan memakai animasi progress yang terlalu lama.
- Progress harus memiliki label aksesibel.
- Jangan membuat progress palsu atau menampilkan nilai yang tidak berasal dari backend.

### Badges dan status

- Gunakan bentuk rounded-rect, bukan pill besar untuk semua hal.
- Teks label harus singkat.
- Ikon dapat memperjelas status tetapi tidak menggantikan label.
- Warna harus mengikuti token status.

### Dialogs, menus, dan drawers

- Gunakan permukaan putih, radius konsisten, border halus, dan heading singkat.
- Dialog anak harus singkat dan fokus pada satu keputusan.
- Hindari konfirmasi berlapis yang membingungkan.
- Sediakan tombol close yang jelas jika aman.
- Kelola fokus keyboard dengan benar.
- Jangan membuat modal sebagai cara default untuk setiap feedback kecil.

### Icons dan ilustrasi

- Gunakan satu keluarga ikon yang konsisten dan satu bobot garis.
- Monochrome untuk ikon navigasi dan fungsi.
- Aksen warna hanya bila membantu pemahaman.
- Jangan memakai emoji sebagai pengganti ikon antarmuka.
- Ilustrasi karakter boleh digunakan sebagai pendamping, bukan dekorasi di setiap komponen.
- Jangan membuat ilustrasi mengganggu area soal.

## 9. Bahasa dan Microcopy

Gunakan Bahasa Indonesia yang ramah, singkat, dan jelas.

Contoh microcopy:
- Berhasil: "Hebat! Jawabanmu benar."
- Salah: "Belum tepat. Yuk, coba cara ini."
- Lanjut: "Lanjut ke soal berikutnya"
- Level terkunci: "Selesaikan level sebelumnya untuk membuka ini."
- Selesai: "Level selesai! Kamu berhasil."
- Empty state: "Belum ada level di sini. Ayo mulai dari level pertama."

Hindari:
- "Gagal", "Kamu kalah", "Salah total", atau pesan yang mempermalukan.
- Ancaman kehilangan progres.
- Bahasa teknis seperti "request timeout", "invalid payload", atau "database error" di area anak.
- Pesan yang memaksa anak terus bermain.

Untuk error teknis, tampilkan pesan sederhana kepada anak dan simpan detail diagnostik di log backend tanpa data pribadi.

## 10. Motion dan Interaksi

- Interaksi harus terasa cepat, lembut, dan dapat diprediksi.
- Gunakan transisi sekitar 120–220ms untuk hover, focus, dan perubahan state sederhana.
- Animasi reward dapat sedikit lebih panjang tetapi tetap singkat dan tidak menghambat alur.
- Hindari bouncing berlebihan, parallax, shake berulang, autoplay, dan animasi dekoratif terus-menerus.
- Jangan menjadikan hover sebagai satu-satunya cara mengakses fungsi.
- Sediakan alternatif untuk touch dan keyboard.
- Hormati `prefers-reduced-motion`.
- Jika ada efek suara, harus dapat dimatikan dan tidak diputar otomatis saat halaman dibuka.
- State penting tidak boleh bergantung pada animasi untuk dapat dipahami.

## 11. Aksesibilitas dan Kenyamanan Anak

- Targetkan WCAG 2.2 AA sejauh relevan.
- Rasio kontras teks normal minimal 4.5:1 dan teks besar minimal 3:1.
- Target sentuh minimal 44 × 44 CSS px bila praktis.
- Gunakan HTML semantik dan urutan heading logis.
- Semua fungsi harus dapat diakses melalui keyboard.
- Focus indicator harus jelas dan tidak tertutup.
- Icon-only controls harus memiliki accessible name.
- Status tidak boleh dibedakan hanya melalui warna.
- Sediakan label input dan error message yang terkait secara programatis.
- Hindari kedipan cepat atau animasi yang dapat mengganggu.
- Pastikan zoom browser tidak merusak layout.
- Instruksi penting tidak boleh hanya disampaikan melalui gambar.
- Sesuaikan tingkat kompleksitas UI untuk rentang usia 4–12 tahun.

### Adaptasi berdasarkan usia

**Mode TK (TK A/B):**
- Teks utama lebih besar dan instruksi lebih pendek.
- Satu tugas utama per layar.
- Visual konkret membantu pemahaman.
- Pilihan jawaban dan target sentuh berukuran besar.
- Navigasi minimal; ikon harus disertai label.
- Hindari teks penjelasan yang panjang.

**Mode SD kelas 1–3:**
- Instruksi tetap singkat.
- Kombinasikan teks, angka, dan visual.
- Berikan feedback yang jelas dan langsung.
- Navigasi level boleh lebih lengkap tetapi tetap sederhana.

**Mode SD kelas 4–6:**
- Dapat menampilkan lebih banyak informasi progres.
- Gunakan soal cerita dan instruksi yang lebih detail sesuai kurikulum.
- Hindari tampilan yang terlalu kekanak-kanakan.
- Tetap pertahankan struktur dan konsistensi visual KidsGo!.

## 12. Responsive Behavior dan Performance

- Mulai dari mobile layout dan perluas ke tablet/desktop.
- Hindari horizontal overflow.
- Pertahankan ukuran target sentuh di layar kecil.
- Gunakan gambar berukuran tepat dan lazy-load aset non-kritis.
- Tetapkan dimensi/aspect ratio gambar untuk mencegah layout shift.
- Hindari rendering daftar kartu/level yang terlalu besar sekaligus.
- Jangan menambah library animasi atau UI besar jika CSS dan komponen sederhana sudah cukup.
- Pastikan pengalaman bermain tetap responsif pada perangkat dengan spesifikasi rendah.
- Jangan mengorbankan keterbacaan untuk menghemat beberapa piksel.

## 13. Aturan Implementasi untuk AI Coding Agent

Setiap AI coding agent yang mengubah UI wajib:

1. Membaca `DESIGN.md` dan `AGENTS.md` sebelum membuat atau mengubah UI.
2. Memeriksa komponen, token, dan pola styling yang sudah ada sebelum menambahkan yang baru.
3. Menggunakan React + Vite + TypeScript dalam pola CSR/SPA sesuai arsitektur proyek.
4. Mengutamakan CSS/Tailwind dan komponen yang sudah ada; jangan menambah UI framework baru tanpa kebutuhan nyata.
5. Menggunakan token terpusat untuk warna, tipografi, spacing, radius, border, dan focus state.
6. Tidak menambahkan font, icon pack, animation library, atau dependency UI tanpa memeriksa dependency yang sudah terpasang dan menjelaskan manfaatnya.
7. Tidak mengubah design system menjadi dashboard korporat atau UI yang terlalu ramai.
8. Mengimplementasikan state default, hover, focus, active, disabled, loading, empty, error, dan success sesuai kebutuhan komponen.
9. Memeriksa layout pada mobile, tablet, dan desktop untuk setiap perubahan UI yang signifikan.
10. Menjaga aksesibilitas dan `prefers-reduced-motion`.
11. Memastikan tombol dan kontrol yang terlihat interaktif benar-benar memiliki fungsi.
12. Tidak menaruh aturan bisnis, kunci jawaban, atau perhitungan progres yang otoritatif di frontend.
13. Tidak menggunakan warna, animasi, atau dekorasi sebagai pengganti informasi yang jelas.
14. Mendokumentasikan penyimpangan desain yang memang diperlukan.
15. Memilih solusi paling sederhana, terbaca, dan konsisten ketika ragu.

## 14. Design Review Checklist

Sebelum tugas UI dianggap selesai, periksa:

- [ ] Tampilan terasa bersih, hangat, dan ramah anak.
- [ ] Industrial minimalism tetap terjaga; elemen dekoratif tidak berlebihan.
- [ ] Warm white menjadi kanvas utama.
- [ ] Biru digunakan konsisten sebagai warna aksi utama.
- [ ] Aksen warna digunakan terbatas dan bermakna.
- [ ] Tipografi instruksi dan soal mudah dibaca.
- [ ] Area soal menjadi fokus utama layar bermain.
- [ ] Tombol dan target sentuh cukup besar.
- [ ] Feedback benar/salah suportif dan tidak menghakimi.
- [ ] Status level dan progres tidak hanya dibedakan melalui warna.
- [ ] Tidak ada animasi berlebihan dan reduced motion dihormati.
- [ ] Kontras memenuhi target aksesibilitas.
- [ ] Navigasi keyboard dan focus state berfungsi.
- [ ] Layout mobile tidak mengalami horizontal overflow.
- [ ] Dashboard anak dan admin memiliki kepadatan informasi yang sesuai.
- [ ] Tidak ada dependency UI baru yang tidak diperlukan.
- [ ] Fungsionalitas lama tidak rusak.

---

**Design direction:** Playful Industrial Minimalism  
**Primary canvas:** Warm White  
**Brand/action color:** Blue  
**Accent colors:** Mint, Sky, Sunshine, Coral — limited use  
**Typography:** Friendly, highly legible sans-serif  
**Geometry:** Rounded rectangles, consistent grid, subtle borders  
**Motion:** Short, calm, purposeful  
**Audience:** Children ages 4–12, with age-aware interface density
