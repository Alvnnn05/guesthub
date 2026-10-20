import { useState } from 'react';
import Swal from 'sweetalert2';
import { loginUser } from '../../api';
import logoGuestHub from '../../assets/guesthub.png';
import './Login.css';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await loginUser(username, password);

      if (res.error) {
        Swal.fire({
          icon: 'error',
          title: 'Login gagal',
          text: res.error || 'Username atau password salah. Periksa lalu coba lagi.',
          confirmButtonText: 'Coba lagi'
        });
      } else {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));

        Swal.fire({
          icon: 'success',
          title: 'Login berhasil',
          text: `Selamat datang, ${res.user?.full_name || res.user?.username || 'User'}. Mengalihkan ke dashboard...`,
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false
        });

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
        confirmButtonColor: '#1a44b7'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Swal.fire({
      icon: 'info',
      title: 'Lupa Password?',
      html: '<p style="color:#64748b; font-size: 0.95rem;">Silakan hubungi admin untuk mereset passwod akun Anda.</p>',
      confirmButtonText: 'Mengerti',
      confirmButtonColor: '#1a44b7'
    });
  };

  return (
    <div className="login-split-page">
      {/* ==========================================
          HEADER HERO BANNER KHUSUS MOBILE & TABLET
          ========================================== */}
      <div className="login-mobile-header">
        <div className="login-brand-badge">
          <img src={logoGuestHub} alt="Logo GuestHub" className="brand-badge-img" />
        </div>
        <span className="login-brand-title">GuestHub</span>
        <h1 className="login-mobile-headline">
          Catat Setiap Tamu,<br />GuestHub.
        </h1>
        <p className="login-mobile-subheadline">
          Sistem buku tamu digital Dinas Perhubungan Kabupaten Ponorogo
        </p>
      </div>

      {/* ==========================================
          SISI KIRI: HERO PANEL KHUSUS DESKTOP (> 1024px)
          ========================================== */}
      <div className="login-hero-panel desktop-only">
        <div className="login-hero-top">
          <div className="brand-logo-box">
            <img src={logoGuestHub} alt="Logo GuestHub" className="brand-g-icon-img" />
            <span className="brand-name-text">GuestHub</span>
          </div>
        </div>

        <div className="login-hero-center">
          <h1 className="hero-headline">
            GuestHub,<br />Catat Setiap Tamu.
          </h1>
          <p className="hero-subheadline">
            Sistem buku tamu digital Dinas Perhubungan Kabupaten Ponorogo.
          </p>
        </div>

        <div className="login-hero-bottom">
          <p className="hero-copyright">
            © {new Date().getFullYear()} GuestHub • Dinas Perhubungan Kabupaten Ponorogo
          </p>
        </div>
      </div>

      {/* ==========================================
          KARTU FORM LOGIN (DESKTOP, TABLET & MOBILE)
          ========================================== */}
      <div className="login-form-panel">
        <div className="login-form-box">
          <div className="login-header-group">
            <h2 className="login-form-title">Selamat datang</h2>
            <p className="login-form-subtitle">Masuk untuk mengelola buku tamu.</p>
          </div>

          <form onSubmit={handleLogin} className="login-inner-form">
            <div className="login-field-group">
              <label htmlFor="login-username">Username</label>
              <div className="login-input-wrapper">
                <span className="input-leading-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </span>
                <input
                  id="login-username"
                  type="text"
                  placeholder="Masukkan username Anda"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="login-field-group">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrapper">
                <span className="input-leading-icon">
                  {/* Ikon Kunci Diagonal Sesuai Screenshot PDF */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="7.5" cy="15.5" r="5.5"></circle>
                    <path d="m21 2-9.6 9.6"></path>
                    <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-login-action" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk ke Sistem'}
            </button>
          </form>

          {/* Lupa password link sesuai referensi PDF */}
          <div className="login-forgot-pwd">
            <span>Lupa password? </span>
            <button
              type="button"
              className="login-forgot-link"
              onClick={handleForgotPassword}
            >
              Hubungi admin.
            </button>
          </div>
        </div>

        {/* Footer Hak Cipta Mobile & Tablet */}
        <div className="login-mobile-footer">
          <p className="footer-mobile-text">© {new Date().getFullYear()} GuestHub • Dishub Kab. Ponorogo</p>
          <p className="footer-tablet-text">© {new Date().getFullYear()} GuestHub • Dinas Perhubungan Kabupaten Ponorogo</p>
        </div>
      </div>
    </div>
  );
}