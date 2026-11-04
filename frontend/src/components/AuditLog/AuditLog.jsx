import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getAuditLogs } from '../../api';
import './AuditLog.css';

// Katalog nama ramah untuk kode action
const ACTION_CONFIG = {
  LOGIN: { label: 'Login Akun', group: 'auth', color: '#6366f1', bg: '#eef2ff' },
  LOGOUT: { label: 'Logout Manual', group: 'auth', color: '#64748b', bg: '#f1f5f9' },
  LOGOUT_AUTO_IDLE: { label: 'Logout Otomatis (Idle)', group: 'auth', color: '#8b5cf6', bg: '#f5f3ff' },
  TAMBAH_TAMU: { label: 'Tambah Tamu', group: 'tamu', color: '#0d9488', bg: '#f0fdfa' },
  EDIT_TAMU: { label: 'Ubah Data Tamu', group: 'tamu', color: '#2563eb', bg: '#eff6ff' },
  HAPUS_TAMU: { label: 'Hapus Tamu', group: 'tamu', color: '#dc2626', bg: '#fef2f2' },
  EXPORT_EXCEL: { label: 'Ekspor Rekap Excel', group: 'export', color: '#16a34a', bg: '#f0fdf4' },
  TAMBAH_USER: { label: 'Tambah User Petugas', group: 'user', color: '#d97706', bg: '#fffbeb' },
  HAPUS_USER: { label: 'Hapus User Petugas', group: 'user', color: '#b91c1c', bg: '#fef2f2' },
  RESET_PASSWORD: { label: 'Reset Password User', group: 'user', color: '#c026d3', bg: '#fdf4ff' },
  GANTI_PROFIL: { label: 'Ubah Profil Akun', group: 'user', color: '#4f46e5', bg: '#eef2ff' },
  AKSES_ADMIN: { label: 'Akses Khusus Admin', group: 'admin', color: '#e11d48', bg: '#fff1f2' },
  LIHAT_AUDIT_LOG: { label: 'Akses Audit Log', group: 'admin', color: '#0284c7', bg: '#f0f9ff' }
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Statistik Ringkasan (Top Cards)
  const [stats, setStats] = useState({
    totalAll: 0,
    totalSuccess: 0,
    totalIssues: 0,
    todayCount: 0
  });

  // State Filter
  const [actionFilter, setActionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Modal Detail Forensik
  const [selectedLog, setSelectedLog] = useState(null);

  // Debounce input pencarian (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Tutup modal dengan tombol keyboard Esc & kunci body scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedLog(null);
      }
    };
    if (selectedLog) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [selectedLog]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        page,
        limit,
        action: actionFilter,
        status: statusFilter,
        startDate,
        endDate,
        search: debouncedSearch
      });

      if (res && res.logs) {
        setLogs(res.logs);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
        if (res.stats) {
          setStats(res.stats);
        }
      } else {
        setLogs([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Gagal mengambil data audit log:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter, statusFilter, startDate, endDate, debouncedSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setActionFilter('ALL');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setPage(1);
  };

  const isFiltered = actionFilter !== 'ALL' || statusFilter !== 'ALL' || startDate || endDate || searchTerm;

  // Format Waktu yang Konsisten dengan GuestTable / UserManagement
  const formatLogTimestamp = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');

      if (isToday) {
        return `Hari ini, ${hours}.${minutes} WIB`;
      }

      const day = d.getDate();
      const month = d.toLocaleDateString('id-ID', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month} ${year}, ${hours}.${minutes} WIB`;
    } catch {
      return dateStr;
    }
  };

  const getActorInitial = (name) => {
    if (!name || name === '-') return '?';
    return name.charAt(0).toUpperCase();
  };

  const renderStatusBadge = (status) => {
    if (status === 'SUCCESS') {
      return (
        <span className="al-status-pill status-success">
          <span className="status-dot"></span> Sukses
        </span>
      );
    }
    if (status === 'DENIED') {
      return (
        <span className="al-status-pill status-denied">
          <span className="status-dot"></span> Ditolak
        </span>
      );
    }
    return (
      <span className="al-status-pill status-failed">
        <span className="status-dot"></span> Gagal
      </span>
    );
  };

  const renderActionBadge = (action) => {
    const conf = ACTION_CONFIG[action] || {
      label: action,
      color: '#475569',
      bg: '#f1f5f9'
    };
    return (
      <span
        className="al-action-pill"
        style={{ color: conf.color, backgroundColor: conf.bg }}
      >
        {conf.label}
      </span>
    );
  };

  return (
    <div className="al-view-wrapper">
      {/* ==========================================
          1. EMPAT KARTU RINGKASAN AUDIT (TOP METRIC CARDS)
          ========================================== */}
      <div className="al-stats-grid">
        {/* Card 1: Total Rekam Jejak */}
        <div className="al-stat-card">
          <div className="al-stat-icon-badge badge-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
          </div>
          <div className="al-stat-content">
            <span className="al-stat-label">Total aktivitas</span>
            <div className="al-stat-value">{stats.totalAll}</div>
            <span className="al-stat-subtext">Keseluruhan rekam jejak</span>
          </div>
        </div>

        {/* Card 2: Hari Ini */}
        <div className="al-stat-card">
          <div className="al-stat-icon-badge badge-purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="al-stat-content">
            <span className="al-stat-label">Aktivitas hari ini</span>
            <div className="al-stat-value">{stats.todayCount}</div>
            <span className="al-stat-subtext">Hari berjalan</span>
          </div>
        </div>

        {/* Card 3: Sukses */}
        <div className="al-stat-card">
          <div className="al-stat-icon-badge badge-emerald">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="al-stat-content">
            <span className="al-stat-label">Operasi sukses</span>
            <div className="al-stat-value">{stats.totalSuccess}</div>
            <span className="al-stat-subtext">Transaksi berhasil</span>
          </div>
        </div>

        {/* Card 4: Insiden / Ditolak */}
        <div className="al-stat-card">
          <div className="al-stat-icon-badge badge-amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div className="al-stat-content">
            <span className="al-stat-label">Gagal / Ditolak</span>
            <div className="al-stat-value">{stats.totalIssues}</div>
            <span className="al-stat-subtext">Kendala & hak akses</span>
          </div>
        </div>
      </div>

      {/* ==========================================
          2. KARTU UTAMA AUDIT LOG (KONSISTEN DENGAN GUESTTABLE & USERMANAGEMENT)
          ========================================== */}
      <div className="al-table-card">
        {/* Top Header Card */}
        <div className="al-card-header">
          <div className="al-header-info">
            <div className="al-title-badge-row">
              <h2 className="al-table-title">Daftar Rekam Jejak Aktivitas</h2>
              <span className="al-compliance-tag" title="Sesuai Perpres SPBE & UU PDP No. 27/2022">
                Append-Only (6 Bulan)
              </span>
            </div>
            <p className="al-table-subtitle">
              Riwayat login, pengisian buku tamu, ekspor Excel, dan manajemen akun staf
            </p>
          </div>

          <div className="al-header-actions">
            <button
              type="button"
              className="btn-al-refresh"
              onClick={fetchLogs}
              title="Perbarui daftar aktivitas"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ==========================================
            2A. TOOLBAR FILTER SEJAJAR (KHUSUS DESKTOP)
            ========================================== */}
        <div className="al-filter-toolbar desktop-only-filter">
          {/* 1. Input Pencarian */}
          <div className="al-filter-wrap search-flex">
            <span className="al-filter-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              className="al-filter-control search-input"
              placeholder="Cari username / ID / keterangan"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="al-clear-search-btn"
                onClick={() => setSearchTerm('')}
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>

          {/* 2. Filter Jenis Aksi */}
          <div className="al-filter-wrap select-flex">
            <select
              className="al-filter-control select-input"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Semua Aktivitas</option>
              <option value="LOGIN">Login Akun</option>
              <option value="LOGOUT">Logout Manual</option>
              <option value="LOGOUT_AUTO_IDLE">Logout Otomatis (Idle)</option>
              <option value="TAMBAH_TAMU">Tambah Data Tamu</option>
              <option value="EDIT_TAMU">Ubah Data Tamu</option>
              <option value="HAPUS_TAMU">Hapus Data Tamu</option>
              <option value="EXPORT_EXCEL">Ekspor Excel</option>
              <option value="TAMBAH_USER">Tambah User Petugas</option>
              <option value="HAPUS_USER">Hapus User Petugas</option>
              <option value="RESET_PASSWORD">Reset Password User</option>
              <option value="GANTI_PROFIL">Ubah Profil Pribadi</option>
            </select>
          </div>

          {/* 3. Filter Status */}
          <div className="al-filter-wrap select-status-flex">
            <select
              className="al-filter-control select-input"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Semua Status</option>
              <option value="SUCCESS">Sukses</option>
              <option value="FAILED">Gagal</option>
              <option value="DENIED">Ditolak</option>
            </select>
          </div>

          {/* 4. Dari Tanggal */}
          <div className="al-filter-wrap date-flex">
            <input
              type="date"
              className="al-filter-control date-input"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              title="Dari tanggal"
            />
          </div>

          {/* 5. Sampai Tanggal */}
          <div className="al-filter-wrap date-flex">
            <input
              type="date"
              className="al-filter-control date-input"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              title="Sampai tanggal"
            />
          </div>

          {/* 6. Tombol Reset Filter */}
          {isFiltered && (
            <button
              type="button"
              className="btn-al-reset"
              onClick={handleResetFilters}
              title="Bersihkan semua filter"
            >
              Reset
            </button>
          )}
        </div>

        {/* ==========================================
            2B. SEARCH & FILTER BAR KHUSUS MOBILE (SESUAI DASHBOARD TAMU)
            ========================================== */}
        <div className="al-mobile-search-filter-container">
          <div className="al-mobile-search-filter-row">
            <div className="al-mobile-search-box">
              <span className="al-mobile-search-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Cari username / ID / aksi"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="al-mobile-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="al-mobile-clear-btn"
                  onClick={() => setSearchTerm('')}
                  title="Hapus pencarian"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              className={`al-mobile-filter-btn ${showMobileFilter || isFiltered ? 'active' : ''}`}
              onClick={() => setShowMobileFilter(!showMobileFilter)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              <span>Filter</span>
              {isFiltered && <span className="al-filter-dot"></span>}
            </button>
          </div>

          {/* Drawer Filter Tambahan saat Tombol Filter Diklik di Layar HP */}
          {showMobileFilter && (
            <div className="al-mobile-filter-drawer">
              <div className="al-mfd-field">
                <label>Jenis Aktivitas</label>
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Semua Aktivitas</option>
                  <option value="LOGIN">Login Akun</option>
                  <option value="LOGOUT">Logout Manual</option>
                  <option value="LOGOUT_AUTO_IDLE">Logout Otomatis (Idle)</option>
                  <option value="TAMBAH_TAMU">Tambah Data Tamu</option>
                  <option value="EDIT_TAMU">Ubah Data Tamu</option>
                  <option value="HAPUS_TAMU">Hapus Data Tamu</option>
                  <option value="EXPORT_EXCEL">Ekspor Excel</option>
                  <option value="TAMBAH_USER">Tambah User Petugas</option>
                  <option value="HAPUS_USER">Hapus User Petugas</option>
                  <option value="RESET_PASSWORD">Reset Password User</option>
                  <option value="GANTI_PROFIL">Ubah Profil Pribadi</option>
                </select>
              </div>

              <div className="al-mfd-field">
                <label>Status Hasil</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Semua Status</option>
                  <option value="SUCCESS">Sukses</option>
                  <option value="FAILED">Gagal</option>
                  <option value="DENIED">Ditolak</option>
                </select>
              </div>

              <div className="al-mfd-field">
                <label>Dari tanggal</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="al-mfd-field">
                <label>Sampai tanggal</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="al-mfd-actions">
                <button
                  type="button"
                  className="btn-al-mfd-reset"
                  onClick={handleResetFilters}
                  disabled={!isFiltered}
                >
                  Reset Filter
                </button>
                <button
                  type="button"
                  className="btn-al-mfd-apply"
                  onClick={() => setShowMobileFilter(false)}
                >
                  Tutup Filter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ==========================================
            DESKTOP TABLE VIEW
            ========================================== */}
        <div className="al-table-container desktop-only-table">
          <table className="al-table">
            <thead>
              <tr>
                <th style={{ width: '18%' }}>WAKTU KEJADIAN</th>
                <th style={{ width: '22%' }}>AKUN PELAKU</th>
                <th style={{ width: '18%' }}>AKTIVITAS</th>
                <th style={{ width: '12%' }}>STATUS</th>
                <th style={{ width: '22%' }}>KETERANGAN</th>
                <th style={{ width: '8%', textAlign: 'center' }}>DETAIL</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="al-state-cell">
                    <div className="al-spinner"></div>
                    <span className="al-state-text">Memuat rekam jejak sistem...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="al-state-cell">
                    <p className="al-empty-title">Tidak ada aktivitas ditemukan</p>
                    <p className="al-empty-desc">Periksa kembali rentang tanggal atau kata kunci pencarian Anda.</p>
                    {isFiltered && (
                      <button type="button" className="btn-al-reset-mini" onClick={handleResetFilters}>
                        Bersihkan Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                logs.map((item) => {
                  const actorUser = item.actor_username || item.attempted_username || '-';
                  const actorRole = (item.role || 'GUEST').toUpperCase();
                  const initial = getActorInitial(actorUser);

                  return (
                    <tr key={item.id} className="al-table-row">
                      {/* Waktu */}
                      <td className="cell-time-wib">
                        <span className="time-primary">{formatLogTimestamp(item.created_at)}</span>
                      </td>

                      {/* Pelaku */}
                      <td>
                        <div className="cell-actor-profile">
                          <div className={`cell-actor-avatar ${actorRole === 'ADMIN' ? 'avatar-admin' : 'avatar-user'}`}>
                            {initial}
                          </div>
                          <div className="actor-info">
                            <span className="actor-username">{actorUser}</span>
                            <span className={`role-badge role-${actorRole.toLowerCase()}`}>
                              {actorRole}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Aktivitas */}
                      <td>{renderActionBadge(item.action)}</td>

                      {/* Status */}
                      <td>{renderStatusBadge(item.status)}</td>

                      {/* Keterangan */}
                      <td className="cell-desc-wrap">
                        <span className="desc-preview" title={item.description || '-'}>
                          {item.description || '-'}
                        </span>
                      </td>

                      {/* Tombol Detail Forensik */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-al-inspect"
                          onClick={() => setSelectedLog(item)}
                          title="Lihat rincian"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ==========================================
            MOBILE CARDS LIST VIEW (< 768px)
            ========================================== */}
        <div className="al-mobile-cards-list mobile-only-cards">
          {loading ? (
            <div className="al-state-cell">
              <div className="al-spinner"></div>
              <span className="al-state-text">Memuat rekam jejak...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="al-empty-mobile-card">
              <p className="al-empty-title">Tidak ada aktivitas ditemukan</p>
              <p className="al-empty-desc">Periksa kembali filter atau kata kunci pencarian Anda.</p>
              {isFiltered && (
                <button type="button" className="btn-al-reset-mini" onClick={handleResetFilters}>
                  Bersihkan Filter
                </button>
              )}
            </div>
          ) : (
            logs.map((item) => {
              const actorUser = item.actor_username || item.attempted_username || '-';
              const actorRole = (item.role || 'GUEST').toUpperCase();
              const initial = getActorInitial(actorUser);

              return (
                <div key={`m-log-${item.id}`} className="al-mobile-card">
                  <div className="al-mcard-top">
                    <div className="cell-actor-profile">
                      <div className={`cell-actor-avatar ${actorRole === 'ADMIN' ? 'avatar-admin' : 'avatar-user'}`}>
                        {initial}
                      </div>
                      <div className="actor-info">
                        <span className="actor-username">{actorUser}</span>
                        <span className={`role-badge role-${actorRole.toLowerCase()}`}>{actorRole}</span>
                      </div>
                    </div>
                    <span className="al-mcard-time">{formatLogTimestamp(item.created_at)}</span>
                  </div>

                  <div className="al-mcard-mid">
                    <div className="al-mcard-badges">
                      {renderActionBadge(item.action)}
                      {renderStatusBadge(item.status)}
                    </div>
                    <p className="al-mcard-desc">{item.description || '-'}</p>
                  </div>

                  <div className="al-mcard-bot">
                    <span className="al-mcard-ip">
                      <code>{item.ip_address || 'IP: -'}</code>
                    </span>
                    <button
                      type="button"
                      className="btn-mcard-detail"
                      onClick={() => setSelectedLog(item)}
                    >
                      Rincian aktivitas →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ==========================================
            PAGINATION FOOTER
            ========================================== */}
        {!loading && total > 0 && (
          <div className="al-table-footer">
            <span className="al-footer-info">
              Menampilkan <strong>{logs.length}</strong> dari <strong>{total}</strong> aktivitas (Halaman {page} dari {totalPages})
            </span>
            <div className="al-pagination-nav">
              <button
                type="button"
                className="btn-al-page-nav"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                title="Halaman Sebelumnya"
              >
                ‹
              </button>
              <span className="al-page-counter">{page} / {totalPages}</span>
              <button
                type="button"
                className="btn-al-page-nav"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                title="Halaman Selanjutnya"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          3. MODAL RINCIAN FORENSIK LOG (PORTAL TO DOCUMENT.BODY)
          ========================================== */}
      {selectedLog && typeof document !== 'undefined' && createPortal(
        <div className="al-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="al-modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header Pinned */}
            <div className="al-modal-header">
              <div className="al-modal-header-left">
                <div className="al-modal-title-row">
                  <span className="al-id-pill">ID #{selectedLog.id}</span>
                  <h3 className="al-modal-title">Rincian Aktivitas</h3>
                </div>
                <span className="al-modal-subtitle">
                  Perekaman jejak keamanan otomatis (Append-Only)
                </span>
              </div>
              <button
                type="button"
                className="al-modal-close-btn"
                onClick={() => setSelectedLog(null)}
                title="Tutup dialog (Esc)"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="al-modal-body">
              {/* Seksi 1: Ringkasan Aktivitas */}
              <div className="al-meta-table">
                <div className="al-meta-row">
                  <span className="al-meta-label">WAKTU KEJADIAN</span>
                  <span className="al-meta-value font-semibold">
                    {formatLogTimestamp(selectedLog.created_at)}
                  </span>
                </div>

                <div className="al-meta-row">
                  <span className="al-meta-label">STATUS HASIL</span>
                  <div className="al-meta-value">
                    {renderStatusBadge(selectedLog.status)}
                  </div>
                </div>

                <div className="al-meta-row">
                  <span className="al-meta-label">JENIS AKTIVITAS</span>
                  <div className="al-meta-value">
                    {renderActionBadge(selectedLog.action)}
                  </div>
                </div>

                <div className="al-meta-row">
                  <span className="al-meta-label">AKUN PELAKU</span>
                  <div className="al-meta-value al-actor-meta">
                    <span className="al-actor-name">
                      {selectedLog.actor_username || selectedLog.attempted_username || '-'}
                    </span>
                    <span className={`role-badge role-${(selectedLog.role || 'guest').toLowerCase()}`}>
                      {selectedLog.role || 'GUEST'}
                    </span>
                  </div>
                </div>

                <div className="al-meta-row">
                  <span className="al-meta-label">RESOURCE TARGET</span>
                  <span className="al-meta-value">
                    {selectedLog.target_resource ? (
                      <span className="al-target-badge">
                        {selectedLog.target_resource} {selectedLog.target_id ? `(ID: ${selectedLog.target_id})` : ''}
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </span>
                </div>

                <div className="al-meta-row full-width-row">
                  <span className="al-meta-label">KETERANGAN TEKNIS</span>
                  <div className="al-desc-display">
                    {selectedLog.description || '-'}
                  </div>
                </div>
              </div>

              {/* Seksi 2: Forensik Jaringan & Klien */}
              <div className="al-forensic-card">
                <div className="al-fcard-header">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  <span>Data Jaringan & Klien</span>
                </div>

                <div className="al-fcard-body">
                  <div className="al-fcard-item">
                    <span className="al-fcard-label">Alamat IP Klien:</span>
                    <div className="al-fcard-ip-row">
                      <code className="al-ip-code-pill">{selectedLog.ip_address || '-'}</code>
                      <span className="al-ip-hint">Reverse-proxy Nginx</span>
                    </div>
                  </div>

                  <div className="al-fcard-item">
                    <span className="al-fcard-label">Informasi Perangkat (User-Agent):</span>
                    <div className="al-ua-code-container">
                      <code>{selectedLog.user_agent || 'Tidak tersedia'}</code>
                    </div>
                    <span className="al-fcard-caveat">
                      *Data teknis perangkat pengakses yang dicatat untuk keperluan audit dan keamanan.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Pinned */}
            <div className="al-modal-footer">
              <span className="al-modal-security-note">
                Log Append-Only
              </span>
              <button
                type="button"
                className="btn-al-modal-close"
                onClick={() => setSelectedLog(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
