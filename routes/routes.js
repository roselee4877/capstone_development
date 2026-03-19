const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const homeController = require('../controllers/HomeController');
const articleController = require('../controllers/articleController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Login Page (no need login)
router.get('/login', authController.getLoginPage);
router.post('/login', authController.postLogin);

// Register Page (no need login)
router.get('/signup', authController.getRegisterPage);
router.post('/signup', authController.postRegister);

// Logout (need login only)
router.get('/logout', isAuthenticated, authController.logoutAndGetHomePage);

// Home Page (need login)
router.get('/', isAuthenticated, homeController.getHomePage);
router.get('/search', isAuthenticated, homeController.getSearchResults);

// Article Detail Page (need login)
router.get('/article/:id', isAuthenticated, articleController.getArticleDetail);
router.post('/api/explain-keyword', isAuthenticated, articleController.postKeywordExplanation);
router.post('/api/explain-article', isAuthenticated, articleController.postArticleExplanation);

// User Logs API (need login)
router.post('/api/log-click', isAuthenticated, homeController.getUserLogs);

// 모듈 내보내기
module.exports = router;