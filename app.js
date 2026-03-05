const express = require('express');
const app = express();
const port = 3000;
const session = require('express-session');

const routes = require('./routes/routes');
const db = require('./config/db');


const { GoogleGenerativeAI } = require("@google/generative-ai");
// 발급받은 API 키를 넣으세요 (환경변수 사용 추천)
const genAI = new GoogleGenerativeAI("AIzaSyCVW5VgGionVRy4EqKmCZ1C0NnZhjKglQo");

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
        const page = parseInt(req.query.page) || 1; // 현재 페이지 (기본값 1)
        const limit = 10; // 한 페이지에 보여줄 개수
        const offset = (page - 1) * limit;

        // 1. 해당 페이지의 기사만 가져오기
        const [articles] = await db.query(
            "SELECT * FROM Article ORDER BY created_at DESC LIMIT ? OFFSET ?",
            [limit, offset]
        );

        // 2. 전체 페이지 수를 계산하기 위한 총 기사 수 구하기
        const [[{ total }]] = await db.query("SELECT COUNT(*) as total FROM Article");
        const totalPages = Math.ceil(total / limit);
        const maxDisplayPages = 10;
        let startPage = Math.max(1, page - Math.floor(maxDisplayPages / 2));
        let endPage = startPage + maxDisplayPages - 1; 
        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - maxDisplayPages + 1);
        }
        
        // 2. 사용자 성향 통계 가져오기 (예시: 세션의 user_id 사용)
        const stats = {
            weekly: { progressive: 20, moderate: 40, conservative: 40 },
            total: { progressive: 40, moderate: 30, conservative: 30 }
        };

        // 3. EJS 렌더링 시 데이터 전달
        res.render('pages/article-list', { 
            title: 'Article List',
            articles: articles,
            stats: stats,
            currentPage: page,
            totalPages: totalPages,
            startPage: startPage,
            endPage: endPage
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
    const { keyword, label, title, content } = req.body;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        console.log("요청 받음:", keyword, label);

        
        const prompt = `
            You are an expert in news media analysis.

            Article Title: "${title}"
            Article Content: "${content}"
            Political Bias Label of this Article: "${label}"

            Please analyze why the keyword "${keyword}" was identified as a "biased keyword" that reveals this specific political orientation within this context. 

            Provide a kind and concise explanation in only 1 sentences so that it is easy for the user to understand. 
            Please respond in English.
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
        console.error("Gemini API Error:", err);
        res.status(500).json({ explanation: "Explanation could not be retrieved." });
    }
});

app.get('/search', async (req, res) => {
    const query = req.query.q || "";
    const page = parseInt(req.query.page) || 1; // 현재 페이지 번호 (기본값 1)
    const limit = 10; // 한 페이지에 보여줄 기사 수
    const offset = (page - 1) * limit;

    if (!query) {
        // 검색어가 없을 경우 빈 결과 페이지를 렌더링하거나 메인으로 리다이렉트
        return res.render('pages/article-list.ejs', { 
            articles: [], 
            searchQuery: "", 
            currentPage: 1, 
            totalPages: 0, 
            startPage: 1, 
            endPage: 1 
        });
    }

    // 1. 검색어를 공백 기준으로 분리
    const keywords = query.split(/\s+/).filter(word => word.length > 0);

    // 2. 검색 조건 및 파라미터 생성
    const conditions = keywords.map(() => "(title LIKE ? OR article_content LIKE ?)").join(" AND ");
    const params = [];
    keywords.forEach(word => {
        const likeWord = `%${word}%`;
        params.push(likeWord, likeWord);
    });

    try {
        // 3. 검색 결과 총 개수(Total) 가져오기 (페이지네이션 계산용)
        const [countRows] = await db.query(
            `SELECT COUNT(*) as count FROM Article WHERE ${conditions}`, 
            params
        );
        const total = countRows[0].count;
        const totalPages = Math.ceil(total / limit);

        // 4. 해당 페이지의 데이터만 가져오기 (LIMIT, OFFSET 적용)
        // 주의: params 배열 뒤에 limit와 offset을 추가로 붙여야 합니다.
        const sql = `SELECT * FROM Article WHERE ${conditions} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const [rows] = await db.query(sql, [...params, limit, offset]);

        // 5. 표시할 페이지 번호 범위 계산 (최대 10개씩)
        const maxDisplayPages = 10;
        let startPage = Math.max(1, page - Math.floor(maxDisplayPages / 2));
        let endPage = startPage + maxDisplayPages - 1;

        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - maxDisplayPages + 1);
        }

        // 6. EJS 렌더링 (모든 변수를 한꺼번에 전달)
        res.render('pages/article-list.ejs', { 
            articles: rows, 
            searchQuery: query,
            currentPage: page,
            totalPages: totalPages,
            startPage: startPage,
            endPage: endPage
        });

    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).send("검색 중 오류가 발생했습니다.");
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