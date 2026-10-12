const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak! Token tidak ditemukan.' });
  }

  try {
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
    return res.status(403).json({
      error: 'Akses ditolak! Fitur ini hanya dapat diakses oleh Admin.'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  verifyAdmin
};