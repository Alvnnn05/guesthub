import { useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { updateUserProfile } from '../../api';
import './ProfileModal.css';

export default function ProfileModal({ user, onClose }) {
  const [loading, setLoading] = useState(false);

  // Ambil data user dari prop atau localStorage
  const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  const username = currentUser?.username || '';
  const [fullName, setFullName] = useState(currentUser?.full_name || username);
  const [password, setPassword] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (password.trim() !== '') {
      if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        Swal.fire({
          icon: 'warning',
          title: 'Password Belum Memenuhi Syarat',
          text: 'Password baru minimal 8 karakter dan harus mengandung kombinasi huruf dan angka!',
          confirmButtonColor: '#1a44b7'
        });
        return;
      }
    }

    setLoading(true);

    try {
      const res = await updateUserProfile({
        full_name: fullName,
        password: password.trim() !== '' ? password : undefined
      });

      if (res.error) {
        throw new Error(res.error);
      }

      // Update data user di localStorage
      localStorage.setItem('user', JSON.stringify(res.user));

      Swal.fire({
        icon: 'success',
        title: 'Profil Diperbarui!',
        text: 'Perubahan profil berhasil disimpan.',
        timer: 1500,
        showConfirmButton: false
      });

      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Update Profil',
        text: err.message || 'Terjadi kesalahan saat memperbarui profil',
        confirmButtonColor: '#1a44b7'
      });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-card" onClick={(e) => e.stopPropagation()}>
        {/* HEADER MODAL */}
        <div className="pm-header">
          <h3 className="pm-title">Pengaturan Profil Akun</h3>
          <button
            type="button"
            className="pm-close-btn"
            onClick={onClose}
            aria-label="Tutup"
          >
            &times;
          </button>
        </div>

        {/* BODY FORM */}
        <form className="pm-form" onSubmit={handleUpdateProfile}>
          <div className="pm-group">
            <label className="pm-label">Username Akun</label>
            <input
              type="text"
              className="pm-input pm-input-disabled"
              value={username}
              disabled
            />
            <small className="pm-hint">Username akun terdaftar tidak dapat diubah.</small>
          </div>

          <div className="pm-group">
            <label className="pm-label">Nama Lengkap / Tampilan</label>
            <input
              type="text"
              className="pm-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Masukkan nama lengkap"
              required
            />
          </div>

          <div className="pm-group">
            <label className="pm-label">Password Baru (Kosongkan jika tidak diubah)</label>
            <input
              type="password"
              className="pm-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter (huruf & angka)"
            />
          </div>

          {/* FOOTER ACTION BUTTONS */}
          <div className="pm-actions">
            <button
              type="button"
              className="pm-btn-cancel"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="submit"
              className="pm-btn-save"
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}