const db = require('../db');
const fs = require('fs');
const path = require('path');

// Helper validasi format foto_url (mencegah path traversal dan input berbahaya)
const isValidFotoUrl = (url) => {
  if (!url) return true;
  return typeof url === 'string' && /^\/?uploads\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png)$/i.test(url) && !url.includes('..');
};

// 1. TAMBAH TAMU BARU (CREATE)
const createTamu = async (req, res) => {
  const { nama_tamu, instansi_asal, no_hp, tujuan_bidang, perihal, foto_url } = req.body;

  if (!nama_tamu || !instansi_asal || !no_hp || !tujuan_bidang || !perihal) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi!' });
  }

  if (nama_tamu.length > 150) {
    return res.status(400).json({ error: 'Nama tamu maksimal 150 karakter!' });
  }
  if (instansi_asal.length > 150) {
    return res.status(400).json({ error: 'Nama instansi maksimal 150 karakter!' });
  }
  if (no_hp.length > 20) {
    return res.status(400).json({ error: 'Nomor HP maksimal 20 digit!' });
  }
  if (tujuan_bidang.length > 100) {
    return res.status(400).json({ error: 'Tujuan bidang maksimal 100 karakter!' });
  }

  if (foto_url && !isValidFotoUrl(foto_url)) {
    return res.status(400).json({ error: 'Format foto_url tidak valid!' });
  }

  try {
    const result = await db.query(
      `INSERT INTO tamu (nama_tamu, instansi_asal, no_hp, tujuan_bidang, perihal, foto_url) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [nama_tamu, instansi_asal, no_hp, tujuan_bidang, perihal, foto_url || null]
    );

    res.status(201).json({
      message: 'Data tamu berhasil dicatat',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
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

  try {
    // 1. Ambil data tamu lama dari database terlebih dahulu
    const oldGuestResult = await db.query('SELECT foto_url FROM tamu WHERE id = $1', [id]);

    if (oldGuestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Data tamu tidak ditemukan' });
    }

    const oldFotoUrl = oldGuestResult.rows[0].foto_url;

    // 2. Update data tamu di database PostgreSQL
    const result = await db.query(
      `UPDATE tamu 
       SET nama_tamu = $1, instansi_asal = $2, no_hp = $3, tujuan_bidang = $4, perihal = $5, foto_url = COALESCE($6, foto_url)
       WHERE id = $7 
       RETURNING *`,
      [nama_tamu, instansi_asal, no_hp, tujuan_bidang, perihal, foto_url || null, id]
    );

    const updatedGuest = result.rows[0];

    // 3. Jika ada foto baru yang di-upload DAN foto lama berbeda dengan foto baru
    if (foto_url && oldFotoUrl && oldFotoUrl !== foto_url) {
      const oldFilename = path.basename(oldFotoUrl);
      const uploadsDir = path.resolve(path.join(__dirname, '../uploads'));
      const oldFilePath = path.resolve(path.join(uploadsDir, oldFilename));

      // Cek bahwa path file tetap di dalam folder uploads/ (anti path traversal)
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
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// 5. HAPUS DATA TAMU + PEMBERSIHAN FILE FOTO (DELETE & CLEANUP)
const deleteTamu = async (req, res) => {
  const { id } = req.params;

  try {
    // Hapus data tamu dari database PostgreSQL
    const result = await db.query('DELETE FROM tamu WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tamu tidak ditemukan' });
    }

    const deletedGuest = result.rows[0];

    // Pembersihan File Foto di Server jika foto_url ada
    if (deletedGuest.foto_url) {
      const filename = path.basename(deletedGuest.foto_url);
      const uploadsDir = path.resolve(path.join(__dirname, '../uploads'));
      const filePath = path.resolve(path.join(uploadsDir, filename));

      // Cek bahwa path file tetap di dalam folder uploads/ (anti path traversal)
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
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

module.exports = { createTamu, getAllTamu, updateTamu, deleteTamu };