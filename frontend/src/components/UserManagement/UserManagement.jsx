import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { getAllUsers, deleteUser, registerUser, resetPassword } from '../../api';
import adminIcon from '../../assets/admin.png';
import receptionistIcon from '../../assets/custservice.png';
import '../GuestTable/GuestTable.css';
import './UserManagement.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // State Form Tambah User
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('RESEPSIONIS');
  const [loadingModal, setLoadingModal] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await getAllUsers();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {
      console.error('Gagal mengambil data user:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Hitung Statistik User
  const totalUsers = users.length;
  const totalAdmin = users.filter((u) => u.role?.toLowerCase() === 'admin').length;
  const totalResepsionis = users.filter((u) => u.role?.toLowerCase() !== 'admin').length;

  const handleDeleteUser = (user) => {
    Swal.fire({
      title: '⚠️ Hapus Akun User',
      text: `Apakah Anda yakin ingin menghapus user "${user.username}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await deleteUser(user.id);
        if (res.error) {
          Swal.fire('Gagal!', res.error, 'error');
        } else {
          Swal.fire('Terhapus!', 'Akun user berhasil dihapus.', 'success');
          fetchUsers();
        }
      }
    });
  };

  const handleResetPassword = (user) => {
    Swal.fire({
      title: `🔑 Reset Password`,
      html: `<p style="color: #64748b; margin-top: 4px; font-size: 0.95rem;">Masukkan password baru untuk akun <strong>${user.username}</strong></p>`,
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
      buttonsStyling: false,
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        input: 'swal-custom-input',
        confirmButton: 'swal-custom-confirm',
        cancelButton: 'swal-custom-cancel'
      },
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
        } catch (err) {
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
        confirmButtonColor: '#2563eb'
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
        confirmButtonColor: '#2563eb'
      });
    } finally {
      setLoadingModal(false);
    }
  };

  return (
    <div className="um-container">
      {/* KARTU RINGKASAN STATISTIK */}
      <div className="um-stats-grid">
        <div className="um-stat-card card-blue">
          <div>
            <p className="um-stat-label">TOTAL USER</p>
            <h3 className="um-stat-value">{totalUsers}</h3>
          </div>
          <div className="um-stat-icon-wrapper bg-blue-light">
            <span className="um-stat-text-icon">👥</span>
          </div>
        </div>

        <div className="um-stat-card card-green">
          <div>
            <p className="um-stat-label">ADMIN</p>
            <h3 className="um-stat-value">{totalAdmin}</h3>
          </div>
          <div className="um-stat-icon-wrapper bg-green-light">
            <img src={adminIcon} alt="Admin" className="um-stat-img-icon" />
          </div>
        </div>

        <div className="um-stat-card card-orange">
          <div>
            <p className="um-stat-label">RESEPSIONIS</p>
            <h3 className="um-stat-value">{totalResepsionis}</h3>
          </div>
          <div className="um-stat-icon-wrapper bg-orange-light">
            <img src={receptionistIcon} alt="Resepsionis" className="um-stat-img-icon" />
          </div>
        </div>
      </div>

      {/* CARD TABEL PENGGUNA */}
      <div className="table-card-right table-card-fullwidth um-table-card">
        <div className="table-card-header um-header-wrapper">
          <div>
            <h2 className="form-title">Daftar Pengguna System</h2>
            <p className="um-subtitle">Kelola akun yang memiliki hak akses ke GuestHub</p>
          </div>
          <button 
            type="button" 
            className="um-btn-add"
            onClick={() => setShowAddModal(true)}
          >
            + Tambah User Baru
          </button>
        </div>

        <div className="table-responsive-right table-margin-top">
          <table className="guest-table-right">
            <thead>
              <tr>
                <th className="text-center col-no">No</th>
                <th>Username</th>
                <th>Nama Lengkap</th>
                <th className="text-center">Role Hak Akses</th>
                <th className="text-center col-action">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state-cell">
                    <div className="empty-state-container">
                      <div className="empty-state-icon">👥</div>
                      <h4 className="empty-state-title">Belum Ada Pengguna</h4>
                      <p className="empty-state-desc">Belum ada akun pengguna yang terdaftar di sistem.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => {
                  const isAdminRole = u.role?.toLowerCase() === 'admin';
                  return (
                    <tr key={u.id}>
                      <td className="text-center">{idx + 1}</td>
                      <td><strong>{u.username}</strong></td>
                      <td>{u.full_name || '-'}</td>
                      <td className="text-center">
                        <span className={`status-pill role-badge-pill ${isAdminRole ? 'completed' : 'active'}`}>
                          <img 
                            src={isAdminRole ? adminIcon : receptionistIcon} 
                            alt={u.role} 
                            className="role-badge-img" 
                          />
                          {isAdminRole ? 'ADMIN' : 'RESEPSIONIS'}
                        </span>
                      </td>
                    <td className="text-center">
                      <div className="um-action-group">
                        <button 
                          type="button"
                          className="btn-reset-pass"
                          onClick={() => handleResetPassword(u)}
                          title="Reset Password"
                        >
                          Reset Pass
                        </button>
                        <button 
                          type="button"
                          className="btn-delete-table" 
                          onClick={() => handleDeleteUser(u)}
                          title="Hapus User"
                        >
                           Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH USER BARU */}
      {showAddModal && (
        <div className="pm-overlay">
          <div className="pm-card">
            <div className="pm-header">
              <h3 className="pm-title">Tambah Akun User Baru</h3>
              <button type="button" className="pm-close-btn" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>

            <form className="pm-form" onSubmit={handleCreateUser}>
              <div className="pm-group">
                <label className="pm-label">Username *</label>
                <input 
                  type="text" 
                  className="pm-input"
                  value={username} 
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  placeholder="Contoh: resepsionis1"
                  required 
                />
              </div>

              <div className="pm-group">
                <label className="pm-label">Nama Lengkap *</label>
                <input 
                  type="text" 
                  className="pm-input"
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="-"
                  required
                />
              </div>

              <div className="pm-group">
                <label className="pm-label">Password *</label>
                <input 
                  type="password" 
                  className="pm-input"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>

              <div className="pm-group">
                <label className="pm-label">Role Akun *</label>
                <select 
                  className="pm-input"
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="RESEPSIONIS">Resepsionis</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="pm-actions">
                <button type="button" className="pm-btn-cancel" onClick={() => setShowAddModal(false)}>
                  Batal
                </button>
                <button type="submit" className="pm-btn-save" disabled={loadingModal}>
                  {loadingModal ? 'Memproses...' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}