import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import Login from "./components/Login/Login";
import FormGuest from "./components/FormGuest/FormGuest";
import GuestTable from "./components/GuestTable/GuestTable";
import ProfileModal from './components/ProfileModal/ProfileModal';

import adminIcon from './assets/admin.png'; 
import receptionistIcon from './assets/custservice.png';
import logoApp from './assets/guesthub.png'; 
import './App.css';

const ADMIN_EMAILS = [
  'vinandrian05@gmail.com'
];

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('form');

  // Load Session & Listener Auth Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Idle Timer Auto Logout (20 Menit)
  useEffect(() => {
    if (!session) return;
    let idleTimer;
    const TIMEOUT_DURATION = 20 * 60 * 1000; // 20 Menit

    const executeAutoLogout = async () => {
      await supabase.auth.signOut();
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
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="loading-screen">Memuat aplikasi...</div>;
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  const userEmail = session.user.email;
  const isAdmin = ADMIN_EMAILS.includes(userEmail);
  const userName = session.user.user_metadata?.full_name || userEmail.split('@')[0];

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

      {/* JIKA ADMIN: TAMPILKAN TAB NAVIGASI UNTUK PISAH HALAMAN */}
      {isAdmin && (
        <nav className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
             Input Buku Tamu
          </button>
          <button 
            className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
             Dashboard & Riwayat Tamu
          </button>
        </nav>
      )}

      {/* KONTEN UTAMA */}
      <main className="main-content" style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {isAdmin ? (
          /* TAMPILAN ADMIN (DIPISAH SESUAI TAB) */
          activeTab === 'form' ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <FormGuest isCentered={true} />
            </div>
          ) : (
            <GuestTable isAdmin={true} showSummaryCards={true} />
          )
        ) : (
          /* TAMPILAN RESEPSIONIS / USER BIASA (SIDE-BY-SIDE SIDEBAR) */
          <div className="form-input-container" style={{ padding: 0 }}>
            <FormGuest isCentered={false} />
            <GuestTable isAdmin={false} showSummaryCards={false} />
          </div>
        )}
      </main>

      {/* MODAL PROFIL */}
      {showProfile && (
        <ProfileModal
          session={session}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}