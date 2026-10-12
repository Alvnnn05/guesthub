const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs'); // Ditambahkan untuk penanganan file system
require('dotenv').config();

// Validasi keberadaan JWT_SECRET wajib di level inisialisasi server
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET belum dikonfigurasi di file .env!');
  process.exit(1);
}

// Import Routes
const authRoutes = require('./routes/authRoutes');
const tamuRoutes = require('./routes/tamuRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. MEMASTIKAN FOLDER UPLOADS TERBUAT OTOMATIS
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 2. HTTP SECURITY HEADERS (HELMET)
// crossOriginResourcePolicy diset cross-origin agar gambar di /uploads dapat dimuat oleh frontend di beda origin/port
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 3. WHITELIST CORS (Mencegah Akses Tidak Diotorisasi dari Domain Asing)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (seperti tools internal, server-to-server) atau domain yang terdaftar di whitelist
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Akses ditolak: Domain tidak diizinkan oleh kebijakan CORS.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' })); // Support data foto berukuran besar/base64
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Akses folder uploads secara publik dengan proteksi header keamanan (Anti MIME-sniffing & Stored XSS)
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'");
  }
}));

// Import Middleware
const { generalLimiter } = require('./middleware/rateLimiter');

// Routes Endpoints (Dengan Proteksi DoS Rate Limiting)
app.use('/api', generalLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/tamu', tamuRoutes);

// Route Health Check Utama
app.get('/', (req, res) => {
  res.send('API GuestHub Backend Running!');
});

// 2. HANDLING ROUTE 404 (JIKA ENDPOINT TIDAK DITEMUKAN)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

// 3. GLOBAL ERROR HANDLER (MENCEGAH SERVER CRASH)
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({
    error: 'Terjadi kesalahan internal pada server',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});