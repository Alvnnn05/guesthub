# Panduan Lengkap Migrasi GuestHub ke Server Dinas Perhubungan (Docker)

Panduan ini disusun secara runtut dan praktis, mulai dari persiapan di laptop hingga sistem **GuestHub** online dan berjalan stabil di server Dinas Perhubungan.

---

## Daftar Alur Migrasi

1. [Tahap 1: Persiapan & Sinkronisasi Kode di Laptop](#tahap-1-persiapan--sinkronisasi-kode-di-laptop)
2. [Tahap 2: Akses Remote ke Server Dinas Perhubungan (SSH)](#tahap-2-akses-remote-ke-server-dinas-perhubungan-ssh)
3. [Tahap 3: Pemeriksaan & Instalasi Docker di Server](#tahap-3-pemeriksaan--instalasi-docker-di-server)
4. [Tahap 4: Mengunduh (Clone) & Menjalankan GuestHub](#tahap-4-mengunduh-clone--menjalankan-guesthub)
5. [Tahap 5: Verifikasi & Uji Coba Sistem](#tahap-5-verifikasi--uji-coba-sistem)
6. [Tahap 6: Koordinasi Subdomain Resmi (.go.id) dengan Tim IT](#tahap-6-koordinasi-subdomain-resmi-goid-dengan-tim-it)
7. [Tahap 7: Monitoring Database dengan DBeaver](#tahap-7-monitoring-database-dengan-dbeaver)
8. [Tahap 8: Panduan Pemeliharaan & Update Kode di Masa Depan](#tahap-8-panduan-pemeliharaan--update-kode-di-masa-depan)

---

## Tahap 1: Persiapan & Sinkronisasi Kode di Laptop

Sebelum mengakses server, pastikan seluruh source code terbaru di laptop sudah tersimpan dan terunggah ke GitHub.

**1. Buka Terminal / PowerShell di folder project:**

```powershell
cd d:\Alvnn\projek\guesthub
```

**2. Periksa status berkas:**

```powershell
git status
```

**3. Simpan dan kirim (*push*) seluruh pembaruan ke GitHub:**

```powershell
git add .
git commit -m "Siap deploy ke server produksi Dishub"
git push origin main
```

**4. Verifikasi:** buka [https://github.com/Alvnnn05/guesthub](https://github.com/Alvnnn05/guesthub) dan pastikan repository sudah memuat berkas berikut:

- `docker-compose.yml`
- `backend/Dockerfile` dan `backend/index.js`
- `frontend/Dockerfile` dan `frontend/nginx.conf`
- `guesthub_backup.sql`

---

## Tahap 2: Akses Remote ke Server Dinas Perhubungan (SSH)

### 2.1. Informasi yang Dibutuhkan

Minta informasi akses server berikut kepada staf IT / pembimbing Dishub:

| Informasi   | Keterangan                                                    |
| :---------- | :------------------------------------------------------------ |
| IP Server   | Contoh: `192.168.1.50` atau IP publik                         |
| Port SSH    | Default: `22`                                                 |
| Username    | Biasanya `root` atau user admin lokal, misalnya `dishubadmin` |
| Autentikasi | Password atau berkas kunci SSH                                |

### 2.2. Langkah Masuk

Buka PowerShell atau Command Prompt di laptop, lalu ketik:

```bash
ssh username@IP_SERVER_DISHUB
```

Contoh:

```bash
ssh root@192.168.1.50
```

> **Catatan:** saat mengetik password di terminal Linux, kursor memang tidak bergerak dan karakter tidak ditampilkan demi keamanan. Ketik dengan teliti, lalu tekan **Enter**.
>
> Setelah berhasil, tampilan terminal berubah menjadi server Linux, misalnya `[root@dishub-server ~]#`.

---

## Tahap 3: Pemeriksaan & Instalasi Docker di Server

Setelah berada di terminal server Dishub, periksa apakah Docker sudah tersedia.

### 3.1. Cek Ketersediaan Docker

```bash
docker --version
docker compose version
```

1. apabila Versi Docker muncul (misal `Docker version 26.x.x` dan `Docker Compose v2.x.x`) Docker sudah siap. **Langsung lanjut ke Tahap 4.**
2. Apabila  Muncul error `command not found`   , Lakukan instalasi sesuai sistem operasi server (lihat 3.2)

### 3.2. Instalasi Docker (Jika Belum Terpasang)

**Server CentOS / RHEL / AlmaLinux / Rocky Linux:**

```bash
# 1. Update package & siapkan repo manager
sudo yum install -y yum-utils git

# 2. Tambahkan repository resmi Docker
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 3. Pasang Docker Engine & Docker Compose Plugin
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 4. Aktifkan service agar otomatis menyala saat server restart
sudo systemctl enable --now docker
```

**Server Ubuntu / Debian:**

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

---

## Tahap 4: Mengunduh (Clone) & Menjalankan GuestHub

### 4.1. Unduh Source Code dari GitHub

```bash
git clone https://github.com/Alvnnn05/guesthub.git
```

### 4.2. Masuk ke Direktori Project

```bash
cd guesthub
```

### 4.3. Jalankan Seluruh Sistem dengan Docker Compose

```bash
docker compose up -d --build
```

> **Apa yang terjadi pada proses ini?**
>
> 1. Docker mengunduh base image resmi (PostgreSQL 17, Node.js 20, Nginx Alpine).
> 2. Database PostgreSQL dibuat dan `guesthub_backup.sql` otomatis dieksekusi, sehingga struktur tabel dan akun awal langsung terisi.
> 3. Frontend React di-compile menjadi asset produksi di dalam container Nginx.
> 4. Opsi `-d` (*detached*) menjalankan aplikasi di latar belakang tanpa mengunci terminal.

---

## Tahap 5: Verifikasi & Uji Coba Sistem

### 5.1. Periksa Status Kontainer

```bash
docker compose ps
```

**Hasil yang diharapkan:** semua kontainer berstatus `Up` (atau `Up (healthy)` untuk database).

| Nama Kontainer      | Layanan                     | Port Host                | Status       |
| :------------------ | :-------------------------- | :----------------------- | :----------- |
| `guesthub_frontend` | Web App React + Nginx Proxy | `0.0.0.0:8085->80/tcp`   | Up           |
| `guesthub_backend`  | API Server Express.js       | `5000/tcp` (internal)    | Up           |
| `guesthub_db`       | Database PostgreSQL 17      | `0.0.0.0:5433->5432/tcp` | Up (healthy) |

### 5.2. Uji Respon Web Server Lokal

Ketik di terminal server:

```bash
curl -I http://localhost:8085
```

Jika menerima respon `HTTP/1.1 200 OK`, web server Nginx sudah aktif.

### 5.3. Buka Aplikasi Lewat Browser Laptop

Pastikan laptop terhubung ke jaringan Wi-Fi / LAN yang sama dengan server, lalu buka:

```text
http://IP_SERVER_DISHUB:8085
```

Contoh: `http://192.168.1.50:8085`

### 5.4. Uji Fungsi Utama

1. Login menggunakan akun bawaan:

   | Peran       | Username       | Password   |
   | :---------- | :------------- | :--------- |
   | Admin       | `admin1`       | `admin123`       |
   | Resepsionis | `resepsionis1` | `resepsionis123` |

2. Tambahkan 1 data tamu baru beserta foto.
3. Periksa apakah data muncul di Dashboard dan tabel Riwayat Kunjungan.

> **Penting:** akun dan password di atas hanya untuk uji awal. Ganti semua password default melalui menu **Kelola User** sebelum sistem dipakai secara resmi.

---

## Tahap 6: Koordinasi Subdomain Resmi (.go.id) dengan Tim IT

Setelah GuestHub berfungsi normal di port `8085`, koordinasikan dengan tim IT Dishub untuk menghubungkan subdomain resmi dinas ke aplikasi.

### Referensi Konfigurasi Nginx untuk Tim IT

Contoh blok konfigurasi Nginx:

```nginx
server {
    listen 80;
    server_name bukutamu.dishub.ponorogo.go.id;

    # Rekomendasi: redirect otomatis HTTP ke HTTPS
    # return 301 https://$host$request_uri;

    location / {
        proxy_pass http://127.0.0.1:8085;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Tahap 7: Monitoring Database dengan DBeaver

Server Linux produksi tidak memiliki antarmuka grafis (GUI). Staf IT Dishub maupun Anda **tidak perlu memasang software GUI di server**. Cukup pasang **DBeaver Community** di laptop/PC kerja masing-masing untuk mengelola database secara visual.

### 7.1. Unduh & Pasang DBeaver (di Laptop/PC Staf IT)

1. Buka situs resmi: [https://dbeaver.io/download/](https://dbeaver.io/download/)
2. Pada bagian **DBeaver Community Edition**, pilih installer sesuai sistem operasi. Untuk Windows, pilih **Windows Installer (.exe)**.
3. Jalankan file `.exe` yang terunduh: klik **Next**, **I Agree**, biarkan pengaturan default, lalu klik **Install** hingga selesai.

### 7.2. Hubungkan DBeaver ke Database Server GuestHub

1. Buka aplikasi **DBeaver**.
2. Klik menu **Database**, pilih **New Database Connection** (atau klik ikon colokan listrik dengan tanda plus di pojok kiri atas).
3. Pilih **PostgreSQL**, lalu klik **Next**.
4. Pada tab **Main**, isi rincian koneksi:

   | Parameter | Nilai                                                      |
   | :-------- | :--------------------------------------------------------- |
   | Host      | IP Server Dishub, misal `192.168.1.50`                     |
   | Port      | `5433` (port luar yang dipetakan Docker, **bukan** `5432`) |
   | Database  | `guesthub_db`                                              |
   | Username  | `postgres`                                                 |
   | Password  | `admguesthub123` (sesuai `docker-compose.yml`)             |

5. **Unduh driver JDBC (otomatis):**
   - Klik **Test Connection** di pojok kiri bawah jendela.
   - Jika ini pertama kali memakai PostgreSQL di DBeaver, muncul pop-up *"Download driver files"*. Klik **Download** dan tunggu beberapa detik.
6. Setelah muncul status **Connected (Success)**, klik **OK**, lalu **Finish**.

### 7.3. Melihat & Mengelola Data Tamu

1. Di panel kiri (**Database Navigator**), klik tanda panah `>` pada nama koneksi yang baru dibuat.
2. Buka folder berurutan: `Databases` > `guesthub_db` > `Schemas` > `public` > `Tables`.
3. Klik dua kali tabel **`tamu`** (data buku tamu) atau **`users`** (data akun petugas).
4. Di panel kanan, pilih tab **Data**. Seluruh data akan tampil seperti tabel Excel.

### 7.4. Catatan Jaringan untuk Tim IT (Firewall Port 5433)

Agar laptop staf IT di jaringan kantor dapat terhubung ke database, izinkan port `5433` pada firewall server CentOS:

```bash
sudo firewall-cmd --add-port=5433/tcp --permanent
sudo firewall-cmd --reload
```

> **Catatan keamanan:** sebaiknya batasi akses port `5433` hanya untuk IP laptop staf IT, dan ganti password database default sebelum port dibuka.

---

## Tahap 8: Panduan Pemeliharaan & Update Kode di Masa Depan

Jika di kemudian hari ada pembaruan fitur pada kode program di laptop:

### 8.1. Di Laptop (Kirim Update)

```powershell
git add .
git commit -m "Update fitur X"
git push origin main
```

### 8.2. Di Server Dishub (Terapkan Update)

Masuk kembali lewat SSH ke server Dishub, lalu jalankan:

```bash
cd guesthub
git pull origin main
docker compose up -d --build
```

> **Keamanan data:** seluruh data tamu di database dan file foto di folder `backend/uploads` **tidak akan terhapus** saat proses update/rebuild container berlangsung.

### 8.3. Perintah Operasional Cepat

| Tujuan                                          | Perintah                 |
| :---------------------------------------------- | :----------------------- |
| Melihat log real-time aplikasi (jika ada error) | `docker compose logs -f` |
| Mematikan sistem sementara                      | `docker compose down`    |
| Menyalakan kembali sistem                       | `docker compose up -d`   |
| Melihat penggunaan memori (RAM & CPU)           | `docker stats`           |
