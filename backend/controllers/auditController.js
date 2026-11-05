const db = require('../db');
const { logAction } = require('../utils/auditLogger');

/**
 * Controller untuk mengelola Audit Log
 * Catatan Keamanan (audit-log-specification.md - Bagian C):
 * - Hanya role ADMIN yang memiliki akses membaca log.
 * - Sifat Append-Only: Tidak ada endpoint PUT/PATCH/DELETE untuk audit log.
 */

// 1. AMBIL DAFTAR AUDIT LOG DENGAN FILTER & PAGINATION (READ ONLY - ADMIN)
const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { action, status, startDate, endDate, search } = req.query;

    const conditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Filter berdasarkan jenis aksi
    if (action && action.trim() !== '' && action.toUpperCase() !== 'ALL') {
      conditions.push(`a.action = $${paramIndex++}`);
      queryParams.push(action.trim().toUpperCase());
    }

    // Filter berdasarkan status (SUCCESS / FAILED / DENIED)
    if (status && status.trim() !== '' && status.toUpperCase() !== 'ALL') {
      conditions.push(`a.status = $${paramIndex++}`);
      queryParams.push(status.trim().toUpperCase());
    }

    // Filter rentang tanggal
    if (startDate && startDate.trim() !== '') {
      conditions.push(`a.created_at::date >= $${paramIndex++}::date`);
      queryParams.push(startDate.trim());
    }
    if (endDate && endDate.trim() !== '') {
      conditions.push(`a.created_at::date <= $${paramIndex++}::date`);
      queryParams.push(endDate.trim());
    }

    // Pencarian kata kunci (deskripsi, attempted_username, atau nama user)
    if (search && search.trim() !== '') {
      conditions.push(`(
        a.description ILIKE $${paramIndex} 
        OR a.attempted_username ILIKE $${paramIndex} 
        OR u.username ILIKE $${paramIndex}
        OR u.full_name ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Hitung total records yang sesuai filter
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM public.audit_logs a
      LEFT JOIN public.users u ON a.user_id = u.id
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0].total, 10);

    // Ambil data log terpaginasi
    const dataQuery = `
      SELECT 
        a.id,
        a.created_at,
        a.user_id,
        COALESCE(u.username, a.attempted_username, '-') AS actor_username,
        COALESCE(u.full_name, '-') AS actor_name,
        COALESCE(a.role, u.role, '-') AS role,
        a.attempted_username,
        a.action,
        a.status,
        a.target_resource,
        a.target_id,
        a.description,
        a.ip_address,
        a.user_agent
      FROM public.audit_logs a
      LEFT JOIN public.users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    queryParams.push(limit, offset);

    const dataResult = await db.query(dataQuery, queryParams);

    // Hitung ringkasan statistik (Summary Cards)
    const summaryQuery = `
      SELECT 
        COUNT(*) AS total_all,
        COUNT(*) FILTER (WHERE status = 'SUCCESS') AS total_success,
        COUNT(*) FILTER (WHERE status IN ('FAILED', 'DENIED')) AS total_issues,
        COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS today_count
      FROM public.audit_logs;
    `;
    const summaryResult = await db.query(summaryQuery);
    const summaryRow = summaryResult.rows[0] || {};

    res.json({
      logs: dataResult.rows,
      pagination: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit) || 1
      },
      stats: {
        totalAll: parseInt(summaryRow.total_all, 10) || 0,
        totalSuccess: parseInt(summaryRow.total_success, 10) || 0,
        totalIssues: parseInt(summaryRow.total_issues, 10) || 0,
        todayCount: parseInt(summaryRow.today_count, 10) || 0
      }
    });
  } catch (err) {
    console.error('Error mengambil audit logs:', err);
    res.status(500).json({ error: 'Gagal mengambil data audit log' });
  }
};

// 2. SINYAL PENCATATAN EKSPOR EXCEL (Dipanggil oleh browser sebelum file didownload)
const recordExportSignal = async (req, res) => {
  try {
    const { filter } = req.body;
    const filterText = filter && typeof filter === 'string' ? filter : 'Keseluruhan';

    logAction(req, {
      action: 'EXPORT_EXCEL',
      status: 'SUCCESS',
      targetResource: 'export',
      description: `Ekspor data Excel (Filter: ${filterText})`
    });

    res.json({ message: 'Sinyal ekspor berhasil dicatat ke audit log.' });
  } catch (err) {
    console.error('Error mencatat sinyal export:', err);
    res.status(500).json({ error: 'Gagal mencatat sinyal export' });
  }
};

module.exports = {
  getAuditLogs,
  recordExportSignal
};
