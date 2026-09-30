import { useState, useEffect, useMemo } from 'react';
import React from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '../../lib/supabaseClient';
import * as XLSX from 'xlsx';
import './GuestTable.css';
import '../../App.css';

export default function GuestTable({ isAdmin, showSummaryCards = true }) {
  const [guests, setGuests] = useState([]);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bidangFilter, setBidangFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [checkoutTarget, setCheckoutTarget] = useState(null);
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
  const [successMessage, setSuccessMessage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchGuests = async () => {
    const { data, error } = await supabase
      .from('tamu')
      .select('*')
      .neq('status', 'draft')
      .order('created_at', { ascending: false });

    if (!error) {
      setGuests(data || []);
      setFilteredGuests(data || []);
    }
  };

  const summaryStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const todayGuests = guests.filter(g => g.created_at && g.created_at.startsWith(todayStr));
    const activeGuests = guests.filter(g => g.status === 'active' || !g.check_out_at);
    const monthGuests = guests.filter(g => {
      if (!g.created_at) return false;
      const d = new Date(g.created_at);
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
    const channel = supabase
      .channel('realtime-tamu-table')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tamu' }, () => fetchGuests())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    let result = guests;
    if (searchTerm) {
      result = result.filter(
        (g) =>
          g.nama_tamu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          g.instansi_asal?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') result = result.filter((g) => g.status === statusFilter);
    if (bidangFilter !== 'all') result = result.filter((g) => g.tujuan_bidang === bidangFilter);
    if (dateFilter) {
      result = result.filter((g) => {
        const guestDate = new Date(g.created_at).toISOString().split('T')[0];
        return guestDate === dateFilter;
      });
    }
    setFilteredGuests(result);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, bidangFilter, dateFilter, guests]);

  const handleResetFilter = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setBidangFilter('all');
    setDateFilter('');
  };

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
    setEditImagePreview(guest.foto_url || null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingGuest) return;
    setEditLoading(true);

    try {
      let new_foto_url = editingGuest.foto_url;
      if (editImageFile) {
        const compressedFile = await imageCompression(editImageFile, { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true });
        const fileName = `${Date.now()}.jpg`;
        const filePath = `tamu/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('foto-tamu').upload(filePath, compressedFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('foto-tamu').getPublicUrl(filePath);
        new_foto_url = urlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('tamu')
        .update({ ...editFormData, foto_url: new_foto_url })
        .eq('id', editingGuest.id);

      if (updateError) throw updateError;

      setSuccessMessage(`Data tamu "${editFormData.nama_tamu}" berhasil diperbarui!`);
      setEditingGuest(null);
      fetchGuests();
    } catch (err) {
      alert(err.message || 'Gagal memperbarui data tamu.');
    } finally {
      setEditLoading(false);
    }
  };

  const confirmCheckout = async () => {
    if (!checkoutTarget) return;
    const { error } = await supabase
      .from('tamu')
      .update({ status: 'completed', check_out_at: new Date().toISOString() })
      .eq('id', checkoutTarget.id);

    if (error) alert('Gagal check-out: ' + error.message);
    else {
      setSuccessMessage(`Tamu "${checkoutTarget.nama_tamu}" berhasil check-out.`);
      setCheckoutTarget(null);
      fetchGuests();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('tamu').delete().eq('id', deleteTarget.id);

    if (error) alert('Gagal menghapus data: ' + error.message);
    else {
      setSuccessMessage(`Data tamu "${deleteTarget.nama_tamu}" berhasil dihapus.`);
      setDeleteTarget(null);
      fetchGuests();
    }
  };

  const handleExportExcel = () => {
    if (filteredGuests.length === 0) return alert('Tidak ada data untuk di-export.');
    const dataToExport = filteredGuests.map((g, idx) => ({
      No: idx + 1,
      'Nama Tamu': g.nama_tamu,
      'Instansi Asal': g.instansi_asal,
      'No. HP': g.no_hp,
      'Tujuan Bidang': g.tujuan_bidang,
      'Perihal': g.perihal,
      'Masuk': new Date(g.created_at).toLocaleString('id-ID'),
      'Keluar': g.check_out_at ? new Date(g.check_out_at).toLocaleString('id-ID') : '-',
      Status: g.status === 'active' ? 'Berkunjung' : 'Selesai'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Tamu');
    XLSX.writeFile(workbook, `Buku_Tamu_Dishub_${new Date().toISOString().split('T')[0]}.xlsx`);
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
          <h2 className="form-title">Daftar Tamu Aktif & Riwayat</h2>
          {isAdmin && <button className="btn-export-excel-small" onClick={handleExportExcel}>Export Excel</button>}
        </div>

        <div className="filter-container-wrapper">
          <div className="filter-row-top">
            <input
              type="text"
              className="search-input-right"
              placeholder="Cari Nama / Instansi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select className="filter-select-right" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Semua Status</option>
              <option value="active">Berkunjung</option>
              <option value="completed">Selesai</option>
            </select>
            <input type="date" className="filter-date-right" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>

          <div className="filter-row-bottom">
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
            <button type="button" className="btn-reset-filter" onClick={handleResetFilter}>Reset</button>
          </div>
        </div>

        <div className="table-responsive-right">
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
                <tr><td colSpan="7" className="empty-row-right">Data tidak ditemukan.</td></tr>
              ) : (
                currentItems.map((guest) => (
                  <tr key={guest.id}>
                    <td>
                      {guest.foto_url ? (
                        <img src={guest.foto_url} alt={guest.nama_tamu} className="table-avatar clickable-avatar" onClick={() => setPreviewImage(guest.foto_url)} />
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
                          <strong>Masuk:</strong> {new Date(guest.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </div>
                        {guest.check_out_at && (
                          <div className="time-item time-out-text">
                            <strong>Keluar:</strong> {new Date(guest.check_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </div>
                        )}
                      </div>
                    </td>
                    <td><span className={`status-pill ${guest.status}`}>{guest.status === 'active' ? 'Berkunjung' : 'Selesai'}</span></td>
                    <td>
                      <div className="action-buttons-cell">
                        {guest.status === 'active' && <button className="btn-checkout-table" onClick={() => setCheckoutTarget(guest)}>Check-Out</button>}
                        <button className="btn-edit-table" onClick={() => handleOpenEdit(guest)}>Edit</button>
                        {isAdmin && <button className="btn-delete-table" onClick={() => setDeleteTarget(guest)}>Hapus</button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredGuests.length > 0 && (
          <div className="pagination-container-right">
            <span className="pagination-info-right">Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredGuests.length)} dari {filteredGuests.length} data</span>
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
                <input type="text" name="nama_tamu" value={editFormData.nama_tamu} onChange={(e) => setEditFormData({...editFormData, nama_tamu: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Instansi Asal *</label>
                <input type="text" name="instansi_asal" value={editFormData.instansi_asal} onChange={(e) => setEditFormData({...editFormData, instansi_asal: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>No. HP *</label>
                <input type="text" name="no_hp" value={editFormData.no_hp} onChange={(e) => setEditFormData({...editFormData, no_hp: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Tujuan Bidang *</label>
                <select name="tujuan_bidang" value={editFormData.tujuan_bidang} onChange={(e) => setEditFormData({...editFormData, tujuan_bidang: e.target.value})} required>
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
                <textarea name="perihal" value={editFormData.perihal} onChange={(e) => setEditFormData({...editFormData, perihal: e.target.value})} rows="3" required />
              </div>
              <div className="form-group">
                <label>Ganti Foto (Opsional)</label>
                <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files[0]; if (file) { setEditImageFile(file); setEditImagePreview(URL.createObjectURL(file)); } }} />
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

      {/* MODAL CHECKOUT */}
      {checkoutTarget && (
        <div className="modal-overlay" onClick={() => setCheckoutTarget(null)}>
          <div className="delete-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🚪</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1e3a8a' }}>Konfirmasi Check-Out</h3>
            <p style={{ margin: '0 0 20px 0', color: '#475569' }}>Proses Check-Out untuk tamu <strong>"{checkoutTarget.nama_tamu}"</strong>?</p>
            <div className="delete-modal-actions">
              <button className="btn-cancel" onClick={() => setCheckoutTarget(null)}>Batal</button>
              <button className="btn-confirm-delete" style={{ backgroundColor: '#10b981' }} onClick={confirmCheckout}>Ya, Check-Out</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HAPUS */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="delete-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Konfirmasi Hapus Data</h3>
            <p>Apakah Anda yakin ingin menghapus data kunjungan dari <strong>"{deleteTarget.nama_tamu}"</strong>?</p>
            <div className="delete-modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteTarget(null)}>Batal</button>
              <button className="btn-confirm-delete" onClick={confirmDelete}>Ya, Hapus Data</button>
            </div>
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

      {/* MODAL SUKSES */}
      {successMessage && (
        <div className="modal-overlay" onClick={() => setSuccessMessage(null)}>
          <div className="success-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>✅ Berhasil!</h3>
            <p>{successMessage}</p>
            <div className="success-modal-actions">
              <button 
                type="button" 
                className="btn-success-close" 
                onClick={() => setSuccessMessage(null)}
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