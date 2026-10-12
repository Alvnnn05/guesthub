import Swal from 'sweetalert2';

// Toast Notifikasi Ringkas (Muncul di pojok kanan atas)
export const showToast = (title, icon = 'success') => {
  Swal.fire({
    icon,
    title,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });
};

// Modal Sukses / Error
export const showAlert = (title, text, icon = 'success') => {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonColor: '#2563eb',
  });
};

// Modal Konfirmasi Hapus Data
export const showConfirmDelete = async (message = 'Data dan file foto terkait akan dihapus permanen!') => {
  const result = await Swal.fire({
    title: 'Apakah kamu yakin?',
    text: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal',
  });
  return result.isConfirmed;
};