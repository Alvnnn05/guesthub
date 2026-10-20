import Swal from 'sweetalert2';
import '../styles/sweetalert.css';

// 1. Toast Notifikasi Ringkas (Muncul di pojok kanan atas)
export const showToast = (title, icon = 'success', timer = 3000) => {
  return Swal.fire({
    icon,
    title,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
  });
};

// 2. Modal Sukses / Error / Info Standar
export const showAlert = (title, text, icon = 'success') => {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonText: 'Selesai',
  });
};

// 3. Modal Sukses Khusus (Bisa Auto-Close atau dengan Tombol)
export const showSuccess = (title, text = '', timer = null) => {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Mengerti',
    ...(timer ? { timer, showConfirmButton: false } : {}),
  });
};

// 4. Modal Error Khusus
export const showError = (title, text = '') => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Tutup',
  });
};

// 5. Modal Warning Khusus
export const showWarning = (title, text = '') => {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonText: 'Lanjutkan',
  });
};

// 6. Modal Info Khusus
export const showInfo = (title, text = '') => {
  return Swal.fire({
    icon: 'info',
    title,
    text,
    confirmButtonText: 'Mengerti',
  });
};

// 7. Modal Konfirmasi Hapus Data (Bahaya / Destruktif)
export const showConfirmDelete = async (
  message = 'Data dan file foto terkait akan dihapus permanen!',
  title = 'Apakah Anda yakin?'
) => {
  const result = await Swal.fire({
    title,
    text: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus Data',
    cancelButtonText: 'Batal',
  });
  return result.isConfirmed;
};

// 8. Modal Konfirmasi Kustom Fleksibel
export const showConfirm = async ({
  title = 'Konfirmasi Tindakan',
  text = 'Apakah Anda yakin ingin melanjutkan?',
  icon = 'question',
  confirmButtonText = 'Ya, Lanjutkan',
  cancelButtonText = 'Batal',
  isDangerous = false,
} = {}) => {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    ...(isDangerous
      ? {
          confirmButtonColor: '#dc2626',
        }
      : {}),
  });
  return result.isConfirmed;
};

export default Swal;