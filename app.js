const express = require('express');
const app = express();
const port = 3000;
const session = require('express-session');

// [추가] iframe 호출 허용을 위한 응답 헤더 설정 미들웨어
app.use((req, res, next) => {
    // 모든 곳에서 iframe 호출을 허용하려면 '*' (특정 도메인만 허용하려면 'https://example.com' 형식으로 지정)
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    res.removeHeader("X-Frame-Options"); // 구형 브라우저 충돌 방지
    next();
});

const routes = require('./routes/routes');
const db = require('./config/db');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const { GoogleGenerativeAI } = require("@google/generative-ai");
// 발급받은 API 키를 넣으세요 (환경변수 사용 추천)
const genAI = new GoogleGenerativeAI(apiKey);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/modules', express.static('node_modules'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // JSON 형태의 데이터를 해석함
// [추가] Beacon API가 보내는 plain text 데이터를 해석하기 위함
app.use(express.text({ type: 'text/plain' })); 
app.use(express.text({ type: 'application/json' })); // Blob으로 보낼 경우 대비
app.use(express.urlencoded({ extended: true })); // URL 인코딩된 데이터를 해석함
app.use(express.static('public')); // public 폴더를 외부에서 접근 가능하게 설정

app.use(session({
    secret: 'AIzaSyC-cK5kAQByEsi3ZUQpalVl1wgojXOT3WE',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: true, 
        sameSite: 'none' 
    }
}));

// Middleware to make session available in EJS templates
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

//발표용 상시 로그인기능
app.use((req, res, next) => {
    // 세션에 발표용 사용자 정보 강제 할당
    req.session.userId = 'right';
    req.session.user = {
        id: 'right',
        name: '발표용 계정'
    };
    
    res.locals.session = req.session;
    next();
});


app.use('/', routes);

// Generic error handler
app.use((err, req, res, next) => {
    console.error(err.stack);

    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status);
    res.render('pages/error', {
        title: `Error ${status}`,
        status: status,
        message: message,
    });
});


/*
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});*/

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});