# GuestHub - Sistem Informasi Buku Tamu Digital

> Aplikasi buku tamu digital untuk **Dinas Perhubungan Kabupaten Ponorogo**.

**GuestHub** adalah aplikasi web modern untuk mendigitalkan, mengelola, dan memantau riwayat kunjungan tamu secara *real-time* di lingkungan Dinas Perhubungan Kabupaten Ponorogo.

Sistem dibangun dengan arsitektur kontainerisasi **Docker** yang mandiri (*on-premise / self-hosted*), sehingga data instansi tetap aman, performa tinggi, sumber daya efisien, dan mudah dimigrasikan tanpa bergantung pada layanan cloud pihak ketiga.

---

## Daftar Isi

- [A. Fitur Utama](#a-fitur-utama)
- [B. Arsitektur & Teknologi](#b-arsitektur--teknologi)
- [C. Daftar 11 Bidang / Unit Kerja](#c-daftar-11-bidang--unit-kerja-resmi)
- [D. Skema Database](#d-skema-database-postgresql)
- [E. Panduan Menjalankan Sistem](#e-panduan-menjalankan-sistem-docker)
- [F. Keterangan Proyek](#f-keterangan-proyek)

---

## A. Fitur Utama

### 1. Dashboard Interaktif & Statistik Real-Time

- **4 metrik ringkasan:**
  - Tamu Hari Ini (dengan perbandingan kemarin)
  - Total Kunjungan Keseluruhan
  - Total Kunjungan Bulan Ini
  - Bidang Tujuan Terbanyak (*Top Unit*)
- **Bar chart tren 7 hari terakhir:** grafik batang dinamis yang memvisualisasikan volume kunjungan harian.
- **Pie chart per bidang tujuan:** diagram lingkaran SVG interaktif dengan tooltip hover dan persentase. Warnanya otomatis sinkron dengan badge pada tabel data tamu.

### 2. Form Pendaftaran Tamu Cepat & Responsif

- **Pencatatan lengkap:** Nama Lengkap, Instansi Asal, Nomor HP/WhatsApp (validasi digit numerik), Bidang/Unit Kerja Tujuan, dan Perihal Kunjungan.
- **Integrasi kamera & unggah foto:** ambil foto langsung lewat kamera perangkat (laptop/tablet/smartphone) atau unggah berkas gambar (JPG, JPEG, PNG).
- **Kompresi gambar otomatis:** foto dikompresi di sisi browser (*client-side compression*) sebelum diunggah, sehingga hemat kuota dan cepat dimuat.

### 3. Filter, Pencarian, & Navigasi Riwayat Kunjungan

- **Pencarian cepat:** berdasarkan nama tamu, instansi asal, maupun perihal.
- **Filter rentang tanggal:** dari *Dari Tanggal* hingga *Sampai Tanggal*.
- **Filter bidang tujuan:** menyaring tamu berdasarkan 11 unit kerja/bidang tujuan.
- **Reset filter:** mengembalikan pencarian dan penyaringan ke kondisi awal dalam satu klik.
- **Paginasi:** tabel riwayat menampilkan 5 data per halaman agar rapi dan cepat dirender.
- **Preview foto fullscreen:** klik avatar tamu pada tabel untuk melihat foto dalam modal beresolusi penuh.

### 4. Manajemen Peran & Hak Akses (Role-Based Access Control)

Otentikasi berbasis **JSON Web Token (JWT)** dengan enkripsi kata sandi **Bcrypt**.

| Kemampuan                                                 | Admin | Resepsionis |
| :-------------------------------------------------------- | :---: | :---------: |
| Mengakses Form Tamu, Dashboard, dan Riwayat Kunjungan     |  Ya   |     Ya      |
| Mengedit data tamu (nama, instansi, kontak, foto)         |  Ya   |     Ya      |
| Menghapus data tamu (beserta berkas foto fisik di server) |  Ya   |    Tidak    |
| Mengunduh rekapitulasi ke Excel (`.xlsx`)                 |  Ya   |    Tidak    |
| Mengakses menu **Kelola User**                            |  Ya   |    Tidak    |

**Menu Kelola User (khusus Admin):** menambah petugas, mengubah data petugas, mereset password, dan menghapus akun pengguna.

> Hak menghapus data dan akses ke menu Kelola User dikunci untuk Resepsionis demi integritas dan keamanan arsip dinas.

### 5. Ekspor Laporan Excel (`.xlsx`)

- Mengunduh rekapitulasi data kunjungan ke spreadsheet Excel secara dinamis, mengikuti filter yang sedang aktif.
- Dilengkapi sanitasi formula (*formula injection safe*).

---

## B. Arsitektur & Teknologi

GuestHub menggunakan arsitektur modular **3 kontainer** (*Multi-Container Docker*):

```text
                     [ Pengguna / Browser ]
                               │
                               ▼  (Port 8085)
┌────────────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND  ·  guesthub_frontend                                      │
│    - React 18 + Vite (SPA)                                             │
│    - Nginx Alpine (Reverse Proxy & Static Asset Caching)               │
│    - Meneruskan /api/ dan /uploads/ ke guesthub_backend:5000           │
└────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼  (Internal Docker Network)
┌────────────────────────────────────────────────────────────────────────┐
│ 2. BACKEND  ·  guesthub_backend                                        │
│    - Node.js 20 LTS + Express.js API                                   │
│    - Keamanan: Helmet, JWT Auth, CORS Whitelist, Multer Filter         │
│    - Foto tamu tersimpan terisolasi di volume mount backend/uploads    │
└────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼  (Internal: 5432 / Host: 5433)
┌────────────────────────────────────────────────────────────────────────┐
│ 3. DATABASE  ·  guesthub_db                                            │
│    - PostgreSQL 17 Alpine                                              │
│    - Data persisten di Docker Named Volume                             │
│    - Inisialisasi otomatis dari guesthub_backup.sql                    │
│    - Port 5433 siap dimonitor lewat DBeaver di laptop                  │
└────────────────────────────────────────────────────────────────────────┘
```

### Rincian Dependensi

| Lapisan  | Teknologi                                                                                     |
| :------- | :-------------------------------------------------------------------------------------------- |
| Frontend | React 18, Vite, Vanilla CSS3 Custom, SweetAlert2, Browser Image Compression, SheetJS (`xlsx`) |
| Backend  | Express.js, `pg` (node-postgres), Bcrypt, JsonWebToken, Multer, Helmet, CORS                  |
| Database | PostgreSQL 17 Alpine                                                                          |

---

## C. Daftar 11 Bidang / Unit Kerja Resmi

Formulir dan filter GuestHub disesuaikan dengan struktur organisasi Dinas Perhubungan:

1. Sub Bagian Umum Dan Kepegawaian
2. Sub Bagian Keuangan Dan Penyusunan Program
3. Bidang Angkutan
4. Seksi Angkutan Orang
5. Seksi Angkutan Barang
6. Bidang Lalu Lintas, Sarana, Prasarana
7. Seksi Parkir
8. Seksi Manajemen Rekayasa Lalu Lintas
9. Seksi Penerangan Jalan Umum
10. Bidang Pengendalian Operasional Lalu Lintas Dan Angkutan Jalan
11. UPT Pengujian Kendaraan Bermotor

---

## D. Skema Database PostgreSQL

### 1. Tabel Buku Tamu (`tamu`)

| Kolom           | Tipe Data            | Keterangan                                  |
| :-------------- | :------------------- | :------------------------------------------ |
| `id`            | `SERIAL PRIMARY KEY` | ID unik auto-increment                      |
| `nama_tamu`     | `VARCHAR(150)`       | Nama lengkap tamu                           |
| `instansi_asal` | `VARCHAR(150)`       | Instansi / lembaga asal tamu                |
| `no_hp`         | `VARCHAR(20)`        | Nomor telepon / WhatsApp                    |
| `tujuan_bidang` | `VARCHAR(100)`       | Unit kerja / bidang yang dituju             |
| `perihal`       | `TEXT`               | Maksud dan keperluan kunjungan              |
| `foto_url`      | `TEXT`               | Path relatif foto tamu di `/uploads/...`    |
| `waktu_masuk`   | `TIMESTAMP`          | Waktu kedatangan tamu (`CURRENT_TIMESTAMP`) |

### 2. Tabel Pengguna Petugas (`users`)

| Kolom           | Tipe Data             | Keterangan                          |
| :-------------- | :-------------------- | :---------------------------------- |
| `id`            | `SERIAL PRIMARY KEY`  | ID unik auto-increment              |
| `username`      | `VARCHAR(255) UNIQUE` | Username unik untuk login           |
| `password_hash` | `VARCHAR(255)`        | Kata sandi terenkripsi Bcrypt       |
| `full_name`     | `VARCHAR(100)`        | Nama lengkap petugas                |
| `role`          | `VARCHAR(20)`         | Hak akses (`admin` / `resepsionis`) |
| `created_at`    | `TIMESTAMP`           | Waktu pembuatan akun petugas        |

---

## E. Panduan Menjalankan Sistem (Docker)

### 1. Prasyarat

- **Docker** dan **Docker Compose** sudah terpasang di komputer atau server.

### 2. Menjalankan GuestHub

Di terminal, masuk ke direktori proyek lalu jalankan:

```bash
docker compose up -d
```

> **Catatan:** Gunakan `docker compose up -d --build` saat pertama kali menjalankan atau setelah mengubah source code.

### 3. Akses Aplikasi

**Aplikasi web:** buka [http://localhost:8085](http://localhost:8085)

**Kredensial default:**

| Peran       | Username       | Password   |
| :---------- | :------------- | :--------- |
| Admin       | `admin1`       | `admin123`       |
| Resepsionis | `resepsionis1` | `resepsionis123` |

**Koneksi database (DBeaver di laptop staf IT):**

| Parameter | Nilai                               |
| :-------- | :---------------------------------- |
| Host      | `localhost` (atau IP Server Dishub) |
| Port      | `5433`                              |
| Database  | `guesthub_db`                       |
| Username  | `postgres`                          |
| Password  | `admguesthub123`                    |

> **Penting:** kredensial di atas hanya untuk instalasi awal. Segera ganti semua password default sebelum sistem dipakai di lingkungan produksi.

### 4. Perintah Pemeliharaan

| Tujuan                          | Perintah                 |
| :------------------------------ | :----------------------- |
| Melihat status kontainer        | `docker compose ps`      |
| Melihat log real-time           | `docker compose logs -f` |
| Menghentikan sementara          | `docker compose stop`    |
| Mematikan & menghapus kontainer | `docker compose down`    |

---

## F. Keterangan Proyek

GuestHub dirancang dan diimplementasikan khusus untuk mendigitalisasi operasional buku tamu di **Dinas Perhubungan Kabupaten Ponorogo**, menggantikan pencatatan buku fisik konvensional dengan sistem digital yang aman, transparan, terpusat, dan mudah dipertanggungjawabkan.
