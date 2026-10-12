const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Helper untuk mengambil Token dan membuat Header Authorization
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

// 1. Auth (Login, Register & User Management)
export const loginUser = async (username, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return response.json();
};

export const registerUser = async (userData) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(), // Menggunakan token JWT Admin
    body: JSON.stringify(userData),
  });
  return response.json();
};

export const updateUserProfile = async (profileData) => {
  const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData),
  });
  return response.json();
};

export const getAllUsers = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/users`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return response.json();
};

export const deleteUser = async (id) => {
  const response = await fetch(`${API_BASE_URL}/auth/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return response.json();
};

// 2. Tamu API
export const getTamuList = async () => {
  const response = await fetch(`${API_BASE_URL}/tamu`, {
    headers: getAuthHeaders(),
  });
  return response.json();
};

export const createTamu = async (dataTamu) => {
  const response = await fetch(`${API_BASE_URL}/tamu`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dataTamu),
  });
  return response.json();
};

export const uploadFotoTamu = async (fileFoto) => {
  const formData = new FormData();
  formData.append('foto', fileFoto);

  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/tamu/upload`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });
  return response.json();
};

// Action Terproteksi JWT
export const updateStatusTamu = async (id, status = 'SELESAI') => {
  const response = await fetch(`${API_BASE_URL}/tamu/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  return response.json();
};

export const updateTamuData = async (id, dataTamu) => {
  const response = await fetch(`${API_BASE_URL}/tamu/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(dataTamu),
  });
  return response.json();
};

export const deleteTamu = async (id) => {
  const response = await fetch(`${API_BASE_URL}/tamu/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return response.json();
};

export const resetPassword = async (username, newPassword) => {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ username, newPassword }),
  });
  return response.json();
};

// 3. Helper URL Foto untuk Penampilan Gambar Dinamis (Localhost & Server Produksi)
export const getImageUrl = (fotoPath) => {
  if (!fotoPath) return '/default-avatar.png';
  if (fotoPath.startsWith('http')) return fotoPath;

  const baseURL = API_BASE_URL.replace('/api', '');
  return `${baseURL}${fotoPath}`;
};