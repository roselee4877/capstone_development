const express = require('express');
const path = require('path');
const session = require('express-session');
// 메인 라우터 파일로 routes.js를 사용하도록 변경
const routes = require('./routes/routes'); 

const app = express();
const port = 3000;

// EJS 템플릿 엔진 설정 및 뷰 경로 설정 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // 뷰 폴더 경로
app.use(express.static('public'));
app.use('/modules', express.static('node_modules'));
app.use(express.urlencoded({ extended: true }));

// 세션 미들웨어 설정
app.use(session({
    secret: '32e97126-8be4-433d-ba34-338f12df99a6',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// EJS 템플릿에서 세션 사용을 가능하게 하는 미들웨어
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// 메인 라우터 연결
app.use('/', routes);

// Generic error handler (사용자 요청 로직 유지)
app.use((err, req, res, next) => {
    console.error(err.stack);

    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status);
    // 'pages/error' 뷰가 없으므로 임시로 'views/error.ejs'로 가정
    res.render('error', { // 실제 프로젝트에서는 'pages/error'로 변경 필요
        title: `Error ${status}`,
        status: status,
        message: message,
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});