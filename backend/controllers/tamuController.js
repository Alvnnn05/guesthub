const db = require('../db');
const fs = require('fs');
const path = require('path');
const { logAction } = require('../utils/auditLogger');

// Helper validasi format foto_url (mencegah path traversal dan input berbahaya)
const isValidFotoUrl = (url) => {
  if (!url) return true;
  return typeof url === 'string' && /^\/?uploads\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png)$/i.test(url) && !url.includes('..');
};

// 1. TAMBAH TAMU BARU (CREATE)
const createTamu = async (req, res) => {
  const { nama_tamu, instansi_asal, no_hp, tujuan_bidang, perihal, foto_url } = req.body;

  // Nama tamu, instansi asal, tujuan bidang, dan perihal wajib diisi. no_hp dan foto_url opsional.
  if (!nama_tamu || !instansi_asal || !tujuan_bidang || !perihal) {
    logAction(req, {
      action: 'TAMBAH_TAMU',
      status: 'FAILED',
      targetResource: 'tamu',
      description: 'Validasi gagal: Kolom wajib belum diisi lengkap'
    });
    return res.status(400).json({ error: 'Nama tamu, instansi asal, tujuan bidang, dan perihal wajib diisi!' });
  }

  if (nama_tamu.length > 150) {
    return res.status(400).json({ error: 'Nama tamu maksimal 150 karakter!' });
  }
  if (instansi_asal.length > 150) {
    return res.status(400).json({ error: 'Nama instansi maksimal 150 karakter!' });
  }
  if (no_hp && no_hp.length > 20) {
    return res.status(400).json({ error: 'Nomor HP maksimal 20 digit!' });
  }
  if (tujuan_bidang.length > 100) {
    return res.status(400).json({ error: 'Tujuan bidang maksimal 100 karakter!' });
  }

  if (foto_url && !isValidFotoUrl(foto_url)) {
    return res.status(400).json({ error: 'Format foto_url tidak valid!' });
  }

  const cleanedNoHp = no_hp && typeof no_hp === 'string' && no_hp.trim() !== '' ? no_hp.trim() : '';

  try {
    const result = await db.query(
      `INSERT INTO tamu (nama_tamu, instansi_asal, no_hp, tujuan_bidang, perihal, foto_url) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [nama_tamu, instansi_asal, cleanedNoHp, tujuan_bidang, perihal, foto_url || null]
    );

    const newGuest = result.rows[0];

    // Catat ke Audit Log (Data Minimization: Tanpa PII tamu)
    logAction(req, {
      action: 'TAMBAH_TAMU',
      status: 'SUCCESS',
      targetResource: 'tamu',
      targetId: newGuest.id,
      description: `Menambah data tamu (ID: ${newGuest.id})`
    });

    res.status(201).json({
      message: 'Data tamu berhasil dicatat',
      data: newGuest,
    });
  } catch (err) {
    console.error(err);
    logAction(req, {
      action: 'TAMBAH_TAMU',
      status: 'FAILED',
      targetResource: 'tamu',
      description: `Terjadi kesalahan database: ${err.message}`
    });
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// 2. AMBIL SEMUA DATA TAMU (READ)
const getAllTamu = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tamu ORDER BY waktu_masuk DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// 3. UPDATE DETAIL DATA TAMU (EDIT FORM)
const updateTamu = async (req, res) => {
  const { id } = req.params;
  const targetId = parseInt(id, 10);
  const { nama_tamu, instansi_asal, no_hp, tujuan_bidang, perihal, foto_url } = req.body;

  if (nama_tamu && nama_tamu.length > 150) {
    return res.status(400).json({ error: 'Nama tamu maksimal 150 karakter!' });
  }
  if (instansi_asal && instansi_asal.length > 150) {
    return res.status(400).json({ error: 'Nama instansi maksimal 150 karakter!' });
  }
  if (no_hp && no_hp.length > 20) {
    return res.status(400).json({ error: 'Nomor HP maksimal 20 digit!' });
  }
  if (tujuan_bidang && tujuan_bidang.length > 100) {
    return res.status(400).json({ error: 'Tujuan bidang maksimal 100 karakter!' });
  }

  if (foto_url && !isValidFotoUrl(foto_url)) {
    return res.status(400).json({ error: 'Format foto_url tidak valid!' });
  }

  const cleanedNoHp = typeof no_hp === 'string' ? no_hp.trim() : (no_hp || '');

  try {
    // 1. Ambil data tamu lama dari database untuk mendeteksi perubahan field
    const oldGuestResult = await db.query('SELECT * FROM tamu WHERE id = $1', [targetId]);

    if (oldGuestResult.rows.length === 0) {
      logAction(req, {
        action: 'EDIT_TAMU',
        status: 'FAILED',
        targetResource: 'tamu',
        targetId,
        description: 'Data tamu tidak ditemukan'
      });
      return res.status(404).json({ error: 'Data tamu tidak ditemukan' });
    }

    const oldGuest = oldGuestResult.rows[0];
    const oldFotoUrl = oldGuest.foto_url;

    // Deteksi field yang mengalami perubahan (Data Minimization: hanya nama field)
    const changedFields = [];
    if (nama_tamu && nama_tamu !== oldGuest.nama_tamu) changedFields.push('nama_tamu');
    if (instansi_asal && instansi_asal !== oldGuest.instansi_asal) changedFields.push('instansi_asal');
    if (no_hp !== undefined && cleanedNoHp !== (oldGuest.no_hp || '')) changedFields.push('no_hp');
    if (tujuan_bidang && tujuan_bidang !== oldGuest.tujuan_bidang) changedFields.push('tujuan_bidang');
    if (perihal && perihal !== oldGuest.perihal) changedFields.push('perihal');
    if (foto_url && foto_url !== oldGuest.foto_url) changedFields.push('foto_url');

    // 2. Update data tamu di database PostgreSQL
    const result = await db.query(
      `UPDATE tamu 
       SET nama_tamu = $1, instansi_asal = $2, no_hp = $3, tujuan_bidang = $4, perihal = $5, foto_url = COALESCE($6, foto_url)
       WHERE id = $7 
       RETURNING *`,
      [nama_tamu, instansi_asal, cleanedNoHp, tujuan_bidang, perihal, foto_url || null, targetId]
    );

    const updatedGuest = result.rows[0];

    // Catat ke Audit Log
    const desc = changedFields.length > 0
      ? `Edit tamu (ID: ${targetId}). Field diubah: [${changedFields.join(', ')}]`
      : `Edit tamu (ID: ${targetId})`;

    logAction(req, {
      action: 'EDIT_TAMU',
      status: 'SUCCESS',
      targetResource: 'tamu',
      targetId,
      description: desc
    });

    // 3. Jika ada foto baru yang di-upload DAN foto lama berbeda dengan foto baru
    if (foto_url && oldFotoUrl && oldFotoUrl !== foto_url) {
      const oldFilename = path.basename(oldFotoUrl);
      const uploadsDir = path.resolve(path.join(__dirname, '../uploads'));
      const oldFilePath = path.resolve(path.join(uploadsDir, oldFilename));

      if (oldFilePath.startsWith(uploadsDir)) {
        fs.access(oldFilePath, fs.constants.F_OK, (err) => {
          if (!err) {
            fs.unlink(oldFilePath, (unlinkErr) => {
              if (unlinkErr) {
                console.error('Gagal menghapus foto lama:', unlinkErr);
              } else {
                console.log(`Foto lama (${oldFilename}) berhasil dibersihkan saat edit data.`);
              }
            });
          }
        });
      }
    }

    res.json({ message: 'Data tamu berhasil diperbarui', data: updatedGuest });
  } catch (err) {
    console.error(err);
    logAction(req, {
      action: 'EDIT_TAMU',
      status: 'FAILED',
      targetResource: 'tamu',
      targetId,
      description: `Gagal memperbarui data tamu: ${err.message}`
    });
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// 4. HAPUS DATA TAMU + PEMBERSIHAN FILE FOTO (DELETE & CLEANUP)
const deleteTamu = async (req, res) => {
  const { id } = req.params;
  const targetId = parseInt(id, 10);

  try {
    // Hapus data tamu dari database PostgreSQL
    const result = await db.query('DELETE FROM tamu WHERE id = $1 RETURNING *', [targetId]);

    if (result.rows.length === 0) {
      logAction(req, {
        action: 'HAPUS_TAMU',
        status: 'FAILED',
        targetResource: 'tamu',
        targetId,
        description: 'Data tamu tidak ditemukan'
      });
      return res.status(404).json({ error: 'Data tamu tidak ditemukan' });
    }

    const deletedGuest = result.rows[0];

    // Catat ke Audit Log
    logAction(req, {
      action: 'HAPUS_TAMU',
      status: 'SUCCESS',
      targetResource: 'tamu',
      targetId,
      description: `Menghapus baris tamu (ID: ${targetId})`
    });

    // Pembersihan File Foto di Server jika foto_url ada
    if (deletedGuest.foto_url) {
      const filename = path.basename(deletedGuest.foto_url);
      const uploadsDir = path.resolve(path.join(__dirname, '../uploads'));
      const filePath = path.resolve(path.join(uploadsDir, filename));

      if (filePath.startsWith(uploadsDir)) {
        fs.access(filePath, fs.constants.F_OK, (err) => {
          if (!err) {
            fs.unlink(filePath, (unlinkErr) => {
              if (unlinkErr) {
                console.error('Gagal menghapus file foto dari disk:', unlinkErr);
              } else {
                console.log(`File foto sampah (${filename}) berhasil dibersihkan dari folder uploads.`);
              }
            });
          }
        });
      }
    }

    res.json({ message: 'Data tamu dan file foto berhasil dihapus' });
  } catch (err) {
    console.error(err);
    logAction(req, {
      action: 'HAPUS_TAMU',
      status: 'FAILED',
      targetResource: 'tamu',
      targetId,
      description: `Gagal menghapus tamu: ${err.message}`
    });
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

module.exports = { createTamu, getAllTamu, updateTamu, deleteTamu };
