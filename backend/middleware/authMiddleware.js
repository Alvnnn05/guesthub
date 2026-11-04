const jwt = require('jsonwebtoken');
const db = require('../db');
const { logAction } = require('../utils/auditLogger');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak! Token tidak ditemukan.' });
  }

  try {
    // 1. Cek apakah token sudah dicabut (di-logout)
    const checkRevoked = await db.query(
      'SELECT 1 FROM revoked_tokens WHERE token = $1 LIMIT 1',
      [token]
    );
    if (checkRevoked.rows.length > 0) {
      return res.status(401).json({ error: 'Sesi Anda telah berakhir. Silakan login kembali.' });
    }

    // 2. Verifikasi keaslian token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token tidak valid atau sudah kedaluwarsa!' });
  }
};

// Pengecekan Khusus Hak Akses Role Admin
const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role?.toLowerCase() !== 'admin') {
    let attemptedAction = 'AKSES_ADMIN';
    if (req.method === 'DELETE' && req.baseUrl?.includes('tamu')) attemptedAction = 'HAPUS_TAMU';
    else if (req.method === 'DELETE' && req.baseUrl?.includes('auth')) attemptedAction = 'HAPUS_USER';
    else if (req.baseUrl?.includes('audit-logs')) attemptedAction = 'LIHAT_AUDIT_LOG';

    logAction(req, {
      action: attemptedAction,
      status: 'DENIED',
      description: 'Akses ditolak: Membutuhkan role Admin'
    });

    return res.status(403).json({
      error: 'Akses ditolak! Fitur ini hanya dapat diakses oleh Admin.'
    });
  }
  return next();
};

module.exports = {
  verifyToken,
  verifyAdmin
};
