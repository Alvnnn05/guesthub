const rateLimit = require('express-rate-limit');

// 1. Limiter Khusus Login (Proteksi Brute-Force Password)
// Membatasi maksimal 5 percobaan login gagal per IP dalam 15 menit
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // Maksimal 5 percobaan gagal
  skipSuccessfulRequests: true, // Login yang sukses tidak dihitung
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Nonaktifkan header usang X-RateLimit-*
  message: {
    error: 'Terlalu banyak percobaan login gagal dari perangkat Anda. Silakan coba lagi setelah 15 menit demi keamanan akun.'
  }
});

// 2. Limiter Khusus Reset Password
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Batas percobaan reset password tercapai. Silakan coba lagi setelah 15 menit.'
  }
});

// 3. Limiter Umum API (Proteksi DoS / Request Flooding)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // 300 request per 15 menit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Terlalu banyak permintaan ke server. Silakan perlambat akses Anda.'
  }
});

module.exports = {
  loginLimiter,
  resetPasswordLimiter,
  generalLimiter
};
