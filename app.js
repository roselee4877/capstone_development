const express = require('express');
const app = express();
const port = 3000;
const session = require('express-session');

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
    cookie: { secure: false }
}));

// Middleware to make session available in EJS templates
app.use((req, res, next) => {
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



app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});