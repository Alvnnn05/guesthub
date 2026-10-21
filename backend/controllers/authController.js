const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Helper validasi kekuatan & panjang password
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return 'Password wajib diisi!';
  }
  if (password.length < 6) {
    return 'Password minimal harus terdiri dari 6 karakter!';
  }
  if (password.length > 100) {
    return 'Password terlalu panjang (maksimal 100 karakter)!';
  }
  return null;
};

// REGISTER
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
    res.status(201).json({ message: 'User berhasil terdaftar', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username sudah digunakan!' });
    }
    res.status(500).json({ error: 'Gagal mendaftarkan user' });
  }
};

// LOGIN
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const user = result.rows[0];
    const hashFromDb = user.password_hash;

    if (!hashFromDb) {
      return res.status(400).json({ 
        error: 'Akun ini belum memiliki password yang terdaftar di database.' 
      });
    }

    const isMatch = await bcrypt.compare(password, hashFromDb);
    if (!isMatch) {
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

// UPDATE PROFILE
const updateProfile = async (req, res) => {
  const { id, full_name, password } = req.body;
  const userId = req.user ? req.user.id : id;

  if (!userId) {
    return res.status(400).json({ error: 'User ID tidak ditemukan!' });
  }

  try {
    let queryText = 'UPDATE users SET full_name = $1 WHERE id = $2 RETURNING id, username, full_name, role';
    let queryParams = [full_name, userId];

    if (password && password.trim() !== '') {
      const passError = validatePassword(password);
      if (passError) {
        return res.status(400).json({ error: passError });
      }
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      queryText = 'UPDATE users SET full_name = $1, password_hash = $2 WHERE id = $3 RETURNING id, username, full_name, role';
      queryParams = [full_name, hashedPassword, userId];
    }

    const result = await db.query(queryText, queryParams);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    res.json({
      message: 'Profil berhasil diperbarui',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Error update profile:', err);
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

// DELETE USER (Dengan Proteksi Anti Self-Deletion & Anti Admin-Lockout)
const deleteUser = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;

  // 1. Cegah Admin menghapus akunnya sendiri yang sedang aktif
  if (parseInt(id, 10) === parseInt(currentUserId, 10)) {
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
        return res.status(400).json({ 
          error: 'Tidak dapat menghapus user ini! Sistem harus memiliki minimal satu akun Admin aktif.' 
        });
      }
    }

    // 4. Eksekusi penghapusan user
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: `User "${targetUser.username}" berhasil dihapus` });
  } catch (err) {
    console.error(err);
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
      return res.status(404).json({ error: 'Username tidak ditemukan!' });
    }

    res.json({ message: 'Password berhasil diperbarui! Silakan coba login.' });
  } catch (err) {
    console.error('Error reset password:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

module.exports = {
  register,
  login,
  updateProfile,
  getAllUsers,
  deleteUser,
  resetPassword
};