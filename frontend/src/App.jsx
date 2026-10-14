import { useState, useEffect } from 'react';
import Login from "./components/Login/Login";
import FormGuest from "./components/FormGuest/FormGuest";
import GuestTable from "./components/GuestTable/GuestTable";
import ProfileModal from './components/ProfileModal/ProfileModal';
import UserManagement from './components/UserManagement/UserManagement';

import adminIcon from './assets/admin.png';
import receptionistIcon from './assets/custservice.png';
import logoApp from './assets/guesthub.png';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('form');

  // Load User dari localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Idle Timer Auto Logout (20 Menit)
  useEffect(() => {
    if (!user) return;
    let idleTimer;
    const TIMEOUT_DURATION = 20 * 60 * 1000; // 20 Menit

    const executeAutoLogout = () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      alert('Sesi Anda telah berakhir karena tidak ada aktivitas selama 20 menit.');
      window.location.reload();
    };

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(executeAutoLogout, TIMEOUT_DURATION);
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => window.addEventListener(event, resetIdleTimer));
    resetIdleTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach((event) => window.removeEventListener(event, resetIdleTimer));
    };
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return <div className="loading-screen">Memuat aplikasi...</div>;
  }

  if (!user) {
    return <Login onLoginSuccess={(loggedUser) => setUser(loggedUser)} />;
  }

  const isAdmin = user.role === 'admin';
  const userName = user.full_name || user.username || 'User';

  return (
    <div className="app-container">
      {/* NAVBAR ATAS */}
      <header className="main-header">
        <div className="header-brand">
          <img src={logoApp} alt="Logo GuestHub" className="header-logo-img" />
          <div>
            <h1 className="header-title">GuestHub</h1>
            <p className="header-subtitle">Sistem Buku Tamu Digital Dinas Perhubungan</p>
          </div>
        </div>

        <div className="header-actions">
          <span className={`role-badge ${isAdmin ? 'admin' : 'resepsionis'}`}>
            {isAdmin ? (
              <>
                <img src={adminIcon} alt="Admin" className="badge-icon" /> Admin
              </>
            ) : (
              <>
                <img src={receptionistIcon} alt="Resepsionis" className="badge-icon badge-icon-resepsionis" /> Resepsionis
              </>
            )}
          </span>

          <button className="btn-header-profile" onClick={() => setShowProfile(true)}>
            ⚙ Profil ({userName})
          </button>

          <button className="btn-header-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* PAGE HEADER / BANNER SAPAAN RESMI */}
      <div className="page-header-wrapper">
        <div className="page-header-container">
          <div className="ph-left">
            <h2 className="ph-title">
              {activeTab === 'form' && 'Pencatatan Tamu Baru'}
              {activeTab === 'dashboard' && 'Dashboard & Riwayat Kunjungan Tamu'}
              {activeTab === 'users' && 'Manajemen Pengguna & Hak Akses'}
            </h2>
            <p className="ph-subtitle">
              Selamat datang, <strong>{userName}</strong> • {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • Dishub Ponorogo
            </p>
          </div>
          <div className="ph-right">
            <span className="ph-status-badge">
              <span className="ph-status-dot"></span>
              Layanan Digital Aktif
            </span>
          </div>
        </div>
      </div>

      {/* TAB NAVIGASI */}
      <nav className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          Form Buku Tamu
        </button>
        <button
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard & Riwayat Tamu
        </button>

        {/* TAB KHUSUS ADMIN UNTUK KELOLA USER */}
        {isAdmin && (
          <button
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Kelola User
          </button>
        )}
      </nav>

      {/* KONTEN UTAMA */}
      <main className="main-content">
        {activeTab === 'form' && (
          <div className="form-single-wrapper">
            <FormGuest isCentered={true} onSuccess={() => setActiveTab('dashboard')} />
          </div>
        )}

        {activeTab === 'dashboard' && (
          <GuestTable isAdmin={isAdmin} showSummaryCards={true} />
        )}

        {activeTab === 'users' && isAdmin && (
          <UserManagement />
        )}
      </main>

      {/* MODAL PROFIL */}
      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}