const express = require('express');
const app = express();
const port = 3000;
const session = require('express-session');

const routes = require('./routes/routes');
const db = require('./config/db');


const { GoogleGenerativeAI } = require("@google/generative-ai");
// 발급받은 API 키를 넣으세요 (환경변수 사용 추천)
const genAI = new GoogleGenerativeAI("AIzaSyDrU9c5dQSxkD1Vpr2P7cH3jygTTR7D2dM");

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/modules', express.static('node_modules'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // JSON 형태의 데이터를 해석함
app.use(express.urlencoded({ extended: true })); // URL 인코딩된 데이터를 해석함

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

        // 1. DB에서 해당 ID의 기사 한 개만 가져오기
        const [rows] = await db.pool.query('SELECT * FROM Article WHERE article_id = ?', [articleId]);

        if (rows.length > 0) {
            const article = rows[0];

            // 2. 해당 기사의 키워드들 가져오기
            const [keywordRows] = await db.pool.query('SELECT keyword FROM Keyword WHERE article_id = ?', [articleId]);
            const keywords = keywordRows.map(row => row.keyword);

            // 3. 추천 기사 가져오기 (Recommendation + Article JOIN)
            // 주제가 비슷하면서 다른 관점(label)을 가진 기사들을 가져옵니다.
            const [recommendationRows] = await db.pool.query(`
                SELECT A.article_id, A.title, R.label 
                FROM Recommendation R
                JOIN Article A ON R.recommend_id = A.article_id
                WHERE R.article_id = ?
            `, [articleId]);

            // 4. 추천 기사를 성향(label)별로 그룹화
            // EJS에서 사용하기 쉽게 객체 형태로 정리합니다.
            const recommendations = {
                Left: recommendationRows.filter(r => r.label === 'Left'),
                Center: recommendationRows.filter(r => r.label === 'Center'),
                Right: recommendationRows.filter(r => r.label === 'Right')
            };

            // 상세 페이지(article.ejs) 렌더링
            res.render('pages/article', { 
                article: article,
                title: article.title,
                keywords: keywords,
                recommendations: recommendations 
            });
        } else {
            res.status(404).send('기사를 찾을 수 없습니다.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('서버 오류');
    }
});


app.post('/api/explain-keyword', async (req, res) => {
    const { keyword, label, title } = req.body;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        console.log("요청 받음:", keyword, label);

        
        const prompt = `
            당신은 뉴스 미디어 분석 전문가입니다.
            뉴스 제목: "${title}"
            이 기사의 정치적 성향: "${label}"
            
            이 맥락에서 "${keyword}"라는 단어가 왜 해당 정치적 성향을 드러내는 '편향적 키워드'로 지목되었는지 분석해주세요.
            사용자가 이해하기 쉽게 2~3문장으로 친절하게 설명해주세요. 한국어로 답변하세요.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ explanation: text });
        

        /*
        const mockData = {
            explanation: `
            The term "strategic competitor" is considered a biased keyword because it reframes the U.S.-China relationship from one of diplomatic cooperation to one of direct rivalry and threat, reflecting a hawkish, right-leaning foreign policy.
            This specific wording is used to justify "America First" agendas and aggressive measures in trade and national security, intentionally contrasting with the more moderate and welcoming language used by previous administrations.`
        };
        
        res.json(mockData);
        */
    } catch (err) {
        console.error("Gemini API 에러:", err);
        res.status(500).json({ explanation: "분석을 가져오는 데 실패했습니다." });
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