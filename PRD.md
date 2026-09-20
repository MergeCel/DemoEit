# Product Requirement Document (PRD)
# "SocialSync" — Platform Manajemen & Penjadwalan Upload Media Sosial

**Versi Dokumen:** 1.0 (MVP)
**Tipe Aplikasi:** Web Internal/Private (Single Tenant)
**Tech Stack:** Laravel 11 (Backend) + Inertia.js + Vue 3 + TailwindCSS (Frontend), MySQL/PostgreSQL, Redis (Queue & Cache), Laravel Horizon, Laravel Scheduler
**Status:** Draft untuk pengembangan

---

## 1. Ringkasan Eksekutif

SocialSync adalah web aplikasi internal yang digunakan oleh tim marketing media sosial untuk mengelola dan mempublikasikan konten (video, foto, story, carousel) ke **Instagram, TikTok, dan Facebook** dari satu titik kontrol. Tujuan utama produk ini adalah menghilangkan proses repetitif upload manual satu per satu ke setiap platform, dengan menyediakan:

1. **Media Library (Drive)** terpusat untuk menyimpan dan mengorganisir aset konten.
2. **Composer Upload** yang menyesuaikan field/parameter sesuai jenis konten dan platform tujuan.
3. **Penjadwalan otomatis** (scheduled publishing) berbasis kalender bulanan, dieksekusi oleh background worker.
4. **Dashboard engagement** sederhana untuk memantau performa konten per platform.

Aplikasi ini **bersifat private/internal** — hanya dapat diakses oleh anggota tim marketing yang terdaftar (tidak ada pendaftaran publik).

---

## 2. Latar Belakang & Masalah (Problem Statement)

Saat ini tim marketing sosial media melakukan upload konten yang **identik** secara manual ke 3 platform berbeda (Instagram, TikTok, Facebook), yang menyebabkan:

- Duplikasi pekerjaan (re-upload file yang sama berkali-kali).
- Risiko lupa jadwal posting karena tidak ada kalender terpusat.
- Tidak ada satu tempat untuk melihat performa (engagement) semua platform sekaligus.
- Aset video/foto tersebar di berbagai perangkat/drive pribadi, sulit dilacak siapa yang upload dan kapan.

## 3. Tujuan Produk (Goals)

| # | Tujuan | Metrik Keberhasilan (Indikatif) |
|---|--------|-------------------------------|
| G1 | Satu kali upload konten → tayang di 1–3 platform sekaligus | Pengurangan waktu upload per konten ≥ 60% |
| G2 | Penjadwalan konten otomatis tanpa intervensi manual saat jam tayang | ≥ 95% post terjadwal tayang tepat waktu (±5 menit) |
| G3 | Visibilitas performa konten di satu dashboard | Tim dapat melihat top performing content tanpa buka 3 aplikasi berbeda |
| G4 | Media terorganisir dan dapat dicari kembali | Semua aset punya nama & folder, tidak ada "untitled" file |

### 3.1 Non-Goals (Di luar cakupan MVP)

- Tidak mendukung platform lain selain Instagram, TikTok, Facebook (YouTube, X/Twitter, LinkedIn dsb. → fase berikutnya).
- Tidak ada fitur AI caption generator / AI editing video di MVP.
- Tidak ada approval workflow berjenjang (multi-level content approval) — MVP hanya 1 layer (uploader langsung publish/jadwalkan).
- Tidak ada multi-tenant / multi-brand workspace di MVP (asumsi 1 organisasi/brand).
- Tidak ada aplikasi mobile native — hanya web responsif.
- Tidak ada fitur komentar/reply langsung dari SocialSync (moderasi komentar tetap dilakukan di platform asli).

---

## 4. Target Pengguna & Role

Aplikasi ini **private**, akses dikontrol lewat login internal (bukan self sign-up).

| Role | Deskripsi | Hak Akses |
|------|-----------|-----------|
| **Admin** | Pemilik/pengelola sistem | Kelola user, kelola koneksi akun sosial media, semua hak Editor |
| **Editor (Marketing Staff)** | Tim yang upload & jadwalkan konten | Upload media, buat post, buat jadwal, lihat dashboard & detail engagement |
| **Viewer** *(opsional, nice-to-have)* | Stakeholder yang hanya melihat laporan | Hanya bisa melihat dashboard & detail engagement (read-only) |

> **Catatan implementasi:** gunakan `spatie/laravel-permission` untuk role & permission berbasis middleware Laravel, dicek juga di sisi Inertia (props `auth.user.permissions`) untuk menyembunyikan/menonaktifkan elemen UI yang tidak diizinkan.

---

## 5. Arsitektur & Prinsip Teknis (High-Level)

```
[Browser - Vue 3 + Inertia.js + TailwindCSS]
            │  (Inertia requests, bukan REST manual)
            ▼
[Laravel 11 App Server]
   ├─ Controllers (Inertia responses)
   ├─ Form Requests (validasi per jenis konten & platform)
   ├─ Services/Actions Layer (PostService, MediaService, SchedulerService)
   ├─ Jobs & Queues (Redis + Laravel Horizon)
   │     ├─ PublishScheduledPostJob
   │     ├─ FetchEngagementStatsJob (cron berkala)
   │     └─ RefreshSocialTokenJob
   ├─ Laravel Scheduler (cron) → memicu dispatch job publish tiap menit
   └─ Adapter/Integration Layer per platform (Interface: SocialPlatformAdapter)
            ├─ InstagramGraphAdapter   [PLACEHOLDER API]
            ├─ TikTokContentAdapter    [PLACEHOLDER API]
            └─ FacebookGraphAdapter    [PLACEHOLDER API]
            ▼
[Storage: S3-Compatible Object Storage (private bucket) untuk video/foto]
[Database: MySQL/PostgreSQL]
[Cache/Queue: Redis]
```

### 5.1 Keputusan Desain Kunci

- **Inertia.js** dipilih agar tidak perlu membangun REST API terpisah untuk SPA — controller Laravel langsung me-render komponen Vue, sekaligus mempermudah validasi & auth memakai mekanisme Laravel native (session-based, bukan token API untuk internal traffic).
- **Adapter Pattern** untuk integrasi tiap platform sosial media — supaya menambah platform baru (fase berikutnya) tidak mengubah logic inti, cukup implementasi interface `SocialPlatformAdapter` (method: `publish()`, `validatePayload()`, `getEngagement()`, `refreshToken()`).
- **Job Queue wajib** untuk proses upload ke platform eksternal & publish terjadwal — karena upload video besar & panggilan API eksternal tidak boleh blocking request HTTP pengguna.
- **Publish "Sekarang" tetap melalui queue** (dengan prioritas tinggi/`high` queue) agar UX konsisten (progress & retry sama seperti scheduled), bukan dieksekusi synchronous di controller.

---

## 6. Alur Pengguna (User Flow) — Detail

### 6.1 Flow Utama (End-to-End)

```
1. Login (internal)
2. Buka menu "Drive/Media Library"
   → Upload video/foto (bisa isi nama file custom + pilih/buat folder)
3. Klik "Buat Post Baru"
   → Isi Judul Upload (internal title, dipakai juga untuk dashboard)
   → Pilih: [Upload Sekarang]  atau  [Upload Terjadwal]
4a. Jika "Upload Sekarang":
   → Halaman Composer terbuka
   → Pilih sumber media: (a) pilih dari Drive, atau (b) upload baru langsung
   → Pilih tipe konten: Story | Video | Foto | Foto Carousel
       - Jika Foto Carousel dipilih → toggle Facebook otomatis OFF + disabled (tooltip alasan)
   → Pilih target platform (checkbox IG/TikTok/FB, sesuai kompatibilitas tipe konten)
   → Isi field sesuai tipe konten (lihat Section 7)
   → (Opsional) buka "Advanced Settings" untuk fitur spesifik platform
   → Klik "Upload"
   → Job dikirim ke queue → tampil halaman/status Loading → Notifikasi hasil (sukses/gagal per platform)
4b. Jika "Upload Terjadwal":
   → Sistem cek apakah sudah ada kalender jadwal di bulan berjalan
       - Jika BELUM ADA jadwal bulan ini → tampilkan CTA "Buat Jadwal Bulan Ini"
       - Jika SUDAH ADA → tampilkan kalender bulan ini dengan slot yang telah direncanakan
   → Pengguna pilih tanggal & jam pada kalender (atau slot yang sudah direncanakan sebelumnya)
   → Lanjut ke Composer (field sama seperti 4a, minus tombol "Upload" → jadi "Jadwalkan")
   → Post tersimpan dengan status "Scheduled"
   → Pada waktu terjadwal, worker (Job) otomatis mempublikasikan ke tiap platform yang dipilih
5. Dashboard menampilkan ringkasan engagement & status publish
```

### 6.2 Diagram Keputusan Tipe Konten

| Tipe Konten | Instagram | TikTok | Facebook | Catatan |
|---|---|---|---|---|
| Story | ✅ (foto/video singkat) | ❌ (tidak didukung MVP; TikTok tidak punya konsep "story" yang sama) | ✅ (foto/video singkat) | Hanya menerima 1 media (foto atau video pendek) |
| Video | ✅ Reels | ✅ | ✅ | Field lengkap: caption, tag, collab |
| Foto (single) | ✅ | ❌ (TikTok Foto Mode dianggap Advanced, lihat 7.4) | ✅ | |
| Foto Carousel (2–15 foto) | ✅ | ✅ (TikTok Photo Mode, jika tersedia via API) | ❌ **auto-disabled** | FB Graph API standar tidak mendukung carousel foto organik dalam MVP ini |

> Sistem **wajib melakukan validasi kompatibilitas** ini di frontend (disable checkbox + tooltip) **dan** di backend (Form Request Validation) — jangan hanya mengandalkan UI, karena request bisa dikirim langsung.

### 6.3 Alur Penjadwalan (Detail Logic "Cek Jadwal Bulan Ini")

```
GET /schedule/calendar?month=YYYY-MM
→ Jika count(posts WHERE status='scheduled' AND MONTH(scheduled_at)=bulan_dipilih) === 0:
      Tampilkan state kosong + CTA besar "Buat Jadwal Bulan Ini"
      Klik CTA → buka modal pilih tanggal awal perencanaan → redirect ke Composer
→ Jika count > 0:
      Tampilkan kalender bulan tsb dengan dot/badge di tanggal yang memiliki post
      Klik tanggal → tampilkan list post terjadwal hari itu (bisa tambah post baru di tanggal yang sama)
```

---

## 7. Spesifikasi Fitur Composer (Detail Field per Tipe Konten)

### 7.1 Field Umum (Semua Tipe Konten)

| Field | Wajib | Keterangan |
|---|---|---|
| Judul Upload (internal) | Ya | Tidak dikirim ke platform, hanya untuk label internal & dashboard (mis. "Hari Jadi Kantor") |
| Sumber Media | Ya | Pilih dari Drive / Upload baru |
| Target Platform | Ya | Minimal 1 platform dicentang |
| Jadwal (jika mode terjadwal) | Ya (kondisional) | Tanggal & jam |

### 7.2 Story (Foto/Video singkat)

- Hanya menerima **1 file media** (foto, atau video pendek sesuai batas durasi platform — *placeholder validasi durasi, contoh: maks 15 detik*).
- Tidak ada field caption panjang (story umumnya tanpa caption teks utama; jika platform mendukung stiker teks, taruh di Advanced Settings).
- Target platform yang tersedia: Instagram, Facebook (TikTok disabled untuk tipe ini).

### 7.3 Video

| Field | Wajib | Platform Berlaku |
|---|---|---|
| File video | Ya | Semua |
| Thumbnail/cover (opsional custom) | Tidak | Semua |
| Caption | Ya | Semua |
| Tag Akun (@mention di caption, dibaca sebagai entity oleh API, bukan sekadar teks) | Tidak | IG, FB, TikTok |
| Fitur Collab/Kolaborasi (pilih 1+ akun kolaborator) | Tidak (toggle aktif/nonaktif) | IG, FB |
| Hashtag | Tidak | Semua |

> **Penting (integrasi teknis):** field "Tag Akun" harus dikirim ke API masing-masing platform dalam format *entity/mention object* sesuai spesifikasi API mereka (misalnya `user_tags` pada IG Graph API), **bukan** sekadar string `@username` di dalam teks caption. Backend perlu melakukan parsing caption untuk mengekstrak `@mention` lalu memvalidasi/mengubahnya menjadi format payload yang sesuai adapter masing-masing platform (lihat Section 10 — API Placeholder).

### 7.4 Foto (Single)

Field sama seperti Video (minus durasi), berlaku untuk Instagram & Facebook. TikTok Photo Mode (single) dikategorikan sebagai **Advanced Setting (khusus TikTok)** karena bukan fitur umum semua platform.

### 7.5 Foto Carousel (maksimal 15 foto)

- Uploader memilih 2–15 foto dari Drive (drag untuk mengatur urutan tampil).
- **Otomatis menonaktifkan checkbox Facebook** (disabled + tooltip: *"Facebook tidak mendukung upload foto carousel organik melalui API ini"*).
- Caption, tag, dan collab berlaku sama seperti Video, untuk platform yang aktif (Instagram, TikTok).
- Validasi jumlah foto: minimal 2, maksimal 15 — validasi di frontend (disable tombol "Upload" jika di luar rentang) **dan** backend (Form Request rule `min:2|max:15`).

### 7.6 Advanced Settings (Fitur Non-Generic per Platform)

Section collapsible/accordion terpisah di bawah field umum, **hanya menampilkan form yang relevan** dengan platform yang dicentang pengguna. Setiap fitur diberi label sumber platform.

| Fitur | Platform | Keterangan |
|---|---|---|
| Sematkan Lokasi (Location Tag) | (Instagram, Facebook) | Pencarian lokasi via placeholder API |
| Branded Content / Paid Partnership Label | (Instagram) | Toggle + input nama brand partner |
| Sound/Music Library Selector | (TikTok, Instagram) | Placeholder pemilihan track musik dari API platform |
| Duet/Stitch Permission | (TikTok) | Toggle on/off |
| Comment Permission (allow/disallow) | (TikTok, Facebook) | Toggle |
| Foto Mode (Single Photo Post) | (TikTok) | Lihat 7.4 |
| Audience/Privacy Post (Public/Friends) | (Facebook) | Dropdown |
| Alt Text untuk Foto (aksesibilitas) | (Instagram, Facebook) | Textarea opsional |

> **Prinsip desain:** Advanced Settings **hanya render field milik platform yang sedang dicentang aktif di form utama** — jika pengguna uncheck Facebook, field khusus Facebook di Advanced Settings ikut disembunyikan (tetapi nilainya tidak hilang dari state form, hanya di-skip saat submit jika platform nonaktif).

---

## 8. Media Library / Drive

### 8.1 Fitur

- Upload file (video: mp4/mov, foto: jpg/png/webp) dengan **nama file custom** (berbeda dari nama file asli).
- Buat, rename, hapus **folder** (nested folder — minimal 1 level, opsional multi-level di MVP jika waktu memungkinkan).
- Pindahkan file antar folder (drag & drop atau menu "Pindahkan ke...").
- Preview thumbnail otomatis (video generate thumbnail dari frame pertama/tengah via `php-ffmpeg` atau job async).
- Search & filter (berdasarkan nama file, tipe, folder, tanggal upload, status pemakaian — "sudah dipakai di post" / "belum dipakai").
- Info metadata: ukuran file, durasi (video), resolusi, uploader, tanggal upload.

### 8.2 Batasan Teknis (MVP)

- Ukuran maksimal upload per file: **placeholder 512 MB** (disesuaikan kapasitas server/limit platform tujuan, contoh: IG Reels maks durasi tertentu — validasi disesuaikan requirement API asli saat integrasi nyata).
- Upload menggunakan **chunked upload** (resumable) agar video besar tidak gagal karena timeout — gunakan library seperti `pionl/laravel-chunk-upload` atau resumable.js di sisi frontend.
- File disimpan di **object storage privat** (S3-compatible), bukan folder publik server, diakses via signed URL sementara.

---

## 9. Dashboard & Engagement

### 9.1 Dashboard Utama (Overview)

Layout terdiri dari **2 kelompok statistik** berdampingan dalam satu baris/grid:

**A. Kartu "Engagement Bulan Ini"** *(1 div, menampilkan 3 platform berderet)*

```
┌───────────────────────────────────────────────┐
│  Engagement Bulan Ini                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │ Instagram │  │  TikTok   │  │ Facebook  │   │
│  │ 12.4K     │  │  28.1K    │  │  5.2K     │   │
│  │ ▲ 8% vs   │  │  ▲ 15%    │  │  ▼ 2%     │   │
│  │  bulan lalu│  │           │  │           │   │
│  └───────────┘  └───────────┘  └───────────┘   │
└───────────────────────────────────────────────┘
```
- Metrik "Engagement" = agregat (likes + comments + shares + saves) per platform, dijumlahkan dari semua post yang tayang bulan berjalan.
- Bandingkan dengan bulan sebelumnya (indikator naik/turun, opsional untuk MVP tapi direkomendasikan karena sederhana dan bernilai tinggi).

**B. Tiga Kartu Leaderboard** *(di sisi kanan/sebelah kartu A)*

| Kartu | Definisi Metode Perhitungan |
|---|---|
| **Engagement Tertinggi** | Top 3 post dengan skor engagement gabungan tertinggi bulan ini — **1 post per platform** (jadi selalu tampil 3 entri: 1 IG, 1 TikTok, 1 FB, masing-masing yang tertinggi di platformnya) |
| **Postingan Terbanyak Ditonton** | Top 3 post berdasarkan `views` tertinggi, 1 per platform |
| **Postingan Terbanyak Disukai** | Top 3 post berdasarkan `likes` tertinggi, 1 per platform |

Format tampilan tiap item (contoh):
```
🏆 "Hari Jadi Kantor" — TikTok
    👁 45.200 views
```
> **Aturan tampilan angka:** setiap kartu leaderboard menampilkan **metrik yang relevan dengan kategori kartunya** — kartu "Terbanyak Ditonton" menampilkan angka *views*; kartu "Terbanyak Disukai" menampilkan angka *likes*; kartu "Engagement Tertinggi" menampilkan angka skor engagement gabungan (atau total interaksi). Jangan campur metrik lain di kartu yang salah.

- Judul post yang ditampilkan = **"Judul Upload" internal** yang diisi pengguna saat membuat post (Section 7.1), digabung dengan nama platform, contoh: `"Hari Jadi Kantor - TikTok"`.

### 9.2 Halaman Detail Engagement (Terpisah)

- List seluruh post (semua status: published, scheduled, failed) dalam bentuk **tabel/list**, kolom: Judul Upload, Thumbnail, Tipe Konten, Platform (multi-badge jika post sama tayang di >1 platform), Tanggal Tayang, Views, Likes, Comments, Shares, Status.
- Filter: rentang tanggal, platform, tipe konten, status.
- Sort by: metrik apapun (views/likes/comments/tanggal).
- Klik 1 baris → buka **detail post** (breakdown metrik per platform jika post itu tayang multi-platform, karena metrik IG/TikTok/FB harus dipisah, tidak digabung, sebab makna metriknya berbeda per platform).
- Data engagement diperbarui secara berkala oleh `FetchEngagementStatsJob` (job terjadwal, misal tiap 1–6 jam, dibatasi rate limit API tiap platform) — **bukan realtime**, cantumkan label "Diperbarui X menit/jam lalu" di UI agar ekspektasi pengguna jelas.

---

## 10. Integrasi API Media Sosial (Placeholder)

> **Catatan penting:** Untuk MVP, seluruh endpoint di bawah adalah **placeholder** — implementasi nyata harus menyesuaikan dokumentasi resmi terbaru dari masing-masing platform (Meta Graph API untuk IG & FB, TikTok Content Posting API) karena versi & kebijakan API kerap berubah dan memerlukan proses App Review/whitelisting dari masing-masing platform sebelum bisa dipakai production.

### 10.1 Kontrak Adapter (Interface, contoh pseudo-code)

```php
interface SocialPlatformAdapter
{
    public function connectAccount(array $oauthCallbackData): SocialAccount;
    public function refreshToken(SocialAccount $account): void;
    public function validatePayload(PostDraft $draft): ValidationResult;
    public function publish(PostDraft $draft): PublishResult; // dipanggil dari dalam Job
    public function getEngagement(string $platformPostId): EngagementData;
    public function disconnectAccount(SocialAccount $account): void;
}
```

### 10.2 Placeholder Endpoint (contoh struktur `.env` / config, BUKAN kredensial asli)

```
INSTAGRAM_API_BASE_URL=https://graph.facebook.com/{version}/PLACEHOLDER
INSTAGRAM_APP_ID=PLACEHOLDER
INSTAGRAM_APP_SECRET=PLACEHOLDER   (harus dienkripsi, jangan commit ke repo)

TIKTOK_API_BASE_URL=https://open.tiktokapis.com/PLACEHOLDER
TIKTOK_CLIENT_KEY=PLACEHOLDER
TIKTOK_CLIENT_SECRET=PLACEHOLDER

FACEBOOK_API_BASE_URL=https://graph.facebook.com/{version}/PLACEHOLDER
FACEBOOK_APP_ID=PLACEHOLDER
FACEBOOK_APP_SECRET=PLACEHOLDER
```

### 10.3 Alur Koneksi Akun (OAuth, Placeholder Flow)

```
1. Admin buka menu "Koneksi Akun" → klik "Hubungkan Instagram/TikTok/Facebook"
2. Redirect ke halaman OAuth resmi platform (placeholder URL)
3. Callback membawa authorization code → tukar dengan access_token & refresh_token (jika ada)
4. Simpan token TERENKRIPSI di tabel social_accounts
5. Token kadaluarsa → RefreshSocialTokenJob berjalan otomatis sebelum expired,
   jika refresh gagal → status akun jadi "Perlu Re-autentikasi" + notifikasi ke Admin
```

### 10.4 Retry & Error Handling saat Publish

- Setiap job publish (`PublishScheduledPostJob`) mencoba ulang otomatis (`retry: 3x`, backoff eksponensial) jika error bersifat sementara (timeout, rate limit 429).
- Jika error bersifat permanen (payload invalid, token revoked) → job berhenti, status post platform tersebut diubah jadi **"Gagal"**, dan notifikasi dikirim ke pengguna yang membuat post + Admin.
- Jika post ditayangkan ke 3 platform dan hanya 1 gagal → 2 lainnya tetap dianggap **sukses parsial**, status per-platform dicatat independen (bukan all-or-nothing).

---

## 11. Skema Data (Database Schema — MVP)

| Tabel | Kolom Kunci | Catatan |
|---|---|---|
| `users` | id, name, email, password, role | Auth internal Laravel (Breeze/Fortify + Inertia) |
| `social_accounts` | id, platform (enum: instagram/tiktok/facebook), account_name, access_token (encrypted cast), refresh_token (encrypted), expires_at, status (connected/expired/error), connected_by |
| `folders` | id, parent_id (nullable, self-relation), name, created_by |
| `media_files` | id, folder_id, original_filename, custom_name, path, thumbnail_path, mime_type, size, duration (nullable), uploaded_by, created_at |
| `posts` | id, title (Judul Upload), content_type (enum: story/video/photo/carousel), caption, status (draft/scheduled/publishing/published/failed/partial), scheduled_at (nullable), created_by, created_at |
| `post_media` | post_id, media_file_id, order (untuk urutan carousel) | pivot table |
| `post_platforms` | id, post_id, platform, is_enabled, advanced_settings (JSON), publish_status (pending/success/failed), platform_post_id (nullable), published_at, error_message | 1 baris per platform yang dicentang per post |
| `engagement_stats` | id, post_platform_id, views, likes, comments, shares, saves, fetched_at | histori snapshot, atau upsert terakhir tergantung kebutuhan tren |
| `notifications` | id, user_id, type, title, message, data (JSON), read_at, created_at | Menggunakan Laravel Notification database channel |
| `activity_logs` | id, user_id, action, subject_type, subject_id, description, created_at | Audit trail, khususnya untuk credential (Section 12) |

> `advanced_settings` disimpan sebagai JSON per baris `post_platforms` karena field advanced bersifat dinamis per platform (lihat Section 7.6) — menghindari puluhan kolom nullable di tabel utama.

---

## 12. Loading Page, Notifikasi, & Template Konfirmasi

> **Prinsip:** Notifikasi & konfirmasi **tidak dibangun sebagai HTML mentah yang dikembalikan dari backend** (mis. `alert()` browser atau blade string HTML). Gunakan **komponen Vue reusable** (Toast component & Modal Confirm component) yang menerima **data terstruktur (props/JSON)** dari Inertia (flash message di response, atau props langsung), lalu dirender oleh frontend menggunakan style system Vue (bukan `v-html` dari string backend).

### 12.1 Loading Page / State

| Konteks | Jenis Loading | Perilaku |
|---|---|---|
| Perpindahan halaman (Inertia visit) | **Top progress bar** (mis. `NProgress` terintegrasi dengan Inertia events `start`/`finish`) | Warna aksen `#3F72AF` |
| Upload file ke Drive | **Progress bar per file** (persentase, kecepatan opsional) di dalam card upload | Bisa cancel upload yang sedang berjalan |
| Submit Composer (upload/jadwalkan) | **Full overlay loading** dengan spinner + teks status ("Mengunggah ke Instagram...", "Menjadwalkan post...") | Background `#F9F7F7` transparan overlay, spinner warna `#3F72AF` |
| Loading data dashboard/list | **Skeleton loader** (placeholder shimmer sesuai bentuk kartu/list asli) | Bukan spinner polos, agar layout tidak "melompat" saat data masuk |

### 12.2 Sistem Notifikasi (Toast)

- Implementasi: komponen Toast Vue custom (atau library seperti `vue-toastification`), dipicu dari:
  - Inertia shared props `flash.success` / `flash.error` / `flash.info` (untuk notifikasi hasil aksi langsung).
  - Tabel `notifications` (Laravel Notification) untuk notifikasi async (misal hasil publish terjadwal yang baru selesai di background, token akun expired) — ditampilkan lewat ikon lonceng di navbar + polling/pusher (opsional realtime via Laravel Reverb/Pusher, atau polling interval jika ingin lebih sederhana untuk MVP).
- Jenis toast: `success` (hijau aksen), `error` (merah aksen), `warning` (kuning/oranye aksen), `info` (biru `#3F72AF`).
- Toast **tidak berisi HTML** — hanya `title` + `message` teks polos + optional `action button` (mis. "Lihat Detail").

### 12.3 Template Konfirmasi (Modal "Ya/Tidak")

Komponen `ConfirmDialog` reusable dengan props: `title`, `message`, `confirmLabel`, `cancelLabel`, `variant` (`danger` | `neutral`).

**Aturan warna tombol (fixed, tidak ikut palet brand):**
- Tombol yang men-trigger aksi **berisiko/tidak dapat dibatalkan** (hapus, putus koneksi akun, batalkan jadwal publish) → **selalu MERAH**, apa pun posisinya (baik itu "Ya, Hapus" maupun "Tidak, Batalkan Jadwal").
- Tombol yang bersifat aman/melanjutkan tanpa efek merugikan → **selalu HIJAU**.
- Tombol netral (menutup dialog tanpa memilih apa pun bila ada 3 opsi) → abu-abu netral (opsional, di luar warna DBE2EF palet brand agar tidak campur dengan warna UI biasa).

| Template | Judul | Pesan | Tombol Kiri | Tombol Kanan |
|---|---|---|---|---|
| **Hapus Koneksi Akun** | "Putuskan Koneksi Akun?" | "Anda akan memutus koneksi akun {Platform} – {NamaAkun}. Semua post terjadwal yang menggunakan akun ini akan otomatis dibatalkan. Tindakan ini tidak dapat dibatalkan." | Batal (hijau) | Ya, Putuskan (merah) |
| **Konfirmasi Edit Post Terjadwal** | "Simpan Perubahan Jadwal?" | "Perubahan akan langsung berlaku untuk post yang belum tayang." | Batal (merah) | Ya, Simpan (hijau) |
| **Hapus Media dari Drive** | "Hapus File Ini?" | "File {NamaFile} akan dihapus permanen. File yang sedang dipakai di post terjadwal tidak dapat dihapus." | Batal (hijau) | Ya, Hapus (merah) |
| **Hapus Folder** | "Hapus Folder Beserta Isinya?" | "Folder {NamaFolder} beserta {jumlah} file di dalamnya akan dihapus permanen." | Batal (hijau) | Ya, Hapus Semua (merah) |
| **Batalkan Post Terjadwal** | "Batalkan Jadwal Post Ini?" | "Post '{JudulUpload}' tidak akan dipublikasikan pada {tanggal, jam}." | Tidak, Kembali (hijau) | Ya, Batalkan (merah) |
| **Hapus User (Admin)** | "Hapus Akses Pengguna?" | "{NamaUser} tidak akan bisa login lagi. Riwayat aktivitas tetap tersimpan." | Batal (hijau) | Ya, Hapus (merah) |

---

## 13. Panduan UI & Palet Warna

| Kode Warna | Peran |
|---|---|
| `#112D4E` | Warna utama gelap — navbar, sidebar, heading penting, tombol primer |
| `#3F72AF` | Warna aksen/interaktif — link, tombol sekunder, progress bar, state aktif/hover |
| `#DBE2EF` | Warna latar elemen sekunder — card background alternatif, border, badge netral |
| `#F9F7F7` | Warna latar utama (background halaman) — hampir putih, menjaga kontras nyaman |
| **Merah** (contoh `#D64545` / `#DC2626`) | **Khusus** tombol konfirmasi negatif/berisiko (Ya-Hapus / Tidak-Batal, tetap sesuai konteks Section 12.3), juga status "Gagal/Error" |
| **Hijau** (contoh `#2E9E5B` / `#16A34A`) | **Khusus** tombol konfirmasi aman/lanjut, juga status "Sukses/Published" |

> Merah & hijau **hanya digunakan untuk konteks konfirmasi Ya/Tidak dan status sistem (sukses/gagal)** — tidak dipakai sebagai warna dekoratif umum, agar makna warnanya tetap konsisten dan tidak membingungkan pengguna.

### 13.1 Responsivitas

- Desain **mobile-first / fully responsive** menggunakan grid TailwindCSS (breakpoint `sm`, `md`, `lg`, `xl`).
- Komponen kompleks (Composer, Kalender jadwal, Tabel detail engagement) punya **layout alternatif untuk layar kecil** — misal tabel berubah jadi stacked-card di mobile, kalender bulan jadi scrollable list agenda di layar sempit.
- Sidebar navigasi collapsible menjadi bottom-nav atau hamburger menu pada breakpoint mobile.

---

## 14. Keamanan & Perlindungan Data (Rekomendasi Wajib untuk MVP)

Karena aplikasi ini menyimpan **kredensial/token akses ke akun media sosial resmi perusahaan**, keamanan menjadi prioritas tinggi, bukan sekadar tambahan:

1. **Enkripsi token di database** — gunakan Laravel `encrypted` cast (atau `Crypt::encryptString`) untuk kolom `access_token` & `refresh_token` di tabel `social_accounts`. Jangan pernah simpan token dalam bentuk plain text.
2. **Jangan expose token ke frontend** — endpoint/props Inertia yang mengirim data `social_accounts` ke Vue **wajib menyaring (hidden/except)** kolom token, hanya kirim status koneksi (connected/expired) dan nama akun.
3. **RBAC ketat** — hanya role **Admin** yang boleh menghubungkan/memutus akun media sosial dan mengelola user lain (`spatie/laravel-permission` + Policy class per model).
4. **Audit log / activity log** — setiap aksi sensitif (hapus akun, hapus user, edit kredensial, disconnect platform) dicatat di `activity_logs` (siapa, kapan, aksi apa) — gunakan `spatie/laravel-activitylog`.
5. **Autentikasi kuat untuk Admin** — wajibkan **2FA (Two-Factor Authentication)** minimal untuk role Admin (Laravel Fortify mendukung ini out-of-the-box).
6. **HTTPS wajib di semua environment** (termasuk staging) — set `APP_URL` https, `SESSION_SECURE_COOKIE=true`, HSTS header.
7. **CSRF Protection** otomatis dari Laravel/Inertia — pastikan tidak dimatikan di route API internal apa pun.
8. **Validasi & sanitasi upload file** — cek MIME type asli (bukan cuma ekstensi), batasi ukuran file, scan malware jika memungkinkan (mis. integrasi ClamAV), simpan file di storage **privat** (bukan publicly readable folder), akses lewat **signed URL** dengan masa berlaku singkat.
9. **Rate limiting** — batasi request login (`throttle` middleware) untuk mencegah brute force, serta batasi pemanggilan API pihak ketiga sesuai kuota masing-masing platform agar akun tidak diblokir/limit oleh IG/TikTok/FB.
10. **Webhook signature verification** — jika nanti memakai webhook dari platform (misal notifikasi status dari TikTok/Meta), **wajib verifikasi signature/secret** setiap payload masuk sebelum diproses, untuk mencegah spoofing.
11. **Secrets management** — jangan commit `.env`/App Secret ke repository; gunakan environment variable di server/CI-CD, pertimbangkan vault (mis. AWS Secrets Manager/HashiCorp Vault) untuk skala lebih besar di fase berikutnya.
12. **Redaksi log** — pastikan token/kredensial **tidak pernah ikut tercetak** di log aplikasi (Laravel log, log job gagal, atau error tracking seperti Sentry) — gunakan mekanisme masking pada exception handler.
13. **Backup terjadwal** — backup database & (opsional) metadata media secara berkala, uji proses restore secara berkala juga (backup yang tidak pernah diuji restore = risiko).
14. **Least privilege untuk akun media sosial** — saat menghubungkan akun IG/TikTok/FB, gunakan scope/permission API paling minimal yang dibutuhkan (jangan minta izin penuh admin halaman jika hanya butuh permission publish + read insight).
15. **Kebijakan retensi & penghapusan data** — saat akun sosial media diputus/dihapus dari sistem, token terkait **langsung dihapus permanen** dari database (bukan soft delete untuk kolom token), sementara data historis engagement bisa tetap disimpan untuk laporan.
16. **Isolasi environment** — pastikan environment staging/development memakai kredensial API **sandbox/test app** milik platform, terpisah total dari App ID/Secret production, untuk mencegah data uji coba tercampur ke akun media sosial asli perusahaan.

---

## 15. Non-Functional Requirements

| Aspek | Target MVP |
|---|---|
| Ketersediaan sistem penjadwal (scheduler/queue worker) | Harus berjalan sebagai daemon terpantau (Supervisor/Horizon), auto-restart jika crash |
| Waktu eksekusi publish terjadwal | Toleransi keterlambatan maksimal ±5 menit dari jadwal |
| Ukuran maksimal upload | Placeholder 512 MB/file, disesuaikan kebutuhan nyata |
| Concurrent upload | Mendukung minimal beberapa upload paralel tanpa memblokir UI (via job queue) |
| Browser support | 2 versi terbaru Chrome, Edge, Firefox, Safari |
| Aksesibilitas dasar | Kontras warna memenuhi WCAG AA minimal untuk teks pada background `#F9F7F7`/`#112D4E` |

---

## 16. Roadmap Fase Berikutnya (Di Luar MVP, untuk Referensi)

- Approval workflow berjenjang (draft → review → approved → scheduled).
- Multi-brand/multi-workspace (multi-tenant).
- Tambahan platform: YouTube Shorts, X (Twitter), LinkedIn, Threads.
- AI caption/hashtag suggestion.
- Realtime collaborative editing pada Composer.
- Analytics lanjutan (grafik tren historis multi-bulan, export laporan PDF/Excel).
- Native mobile app / PWA notifikasi push.

---

## 17. Ringkasan Glosarium

| Istilah | Arti |
|---|---|
| **Composer** | Halaman/form pembuatan post sebelum upload/jadwalkan |
| **Drive/Media Library** | Modul penyimpanan & organisasi file media |
| **Advanced Settings** | Kumpulan field fitur khusus platform tertentu (non-generic) |
| **Post Platform** | Representasi 1 post untuk 1 platform tertentu (status publish independen) |
| **Engagement** | Gabungan interaksi (likes, comments, shares, saves) pada 1 post |
| **Adapter** | Lapisan integrasi kode yang menjembatani sistem internal dengan API tiap platform sosial media |

---

*Dokumen ini adalah PRD tingkat MVP — detail teknis (contoh: nama endpoint API asli, rate limit spesifik, versi API) perlu divalidasi ulang terhadap dokumentasi resmi Meta Graph API dan TikTok Content Posting API saat masuk fase implementasi, karena kebijakan API pihak ketiga dapat berubah sewaktu-waktu.*