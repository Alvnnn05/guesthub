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
const auditRoutes = require('./routes/auditRoutes');
const { verifyToken } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Aktifkan trust proxy agar Express dapat membaca IP asli klien di balik reverse proxy Nginx
const trustProxyEnv = process.env.TRUST_PROXY;
app.set(
  'trust proxy',
  trustProxyEnv
    ? (trustProxyEnv === 'true' ? true : (isNaN(trustProxyEnv) ? trustProxyEnv : parseInt(trustProxyEnv, 10)))
    : 1
);

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
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8085,http://127.0.0.1:8085')
  .split(',')
  .map(origin => origin.trim());

// Helper validasi origin: Mendukung domain whitelist & rentang IP privat LAN (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
const isOriginAllowed = (origin) => {
  if (!origin) return true; // Request internal server-to-server / non-browser
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return true;

  try {
    const { hostname } = new URL(origin);
    // Otomatis izinkan localhost dan IP private LAN untuk akses HP di Wi-Fi lokal
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
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
app.use('/uploads', verifyToken, express.static(uploadsDir, {
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
app.use('/api/audit-logs', auditRoutes);

// Route Health Check Utama
app.get('/', (req, res) => {
  res.send('API GuestHub Backend Running!');
});

// 2. HANDLING ROUTE 404 (JIKA ENDPOINT TIDAK DITEMUKAN)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

// 3. GLOBAL ERROR HANDLER (MENCEGAH SERVER CRASH & KEBOCORAN INFO)
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    error: 'Terjadi kesalahan internal pada server',
    ...(isDev && { message: err.message })
  });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
