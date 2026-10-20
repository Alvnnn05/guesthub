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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="app-layout">
      {/* OVERLAY UNTUK MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      {/* ==========================================
          SIDEBAR KIRI (NAVY DISHUB)
          ========================================== */}
      <aside className={`app-sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top-section">
          {/* LOGO & BRAND */}
          <div className="sidebar-brand">
            <img src={logoApp} alt="Logo GuestHub" className="sidebar-logo-img" />
            <span className="sidebar-brand-name">GuestHub</span>
          </div>

          {/* MENU NAVIGASI */}
          <nav className="sidebar-nav-menu">
            <button
              className={`sidebar-nav-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('form');
                setMobileMenuOpen(false);
              }}
            >
              <svg className="nav-btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>Form Buku Tamu</span>
            </button>

            <button
              className={`sidebar-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
            >
              <svg className="nav-btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Dashboard & Riwayat</span>
            </button>

            {isAdmin && (
              <button
                className={`sidebar-nav-btn ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('users');
                  setMobileMenuOpen(false);
                }}
              >
                <svg className="nav-btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>Kelola User</span>
              </button>
            )}
          </nav>
        </div>

        {/* SIDEBAR BOTTOM: USER PROFILE MINI */}
        <div className="sidebar-bottom-section">
          <div
            className="sidebar-user-card"
            onClick={() => setShowProfile(true)}
            title="Klik untuk membuka profil Anda"
          >
            <div className="sidebar-avatar-circle">
              {userInitial}
            </div>
            <div className="sidebar-user-details">
              <span className="sidebar-username">{userName}</span>
              <span className="sidebar-user-role">{isAdmin ? 'Admin' : 'Resepsionis'}</span>
            </div>
          </div>

          <button
            className="sidebar-logout-action"
            onClick={handleLogout}
            title="Keluar / Logout"
            aria-label="Logout"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </aside>

      {/* ==========================================
          AREA KONTEN UTAMA (CANVAS PUTIH/ABU-ABU)
          ========================================== */}
      <div className="app-main-canvas">
        {/* MOBILE TOPBAR HEADER */}
        <div className="canvas-mobile-bar">
          <button
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Buka menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="mobile-brand-title">GuestHub</div>
        </div>

        {/* HEADER HALAMAN */}
        <header className="canvas-header">
          <h1 className="canvas-title">
            {activeTab === 'form' && 'Form Buku Tamu'}
            {activeTab === 'dashboard' && (
              <>
                <span className="desktop-title-text">Dashboard & Riwayat Kunjungan</span>
                <span className="mobile-title-text">Dashboard</span>
              </>
            )}
            {activeTab === 'users' && 'Manajemen Pengguna & Hak Akses'}
          </h1>
          <p className="canvas-subtitle">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            <span className="desktop-subtitle-dishub"> • Dishub Ponorogo</span>
          </p>
        </header>

        {/* ISI KONTEN TAB */}
        <main className="canvas-content-area">
          <div key={activeTab} className="tab-pane-transition">
            {activeTab === 'form' && (
              <FormGuest isCentered={false} onSuccess={() => setActiveTab('dashboard')} />
            )}

            {activeTab === 'dashboard' && (
              <GuestTable isAdmin={isAdmin} showSummaryCards={true} />
            )}

            {activeTab === 'users' && isAdmin && (
              <UserManagement />
            )}
          </div>
        </main>
      </div>

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