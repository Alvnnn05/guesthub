const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { logAction } = require('../utils/auditLogger');

// Helper validasi kekuatan & panjang password (Minimal 8 karakter, kombinasi huruf & angka)
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return 'Password wajib diisi!';
  }
  if (password.length < 8) {
    return 'Password minimal harus terdiri dari 8 karakter!';
  }
  if (password.length > 100) {
    return 'Password terlalu panjang (maksimal 100 karakter)!';
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password harus mengandung kombinasi huruf dan angka!';
  }
  return null;
};

// REGISTER (TAMBAH_USER)
const register = async (req, res) => {
  const { username, password, full_name, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi!' });
  }

  // Validasi kekuatan password
  const passError = validatePassword(password);
  if (passError) {
    return res.status(400).json({ error: passError });
  }

  // Validasi whitelist role
  const allowedRoles = ['ADMIN', 'RESEPSIONIS'];
  const userRole = (role || 'RESEPSIONIS').toUpperCase();
  if (!allowedRoles.includes(userRole)) {
    return res.status(400).json({ error: 'Role tidak valid! Hanya diperbolehkan ADMIN atau RESEPSIONIS.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Menggunakan kolom password_hash sesuai tabel PostgreSQL
    const result = await db.query(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, role',
      [username.trim(), hashedPassword, full_name ? full_name.trim() : null, userRole]
    );

    const newUser = result.rows[0];

    // Catat ke Audit Log
    logAction(req, {
      action: 'TAMBAH_USER',
      status: 'SUCCESS',
      targetResource: 'user',
      targetId: newUser.id,
      description: `Membuat akun user baru (ID: ${newUser.id}, Role: ${userRole})`
    });

    res.status(201).json({ message: 'User berhasil terdaftar', user: newUser });
  } catch (err) {
    console.error(err);
    const isDuplicate = err.code === '23505';

    logAction(req, {
      action: 'TAMBAH_USER',
      status: 'FAILED',
      targetResource: 'user',
      description: `Gagal membuat user baru: ${isDuplicate ? 'Username sudah digunakan' : 'Kesalahan server'}`
    });

    if (isDuplicate) {
      return res.status(400).json({ error: 'Username sudah digunakan!' });
    }
    res.status(500).json({ error: 'Gagal mendaftarkan user' });
  }
};

// LOGIN
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    logAction(req, {
      action: 'LOGIN',
      status: 'FAILED',
      attemptedUsername: username ? String(username).trim() : null,
      description: 'Username atau password kosong'
    });
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  const cleanUsername = String(username).trim();

  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [cleanUsername]);
    if (result.rows.length === 0) {
      logAction(req, {
        action: 'LOGIN',
        status: 'FAILED',
        attemptedUsername: cleanUsername,
        description: 'Username tidak ditemukan'
      });
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const user = result.rows[0];
    const hashFromDb = user.password_hash;

    if (!hashFromDb) {
      logAction(req, {
        action: 'LOGIN',
        status: 'FAILED',
        attemptedUsername: cleanUsername,
        userId: user.id,
        role: user.role,
        description: 'Akun belum memiliki password di database'
      });
      return res.status(400).json({ 
        error: 'Akun ini belum memiliki password yang terdaftar di database.' 
      });
    }

    const isMatch = await bcrypt.compare(password, hashFromDb);
    if (!isMatch) {
      logAction(req, {
        action: 'LOGIN',
        status: 'FAILED',
        attemptedUsername: cleanUsername,
        userId: user.id,
        role: user.role,
        description: 'Password tidak cocok'
      });
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        full_name: user.full_name || 'User' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Audit Log Login Sukses
    logAction(req, {
      action: 'LOGIN',
      status: 'SUCCESS',
      attemptedUsername: cleanUsername,
      userId: user.id,
      role: user.role,
      description: 'Login berhasil'
    });

    res.json({
      message: 'Login berhasil',
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        full_name: user.full_name || 'User', 
        role: user.role 
      }
    });
  } catch (err) {
    console.error('Error saat login:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// UPDATE PROFILE (GANTI_PROFIL)
const updateProfile = async (req, res) => {
  const { full_name, password } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Akses ditolak! Sesi login tidak valid atau kedaluwarsa.' });
  }

  try {
    let queryText = 'UPDATE users SET full_name = $1 WHERE id = $2 RETURNING id, username, full_name, role';
    let queryParams = [full_name, userId];
    let changedPassword = false;

    if (password && password.trim() !== '') {
      const passError = validatePassword(password);
      if (passError) {
        return res.status(400).json({ error: passError });
      }
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      changedPassword = true;

      queryText = 'UPDATE users SET full_name = $1, password_hash = $2 WHERE id = $3 RETURNING id, username, full_name, role';
      queryParams = [full_name, hashedPassword, userId];
    }

    const result = await db.query(queryText, queryParams);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Catat ke Audit Log
    const changedFields = changedPassword ? '[full_name, password]' : '[full_name]';
    logAction(req, {
      action: 'GANTI_PROFIL',
      status: 'SUCCESS',
      targetResource: 'user',
      targetId: userId,
      description: `Perubahan profil akun. Field diubah: ${changedFields}`
    });

    res.json({
      message: 'Profil berhasil diperbarui',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Error update profile:', err);
    logAction(req, {
      action: 'GANTI_PROFIL',
      status: 'FAILED',
      targetResource: 'user',
      targetId: userId,
      description: `Gagal memperbarui profil: ${err.message}`
    });
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// GET ALL USERS
const getAllUsers = async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, full_name, role, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data user' });
  }
};

// DELETE USER (HAPUS_USER)
const deleteUser = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;
  const targetId = parseInt(id, 10);

  // 1. Cegah Admin menghapus akunnya sendiri yang sedang aktif
  if (targetId === parseInt(currentUserId, 10)) {
    logAction(req, {
      action: 'HAPUS_USER',
      status: 'DENIED',
      targetResource: 'user',
      targetId,
      description: 'Ditolak: Mencoba menghapus akun sendiri saat sedang login'
    });
    return res.status(400).json({ 
      error: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang login!' 
    });
  }

  try {
    // 2. Cek apakah user yang akan dihapus ada di database
    const targetUserResult = await db.query('SELECT id, username, role FROM users WHERE id = $1', [id]);
    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    const targetUser = targetUserResult.rows[0];

    // 3. Jika target adalah Admin, pastikan masih ada minimal 1 Admin lain yang tersisa (Anti Lockout)
    if (targetUser.role?.toLowerCase() === 'admin') {
      const adminCountResult = await db.query(
        "SELECT COUNT(*) FROM users WHERE LOWER(role) = 'admin'"
      );
      const totalAdmin = parseInt(adminCountResult.rows[0].count, 10);
      if (totalAdmin <= 1) {
        logAction(req, {
          action: 'HAPUS_USER',
          status: 'DENIED',
          targetResource: 'user',
          targetId,
          description: 'Ditolak: Mencoba menghapus admin terakhir di sistem'
        });
        return res.status(400).json({ 
          error: 'Tidak dapat menghapus user ini! Sistem harus memiliki minimal satu akun Admin aktif.' 
        });
      }
    }

    // 4. Eksekusi penghapusan user
    await db.query('DELETE FROM users WHERE id = $1', [id]);

    logAction(req, {
      action: 'HAPUS_USER',
      status: 'SUCCESS',
      targetResource: 'user',
      targetId,
      description: `Menghapus akun user (ID: ${id})`
    });

    res.json({ message: `User "${targetUser.username}" berhasil dihapus` });
  } catch (err) {
    console.error(err);
    logAction(req, {
      action: 'HAPUS_USER',
      status: 'FAILED',
      targetResource: 'user',
      targetId,
      description: `Gagal menghapus user: ${err.message}`
    });
    res.status(500).json({ error: 'Gagal menghapus user' });
  }
};

// RESET PASSWORD USER
const resetPassword = async (req, res) => {
  const { username, newPassword } = req.body;

  if (!username || !newPassword) {
    return res.status(400).json({ error: 'Username dan password baru wajib diisi!' });
  }

  // Validasi kekuatan password baru
  const passError = validatePassword(newPassword);
  if (passError) {
    return res.status(400).json({ error: passError });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await db.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username',
      [hashedPassword, username]
    );

    if (result.rows.length === 0) {
      logAction(req, {
        action: 'RESET_PASSWORD',
        status: 'FAILED',
        targetResource: 'user',
        description: 'Reset password gagal: Username tidak ditemukan'
      });
      return res.status(404).json({ error: 'Username tidak ditemukan!' });
    }

    const updatedUser = result.rows[0];

    logAction(req, {
      action: 'RESET_PASSWORD',
      status: 'SUCCESS',
      targetResource: 'user',
      targetId: updatedUser.id,
      description: `Reset password akun (ID: ${updatedUser.id}). Password baru diacak.`
    });

    res.json({ message: 'Password berhasil diperbarui! Silakan coba login.' });
  } catch (err) {
    console.error('Error reset password:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// LOGOUT (Mencabut masa aktif Token JWT di server & mencatat event)
const logout = async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(400).json({ error: 'Token tidak ditemukan' });
  }

  const isAutoIdle = req.body?.reason === 'idle' || req.query?.reason === 'idle';
  const action = isAutoIdle ? 'LOGOUT_AUTO_IDLE' : 'LOGOUT';
  const description = isAutoIdle 
    ? 'Sesi diakhiri otomatis (idle timeout)' 
    : 'Logout manual melalui tombol sidebar';

  try {
    const decoded = jwt.decode(token);
    const expiresAt = decoded && decoded.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 8 * 60 * 60 * 1000);

    await db.query(
      'INSERT INTO revoked_tokens (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING',
      [token, expiresAt]
    );

    // Pembersihan otomatis berkala token yang sudah kedaluwarsa
    db.query('DELETE FROM revoked_tokens WHERE expires_at < CURRENT_TIMESTAMP').catch(() => {});

    // Catat ke Audit Log
    logAction(req, {
      action,
      status: 'SUCCESS',
      targetResource: 'session',
      userId: decoded?.id || req.user?.id || null,
      role: decoded?.role || req.user?.role || null,
      description
    });

    res.json({ message: 'Logout berhasil, sesi telah dinonaktifkan di server.' });
  } catch (err) {
    console.error('Error saat logout:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server saat logout' });
  }
};

module.exports = {
  logout,
  register,
  login,
  updateProfile,
  getAllUsers,
  deleteUser,
  resetPassword
};
