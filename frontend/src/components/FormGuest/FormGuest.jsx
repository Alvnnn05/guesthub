import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Webcam from 'react-webcam';
import imageCompression from 'browser-image-compression';
import Swal from 'sweetalert2';
import { createTamu, uploadFotoTamu } from '../../api';
import './FormGuest.css';

const DAFTAR_BIDANG = [
  'Sub Bagian Umum Dan Kepegawaian',
  'Sub Bagian Keuangan Dan Penyusunan Program',
  'Bidang Angkutan',
  'Seksi Angkutan Orang',
  'Seksi Angkutan Barang',
  'Bidang Lalu Lintas, Sarana, Prasarana',
  'Seksi Parkir',
  'Seksi Manajemen Rekayasa Lalu Lintas',
  'Seksi Penerangan Jalan Umum',
  'Bidang Pengendalian Operasional Lalu Lintas Dan Angkutan Jalan',
  'UPT Pengujian Kendaraan Bermotor'
];

export default function FormGuest({ onSuccess }) {
  const [formData, setFormData] = useState({
    nama_tamu: '',
    instansi_asal: '',
    no_hp: '',
    tujuan_bidang: 'Sub Bagian Umum Dan Kepegawaian',
    perihal: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedImg, setCapturedImg] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');

  const webcamRef = useRef(null);

  const toggleCamera = () => {
    setFacingMode((prevMode) => (prevMode === 'user' ? 'environment' : 'user'));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (e) => {
    const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
    if (onlyNumbers.length <= 15) {
      setFormData((prev) => ({
        ...prev,
        no_hp: onlyNumbers
      }));
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        icon: 'error',
        title: 'Format File Tidak Sesuai',
        text: 'Format foto harus berupa JPG, JPEG, atau PNG!'
      });
      e.target.value = '';
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      Swal.fire({
        icon: 'warning',
        title: 'Ukuran Terlalu Besar',
        text: 'Ukuran file foto maksimal adalah 5 MB!'
      });
      e.target.value = '';
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

  const handleResetForm = () => {
    setFormData({
      nama_tamu: '',
      instansi_asal: '',
      no_hp: '',
      tujuan_bidang: 'Sub Bagian Umum Dan Kepegawaian',
      perihal: ''
    });
    handleRemovePhoto();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.no_hp.length < 10) {
      Swal.fire({
        icon: 'warning',
        title: 'Data belum lengkap',
        text: 'Nomor telepon minimal 10 digit.',
        confirmButtonText: 'Mengerti'
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
      const compressedFile = await imageCompression(photoFile, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      });

      const uploadRes = await uploadFotoTamu(compressedFile);
      if (uploadRes.error) {
        throw new Error(uploadRes.error);
      }

      const fotoUrl = uploadRes.foto_url;

      const result = await createTamu({
        ...formData,
        foto_url: fotoUrl
      });

      if (result.error) {
        throw new Error(result.error);
      }

      handleResetForm();

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
    <div className="form-guest-card-container">
      <h2 className="form-card-main-title">Formulir Pencatatan Tamu Baru</h2>

      <form onSubmit={handleSubmit} className="form-guest-layout">
        {/* KOLOM KIRI: DATA TAMU */}
        <div className="fg-left-col">
          {/* BARIS 1: NAMA LENGKAP & INSTANSI ASAL */}
          <div className="fg-dual-row">
            <div className="fg-field-group">
              <label>Nama lengkap tamu *</label>
              <div className="fg-input-wrap">
                <span className="fg-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </span>
                <input
                  type="text"
                  name="nama_tamu"
                  value={formData.nama_tamu}
                  onChange={handleChange}
                  autoComplete="off"
                  placeholder="Nama tamu"
                  required
                />
              </div>
            </div>

            <div className="fg-field-group">
              <label>Instansi / lembaga asal *</label>
              <div className="fg-input-wrap">
                <span className="fg-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                    <line x1="9" y1="22" x2="9" y2="22.01"></line>
                    <line x1="15" y1="22" x2="15" y2="22.01"></line>
                    <line x1="9" y1="6" x2="9" y2="6.01"></line>
                    <line x1="15" y1="6" x2="15" y2="6.01"></line>
                    <line x1="9" y1="10" x2="9" y2="10.01"></line>
                    <line x1="15" y1="10" x2="15" y2="10.01"></line>
                    <line x1="9" y1="14" x2="9" y2="14.01"></line>
                    <line x1="15" y1="14" x2="15" y2="14.01"></line>
                    <line x1="9" y1="18" x2="9" y2="18.01"></line>
                    <line x1="15" y1="18" x2="15" y2="18.01"></line>
                  </svg>
                </span>
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
            </div>
          </div>

          {/* BARIS 2: NOMOR TELEPON / WA */}
          <div className="fg-field-group">
            <label>Nomor telepon / WA *</label>
            <div className="fg-input-wrap">
              <span className="fg-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </span>
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
            </div>
            <span className="fg-helper-text">
              Minimal 10 digit {formData.no_hp.length > 0 && formData.no_hp.length < 10 ? `(${formData.no_hp.length}/10 digit)` : ''}
            </span>
          </div>

          {/* BARIS 3: TUJUAN BIDANG / UNIT KERJA */}
          <div className="fg-field-group">
            <label>Tujuan bidang / unit kerja *</label>
            <div className="fg-select-wrap">
              <select
                name="tujuan_bidang"
                className="fg-select-field"
                value={formData.tujuan_bidang}
                onChange={handleChange}
                required
              >
                {DAFTAR_BIDANG.map((bidang) => (
                  <option key={bidang} value={bidang}>
                    {bidang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* BARIS 4: PERIHAL / MAKSUD KUNJUNGAN */}
          <div className="fg-field-group">
            <label>Perihal / maksud kunjungan *</label>
            <textarea
              name="perihal"
              value={formData.perihal}
              onChange={handleChange}
              rows="4"
              placeholder="Tuliskan maksud kunjungan"
              required
            />
          </div>
        </div>

        {/* KOLOM KANAN: PRATINJAU FOTO & AKSI FOTO */}
        <div className="fg-right-col">
          <label className="fg-photo-label">Foto tamu *</label>

          {/* KOTAK PREVIEW FOTO DASHED */}
          <div className="fg-photo-box">
            {!photoPreview ? (
              <div className="photo-empty-state">
                <svg className="photo-camera-placeholder-icon" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                <span className="photo-placeholder-text">Pratinjau foto</span>
              </div>
            ) : (
              <div className="photo-filled-state">
                <img src={photoPreview} alt="Foto Tamu" className="photo-actual-preview" />
                <button
                  type="button"
                  className="photo-remove-badge"
                  onClick={handleRemovePhoto}
                  title="Hapus foto"
                >
                  ✕ Hapus
                </button>
              </div>
            )}
          </div>

          {/* TOMBOL AKSI FOTO */}
          <div className="fg-photo-actions-row">
            <button
              type="button"
              className="btn-fg-camera"
              onClick={() => setShowCameraModal(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span>Ambil via kamera</span>
            </button>

            <label className="btn-fg-upload">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Upload file</span>
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileUpload}
                className="hidden-file-input"
              />
            </label>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS: BATAL & SIMPAN */}
        <div className="fg-bottom-actions">
          <button
            type="button"
            className="btn-fg-batal"
            onClick={handleResetForm}
            disabled={loading}
          >
            Batal
          </button>

          <button
            type="submit"
            className="btn-fg-simpan"
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : 'Simpan tamu'}
          </button>
        </div>
      </form>

      {/* MODAL WEBCAM POPUP (PORTAL LANGSUNG KE BODY AGAR FULLSCREEN & TIDAK TERPOTONG) */}
      {showCameraModal &&
        createPortal(
          <div className="modal-overlay" onClick={() => setShowCameraModal(false)}>
            <div className="camera-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="camera-modal-header">
                <h3>Ambil Foto Tamu</h3>
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
          </div>,
          document.body
        )}
    </div>
  );
}