const express = require('express');
const router = express.Router();

// 뉴스 목록 컨트롤러 (서브 라우터) import
const newsRouter = require('./newsController'); 

// GET /charts 라우트 (사용자 리다이렉트의 목적지)
router.get('/charts', (req, res) => {
    // 실제 charts 페이지 렌더링 로직 (현재는 목업)
    res.send("This is the /charts page (Placeholder)");
});

// 뉴스 라우터 마운트: 이제 뉴스 목록은 /news 경로로 접근 가능합니다.
// newsController 내부의 router.get('/')는 이제 '/news'를 의미합니다.
router.use('/news', newsRouter);

// GET / 라우트: 루트 경로를 /charts로 리다이렉션합니다. (사용자 요청)
router.get('/', (req, res) => res.redirect('/charts'));


// 모듈 내보내기
module.exports = router;