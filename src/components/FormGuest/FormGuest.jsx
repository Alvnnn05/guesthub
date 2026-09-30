import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import imageCompression from 'browser-image-compression';
import { supabase } from '../../lib/supabaseClient';
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const webcamRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setCapturedImg(null);
    }
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
          setPhotoFile(file);
          setPhotoPreview(capturedImg);
          setShowCameraModal(false);
          setCapturedImg(null);
        });
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setCapturedImg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photoFile) {
      alert('Silakan ambil foto via kamera atau upload file foto tamu terlebih dahulu!');
      return;
    }

    setLoading(true);

    try {
      // Kompresi Gambar
      const compressedFile = await imageCompression(photoFile, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      });

      const fileName = `${Date.now()}_${formData.nama_tamu.replace(/\s+/g, '_')}.jpg`;
      const filePath = `tamu/${fileName}`;

      // Upload ke Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('foto-tamu')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      // Ambil Public URL
      const { data: urlData } = supabase.storage
        .from('foto-tamu')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Insert ke database Supabase
      const { error: insertError } = await supabase.from('tamu').insert([
        {
          nama_tamu: formData.nama_tamu,
          instansi_asal: formData.instansi_asal,
          no_hp: formData.no_hp,
          tujuan_bidang: formData.tujuan_bidang,
          perihal: formData.perihal,
          foto_url: publicUrl,
          status: 'active'
        }
      ]);

      if (insertError) throw insertError;

      // Reset Form & Tampilkan Modal Sukses
      setFormData({
        nama_tamu: '',
        instansi_asal: '',
        no_hp: '',
        tujuan_bidang: 'Sekretariat',
        perihal: ''
      });
      handleRemovePhoto();
      setShowSuccessModal(true);

      if (onSuccess) onSuccess();
    } catch (err) {
      alert('Gagal menyimpan data tamu: ' + (err.message || 'Terjadi kesalahan'));
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
            placeholder="Contoh: Alvin Andriansyah"
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
            placeholder="-"
            required
          />
        </div>

        <div className="form-group">
          <label>Nomor Telepon / WA *</label>
          <input
            type="text"
            name="no_hp"
            value={formData.no_hp}
            onChange={handleChange}
            placeholder="08123456789"
            required
          />
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
                  accept="image/*"
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
              <button
                type="button"
                className="camera-modal-close"
                onClick={() => setShowCameraModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="camera-viewport-box">
              {!capturedImg ? (
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="webcam-live-view"
                  videoConstraints={{ facingMode: 'user' }}
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

      {/* MODAL SUKSES SIMPAN DATA */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="success-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon-badge">✅</div>
            <h3 className="success-modal-title">Berhasil!</h3>
            <p className="success-modal-text">Data tamu berhasil disimpan!</p>
            <div className="success-modal-actions">
              <button
                type="button"
                className="btn-success-close"
                onClick={() => setShowSuccessModal(false)}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}