const express = require('express');
const app = express();
const port = 3000;
const session = require('express-session');

const routes = require('./routes/routes');
const db = require('./config/db');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/modules', express.static('node_modules'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: '32e97126-8be4-433d-ba34-338f12df99a6',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Middleware to make session available in EJS templates
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

app.get('/', async (req, res) => {
    try {
        // 1. 뉴스 목록 가져오기
        const [articles] = await db.pool.query('SELECT * FROM Article ORDER BY created_at DESC');

        // 2. 사용자 성향 통계 가져오기 (예시: 세션의 user_id 사용)
        // 실제 운영 시에는 복잡한 JOIN 쿼리가 필요하겠지만, 여기서는 예시 데이터를 보냅니다.
        const stats = {
            weekly: { progressive: 20, moderate: 40, conservative: 40 },
            total: { progressive: 40, moderate: 30, conservative: 30 }
        };

        // 3. EJS 렌더링 시 데이터 전달
        res.render('pages/article-list', { 
            title: 'Article List',
            articles: articles,
            stats: stats
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("서버 에러");
    }
});

app.get('/article/:id', async (req, res) => {
    try {
        const articleId = req.params.id; // URL에서 ID 추출

        // DB에서 해당 ID의 기사 한 개만 가져오기
        const [rows] = await db.pool.query('SELECT * FROM Article WHERE article_id = ?', [articleId]);

        if (rows.length > 0) {
            // 상세 페이지(article.ejs) 렌더링, 조회된 기사 데이터 전달
            res.render('pages/article', { 
                article: rows[0],
                title: rows[0].title 
            });
        } else {
            res.status(404).send('기사를 찾을 수 없습니다.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('서버 오류');
    }
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