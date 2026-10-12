#  Panduan Migrasi GuestHub ke Server Dinas Perhubungan (CentOS + Docker)

Panduan ini dibuat seringkas dan semudah mungkin untuk memindahkan projek **GuestHub** dari laptop Anda ke server **CentOS** milik Dinas Perhubungan.

---

## 📦 Berkas Docker yang Sudah Dibuat

1. [`backend/Dockerfile`](file:///d:/Alvnn/projek/guesthub/backend/Dockerfile) ➡️ Membungkus backend Express.js ke Node 20.
2. [`frontend/Dockerfile`](file:///d:/Alvnn/projek/guesthub/frontend/Dockerfile) ➡️ Mem-build React Vite dan menjalankannya dengan Nginx super cepat.
3. [`frontend/nginx.conf`](file:///d:/Alvnn/projek/guesthub/frontend/nginx.conf) ➡️ Mengatur routing halaman React dan otomatis meneruskan `/api/` & `/uploads/` ke backend.
4. [`docker-compose.yml`](file:///d:/Alvnn/projek/guesthub/docker-compose.yml) ➡️ Menjalankan Database PostgreSQL 17, Backend, dan Frontend sekaligus dalam satu perintah.
5. [`guesthub_backup.sql`](file:///d:/Alvnn/projek/guesthub/guesthub_backup.sql) ➡️ Otomatis di-import ke database saat container pertama kali menyala.

---

## 🛠️ Langkah-Langkah di Server CentOS

### Langkah 1: Pindahkan Folder Projek ke Server
Anda bisa memindahkan folder projek `guesthub` ke server Dishub dengan salah satu cara berikut:
* **Cara A (Pakai GitHub/GitLab):** Push projek ke repo Git, lalu di server lakukan:
  ```bash
  git clone <url-repo-anda>
  cd guesthub
  ```
* **Cara B (Upload File ZIP via WinSCP/FileZilla):**
  Kompres folder `guesthub` (tanpa folder `node_modules`), lalu upload ke server dan ekstrak.

---

### Langkah 2: Pastikan Docker & Docker Compose Sudah Terinstal di Server CentOS
Tanyakan ke tim IT Dishub apakah Docker sudah terpasang. Jika belum, instalasinya di CentOS sangat standar:
```bash
# Pastikan repository docker terpasang
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install docker dan plugin compose
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Nyalakan service docker
sudo systemctl start docker
sudo systemctl enable docker
```

---

### Langkah 3: Jalankan GuestHub (Hanya 1 Perintah!)
Masuk ke dalam folder `guesthub` di terminal server, lalu jalankan:

```bash
docker compose up -d --build
```

> **Apa yang terjadi otomatis?**
> 1. Database PostgreSQL akan menyala dan otomatis mengeksekusi file `guesthub_backup.sql` Anda (semua tabel dan data langsung terisi!).
> 2. Backend Express API dibangun dan menyala di background.
> 3. Frontend React dibuild dan disajikan oleh Nginx di port **8080**.

Untuk mengecek apakah semuanya sudah berjalan normal:
```bash
docker compose ps
```
Semua kontainer (`guesthub_db`, `guesthub_backend`, `guesthub_frontend`) akan berstatus **Up / running**.

---

## 🌐 Menghubungkan Subdomain `.go.id` (Serahkan ke Tim IT Dishub)

Setelah aplikasi menyala di port `8080`, Anda cukup menghubungi tim IT / Jaringan Dishub dengan pesan berikut:

> *"Halo Mas/Pak Tim IT, aplikasi GuestHub sudah aktif di server pada port lokal **8080**.*  
> *Mohon bantuannya untuk mengarahkan subdomain **(contoh: bukutamu.dishub.namadaerah.go.id)** sebagai Reverse Proxy ke **http://127.0.0.1:8080** serta dipasangkan sertifikat SSL HTTPS ya. Terima kasih banyak!"*

### Contoh Konfigurasi Nginx Server Utama Dishub (Untuk Referensi Tim IT):
Tim IT biasanya akan menambahkan blok ini di Nginx utama server mereka:
```nginx
server {
    listen 80;
    server_name bukutamu.dishub.namadaerah.go.id;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🗄️ Bagaimana Cara Cek Database Server Lewat DBeaver di Laptop?

Anda **tidak perlu** install DBeaver di server. Cukup buka DBeaver di laptop Anda:
1. Klik **New Database Connection** ➡️ pilih **PostgreSQL**.
2. **Host:** Masukkan IP Server Dishub (misal: `192.168.1.50` atau IP publik server).
3. **Port:** `5432`
4. **Database:** `guesthub_db`
5. **Username:** `postgres`
6. **Password:** `admin123`
7. Klik **Test Connection**. Anda bisa langsung mengelola database server dari laptop Anda seperti biasa!
*(Catatan: Pastikan firewall server mengizinkan akses ke port 5432 jika diakses dari jaringan lokal kantor).*

---

## ⏹️ Perintah Bermanfaat Lainnya di Server

* **Melihat log aplikasi secara langsung:**
  ```bash
  docker compose logs -f
  ```
* **Mematikan aplikasi:**
  ```bash
  docker compose down
  ```
* **Merestart aplikasi:**
  ```bash
  docker compose restart
  ```