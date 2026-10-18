# KidsGo! 🚀
> **Belajar Seru, Naik Level!**

**KidsGo!** adalah platform belajar interaktif untuk anak usia 4–12 tahun (TK A/B hingga SD Kelas 6) dengan pendekatan gamifikasi layaknya perpaduan Duolingo dan petualangan RPG koleksi kartu. 

Pada fase MVP (Minimum Viable Product), aplikasi difokuskan secara penuh pada mata pelajaran **Matematika** dengan antarmuka yang dirancang khusus untuk kenyamanan perangkat bergerak (**Mobile-First**).

---

## 🌟 Fitur Utama (MVP)

- 🎮 **Gamifikasi RPG Belajar:** Pembelajaran terbagi ke dalam level, semester, dan jenjang pendidikan dengan reward XP, lencana (badges), dan kartu koleksi (Common, Rare, Epic, Legendary).
- 📱 **Mobile-First & Child-Friendly:** Desain antarmuka responsif dioptimalkan untuk layar ponsel pintar dengan target sentuh tombol minimal 48px, tipografi ramah anak, dan palet warna *Warm White*.
- 🛡️ **Aman & Privasi Terjaga:** Autentikasi anak menggunakan PIN terenkripsi (Argon2/bcrypt) dan cookie `HttpOnly`. Tidak ada iklan, mikrotransaksi, atau data sensitif yang bocor ke browser.
- 📚 **Kurikulum Terstruktur:** Mendukung jenjang TK A, TK B, dan SD Kelas 1 sampai 6, masing-masing dengan tepat dua semester dan topik matematika bertingkat.
- 📦 **External Question Bank Engine:** Pembuatan soal dilakukan secara eksternal (manual via AI/guru), lalu diimpor dan divalidasi secara ketat menggunakan JSON Schema bawaan sebelum disetujui (approval) oleh admin. **Tidak ada pemanggilan API AI langsung di dalam aplikasi.**

---

## 🛠️ Tech Stack & Arsitektur

KidsGo! dibangun sebagai **Modular Monolith** dengan dependensi minimal dan berjalan langsung secara native tanpa Docker:

- **Frontend:** [React](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/) (Client-Side Rendering / SPA murni)
- **Backend:** [Node.js](https://nodejs.org/) + [Fastify](https://fastify.dev/)
- **Database:** [SQLite](https://sqlite.org/) via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (Foreign Keys aktif, WAL mode)
- **Validasi Data:** JSON Schema bawaan Fastify
- **Gaya Visual:** Vanilla CSS berbasis token (*Playful Industrial Minimalism*, [DESIGN.md](DESIGN.md))
- **Workspace:** NPM Workspaces Monorepo

---

## 📂 Struktur Repositori

```text
kidsgo/
├── apps/
│   ├── api/                    # Fastify Backend Server (Port 3001)
│   │   ├── src/
│   │   │   ├── db/             # Koneksi SQLite & skrip migrasi DDL
│   │   │   ├── server.ts       # Fastify instance, CORS, Cookies & Routes
│   │   │   └── index.ts        # Server entry point
│   │   └── test/               # Node.js native unit & integration tests
│   └── web/                    # React + Vite Frontend (Port 3000)
│       ├── src/
│       │   ├── App.tsx         # Mobile-first app frame & interaksi
│       │   ├── index.css       # Design tokens & styling mobile
│       │   └── main.tsx        # React client entry point
│       └── vite.config.ts      # Konfigurasi Vite & reverse proxy /api
├── packages/
│   └── shared/                 # Tipe TypeScript bersama (@kidsgo/shared)
│       └── src/index.ts        # Definisi jenjang, soal, tipe profil & XP
├── data/                       # Database SQLite lokal (kidsgo.db)
├── docs/                       # Dokumentasi arsitektur & skema JSON
├── AGENTS.md                   # Pedoman aturan arsitektur & coding agent
└── DESIGN.md                   # Spesifikasi design system & UI/UX
```

---

## 🚀 Memulai (Quick Start)

### Prasyarat
- **Node.js:** Versi >= 20.x (disarankan v22.x atau v24.x)
- **NPM:** Versi >= 10.x
- Build tools dasar (`gcc`, `g++`, `make`, `python3`) untuk kompilasi modul native SQLite `better-sqlite3`.

> ⚠️ **Catatan Penting:** Proyek ini dirancang untuk dijalankan **secara langsung tanpa Docker**. Jangan menambahkan `Dockerfile` atau `docker-compose.yml`.

### 1. Kloning dan Instal Dependensi
```bash
git clone https://github.com/setopratama/kidsgo.git
cd kidsgo
npm install
```

### 2. Inisialisasi Database SQLite
Jalankan migrasi DDL awal untuk membuat tabel database SQLite:
```bash
npm run db:migrate
```
*File database akan otomatis dibuat di folder `data/kidsgo.db` dengan mode WAL dan Foreign Keys aktif.*

### 3. Menjalankan Server Development
Jalankan server backend (Fastify) dan frontend (Vite) secara bersamaan:
```bash
npm run dev
```

Aplikasi akan berjalan pada alamat berikut:
- **Web App (Frontend):** [http://localhost:3000](http://localhost:3000)
- **API Server (Backend):** [http://localhost:3001](http://localhost:3001)
- **API Health Check:** [http://localhost:3000/api/health](http://localhost:3000/api/health) *(via reverse proxy Vite)*

---

## 📜 Perintah yang Tersedia (NPM Scripts)

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan backend API dan frontend Vite secara paralel |
| `npm run dev:api` | Menjalankan hanya backend API Fastify (port 3001) dengan hot-reload |
| `npm run dev:web` | Menjalankan hanya frontend web Vite (port 3000) |
| `npm run db:migrate` | Menerapkan skrip migrasi DDL ke database SQLite lokal |
| `npm run build` | Melakukan type check dan kompilasi production bundle untuk semua workspace |
| `npm run test` | Menjalankan pengujian unit dan integrasi |

---

## 📖 Dokumentasi Terkait

- [AGENTS.md](AGENTS.md) — Aturan arsitektur, batasan teknologi, dan panduan AI coding agent.
- [DESIGN.md](DESIGN.md) — Panduan desain visual, palet warna, tipografi, dan filosofi UI ramah anak.

---

## 📄 Lisensi

Hak Cipta © 2026 KidsGo! Tim Pengembang. Seluruh hak cipta dilindungi.
