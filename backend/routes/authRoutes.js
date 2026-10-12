const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  updateProfile, 
  getAllUsers, 
  deleteUser, 
  resetPassword 
} = require('../controllers/authController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const { loginLimiter, resetPasswordLimiter } = require('../middleware/rateLimiter');

// Endpoint Publik (Dilindungi Rate Limiter Anti Brute-Force)
router.post('/login', loginLimiter, login);

// Endpoint Terproteksi (Semua Role Terautentikasi)
router.put('/update-profile', verifyToken, updateProfile);

// Endpoint Terproteksi Khusus ADMIN
router.post('/register', verifyToken, verifyAdmin, register);
router.get('/users', verifyToken, verifyAdmin, getAllUsers);
router.delete('/users/:id', verifyToken, verifyAdmin, deleteUser);
router.post('/reset-password', verifyToken, verifyAdmin, resetPasswordLimiter, resetPassword);

module.exports = router;