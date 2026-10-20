const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  createTamu,
  getAllTamu,
  updateTamu,
  deleteTamu,
} = require('../controllers/tamuController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware'); // Import dengan destructuring {}

// 1. Konfigurasi Multer Aman (Whitelist Ekstensi & MIME, Anti Stored-XSS)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    // Ekstensi dikunci secara ketat hanya .jpg atau .png berdasarkan MIME type yang valid
    let ext = '.jpg';
    if (file.mimetype === 'image/png') {
      ext = '.png';
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'tamu-' + uniqueSuffix + ext);
  }
});

// Filter tipe file & batas ukuran maksimal 5MB di level backend (Security)
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const rawExt = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', ''];

    // Tolak file jika MIME bukan image atau ekstensi mencurigakan (mencegah HTML/SVG/script injection)
    if (allowedMimeTypes.includes(file.mimetype) && allowedExts.includes(rawExt)) {
      return cb(null, true);
    }
    cb(new Error('Format file ditolak! Hanya file gambar JPG, JPEG, atau PNG asli yang diperbolehkan.'));
  }
});

// 2. Upload Foto & Tambah Tamu (Terproteksi JWT)
router.post('/upload', verifyToken, (req, res, next) => {
  upload.single('foto')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
    }

    // Mengembalikan path relatif agar dinamis di localhost maupun server produksi
    const relativeUrl = `/uploads/${req.file.filename}`;
    res.json({ foto_url: relativeUrl });
  });
});

// Protected Routes (Wajib Token JWT Valid)
router.post('/', verifyToken, createTamu);
router.get('/', verifyToken, getAllTamu);
router.put('/:id', verifyToken, updateTamu);
router.delete('/:id', verifyToken, verifyAdmin, deleteTamu);

module.exports = router;