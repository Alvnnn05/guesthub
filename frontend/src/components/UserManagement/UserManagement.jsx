import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { getAllUsers, deleteUser, registerUser, resetPassword } from '../../api';
import './UserManagement.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Mobile 3-Dots Dropdown Popover
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // State Form Tambah User
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('RESEPSIONIS');
  const [loadingModal, setLoadingModal] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await getAllUsers();
      if (Array.isArray(data)) {
        setUsers(data);
        setFilteredUsers(data);
      }
    } catch (err) {
      console.error('Gagal mengambil data user:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Tutup dropdown menu 3-dots saat klik di luar
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.umc-menu-wrap')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Filter pencarian pengguna
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const q = searchTerm.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.username?.toLowerCase().includes(q) ||
            u.full_name?.toLowerCase().includes(q) ||
            u.role?.toLowerCase().includes(q)
        )
      );
    }
  }, [searchTerm, users]);

  // Hitung Statistik User
  const totalUsers = users.length;
  const totalAdmin = users.filter((u) => u.role?.toLowerCase() === 'admin').length;
  const totalResepsionis = users.filter((u) => u.role?.toLowerCase() !== 'admin').length;

  const handleDeleteUser = (user) => {
    Swal.fire({
      title: 'Hapus akun pengguna?',
      text: `Akun "${user.username}" akan dihapus dan tidak bisa dikembalikan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await deleteUser(user.id);
        if (res.error) {
          Swal.fire('Gagal!', res.error, 'error');
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Terhapus!',
            text: `Akun "${user.username}" berhasil dihapus.`,
            timer: 1500,
            showConfirmButton: false
          });
          fetchUsers();
        }
      }
    });
  };

  const handleResetPassword = (user) => {
    const safeUsername = (user.username || '').replace(/[<>&"']/g, (c) => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

    Swal.fire({
      icon: 'question',
      iconHtml: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 7.5 3 3L22 7l-3-3"></path></svg>`,
      customClass: {
        icon: 'swal-icon-key'
      },
      title: 'Reset password?',
      html: `<p style="color: #64748b; margin-top: 4px; font-size: 0.92rem;">Masukkan password baru untuk akun <strong>${safeUsername}</strong></p>`,
      input: 'password',
      inputPlaceholder: 'Minimal 6 karakter',
      inputAttributes: {
        minlength: 6,
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      confirmButtonText: 'Simpan Password',
      cancelButtonText: 'Batal',
      preConfirm: (newPassword) => {
        if (!newPassword || newPassword.length < 6) {
          Swal.showValidationMessage('Password minimal harus 6 karakter!');
        }
        return newPassword;
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await resetPassword(user.username, result.value);
          if (res.error) {
            Swal.fire({
              icon: 'error',
              title: 'Gagal!',
              text: res.error,
              customClass: { popup: 'swal-custom-popup' }
            });
          } else {
            Swal.fire({
              icon: 'success',
              title: 'Berhasil!',
              text: `Password untuk user "${user.username}" berhasil diubah.`,
              timer: 1500,
              showConfirmButton: false,
              customClass: { popup: 'swal-custom-popup' }
            });
          }
        } catch {
          Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Gagal mereset password user.',
            customClass: { popup: 'swal-custom-popup' }
          });
        }
      }
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      Swal.fire({
        icon: 'warning',
        title: 'Password Kurang Panjang',
        text: 'Password minimal harus 6 karakter!',
        confirmButtonColor: '#1a44b7'
      });
      return;
    }

    setLoadingModal(true);

    try {
      const res = await registerUser({
        username,
        password,
        full_name: fullName,
        role
      });

      if (res.error) {
        throw new Error(res.error);
      }

      Swal.fire({
        icon: 'success',
        title: 'Akun Berhasil Dibuat!',
        text: `User "${username}" berhasil terdaftar sebagai ${role}.`,
        timer: 1500,
        showConfirmButton: false
      });

      setUsername('');
      setFullName('');
      setPassword('');
      setRole('RESEPSIONIS');
      setShowAddModal(false);
      fetchUsers();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Membuat Akun',
        text: err.message || 'Terjadi kesalahan saat membuat user baru',
        confirmButtonColor: '#1a44b7'
      });
    } finally {
      setLoadingModal(false);
    }
  };

  // Format Waktu Pembuatan Akun: "Hari ini 00.02" / "14 Okt 23.55" (Persis Referensi)
  const formatUserTimestamp = (dateStr) => {
    if (!dateStr) return 'Hari ini';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Hari ini';
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');

      if (isToday) {
        return `Hari ini ${hours}.${minutes}`;
      }

      const day = d.getDate();
      const month = d.toLocaleDateString('id-ID', { month: 'short' });
      return `${day} ${month} ${hours}.${minutes}`;
    } catch {
      return 'Hari ini';
    }
  };

  return (
    <div className="um-view-wrapper">
      {/* ==========================================
          1. TIGA KARTU STATISTIK USER
          ========================================== */}
      <div className="um-stats-grid">
        {/* Card 1: Total User */}
        <div className="um-stat-card">
          <div className="um-stat-icon-badge badge-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="um-stat-content">
            <span className="um-stat-label desktop-only-label">Total user</span>
            <div className="um-stat-value">{totalUsers}</div>
            <span className="um-stat-label mobile-only-label">Total user</span>
            <span className="um-stat-subtext desktop-only-subtext">Akun aktif</span>
          </div>
        </div>

        {/* Card 2: Admin */}
        <div className="um-stat-card">
          <div className="um-stat-icon-badge badge-emerald">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className="um-stat-content">
            <span className="um-stat-label desktop-only-label">Admin</span>
            <div className="um-stat-value">{totalAdmin}</div>
            <span className="um-stat-label mobile-only-label">Admin</span>
            <span className="um-stat-subtext desktop-only-subtext">Akses penuh</span>
          </div>
        </div>

        {/* Card 3: Resepsionis */}
        <div className="um-stat-card">
          <div className="um-stat-icon-badge badge-amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className="um-stat-content">
            <span className="um-stat-label desktop-only-label">Resepsionis</span>
            <div className="um-stat-value">{totalResepsionis}</div>
            <span className="um-stat-label mobile-only-label">Resepsionis</span>
            <span className="um-stat-subtext desktop-only-subtext">Input tamu</span>
          </div>
        </div>
      </div>

      {/* ==========================================
          2. KARTU DAFTAR PENGGUNA SISTEM (KONSEP KARTU SESUAI GAMBAR REFERENSI)
          ========================================== */}
      <div className="um-table-card">
        <div className="um-card-header">
          <div className="um-header-info">
            <h2 className="um-table-title">Daftar pengguna sistem</h2>
            <p className="um-table-subtitle">Kelola akun yang memiliki hak akses ke GuestHub</p>
          </div>

          <div className="um-header-actions">
            {/* Input Pencarian */}
            <div className="um-search-box">
              <span className="um-search-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Cari nama / username"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="um-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="um-clear-search"
                  onClick={() => setSearchTerm('')}
                  title="Hapus pencarian"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Tombol Tambah User Baru */}
            <button
              type="button"
              className="btn-um-add"
              onClick={() => setShowAddModal(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Tambah user baru</span>
            </button>
          </div>
        </div>

        {/* ==========================================
            DAFTAR KARTU PENGGUNA (PERSIS KONSEP GAMBAR REFERENSI)
            ========================================== */}
        <div className="um-cards-list">
          {filteredUsers.length === 0 ? (
            <div className="um-empty-state-card">
              <p className="um-mec-title">Tidak ada akun pengguna ditemukan</p>
              <p className="um-mec-desc">Silakan periksa kata kunci pencarian Anda atau tambah user baru.</p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isAdminRole = u.role?.toLowerCase() === 'admin';
              const initial = (u.username?.[0] || 'U').toUpperCase();
              const timeString = formatUserTimestamp(u.created_at);

              return (
                <div key={`user-${u.id}`} className="um-user-card">
                  {/* Baris Atas: Avatar + Nama Pengguna + Subtitle + Tombol Titik Tiga */}
                  <div className="umc-top-row">
                    <div className="umc-avatar-wrap">
                      <div className={`user-avatar-circle ${isAdminRole ? 'avatar-admin' : 'avatar-receptionist'}`}>
                        {isAdminRole ? (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        ) : (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                            <circle cx="12" cy="11" r="3"></circle>
                          </svg>
                        )}
                      </div>
                    </div>

                    <div className="umc-identity-box">
                      <h4 className="umc-guest-name">{u.username}</h4>
                      <span className="umc-guest-sub">
                        {u.full_name || 'Petugas'} • {isAdminRole ? 'Admin' : 'Resepsionis'}
                      </span>
                    </div>

                    {/* Tombol Titik Tiga Aksi */}
                    <div className="umc-menu-wrap">
                      <button
                        type="button"
                        className="umc-menu-btn"
                        onClick={() =>
                          setActiveDropdownId(activeDropdownId === u.id ? null : u.id)
                        }
                        aria-label="Menu Aksi"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2"></circle>
                          <circle cx="12" cy="12" r="2"></circle>
                          <circle cx="12" cy="19" r="2"></circle>
                        </svg>
                      </button>

                      {activeDropdownId === u.id && (
                        <div className="umc-dropdown-popover">
                          <button
                            type="button"
                            className="umc-popover-item reset"
                            onClick={() => {
                              handleResetPassword(u);
                              setActiveDropdownId(null);
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="7.5" cy="15.5" r="5.5"></circle>
                              <path d="M21 2l-9.6 9.6"></path>
                              <path d="M15.5 7.5l3 3L22 7l-3-3"></path>
                            </svg>
                            <span>Reset Password</span>
                          </button>
                          <button
                            type="button"
                            className="umc-popover-item delete"
                            onClick={() => {
                              handleDeleteUser(u);
                              setActiveDropdownId(null);
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Hapus Akun</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Baris Bawah: Pill Badge Role + Timestamp Pembuatan Akun */}
                  <div className="umc-bottom-row">
                    <span className="umc-role-pill">
                      {isAdminRole ? 'Administrator Sistem' : 'Petugas Resepsionis'}
                    </span>
                    <span className="umc-time-text">
                      {timeString}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ==========================================
          MODAL TAMBAH USER BARU
          ========================================== */}
      {showAddModal &&
        createPortal(
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="um-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="um-modal-header">
                <h3>Tambah User Baru</h3>
                <button
                  type="button"
                  className="um-modal-close"
                  onClick={() => setShowAddModal(false)}
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="um-modal-body">
                <div className="um-form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                    placeholder="Contoh: resepsionis2"
                    required
                  />
                </div>

                <div className="um-form-group">
                  <label>Nama Lengkap *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="isi nama "
                    required
                  />
                </div>

                <div className="um-form-group">
                  <label>Password Akun *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                  />
                </div>

                <div className="um-form-group">
                  <label>Role Hak Akses *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="RESEPSIONIS">Resepsionis (Input Tamu)</option>
                    <option value="admin">Admin (Akses Penuh)</option>
                  </select>
                </div>

                <div className="um-modal-actions">
                  <button
                    type="button"
                    className="btn-um-cancel"
                    onClick={() => setShowAddModal(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn-um-submit"
                    disabled={loadingModal}
                  >
                    {loadingModal ? 'Memproses...' : 'Buat Akun'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}