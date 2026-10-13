# 📘 Panduan Lengkap Migrasi GuestHub ke Server Dinas Perhubungan (CentOS + Docker)

Panduan ini disusun secara bertahap dan rinci agar Anda dapat memindahkan serta menjalankan sistem **GuestHub** di server CentOS milik Dinas Perhubungan dengan lancar.

---

## 📑 Daftar Isi
1. [Persiapan Sebelum Berangkat ke Server](#1-persiapan-sebelum-berangkat-ke-server)
2. [Cara Masuk (Remote) ke Server CentOS](#2-cara-masuk-remote-ke-server-centos)
3. [Pengecekan & Instalasi Docker di Server](#3-pengecekan--instalasi-docker-di-server)
4. [Mengunduh & Menjalankan GuestHub](#4-mengunduh--menjalankan-guesthub)
5. [Memastikan Aplikasi Berjalan dengan Benar](#5-memastikan-aplikasi-berjalan-dengan-benar)
6. [Koordinasi Subdomain .go.id dengan Tim IT](#6-koordinasi-subdomain-goid-dengan-tim-it)
7. [Menghubungkan DBeaver Laptop ke Database Server](#7-menghubungkan-dbeaver-laptop-ke-database-server)
8. [Panduan Pemeliharaan & Update Kode di Masa Depan](#8-panduan-pemeliharaan--update-kode-di-masa-depan)

---

## 1. Persiapan Sebelum Berangkat ke Server

Pastikan seluruh kode dan database terbaru di laptop Anda sudah terkirim ke GitHub:

1. Buka Terminal di laptop Anda (pada folder `guesthub`).
2. Jalankan perintah:
   ```bash
   git status
   ```
3. Jika ada perubahan yang belum tersimpan, simpan dan kirim:
   ```bash
   git add .
   git commit -m "Update konfigurasi siap migrasi"
   git push origin main
   ```
4. Buka browser dan pastikan repository **`https://github.com/Alvnnn05/guesthub`** sudah memuat berkas:
   * `docker-compose.yml`
   * `backend/Dockerfile`
   * `frontend/Dockerfile` & `frontend/nginx.conf`
   * `guesthub_backup.sql`

---

## 2. Cara Masuk (Remote) ke Server CentOS

Minta data akses server ke pembimbing atau staf IT Dishub:
* **IP Server** (Contoh: `192.168.1.50` atau IP publik)
* **Username** (Biasanya `root` atau nama user khusus seperti `dishubadmin`)
* **Password** atau berkas SSH Key (`.pem` / `.ppk`)

### Langkah Masuk via Terminal / PowerShell di Laptop:
Buka PowerShell atau Command Prompt di laptop Anda, lalu ketik:
```bash
ssh username@IP_SERVER_DISHUB
```
*(Contoh: `ssh root@192.168.1.50`)*

* Masukkan password saat diminta (catatan: saat mengetik password di Linux, karakter memang tidak muncul di layar demi keamanan, langsung tekan `Enter`).
* Jika berhasil, tampilan terminal akan berubah menjadi prompt server CentOS (misal: `[root@dishub-server ~]#`).

---

## 3. Pengecekan & Instalasi Docker di Server

Setelah berhasil masuk ke server CentOS, periksa apakah Docker sudah terpasang.

### Langkah 3.1: Cek Apakah Docker Sudah Ada
Ketik perintah:
```bash
docker --version
docker compose version
```

* **Jika muncul versi Docker (misal: `Docker version 24.x.x` / `26.x.x`):**  
  ➡️ Artinya Docker sudah siap! Anda bisa **langsung lompat ke Langkah 4**.
* **Jika muncul pesan `command not found`:**  
  ➡️ Jalankan perintah instalasi di bawah ini (Langkah 3.2).

### Langkah 3.2: Instalasi Docker di CentOS (Jika Belum Ada)
Jalankan baris perintah ini satu per satu:
```bash
# 1. Update package manager & siapkan tools repo
sudo yum install -y yum-utils git

# 2. Tambahkan repository resmi Docker
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 3. Install Docker Engine & Docker Compose Plugin
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 4. Aktifkan dan jalankan service Docker
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 4. Mengunduh & Menjalankan GuestHub

Sekarang kita pasang aplikasi GuestHub di server.

### Langkah 4.1: Clone Repository dari GitHub
Di terminal server CentOS, jalankan:
```bash
git clone https://github.com/Alvnnn05/guesthub.git
```

### Langkah 4.2: Masuk ke Folder Projek
```bash
cd guesthub
```

### Langkah 4.3: Jalankan Sistem dengan Docker Compose
Ketik perintah sakti berikut:
```bash
docker compose up -d --build
```

> **Penjelasan Proses:**
> * Docker akan otomatis mengunduh image PostgreSQL 17, Node 20, dan Nginx.
> * Database otomatis dibuat dan file `guesthub_backup.sql` otomatis di-import (tabel tamu & user langsung terisi).
> * Frontend di-build dan siap disajikan lewat Nginx.
> * Opsi `-d` berarti *Detached* (aplikasi berjalan di latar belakang tanpa mengunci terminal Anda).
> * Proses ini butuh waktu sekitar 1–3 menit tergantung kecepatan internet server.

---

## 5. Memastikan Aplikasi Berjalan dengan Benar

Setelah proses build selesai, pastikan semua kontainer menyala dengan baik.

### Langkah 5.1: Cek Status Kontainer
Ketik:
```bash
docker compose ps
```
**Hasil yang Diharapkan:**
Semua kontainer berstatus **`Up`** atau **`running`**:
* `guesthub_db` (Port 5432)
* `guesthub_backend` (Port 5000)
* `guesthub_frontend` (Port 8085 -> 80)

### Langkah 5.2: Uji Respon Lokal Server
Ketik di terminal server:
```bash
curl http://localhost:8085
```
Jika keluar teks kode HTML React (`<!doctype html>...`), berarti web server Nginx sudah aktif sempurna!

### Langkah 5.3: Buka dari Browser Laptop
Jika laptop Anda terhubung ke jaringan Wi-Fi/LAN kantor yang sama dengan server:
1. Buka Google Chrome di laptop.
2. Akses alamat:
   ```text
   http://IP_SERVER_DISHUB:8085
   ```
   *(Contoh: `http://192.168.1.50:8085`)*
3. Halaman Login **GuestHub** akan langsung tampil! Cobalah login menggunakan akun Anda (`admin1` / password Anda).

---

## 6. Koordinasi Subdomain .go.id dengan Tim IT

Setelah GuestHub dipastikan aktif di port `8085`, Anda tinggal meminta bantuan tim IT Dishub untuk menyambungkannya ke subdomain resmi dinas.

### Pesan yang Bisa Anda Kirim ke Tim IT:
> *"Halo Pak/Mas Tim IT, aplikasi GuestHub (Buku Tamu Digital) sudah berhasil dijalankan di server menggunakan Docker pada port lokal **8085**.*  
> *Mohon bantuannya untuk mengarahkan subdomain resmi (misal: **bukutamu.dishub.namadaerah.go.id**) sebagai **Reverse Proxy** ke port **http://127.0.0.1:8085** dan dipasangkan sertifikat SSL HTTPS. Terima kasih banyak!"*

### Referensi Konfigurasi untuk Tim IT (Nginx Utama Server Dishub):
Jika tim IT menanyakan konfigurasinya, Anda bisa memberikan referensi ini:
```nginx
server {
    listen 80;
    server_name bukutamu.dishub.namadaerah.go.id;

    # Redirect ke HTTPS jika SSL aktif
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

## 7. Menghubungkan DBeaver Laptop ke Database Server

Anda **tidak perlu** menginstal DBeaver di server. Anda bisa melihat dan mengelola isi database server langsung dari laptop:

1. Buka DBeaver di laptop Anda.
2. Klik tombol **New Database Connection** (ikon colokan listrik) ➡️ Pilih **PostgreSQL**.
3. Isi parameter koneksi:
   * **Host:** `IP_SERVER_DISHUB` (Contoh: `192.168.1.50`)
   * **Port:** `5432`
   * **Database:** `guesthub_db`
   * **Username:** `postgres`
   * **Password:** `[PASSWORD_DATABASE]` *(Password yang dikonfigurasi di file docker-compose.yml)*
4. Klik tombol **Test Connection**. Jika sukses, klik **Finish**.
5. Anda sekarang bisa membuka tabel `tamu` dan `users` di server langsung dari laptop!

---

## 8. Panduan Pemeliharaan & Update Kode di Masa Depan

Jika di kemudian hari Anda melakukan perubahan kode di laptop dan ingin memperbarui aplikasi di server:

1. **Di Laptop:**
   Simpan dan kirim kode baru ke GitHub:
   ```bash
   git add .
   git commit -m "Update fitur X"
   git push origin main
   ```

2. **Di Server CentOS:**
   Tarik pembaruan dan rebuild kontainer:
   ```bash
   cd guesthub
   git pull origin main
   docker compose up -d --build
   ```
   *(Data database dan foto tamu di folder `uploads` tidak akan hilang saat rebuild).*

3. **Perintah Cepat Lainnya:**
   * **Melihat log real-time jika ada error:**
     ```bash
     docker compose logs -f
     ```
   * **Mematikan sistem sementara:**
     ```bash
     docker compose down
     ```
   * **Menyalakan kembali:**
     ```bash
     docker compose up -d
     ```