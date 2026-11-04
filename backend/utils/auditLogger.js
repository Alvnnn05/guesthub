const db = require('../db');

/**
 * Helper untuk mencatat aktivitas sistem (Audit Log) secara asinkron, terisolasi, dan non-blocking.
 * Sesuai panduan audit-log-specification.md:
 * - Data Minimization: Tidak mencatat PII tamu (nama, foto, nomor HP utuh).
 * - Zero-Secret: Dilarang keras mencatat password, hash, atau token.
 * - Fail-Safe: Kesalahan penulisan log tidak menggagalkan transaksi bisnis utama.
 * 
 * @param {import('express').Request|null} req - Objek Express Request (untuk IP, User-Agent, user sesi)
 * @param {Object} options
 * @param {string} options.action - Kode aksi (LOGIN, LOGOUT, TAMBAH_TAMU, dll)
 * @param {'SUCCESS'|'FAILED'|'DENIED'} [options.status='SUCCESS'] - Status hasil eksekusi
 * @param {string|null} [options.targetResource=null] - Resource target ('tamu', 'user', 'session', 'export')
 * @param {number|null} [options.targetId=null] - ID baris data yang disentuh
 * @param {string|null} [options.description=null] - Keterangan ringkas (misal field yang diubah)
 * @param {string|null} [options.attemptedUsername=null] - Khusus aksi LOGIN: username yang dicoba
 * @param {number|null} [options.userId=null] - Override user_id jika req.user belum terpasang
 * @param {string|null} [options.role=null] - Override role jika req.user belum terpasang
 */
const logAction = (req, {
  action,
  status = 'SUCCESS',
  targetResource = null,
  targetId = null,
  description = null,
  attemptedUsername = null,
  userId = null,
  role = null
}) => {
  // Eksekusi secara non-blocking di event loop berikutnya
  setImmediate(async () => {
    try {
      const finalUserId = userId !== null ? userId : (req?.user?.id || null);
      const finalRole = role !== null ? role : (req?.user?.role || null);
      
      // Ambil IP asli klien dari reverse-proxy (prioritaskan X-Forwarded-For pertama)
      const rawForwarded = req?.headers ? req.headers['x-forwarded-for'] : null;
      const clientIpFromHeader = rawForwarded ? String(rawForwarded).split(',')[0].trim() : null;
      const ipAddress = clientIpFromHeader || req?.headers?.['x-real-ip'] || req?.ip || req?.connection?.remoteAddress || null;
      
      const userAgent = req?.headers ? req.headers['user-agent'] : null;

      // Sanitasi tambahan: Bersihkan string description jika ada data mencurigakan
      let sanitizedDescription = description;
      if (typeof sanitizedDescription === 'string') {
        sanitizedDescription = sanitizedDescription
          .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
          .replace(/password[:=]\s*[^\s,]+/gi, 'password=[REDACTED]');
      }

      await db.query(
        `INSERT INTO public.audit_logs 
          (user_id, role, attempted_username, action, status, target_resource, target_id, description, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          finalUserId,
          finalRole ? String(finalRole).toUpperCase() : null,
          attemptedUsername,
          action,
          status,
          targetResource,
          targetId ? parseInt(targetId, 10) : null,
          sanitizedDescription,
          ipAddress,
          userAgent
        ]
      );
    } catch (err) {
      // Prinsip Fail-Safe: Gagal menulis log hanya dicetak ke error console, tidak menggagalkan fungsi utama
      console.error('[AUDIT-LOG-ERROR]: Gagal mencatat log ke database:', err.message);
    }
  });
};

module.exports = { logAction };

