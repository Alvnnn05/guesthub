import { useState, useEffect, useMemo, useCallback } from 'react';
import React from 'react';
import imageCompression from 'browser-image-compression';
import Swal from 'sweetalert2';
import {
  getTamuList,
  updateStatusTamu,
  updateTamuData,
  deleteTamu,
  uploadFotoTamu,
  getImageUrl
} from '../../api';
import * as XLSX from 'xlsx';
import './GuestTable.css';
import '../../App.css';

// Helper: format durasi ms ke string "X Jam Y Menit" atau "Y Menit"
function formatDuration(ms) {
  if (ms < 0) return '< 1 Menit';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} Jam ${minutes} Menit`;
  if (totalMinutes === 0) return '< 1 Menit';
  return `${totalMinutes} Menit`;
}

export default function GuestTable({ isAdmin, showSummaryCards = true }) {
  const [guests, setGuests] = useState([]);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bidangFilter, setBidangFilter] = useState('all');

  // State ticker untuk badge durasi realtime (update tiap 1 menit)
  const [now, setNow] = useState(Date.now());

  // State Filter Rentang Tanggal
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [editingGuest, setEditingGuest] = useState(null);
  const [editFormData, setEditFormData] = useState({
    nama_tamu: '',
    instansi_asal: '',
    no_hp: '',
    tujuan_bidang: 'Sekretariat',
    perihal: ''
  });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fetch Data Tamu
  const fetchGuests = async () => {
    try {
      const data = await getTamuList();
      if (Array.isArray(data)) {
        setGuests(data);
        setFilteredGuests(data);
      }
    } catch (err) {
      console.error('Gagal mengambil data tamu:', err);
    }
  };

  const summaryStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const todayGuests = guests.filter(g => g.waktu_masuk && g.waktu_masuk.startsWith(todayStr));
    const activeGuests = guests.filter(g => g.status === 'BERKUNJUNG' || !g.waktu_keluar);
    const monthGuests = guests.filter(g => {
      if (!g.waktu_masuk) return false;
      const d = new Date(g.waktu_masuk);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const unitCounts = {};
    monthGuests.forEach(g => {
      const unit = g.tujuan_bidang || 'Lainnya';
      unitCounts[unit] = (unitCounts[unit] || 0) + 1;
    });

    let topUnit = '-';
    let topUnitCount = 0;
    Object.entries(unitCounts).forEach(([unit, count]) => {
      if (count > topUnitCount) {
        topUnit = unit;
        topUnitCount = count;
      }
    });

    return {
      todayCount: todayGuests.length,
      activeCount: activeGuests.length,
      monthCount: monthGuests.length,
      topUnitName: topUnit,
      topUnitCount: topUnitCount
    };
  }, [guests]);

  useEffect(() => {
    fetchGuests();
    const dataInterval = setInterval(() => {
      fetchGuests();
    }, 10000);

    // Ticker setiap 1 menit untuk update badge durasi tanpa refetch
    const tickInterval = setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(tickInterval);
    };
  }, []);

  // Filter Lanjutan
  useEffect(() => {
    let result = guests;

    if (searchTerm) {
      result = result.filter(
        (g) =>
          g.nama_tamu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          g.instansi_asal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          g.perihal?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      const filterVal = statusFilter === 'active' ? 'BERKUNJUNG' : 'SELESAI';
      result = result.filter((g) => g.status === filterVal);
    }

    if (bidangFilter !== 'all') {
      result = result.filter((g) => g.tujuan_bidang === bidangFilter);
    }

    if (startDate) {
      result = result.filter((g) => {
        const guestDate = new Date(g.waktu_masuk).toISOString().split('T')[0];
        return guestDate >= startDate;
      });
    }

    if (endDate) {
      result = result.filter((g) => {
        const guestDate = new Date(g.waktu_masuk).toISOString().split('T')[0];
        return guestDate <= endDate;
      });
    }

    setFilteredGuests(result);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, bidangFilter, startDate, endDate, guests]);

  const handleResetFilter = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setBidangFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const isFiltered = Boolean(
    searchTerm.trim() !== '' ||
    statusFilter !== 'all' ||
    bidangFilter !== 'all' ||
    startDate !== '' ||
    endDate !== ''
  );

  const handleOpenEdit = (guest) => {
    setEditingGuest(guest);
    setEditFormData({
      nama_tamu: guest.nama_tamu || '',
      instansi_asal: guest.instansi_asal || '',
      no_hp: guest.no_hp || '',
      tujuan_bidang: guest.tujuan_bidang || 'Sekretariat',
      perihal: guest.perihal || ''
    });
    setEditImageFile(null);
    setEditImagePreview(guest.foto_url ? getImageUrl(guest.foto_url) : null);
  };

  const handleEditPhoneChange = (e) => {
    const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
    if (onlyNumbers.length <= 15) {
      setEditFormData((prev) => ({ ...prev, no_hp: onlyNumbers }));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingGuest) return;

    if (editFormData.no_hp.length < 10) {
      Swal.fire({
        icon: 'warning',
        title: 'Nomor Telepon Kurang',
        text: 'Nomor telepon/WA minimal terdiri dari 10 digit angka.'
      });
      return;
    }

    setEditLoading(true);

    try {
      let new_foto_url = editingGuest.foto_url;
      if (editImageFile) {
        const compressedFile = await imageCompression(editImageFile, {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 1024,
          useWebWorker: true
        });
        const uploadRes = await uploadFotoTamu(compressedFile);
        if (uploadRes.error) throw new Error(uploadRes.error);
        new_foto_url = uploadRes.foto_url;
      }

      const res = await updateTamuData(editingGuest.id, { ...editFormData, foto_url: new_foto_url });
      if (res.error) throw new Error(res.error);

      setEditingGuest(null);

      Swal.fire({
        icon: 'success',
        title: 'Berhasil Diperbarui!',
        text: `Data tamu "${editFormData.nama_tamu}" berhasil disimpan.`,
        timer: 2000,
        showConfirmButton: false
      });

      fetchGuests();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal!',
        text: err.message || 'Gagal memperbarui data tamu.',
      });
    } finally {
      setEditLoading(false);
    }
  };

  // Check-Out via SweetAlert2
  const handleCheckout = (guest) => {
    Swal.fire({
      title: 'Konfirmasi Check-Out',
      text: `Proses Check-Out untuk tamu "${guest.nama_tamu}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Check-Out',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await updateStatusTamu(guest.id, 'SELESAI');

        if (res.error) {
          Swal.fire('Gagal!', 'Gagal check-out: ' + res.error, 'error');
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Selesai!',
            text: `Tamu "${guest.nama_tamu}" telah check-out.`,
            timer: 2000,
            showConfirmButton: false
          });
          fetchGuests();
        }
      }
    });
  };

  // Hapus Data via SweetAlert2
  const handleDelete = (guest) => {
    Swal.fire({
      title: '⚠️ Konfirmasi Hapus',
      text: `Apakah Anda yakin ingin menghapus data kunjungan dari "${guest.nama_tamu}"? Foto terkait juga akan dibersihkan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus Data',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await deleteTamu(guest.id);

        if (res.error) {
          Swal.fire('Gagal!', 'Gagal menghapus data: ' + res.error, 'error');
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Terhapus!',
            text: `Data tamu "${guest.nama_tamu}" berhasil dibersihkan dari server.`,
            timer: 2000,
            showConfirmButton: false
          });
          fetchGuests();
        }
      }
    });
  };

  // Export Excel
  // Sanitasi: cegah Formula Injection (=, +, -, @) pada cell Excel
  const sanitizeCell = (value) => {
    if (typeof value !== 'string') return value ?? '';
    // Karakter awal yg diinterpretasikan sebagai formula oleh Excel/LibreOffice
    if (/^[=+\-@\t\r]/.test(value)) {
      return `'${value}`; // prefix single-quote → Excel memperlakukannya sebagai teks biasa
    }
    return value;
  };

  const handleExportExcel = () => {
    if (filteredGuests.length === 0) {
      return Swal.fire({
        icon: 'info',
        title: 'Info',
        text: 'Tidak ada data untuk di-export pada rentang filter ini.'
      });
    }

    const dataToExport = filteredGuests.map((g, idx) => ({
      No: idx + 1,
      'Nama Tamu': sanitizeCell(g.nama_tamu),
      'Instansi Asal': sanitizeCell(g.instansi_asal),
      'No. HP': sanitizeCell(g.no_hp),
      'Tujuan Bidang': sanitizeCell(g.tujuan_bidang),
      'Perihal': sanitizeCell(g.perihal),
      'Waktu Masuk': g.waktu_masuk ? new Date(g.waktu_masuk).toLocaleString('id-ID') : '-',
      'Waktu Keluar': g.waktu_keluar ? new Date(g.waktu_keluar).toLocaleString('id-ID') : '-',
      Status: g.status === 'BERKUNJUNG' ? 'Berkunjung' : 'Selesai'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Buku Tamu');

    let periodText = 'Keseluruhan';
    if (startDate && endDate) periodText = `${startDate}_sd_${endDate}`;
    else if (startDate) periodText = `mulai_${startDate}`;
    else if (endDate) periodText = `sampai_${endDate}`;

    XLSX.writeFile(workbook, `Rekapitulasi_Buku_Tamu_Dishub_${periodText}.xlsx`);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredGuests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);

  return (
    <div style={{ width: '100%' }}>
      {showSummaryCards && (
        <div className="summary-cards-grid">
          <div className="summary-card card-yellow-border">
            <div className="card-header-content">
              <div>
                <span className="card-title">Tamu Hari Ini</span>
                <h3 className="card-value">{summaryStats.todayCount}</h3>
              </div>
              <div className="card-icon-badge bg-badge-orange">👥</div>
            </div>
            <div className="card-footer-text text-green">▲ Hari ini</div>
          </div>

          <div className="summary-card card-orange-border">
            <div className="card-header-content">
              <div>
                <span className="card-title">Sedang Berkunjung</span>
                <h3 className="card-value">{summaryStats.activeCount}</h3>
              </div>
              <div className="card-icon-badge bg-badge-yellow">🕒</div>
            </div>
            <div className="card-footer-text text-sub">belum checkout</div>
          </div>

          <div className="summary-card card-green-border">
            <div className="card-header-content">
              <div>
                <span className="card-title">Total Bulan Ini</span>
                <h3 className="card-value">{summaryStats.monthCount}</h3>
              </div>
              <div className="card-footer-text text-sub">
                per {new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="summary-card card-blue-border">
            <div className="card-header-content">
              <div>
                <span className="card-title">Bidang Terbanyak</span>
                <h3 className="card-value text-truncate">{summaryStats.topUnitName}</h3>
              </div>
              <div className="card-icon-badge bg-badge-blue">🏢</div>
            </div>
            <div className="card-footer-text text-sub">{summaryStats.topUnitCount} kunjungan bulan ini</div>
          </div>
        </div>
      )}

      <div className="table-card-right table-card-fullwidth">
        <div className="table-card-header">
          <h2 className="form-title">Daftar Tamu Aktif & Tamu Selesai</h2>
          {isAdmin && (
            <button className="btn-export-excel-small" onClick={handleExportExcel}>
              Export Excel ({filteredGuests.length} Data)
            </button>
          )}
        </div>

        {/* CONTAINER FILTER LANJUTAN */}
        <div className="filter-container-wrapper">
          <div className="filter-row-top" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="search-input-right"
              placeholder="Cari Nama / Instansi / Perihal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: '1 1 200px' }}
            />
            <select className="filter-select-right" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Semua Status</option>
              <option value="active">Berkunjung</option>
              <option value="completed">Selesai</option>
            </select>
          </div>

          <div className="filter-row-middle" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: '#475569' }}>Dari:</span>
              <input
                type="date"
                className="filter-date-right"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: '#475569' }}>Sampai:</span>
              <input
                type="date"
                className="filter-date-right"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-row-bottom" style={{ marginTop: '10px' }}>
            <select className="filter-select-bidang-full" value={bidangFilter} onChange={(e) => setBidangFilter(e.target.value)}>
              <option value="all">-- Semua Tujuan Bidang / Unit Kerja --</option>
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
            <button type="button" className="btn-reset-filter" onClick={handleResetFilter}>Reset Filter</button>
          </div>
        </div>

        {/* DESKTOP TABLE VIEW (Tampil di Layar > 768px) */}
        <div className="table-responsive-right desktop-table-view">
          <table className="guest-table-right">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nama & Kontak</th>
                <th>Instansi Asal</th>
                <th>Tujuan & Perihal</th>
                <th>Waktu Kunjungan</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state-cell">
                    <div className="empty-state-container">
                      <div className="empty-state-icon">
                        {isFiltered ? '🔍' : '📖'}
                      </div>
                      <h4 className="empty-state-title">
                        {isFiltered ? 'Tidak Ada Tamu yang Sesuai' : 'Belum Ada Kunjungan Tamu'}
                      </h4>
                      <p className="empty-state-desc">
                        {isFiltered
                          ? 'Tidak ditemukan data tamu yang cocok dengan kata kunci atau filter yang Anda pilih.'
                          : 'Buku tamu masih kosong saat ini. Tamu baru yang dicatat akan muncul di tabel ini.'}
                      </p>
                      {isFiltered && (
                        <button type="button" className="btn-empty-reset" onClick={handleResetFilter}>
                          ↺ Bersihkan Semua Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((guest) => {
                  const fullPhotoUrl = getImageUrl(guest.foto_url);
                  return (
                    <tr key={guest.id}>
                      <td>
                        {guest.foto_url ? (
                          <img
                            src={fullPhotoUrl}
                            alt={guest.nama_tamu}
                            className="table-avatar clickable-avatar"
                            onClick={() => setPreviewImage(fullPhotoUrl)}
                          />
                        ) : (
                          <div className="no-avatar-cell">No Pic</div>
                        )}
                      </td>
                      <td><strong>{guest.nama_tamu}</strong><div className="sub-detail">{guest.no_hp}</div></td>
                      <td>{guest.instansi_asal}</td>
                      <td><strong>{guest.tujuan_bidang}</strong><div className="sub-detail">{guest.perihal}</div></td>
                      <td>
                        <div className="time-details">
                          <div className="time-item">
                            <strong>Masuk:</strong> {guest.waktu_masuk ? new Date(guest.waktu_masuk).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'} WIB
                          </div>
                          {guest.waktu_keluar && (
                            <div className="time-item time-out-text">
                              <strong>Keluar:</strong> {new Date(guest.waktu_keluar).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} WIB
                            </div>
                          )}
                          {guest.status === 'BERKUNJUNG' && guest.waktu_masuk && (
                            <span className="duration-badge">
                              ⏱ Durasi: {formatDuration(now - new Date(guest.waktu_masuk).getTime())}
                            </span>
                          )}
                        </div>
                      </td>
                      <td><span className={`status-pill ${guest.status?.toLowerCase()}`}>{guest.status === 'BERKUNJUNG' ? 'Berkunjung' : 'Selesai'}</span></td>
                      <td>
                        <div className="action-buttons-cell">
                          {guest.status === 'BERKUNJUNG' && <button className="btn-checkout-table" onClick={() => handleCheckout(guest)}>Check-Out</button>}
                          <button className="btn-edit-table" onClick={() => handleOpenEdit(guest)}>Edit</button>
                          {isAdmin && <button className="btn-delete-table" onClick={() => handleDelete(guest)}>Hapus</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW (Tampil di Layar HP & Tablet < 768px) */}
        <div className="mobile-guest-cards-list">
          {currentItems.length === 0 ? (
            <div className="empty-card-mobile">
              <div className="empty-state-icon">
                {isFiltered ? '🔍' : '📖'}
              </div>
              <h4 className="empty-state-title">
                {isFiltered ? 'Tidak Ada Tamu yang Sesuai' : 'Belum Ada Kunjungan'}
              </h4>
              <p className="empty-state-desc">
                {isFiltered
                  ? 'Tidak ada riwayat tamu yang cocok dengan kata kunci atau filter saat ini.'
                  : 'Buku tamu digital masih kosong saat ini.'}
              </p>
              {isFiltered && (
                <button type="button" className="btn-empty-reset" onClick={handleResetFilter}>
                  ↺ Bersihkan Semua Filter
                </button>
              )}
            </div>
          ) : (
            currentItems.map((guest) => {
              const fullPhotoUrl = getImageUrl(guest.foto_url);
              return (
                <div className="guest-mobile-card" key={`mobile-${guest.id}`}>
                  {/* Bagian Atas Kartu: Identitas, Kontak & Status */}
                  <div className="gmc-header">
                    <div className="gmc-identity">
                      {guest.foto_url ? (
                        <img
                          src={fullPhotoUrl}
                          alt={guest.nama_tamu}
                          className="gmc-avatar clickable-avatar"
                          onClick={() => setPreviewImage(fullPhotoUrl)}
                        />
                      ) : (
                        <div className="gmc-no-avatar">No Pic</div>
                      )}
                      <div className="gmc-name-box">
                        <h4 className="gmc-name">{guest.nama_tamu}</h4>
                        <span className="gmc-phone">📞 {guest.no_hp}</span>
                      </div>
                    </div>
                    <span className={`status-pill ${guest.status?.toLowerCase()}`}>
                      {guest.status === 'BERKUNJUNG' ? 'Berkunjung' : 'Selesai'}
                    </span>
                  </div>

                  {/* Bagian Badan Kartu: Detail Informasi Kunjungan */}
                  <div className="gmc-body">
                    <div className="gmc-info-row">
                      <span className="gmc-label">Instansi:</span>
                      <span className="gmc-value">{guest.instansi_asal || '-'}</span>
                    </div>
                    <div className="gmc-info-row">
                      <span className="gmc-label">Tujuan Bidang:</span>
                      <span className="gmc-value font-semibold">{guest.tujuan_bidang}</span>
                    </div>
                    <div className="gmc-info-row">
                      <span className="gmc-label">Perihal:</span>
                      <span className="gmc-value">{guest.perihal}</span>
                    </div>
                    <div className="gmc-info-row gmc-time-row">
                      <span className="gmc-label">Waktu:</span>
                      <div className="gmc-time-val">
                        <span>🟢 Masuk: {guest.waktu_masuk ? new Date(guest.waktu_masuk).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'} WIB</span>
                        {guest.waktu_keluar && (
                          <span className="text-red">🔴 Keluar: {new Date(guest.waktu_keluar).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} WIB</span>
                        )}
                        {guest.status === 'BERKUNJUNG' && guest.waktu_masuk && (
                          <span className="duration-badge">
                            ⏱ Durasi: {formatDuration(now - new Date(guest.waktu_masuk).getTime())}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bagian Bawah Kartu: Tombol Aksi Touch-Friendly */}
                  <div className="gmc-footer">
                    {guest.status === 'BERKUNJUNG' && (
                      <button className="btn-checkout-table gmc-btn" onClick={() => handleCheckout(guest)}>
                        ✓ Check-Out
                      </button>
                    )}
                    <button className="btn-edit-table gmc-btn" onClick={() => handleOpenEdit(guest)}>
                      ✎ Edit
                    </button>
                    {isAdmin && (
                      <button className="btn-delete-table gmc-btn" onClick={() => handleDelete(guest)}>
                        🗑 Hapus
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {filteredGuests.length > 0 && (
          <div className="pagination-container-right">
            <span className="pagination-info-right">Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredGuests.length)} dari {filteredGuests.length} data terfilter</span>
            <div className="pagination-buttons-right">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>&laquo; Prev</button>
              <span>Halaman {currentPage} dari {totalPages || 1}</span>
              <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage((prev) => prev + 1)}>Next &raquo;</button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDIT */}
      {editingGuest && (
        <div className="modal-overlay" onClick={() => setEditingGuest(null)}>
          <div className="edit-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Edit Data Tamu</h3>
              <button className="edit-modal-close" onClick={() => setEditingGuest(null)}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit} className="guest-form">
              <div className="form-group">
                <label>Nama Lengkap Tamu *</label>
                <input type="text" name="nama_tamu" value={editFormData.nama_tamu} onChange={(e) => setEditFormData({ ...editFormData, nama_tamu: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Instansi Asal *</label>
                <input type="text" name="instansi_asal" value={editFormData.instansi_asal} onChange={(e) => setEditFormData({ ...editFormData, instansi_asal: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>No. HP *</label>
                <input type="text" name="no_hp" value={editFormData.no_hp} onChange={handleEditPhoneChange} maxLength={15} required />
                {editFormData.no_hp.length < 10 && (
                  <small className="inline-validation-hint">
                    *Minimal 10 digit {editFormData.no_hp.length > 0 ? `(${editFormData.no_hp.length}/10 digit)` : ''}
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Tujuan Bidang *</label>
                <select name="tujuan_bidang" value={editFormData.tujuan_bidang} onChange={(e) => setEditFormData({ ...editFormData, tujuan_bidang: e.target.value })} required>
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
                <label>Perihal *</label>
                <textarea name="perihal" value={editFormData.perihal} onChange={(e) => setEditFormData({ ...editFormData, perihal: e.target.value })} rows="3" required />
              </div>
              <div className="form-group">
                <label>Ganti Foto (Opsional)</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                      if (!allowedTypes.includes(file.type)) {
                        Swal.fire({ icon: 'error', title: 'Format Tidak Sesuai', text: 'Gunakan format JPG, JPEG, atau PNG!' });
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        Swal.fire({ icon: 'warning', title: 'Ukuran Terlalu Besar', text: 'Maksimal ukuran foto adalah 5 MB!' });
                        return;
                      }
                      if (editImagePreview && editImagePreview.startsWith('blob:')) {
                        URL.revokeObjectURL(editImagePreview);
                      }
                      setEditImageFile(file);
                      setEditImagePreview(URL.createObjectURL(file));
                    }
                  }}
                />
                {editImagePreview && <div className="image-preview-container"><img src={editImagePreview} alt="Preview" className="image-preview" /></div>}
              </div>
              <div className="delete-modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setEditingGuest(null)}>Batal</button>
                <button type="submit" className="btn-confirm-delete" style={{ backgroundColor: '#f59e0b' }} disabled={editLoading}>{editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW FOTO */}
      {previewImage && (
        <div className="image-preview-overlay" onClick={() => setPreviewImage(null)}>
          <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close-btn" onClick={() => setPreviewImage(null)}>&times;</button>
            <img src={previewImage} alt="Preview" className="preview-full-img" />
          </div>
        </div>
      )}
    </div>
  );
}