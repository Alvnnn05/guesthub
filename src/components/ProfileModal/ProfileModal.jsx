import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ProfileModal.css';

export default function ProfileModal({ session, onClose }) {
  const [loading, setLoading] = useState(false);
  const userEmail = session?.user?.email || '';
  const [fullName, setFullName] = useState(session?.user?.user_metadata?.full_name || userEmail.split('@')[0]);
  const [password, setPassword] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = {
        data: { full_name: fullName }
      };

      if (password.trim() !== '') {
        if (password.length < 6) {
          alert('Password minimal 6 karakter!');
          setLoading(false);
          return;
        }
        updates.password = password;
      }

      const { error } = await supabase.auth.updateUser(updates);

      if (error) throw error;

      alert('Profil berhasil diperbarui!');
      onClose();
      window.location.reload();
    } catch (err) {
      alert('Gagal memperbarui profil: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pm-overlay">
      <div className="pm-card">
        {/* HEADER MODAL */}
        <div className="pm-header">
          <h3 className="pm-title">⚙️ Pengaturan Profil Akun</h3>
          <button type="button" className="pm-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* BODY FORM */}
        <form className="pm-form" onSubmit={handleUpdateProfile}>
          <div className="pm-group">
            <label className="pm-label">Email Akun</label>
            <input 
              type="email" 
              className="pm-input pm-input-disabled"
              value={userEmail} 
              disabled 
            />
            <small className="pm-hint">Email akun terdaftar tidak dapat diubah.</small>
          </div>

          <div className="pm-group">
            <label className="pm-label">Nama Lengkap / Username</label>
            <input 
              type="text" 
              className="pm-input"
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)}
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
              placeholder="Minimal 6 karakter"
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
    </div>
  );
}