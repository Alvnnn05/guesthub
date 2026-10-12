import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import imageCompression from 'browser-image-compression';
import Swal from 'sweetalert2';
import { createTamu, uploadFotoTamu } from '../../api';
import './FormGuest.css';

export default function FormGuest({ isCentered = false, onSuccess }) {
  const [formData, setFormData] = useState({
    nama_tamu: '',
    instansi_asal: '',
    no_hp: '',
    tujuan_bidang: 'Sekretariat',
    perihal: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedImg, setCapturedImg] = useState(null);

  // State mode kamera (default: 'environment' / kamera belakang di HP)
  const [facingMode, setFacingMode] = useState('environment');

  const webcamRef = useRef(null);

  // Fungsi toggle kamera depan/belakang
  const toggleCamera = () => {
    setFacingMode((prevMode) => (prevMode === 'user' ? 'environment' : 'user'));
  };

  // Handler input umum
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 1. HANDLER KHUSUS NO HP (HANYA ANGKA & MAKSIMAL 15 DIGIT)
  const handlePhoneChange = (e) => {
    const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
    if (onlyNumbers.length <= 15) {
      setFormData((prev) => ({
        ...prev,
        no_hp: onlyNumbers
      }));
    }
  };

  // 2. HANDLER UPLOAD FILE DENGAN VALIDASI FORMAT & UKURAN
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validasi Format File
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        icon: 'error',
        title: 'Format File Tidak Sesuai',
        text: 'Format foto harus berupa JPG, JPEG, atau PNG!'
      });
      e.target.value = ''; // Reset input
      return;
    }

    // Validasi Ukuran File (Maksimal 5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      Swal.fire({
        icon: 'warning',
        title: 'Ukuran Terlalu Besar',
        text: 'Ukuran file foto maksimal adalah 5 MB!'
      });
      e.target.value = ''; // Reset input
      return;
    }

    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setCapturedImg(null);
  };

  const handleCapturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedImg(imageSrc);
    }
  };

  const handleConfirmCapturedPhoto = () => {
    if (capturedImg) {
      fetch(capturedImg)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' });
          if (photoPreview && photoPreview.startsWith('blob:')) {
            URL.revokeObjectURL(photoPreview);
          }
          setPhotoFile(file);
          setPhotoPreview(capturedImg);
          setShowCameraModal(false);
          setCapturedImg(null);
        });
    }
  };

  const handleRemovePhoto = () => {
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    setCapturedImg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi Tambahan No HP Minimal 10 Digit
    if (formData.no_hp.length < 10) {
      Swal.fire({
        icon: 'warning',
        title: 'Nomor Telepon Kurang',
        text: 'Nomor telepon/WA minimal terdiri dari 10 digit angka.'
      });
      return;
    }

    if (!photoFile) {
      Swal.fire({
        icon: 'warning',
        title: 'Foto Belum Ada!',
        text: 'Silakan ambil foto via kamera atau upload file foto tamu terlebih dahulu.'
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Kompresi Gambar
      const compressedFile = await imageCompression(photoFile, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      });

      // 2. Upload Foto ke Backend
      const uploadRes = await uploadFotoTamu(compressedFile);
      if (uploadRes.error) {
        throw new Error(uploadRes.error);
      }

      const fotoUrl = uploadRes.foto_url;

      // 3. Simpan Data Tamu ke Database
      const result = await createTamu({
        ...formData,
        foto_url: fotoUrl
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // 4. Reset Form
      setFormData({
        nama_tamu: '',
        instansi_asal: '',
        no_hp: '',
        tujuan_bidang: 'Sekretariat',
        perihal: ''
      });
      handleRemovePhoto();

      // 5. Notifikasi Sukses
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Data tamu berhasil disimpan.',
        timer: 2000,
        showConfirmButton: false
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal!',
        text: 'Gagal menyimpan data tamu: ' + (err.message || 'Terjadi kesalahan')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`form-card ${isCentered ? 'form-card-centered' : ''}`}>
      <h2 className="form-title">Pencatatan Tamu Baru</h2>

      <form onSubmit={handleSubmit} className="guest-form">
        <div className="form-group">
          <label>Nama Lengkap Tamu *</label>
          <input
            type="text"
            name="nama_tamu"
            value={formData.nama_tamu}
            onChange={handleChange}
            autoComplete="off"
            placeholder="nama tamu"
            required
          />
        </div>

        <div className="form-group">
          <label>Instansi / Lembaga Asal *</label>
          <input
            type="text"
            name="instansi_asal"
            value={formData.instansi_asal}
            onChange={handleChange}
            autoComplete="off"
            placeholder="Contoh: Dinas / Umum"
            required
          />
        </div>

        <div className="form-group">
          <label>Nomor Telepon / WA *</label>
          <input
            type="text"
            name="no_hp"
            value={formData.no_hp}
            onChange={handlePhoneChange}
            autoComplete="off"
            placeholder="08123456789"
            maxLength={15}
            required
          />
          {formData.no_hp.length < 10 && (
            <small className="inline-validation-hint">
              *Minimal 10 digit {formData.no_hp.length > 0 ? `(${formData.no_hp.length}/10 digit)` : ''}
            </small>
          )}
        </div>

        <div className="form-group">
          <label>Tujuan Bidang / Unit Kerja *</label>
          <select
            name="tujuan_bidang"
            value={formData.tujuan_bidang}
            onChange={handleChange}
            required
          >
            <option value="Sekretariat">Sekretariat</option>
            <option value="Sub Bagian Umum Dan Kepegawaian">Sub Bagian Umum Dan Kepegawaian</option>
            <option value="Sub Bagian Keuangan Dan Penyusunan Program">Sub Bagian Keuangan Dan Penyusunan Program</option>
            <option value="Bidang Angkutan">Bidang Angkutan</option>
            <option value="Seksi Angkutan Orang">Seksi Angkutan Orang</option>
            <option value="Seksi Angkutan Barang">Seksi Angkutan Barang</option>
            <option value="Bidang Lalu Lintas, Sarana, Prasarana">Bidang Lalu Lintas, Sarana, Prasarana</option>
            <option value="Seksi Parkir">Seksi Parkir</option>
            <option value="Seksi Manajemen Rekayasa Lalu Lintas">Seksi Manajemen Rekayasa Lalu Lintas</option>
            <option value="Seksi Penerangan Jalan Umum">Seksi Penerangan Jalan Umum</option>
            <option value="Bidang Pengendalian Operasional Lalu Lintas Dan Angkutan Jalan">Bidang Pengendalian Operasional Lalu Lintas Dan Angkutan Jalan</option>
            <option value="UPT Pengujian Kendaraan Bermotor">UPT Pengujian Kendaraan Bermotor</option>
          </select>
        </div>

        <div className="form-group">
          <label>Perihal / Maksud Kunjungan *</label>
          <textarea
            name="perihal"
            value={formData.perihal}
            onChange={handleChange}
            rows="3"
            required
          />
        </div>

        <div className="form-group">
          <label>Foto Tamu *</label>
          {!photoPreview ? (
            <div className="photo-input-options">
              <button
                type="button"
                className="btn-webcam-trigger"
                onClick={() => setShowCameraModal(true)}
              >
                Ambil via Kamera
              </button>
              <label className="custom-file-upload">
                Upload File
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileUpload}
                  className="hidden-file-input"
                />
              </label>
            </div>
          ) : (
            <div className="photo-preview-box">
              <img src={photoPreview} alt="Preview Tamu" className="form-photo-thumbnail" />
              <span className="photo-status-text">✓ Foto Siap</span>
              <button
                type="button"
                className="btn-remove-photo"
                onClick={handleRemovePhoto}
              >
                Hapus
              </button>
            </div>
          )}
        </div>

        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'Menyimpan...' : 'Simpan Data Tamu'}
        </button>
      </form>

      {/* MODAL KAMERA WEBCAM */}
      {showCameraModal && (
        <div className="modal-overlay" onClick={() => setShowCameraModal(false)}>
          <div className="camera-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="camera-modal-header">
              <h3>Ambil Foto</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!capturedImg && (
                  <button
                    type="button"
                    className="btn-switch-camera"
                    onClick={toggleCamera}
                    title="Ganti Kamera Depan/Belakang"
                  >
                    🔄 {facingMode === 'environment' ? 'Kamera Depan' : 'Kamera Belakang'}
                  </button>
                )}
                <button
                  type="button"
                  className="camera-modal-close"
                  onClick={() => setShowCameraModal(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="camera-viewport-box">
              {!capturedImg ? (
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="webcam-live-view"
                  videoConstraints={{ facingMode: facingMode }}
                />
              ) : (
                <img src={capturedImg} alt="Hasil Ambil Foto" className="camera-captured-img" />
              )}
            </div>

            <div className="camera-modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  if (capturedImg) setCapturedImg(null);
                  else setShowCameraModal(false);
                }}
              >
                {capturedImg ? 'Foto Ulang' : 'Batal'}
              </button>

              {!capturedImg ? (
                <button
                  type="button"
                  className="btn-capture-photo"
                  onClick={handleCapturePhoto}
                >
                  Tangkap Foto
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-capture-photo"
                  onClick={handleConfirmCapturedPhoto}
                >
                  Gunakan Foto Ini
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}