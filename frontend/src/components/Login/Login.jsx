import { useState } from 'react';
import Swal from 'sweetalert2';
import { loginUser } from '../../api';
import './Login.css';

// Import logo dari folder assets
import logoDishub from '../../assets/guesthub2.png';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await loginUser(username, password);

      if (res.error) {
        // Notifikasi Gagal Login via SweetAlert2
        Swal.fire({
          icon: 'error',
          title: 'Gagal Login!',
          text: res.error,
          confirmButtonColor: '#2563eb'
        });
      } else {
        // Simpan token JWT dan data user ke localStorage
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));

        // Toast Notifikasi Berhasil
        Swal.fire({
          icon: 'success',
          title: 'Login Berhasil!',
          text: `Selamat datang kembali, ${res.user?.full_name || res.user?.username || 'User'}!`,
          timer: 1500,
          showConfirmButton: false
        });

        // Panggil callback jika ada
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(res.user);
          } else {
            window.location.reload();
          }
        }, 1500);
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Koneksi Gagal!',
        text: 'Tidak dapat terhubung ke server login.',
        confirmButtonColor: '#2563eb'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-card-accent"></div>
        <div className="login-card-content">
          <div className="login-header-icon">
            <img src={logoDishub} alt="Logo Dishub" className="login-logo-img" />
          </div>

          <h2 className="login-title">GuestHub</h2>
          <p className="login-subtitle">Sistem Buku Tamu Digital Dinas Perhubungan</p>
          <div className="login-security-badge">
            🔒 Portal Resmi Pelayanan Tamu Terenkripsi
          </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group-login">
            <label>Username</label>
            <input
              type="text"
              placeholder="Masukkan username Anda"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group-login">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-login-submit" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk ke Sistem'}
          </button>
        </form>
        </div>
      </div>

      <div className="login-footer-text">
        © {new Date().getFullYear()} GuestHub • Dinas Perhubungan
      </div>
    </div>
  );
}