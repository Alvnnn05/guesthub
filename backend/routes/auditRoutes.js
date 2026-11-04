const express = require('express');
const router = express.Router();
const { getAuditLogs, recordExportSignal } = require('../controllers/auditController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// 1. Ambil riwayat audit log (Khusus Role Admin)
router.get('/', verifyToken, verifyAdmin, getAuditLogs);

// 2. Pencatatan sinyal ekspor Excel dari browser (User login: Admin / Resepsionis)
router.post('/export-signal', verifyToken, recordExportSignal);

module.exports = router;

