import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import imageCompression from 'browser-image-compression';
import Swal from 'sweetalert2';
import {
  getTamuList,
  updateTamuData,
  deleteTamu,
  uploadFotoTamu,
  getImageUrl
} from '../../api';
import * as XLSX from 'xlsx';
import './GuestTable.css';

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

const PIE_COLORS = [
  '#1a44b7', 
  '#f59e0b', 
  '#0d9488', 
  '#8b5cf6', 
  '#10b981', 
  '#ec4899', 
  '#2563eb', 
  '#f97316', 
  '#06b6d4', 
  '#84cc16', 
  '#6366f1', 
  '#e11d48'  
];

export default function GuestTable({ isAdmin = true, showSummaryCards = true }) {
  const [guests, setGuests] = useState([]);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [bidangFilter, setBidangFilter] = useState('all');

  // Filter Rentang Tanggal
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Mobile Filter Drawer Toggle
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Mobile 3-Dots Dropdown Popover
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // Floating Tooltip Pie Chart & Hover Highlight
  const [pieTooltip, setPieTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    name: '',
    count: 0,
    pct: '0',
    color: '',
    placement: 'top'
  });
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(null);

  // State Edit Tamu
  const [editingGuest, setEditingGuest] = useState(null);
  const [editFormData, setEditFormData] = useState({
    nama_tamu: '',
    instansi_asal: '',
    no_hp: '',
    tujuan_bidang: 'Sub Bagian Umum Dan Kepegawaian',
    perihal: ''
  });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Modal Preview Foto
  const [previewImage, setPreviewImage] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fetch Data Tamu dari Backend
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

  useEffect(() => {
    fetchGuests();
    const interval = setInterval(fetchGuests, 10000);
    return () => clearInterval(interval);
  }, []);

  // Tutup dropdown menu 3-dots saat klik di luar
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.mgc-menu-wrap')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Filter Data Tamu
  useEffect(() => {
    let result = guests;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (g) =>
          g.nama_tamu?.toLowerCase().includes(q) ||
          g.instansi_asal?.toLowerCase().includes(q) ||
          g.perihal?.toLowerCase().includes(q) ||
          g.no_hp?.includes(q)
      );
    }

    if (bidangFilter !== 'all') {
      result = result.filter((g) => g.tujuan_bidang === bidangFilter);
    }

    if (startDate) {
      result = result.filter((g) => {
        if (!g.waktu_masuk) return false;
        const guestDate = new Date(g.waktu_masuk).toISOString().split('T')[0];
        return guestDate >= startDate;
      });
    }

    if (endDate) {
      result = result.filter((g) => {
        if (!g.waktu_masuk) return false;
        const guestDate = new Date(g.waktu_masuk).toISOString().split('T')[0];
        return guestDate <= endDate;
      });
    }

    setFilteredGuests(result);
    setCurrentPage(1);
  }, [searchTerm, bidangFilter, startDate, endDate, guests]);

  const handleResetFilter = () => {
    setSearchTerm('');
    setBidangFilter('all');
    setStartDate('');
    setEndDate('');
    setShowMobileFilter(false);
  };

  const isFiltered = Boolean(
    searchTerm.trim() !== '' ||
    bidangFilter !== 'all' ||
    startDate !== '' ||
    endDate !== ''
  );

  // Kalkulasi Statistik Ringkasan & Grafik
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const todayGuests = guests.filter(
      (g) => g.waktu_masuk && g.waktu_masuk.startsWith(todayStr)
    );
    const yesterdayGuests = guests.filter(
      (g) => g.waktu_masuk && g.waktu_masuk.startsWith(yesterdayStr)
    );

    const monthGuests = guests.filter((g) => {
      if (!g.waktu_masuk) return false;
      const d = new Date(g.waktu_masuk);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const diffYesterday = todayGuests.length - yesterdayGuests.length;
    const diffText =
      diffYesterday >= 0
        ? `+${diffYesterday} dari kemarin`
        : `${diffYesterday} dari kemarin`;

    // Frekuensi per Bidang
    const unitCounts = {};
    guests.forEach((g) => {
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

    // 7 Hari Terakhir
    const daysShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const sevenDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const count = guests.filter(
        (g) => g.waktu_masuk && g.waktu_masuk.startsWith(dStr)
      ).length;
      sevenDays.push({
        dayLabel: daysShort[d.getDay()],
        dateStr: dStr,
        count
      });
    }

    const maxSevenDaysCount = Math.max(...sevenDays.map((d) => d.count), 1);

    // Keseluruhan Bidang Sorted (semua bidang yang memiliki data)
    const sortedUnits = Object.entries(unitCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    const maxUnitCount = Math.max(...sortedUnits.map((u) => u.count), 1);

    const monthName = now.toLocaleDateString('id-ID', { month: 'short' });

    return {
      todayCount: todayGuests.length,
      diffText,
      totalCount: guests.length,
      monthLabel: `Total ${monthName} ${currentYear}`,
      monthCount: monthGuests.length,
      topUnitName: topUnit,
      topUnitCount,
      sevenDays,
      maxSevenDaysCount,
      sortedUnits,
      maxUnitCount
    };
  }, [guests]);

  // Formatter Waktu Masuk Desktop: "Hari ini" / "12 Okt 2026" & "13.57 WIB"
  const formatWaktuMasuk = (dateStr) => {
    if (!dateStr) return { dateText: '-', timeText: '' };
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const dateText = isToday
        ? 'Hari ini'
        : d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });

      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const timeText = `${hours}.${minutes} WIB`;

      return { dateText, timeText };
    } catch {
      return { dateText: dateStr, timeText: '' };
    }
  };

  // Formatter Waktu Masuk Mobile: "Hari ini 13.57" / "12 Okt 11.05" (Sesuai Referensi Mobile)
  const formatMobileWaktu = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');

      if (isToday) {
        return `Hari ini ${hours}.${minutes}`;
      }

      const day = d.getDate();
      const month = d.toLocaleDateString('id-ID', { month: 'short' });
      return `${day} ${month} ${hours}.${minutes}`;
    } catch {
      return dateStr;
    }
  };

  // Helper Initial Huruf Tamu
  const getAvatarInitial = (name = '') => {
    if (!name) return 'T';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Helper Warna Badge Bidang: Disamakan dengan warna di Pie Chart (PIE_COLORS)
  const getBidangBadgeColor = (bidang) => {
    const unitIdx = stats?.sortedUnits?.findIndex((u) => u.name === bidang);
    const color =
      unitIdx !== -1 && unitIdx !== undefined
        ? PIE_COLORS[unitIdx % PIE_COLORS.length]
        : DAFTAR_BIDANG.indexOf(bidang) !== -1
        ? PIE_COLORS[DAFTAR_BIDANG.indexOf(bidang) % PIE_COLORS.length]
        : PIE_COLORS[0];

    return {
      bg: `${color}14`,
      color: color,
      border: `1px solid ${color}35`
    };
  };

  // Aksi Edit & Hapus
  const handleOpenEdit = (guest) => {
    setEditingGuest(guest);
    setEditFormData({
      nama_tamu: guest.nama_tamu || '',
      instansi_asal: guest.instansi_asal || '',
      no_hp: guest.no_hp || '',
      tujuan_bidang: guest.tujuan_bidang || 'Sub Bagian Umum Dan Kepegawaian',
      perihal: guest.perihal || ''
    });
    setEditImageFile(null);
    setEditImagePreview(guest.foto_url ? getImageUrl(guest.foto_url) : null);
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

      const res = await updateTamuData(editingGuest.id, {
        ...editFormData,
        foto_url: new_foto_url
      });
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
        text: err.message || 'Gagal memperbarui data tamu.'
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (guest) => {
    Swal.fire({
      title: 'Hapus data tamu?',
      text: `Data kunjungan "${guest.nama_tamu}" akan dihapus dan tidak bisa dikembalikan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Ya, hapus',
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
            text: `Data tamu "${guest.nama_tamu}" berhasil dihapus.`,
            timer: 2000,
            showConfirmButton: false
          });
          fetchGuests();
        }
      }
    });
  };

  // Sanitasi & Export Excel
  const sanitizeCell = (value) => {
    if (typeof value !== 'string') return value ?? '';
    if (/^[=+\-@\t\r]/.test(value)) {
      return `'${value}`;
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
      'Waktu Masuk': g.waktu_masuk
        ? new Date(g.waktu_masuk).toLocaleString('id-ID')
        : '-'
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

  // Pagination Slice
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredGuests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);

  return (
    <div className="dashboard-view-wrapper">
      {/* ==========================================
          1. TOP 4 METRIC STATS CARDS (SESUAI HALAMAN 1 & MOBILE 2x2)
          ========================================== */}
      {showSummaryCards && (
        <div className="dash-metrics-grid">
          {/* Card 1: Tamu Hari Ini */}
          <div className="dash-metric-card">
            <div className="dmc-icon-badge badge-amber">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="dmc-content">
              <span className="dmc-label desktop-only-label">Tamu hari ini</span>
              <div className="dmc-value">{stats.todayCount}</div>
              <span className="dmc-label mobile-only-label">Tamu hari ini</span>
              <span className="dmc-subtext dmc-subtext-green desktop-only-subtext">{stats.diffText}</span>
            </div>
          </div>

          {/* Card 2: Total Kunjungan */}
          <div className="dash-metric-card">
            <div className="dmc-icon-badge badge-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div className="dmc-content">
              <span className="dmc-label desktop-only-label">Total kunjungan</span>
              <div className="dmc-value">{stats.totalCount}</div>
              <span className="dmc-label mobile-only-label">Total kunjungan</span>
              <span className="dmc-subtext desktop-only-subtext">Keseluruhan data</span>
            </div>
          </div>

          {/* Card 3: Total Bulan Ini */}
          <div className="dash-metric-card">
            <div className="dmc-icon-badge badge-emerald">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
              </svg>
            </div>
            <div className="dmc-content">
              <span className="dmc-label desktop-only-label">{stats.monthLabel}</span>
              <div className="dmc-value">{stats.monthCount}</div>
              <span className="dmc-label mobile-only-label">{stats.monthLabel}</span>
              <span className="dmc-subtext desktop-only-subtext">Bulan berjalan</span>
            </div>
          </div>

          {/* Card 4: Bidang Terbanyak */}
          <div className="dash-metric-card">
            <div className="dmc-icon-badge badge-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18"></path>
                <path d="M5 21V7l8-4v18"></path>
                <path d="M19 21V11l-6-4"></path>
                <path d="M9 9h1"></path>
                <path d="M9 13h1"></path>
                <path d="M9 17h1"></path>
              </svg>
            </div>
            <div className="dmc-content">
              <span className="dmc-label desktop-only-label">Bidang terbanyak</span>
              <div className="dmc-value dmc-value-unit" title={stats.topUnitName}>
                {stats.topUnitName}
              </div>
              <span className="dmc-label mobile-only-label">Bidang terbanyak</span>
              <span className="dmc-subtext desktop-only-subtext">{stats.topUnitCount} kunjungan</span>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          2. DUA KARTU ANALITIK & GRAFIK (DESKTOP VIEW)
          ========================================== */}
      <div className="dash-charts-grid">
        {/* Grafik Bar: Kunjungan 7 Hari Terakhir */}
        <div className="dash-chart-card">
          <h3 className="chart-card-title">Kunjungan 7 hari terakhir</h3>
          <div className="barchart-container">
            {stats.sevenDays.map((item, idx) => {
              const barHeightPct = Math.max(
                item.count > 0 ? (item.count / stats.maxSevenDaysCount) * 100 : 4,
                item.count > 0 ? 14 : 4
              );
              return (
                <div key={idx} className="barchart-col">
                  <div className="barchart-bar-slot">
                    <div
                      className={`barchart-bar-fill ${item.count > 0 ? 'has-data' : ''}`}
                      style={{ height: `${barHeightPct}%` }}
                      title={`${item.dateStr}: ${item.count} tamu`}
                    >
                      {item.count > 0 && (
                        <span className="bar-hover-counter">{item.count}</span>
                      )}
                    </div>
                  </div>
                  <span className="barchart-day-label">{item.dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie Chart: Per Bidang Tujuan */}
        <div className="dash-chart-card">
          <h3 className="chart-card-title">Per bidang tujuan</h3>
          {stats.sortedUnits.length === 0 ? (
            <p className="empty-chart-text">Belum ada kunjungan tercatat</p>
          ) : (
            <div className="piechart-layout">
              <div className="piechart-svg-wrap">
                <svg viewBox="0 0 120 120" className="piechart-svg">
                  {(() => {
                    const total = stats.sortedUnits.reduce((s, u) => s + u.count, 0);
                    let cumulative = 0;
                    const radius = 48;
                    const cx = 60;
                    const cy = 60;
                    const circumference = 2 * Math.PI * radius;

                    return stats.sortedUnits.map((u, idx) => {
                      const pct = total > 0 ? u.count / total : 0;
                      const dashLen = pct * circumference;
                      const dashGap = circumference - dashLen;
                      const offset = -cumulative * circumference + circumference * 0.25;
                      cumulative += pct;

                      const pctVal = total > 0 ? ((u.count / total) * 100).toFixed(1) : '0';
                      const isHovered = activeSegmentIdx === idx;

                      return (
                        <circle
                          key={idx}
                          cx={cx}
                          cy={cy}
                          r={radius}
                          fill="none"
                          stroke={PIE_COLORS[idx % PIE_COLORS.length]}
                          strokeWidth="22"
                          strokeDasharray={`${dashLen} ${dashGap}`}
                          strokeDashoffset={offset}
                          className="piechart-segment"
                          style={{
                            animationDelay: `${idx * 0.08}s`,
                            opacity: activeSegmentIdx !== null && !isHovered ? 0.35 : 1,
                            filter: isHovered ? 'drop-shadow(0 0 5px rgba(0,0,0,0.35))' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            const card = e.currentTarget.closest('.dash-chart-card');
                            const cardRect = card ? card.getBoundingClientRect() : { left: 0, top: 0, width: 300 };
                            const rawX = e.clientX - cardRect.left;
                            const rawY = e.clientY - cardRect.top;
                            const clampedX = Math.max(90, Math.min(rawX, cardRect.width - 90));

                            setActiveSegmentIdx(idx);
                            setPieTooltip({
                              visible: true,
                              x: clampedX,
                              y: rawY,
                              name: u.name,
                              count: u.count,
                              pct: pctVal,
                              color: PIE_COLORS[idx % PIE_COLORS.length]
                            });
                          }}
                          onMouseMove={(e) => {
                            const card = e.currentTarget.closest('.dash-chart-card');
                            if (!card) return;
                            const cardRect = card.getBoundingClientRect();
                            const rawX = e.clientX - cardRect.left;
                            const rawY = e.clientY - cardRect.top;
                            const clampedX = Math.max(90, Math.min(rawX, cardRect.width - 90));

                            setPieTooltip((prev) => ({
                              ...prev,
                              visible: true,
                              x: clampedX,
                              y: rawY
                            }));
                          }}
                          onMouseLeave={() => {
                            setActiveSegmentIdx(null);
                            setPieTooltip((prev) => ({ ...prev, visible: false }));
                          }}
                        />
                      );
                    });
                  })()}
                  {/* Center circle for donut hole */}
                  <circle cx="60" cy="60" r="37" fill="#ffffff" />
                  <text x="60" y="56" textAnchor="middle" className="piechart-center-value">
                    {stats.sortedUnits.reduce((s, u) => s + u.count, 0)}
                  </text>
                  <text x="60" y="70" textAnchor="middle" className="piechart-center-label">
                    Total
                  </text>
                </svg>
              </div>
              <div className="piechart-legend">
                {stats.sortedUnits.map((u, idx) => {
                  const isItemActive = activeSegmentIdx === idx;
                  return (
                    <div
                      key={idx}
                      className={`piechart-legend-item ${isItemActive ? 'is-active' : ''}`}
                      onMouseEnter={() => setActiveSegmentIdx(idx)}
                      onMouseLeave={() => setActiveSegmentIdx(null)}
                    >
                      <span
                        className="piechart-legend-dot"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      ></span>
                      <span className="piechart-legend-name" title={u.name}>{u.name}</span>
                      <span className="piechart-legend-count">{u.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Floating Tooltip Gelap Elegan */}
          {pieTooltip.visible && (
            <div
              className="pie-floating-tooltip"
              style={{
                left: `${pieTooltip.x}px`,
                top: `${pieTooltip.y}px`
              }}
            >
              <div className="pie-tooltip-title">{pieTooltip.name}</div>
              <div className="pie-tooltip-info">
                <span
                  className="pie-tooltip-badge"
                  style={{ backgroundColor: pieTooltip.color }}
                ></span>
                <span className="pie-tooltip-count">{pieTooltip.count} tamu</span>
                <span className="pie-tooltip-pct">({pieTooltip.pct}%)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          SEARCH & FILTER BAR KHUSUS MOBILE (SESUAI SCREENSHOT)
          ========================================== */}
      <div className="mobile-search-filter-container">
        <div className="mobile-search-filter-row">
          <div className="mobile-search-box">
            <span className="mobile-search-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Cari nama / instansi"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mobile-search-input"
            />
          </div>

          <button
            type="button"
            className={`mobile-filter-btn ${showMobileFilter || isFiltered ? 'active' : ''}`}
            onClick={() => setShowMobileFilter(!showMobileFilter)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span>Filter</span>
          </button>
        </div>

        {/* Drawer Filter Tambahan di Layar Mobile */}
        {showMobileFilter && (
          <div className="mobile-filter-drawer">
            <div className="mfd-field">
              <label>Dari tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="mfd-field">
              <label>Sampai tanggal</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="mfd-field">
              <label>Semua bidang</label>
              <select
                value={bidangFilter}
                onChange={(e) => setBidangFilter(e.target.value)}
              >
                <option value="all">Semua bidang</option>
                {DAFTAR_BIDANG.map((b, idx) => (
                  <option key={idx} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="mfd-actions">
              <button
                type="button"
                className="btn-mfd-reset"
                onClick={handleResetFilter}
              >
                Reset Filter
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="btn-mfd-export"
                  onClick={handleExportExcel}
                >
                  Export Excel
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          MOBILE CARDS LIST (PERSIS SEPERTI SCREENSHOT USER)
          ========================================== */}
      <div className="dash-mobile-cards-list">
        {currentItems.length === 0 ? (
          <div className="mobile-empty-card">
            <p className="mec-title">Tidak ada data kunjungan</p>
            <p className="mec-desc">Silakan periksa filter atau kata kunci pencarian Anda.</p>
            {isFiltered && (
              <button
                type="button"
                className="btn-clear-filters-mini"
                onClick={handleResetFilter}
              >
                Bersihkan Filter
              </button>
            )}
          </div>
        ) : (
          currentItems.map((guest) => {
            const fullPhotoUrl = getImageUrl(guest.foto_url);
            const badgeStyle = getBidangBadgeColor(guest.tujuan_bidang);
            const initial = getAvatarInitial(guest.nama_tamu);
            const mobileWaktu = formatMobileWaktu(guest.waktu_masuk);

            return (
              <div key={`mob-${guest.id}`} className="mobile-guest-card">
                {/* Baris Atas: Avatar + Nama + Kontak & Instansi + Tombol Titik Tiga */}
                <div className="mgc-top-row">
                  <div className="mgc-avatar-wrap">
                    {guest.foto_url ? (
                      <img
                        src={fullPhotoUrl}
                        alt={guest.nama_tamu}
                        className="mgc-avatar-img clickable"
                        onClick={() => setPreviewImage(fullPhotoUrl)}
                        title="Klik untuk melihat foto"
                      />
                    ) : (
                      <div className="mgc-avatar-initial">{initial}</div>
                    )}
                  </div>

                  <div className="mgc-identity-box">
                    <h4 className="mgc-guest-name">{guest.nama_tamu}</h4>
                    <span className="mgc-guest-sub">
                      {guest.no_hp || '-'} • {guest.instansi_asal || '-'}
                    </span>
                  </div>

                  {/* Tombol Titik Tiga Aksi */}
                  <div className="mgc-menu-wrap">
                    <button
                      type="button"
                      className="mgc-menu-btn"
                      onClick={() =>
                        setActiveDropdownId(
                          activeDropdownId === guest.id ? null : guest.id
                        )
                      }
                      aria-label="Menu Aksi"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2"></circle>
                        <circle cx="12" cy="12" r="2"></circle>
                        <circle cx="12" cy="19" r="2"></circle>
                      </svg>
                    </button>

                    {activeDropdownId === guest.id && (
                      <div className="mgc-dropdown-popover">
                        <button
                          type="button"
                          className="mgc-popover-item edit"
                          onClick={() => {
                            handleOpenEdit(guest);
                            setActiveDropdownId(null);
                          }}
                        >
                          ✎ Edit Data
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className="mgc-popover-item delete"
                            onClick={() => {
                              handleDelete(guest);
                              setActiveDropdownId(null);
                            }}
                          >
                            🗑 Hapus Data
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Baris Bawah: Pill Badge Bidang + Waktu Masuk Simple */}
                <div className="mgc-bottom-row">
                  <span
                    className="bidang-pill-badge"
                    style={{
                      backgroundColor: badgeStyle.bg,
                      color: badgeStyle.color,
                      border: badgeStyle.border
                    }}
                  >
                    {guest.tujuan_bidang}
                  </span>
                  <span className="mgc-time-text">{mobileWaktu}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ==========================================
          3. TABEL RIWAYAT KUNJUNGAN TAMU (DESKTOP VIEW)
          ========================================== */}
      <div className="dash-table-card desktop-table-card">
        {/* Table Card Topbar */}
        <div className="table-top-bar">
          <h2 className="table-main-title">Riwayat Kunjungan Tamu</h2>
          {isAdmin && (
            <button
              type="button"
              className="btn-dash-export-excel"
              onClick={handleExportExcel}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Export Excel ({filteredGuests.length} data)</span>
            </button>
          )}
        </div>

        {/* Filter Toolbar Sejajar (Single Line Desktop) */}
        <div className="dash-filter-toolbar">
          <div className="filter-input-wrap search-flex">
            <span className="filter-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              className="filter-control search-input"
              placeholder="Cari nama / instansi / perihal"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-input-wrap">
            <input
              type="date"
              className="filter-control date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Dari tanggal"
            />
          </div>

          <div className="filter-input-wrap">
            <input
              type="date"
              className="filter-control date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="Sampai tanggal"
            />
          </div>

          <div className="filter-input-wrap select-flex">
            <select
              className="filter-control select-input"
              value={bidangFilter}
              onChange={(e) => setBidangFilter(e.target.value)}
            >
              <option value="all">Semua bidang</option>
              {DAFTAR_BIDANG.map((b, idx) => (
                <option key={idx} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn-filter-reset"
            onClick={handleResetFilter}
          >
            Reset
          </button>
        </div>

        {/* Tabel Data Tamu Desktop */}
        <div className="dash-table-container">
          <table className="dash-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>TAMU</th>
                <th style={{ width: '20%' }}>INSTANSI</th>
                <th style={{ width: '28%' }}>TUJUAN & Perihal</th>
                <th style={{ width: '16%' }}>WAKTU MASUK</th>
                <th style={{ width: '8%', textAlign: 'center' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="dash-empty-cell">
                    <div className="dash-empty-state">
                      <p className="empty-main-text">Tidak ada data kunjungan ditemukan</p>
                      <p className="empty-sub-text">
                        Silakan periksa kata kunci pencarian atau sesuaikan filter Anda.
                      </p>
                      {isFiltered && (
                        <button
                          type="button"
                          className="btn-clear-filters-mini"
                          onClick={handleResetFilter}
                        >
                          Bersihkan Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((guest) => {
                  const fullPhotoUrl = getImageUrl(guest.foto_url);
                  const waktu = formatWaktuMasuk(guest.waktu_masuk);
                  const badgeStyle = getBidangBadgeColor(guest.tujuan_bidang);
                  const initial = getAvatarInitial(guest.nama_tamu);

                  return (
                    <tr key={guest.id} className="dash-table-row">
                      {/* Kolom Tamu: Avatar + Nama + Kontak */}
                      <td>
                        <div className="cell-guest-profile">
                          {guest.foto_url ? (
                            <img
                              src={fullPhotoUrl}
                              alt={guest.nama_tamu}
                              className="cell-avatar-img clickable"
                              onClick={() => setPreviewImage(fullPhotoUrl)}
                              title="Klik untuk memperbesar foto"
                            />
                          ) : (
                            <div className="cell-avatar-initial">{initial}</div>
                          )}
                          <div className="cell-guest-texts">
                            <span className="guest-name-text">{guest.nama_tamu}</span>
                            <span className="guest-phone-text">
                              {guest.no_hp || '-'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Kolom Instansi */}
                      <td>
                        <span className="cell-instansi-text">
                          {guest.instansi_asal || '-'}
                        </span>
                      </td>

                      {/* Kolom Tujuan: Pill Badge + Perihal */}
                      <td>
                        <div className="cell-tujuan-wrapper">
                          <span
                            className="bidang-pill-badge"
                            style={{
                              backgroundColor: badgeStyle.bg,
                              color: badgeStyle.color,
                              border: badgeStyle.border
                            }}
                          >
                            {guest.tujuan_bidang}
                          </span>
                          <span className="guest-perihal-text">
                            {guest.perihal || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Kolom Waktu Masuk: Stacked */}
                      <td>
                        <div className="cell-waktu-wrapper">
                          <span className="waktu-date-text">{waktu.dateText}</span>
                          <span className="waktu-time-text">{waktu.timeText}</span>
                        </div>
                      </td>

                      {/* Kolom Aksi: Edit (Semua Role) & Hapus (Khusus Admin) */}
                      <td>
                        <div className="cell-actions-icons">
                          <button
                            type="button"
                            className="btn-table-action action-edit"
                            onClick={() => handleOpenEdit(guest)}
                            title="Edit Tamu"
                            aria-label="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9"></path>
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              className="btn-table-action action-delete"
                              onClick={() => handleDelete(guest)}
                              title="Hapus Data"
                              aria-label="Hapus"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          )}
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

      {/* Table Footer: Info & Pagination (Tampil baik di Desktop maupun Mobile) */}
      {filteredGuests.length > 0 && (
        <div className="dash-table-footer">
          <span className="table-footer-info">
            Menampilkan {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredGuests.length)} dari {filteredGuests.length} data
          </span>

          {totalPages > 1 && (
            <div className="table-pagination-nav">
              <button
                type="button"
                className="btn-page-nav"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                aria-label="Halaman sebelumnya"
              >
                &lsaquo;
              </button>
              <span className="page-current-indicator">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="btn-page-nav"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                aria-label="Halaman selanjutnya"
              >
                &rsaquo;
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          MODAL EDIT DATA TAMU (PORTAL)
          ========================================== */}
      {editingGuest &&
        createPortal(
          <div className="modal-overlay" onClick={() => setEditingGuest(null)}>
            <div className="edit-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="edit-modal-header">
                <h3>Edit Data Tamu</h3>
                <button
                  type="button"
                  className="edit-modal-close"
                  onClick={() => setEditingGuest(null)}
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="edit-modal-body">
                <div className="em-field">
                  <label>Nama Lengkap Tamu *</label>
                  <input
                    type="text"
                    value={editFormData.nama_tamu}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, nama_tamu: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="em-field">
                  <label>Instansi Asal *</label>
                  <input
                    type="text"
                    value={editFormData.instansi_asal}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, instansi_asal: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="em-field">
                  <label>No. HP / WA *</label>
                  <input
                    type="text"
                    value={editFormData.no_hp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length <= 15) {
                        setEditFormData({ ...editFormData, no_hp: val });
                      }
                    }}
                    required
                  />
                </div>

                <div className="em-field">
                  <label>Tujuan Bidang *</label>
                  <select
                    value={editFormData.tujuan_bidang}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, tujuan_bidang: e.target.value })
                    }
                    required
                  >
                    {DAFTAR_BIDANG.map((b, idx) => (
                      <option key={idx} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="em-field">
                  <label>Perihal Kunjungan *</label>
                  <textarea
                    rows="3"
                    value={editFormData.perihal}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, perihal: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="em-field">
                  <label>Ganti Foto Tamu (Opsional)</label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        if (editImagePreview && editImagePreview.startsWith('blob:')) {
                          URL.revokeObjectURL(editImagePreview);
                        }
                        setEditImageFile(file);
                        setEditImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  {editImagePreview && (
                    <div className="em-photo-preview">
                      <img src={editImagePreview} alt="Preview" />
                    </div>
                  )}
                </div>

                <div className="em-actions">
                  <button
                    type="button"
                    className="btn-em-cancel"
                    onClick={() => setEditingGuest(null)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn-em-save"
                    disabled={editLoading}
                  >
                    {editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ==========================================
          MODAL PREVIEW FOTO TAMU (PORTAL)
          ========================================== */}
      {previewImage &&
        createPortal(
          <div
            className="modal-overlay"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="photo-preview-card"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="btn-preview-close"
                onClick={() => setPreviewImage(null)}
              >
                &times;
              </button>
              <img src={previewImage} alt="Foto Tamu Full" className="img-full-preview" />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}