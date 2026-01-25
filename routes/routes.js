const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Login Page (no need login)
router.get('/login', authController.getLoginPage);
router.post('/login', authController.postLogin);

// Register Page (no need login)
router.get('/signup', authController.getRegisterPage);
router.post('/signup', authController.postRegister);

// Logout (need login only)
router.get('/logout', isAuthenticated, authController.logoutAndGetHomePage);


// 모듈 내보내기
module.exports = router;