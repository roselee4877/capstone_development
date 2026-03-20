const db = require('../config/db');
require('dotenv').config();


const apiKey = process.env.GEMINI_API_KEY;
const { GoogleGenerativeAI } = require("@google/generative-ai");
// 발급받은 API 키를 넣으세요 (환경변수 사용 추천)
const genAI = new GoogleGenerativeAI(apiKey);

const getArticleDetail = async (req, res, next) => {
    try {
            const articleId = req.params.id; // URL에서 ID 추출
            const isSplit = req.query.isSplit; // URL의 ?isSplit=true를 읽어옴
    
            // DB에서 해당 ID의 기사 한 개만 가져오기
            const [rows] = await db.pool.query('SELECT * FROM Article WHERE article_id = ?', [articleId]);
    
            if (rows.length > 0) {
                const article = rows[0];
    
                // 해당 기사의 키워드들 가져오기
                const [keywordRows] = await db.pool.query(
                    'SELECT keyword, sentence FROM Keyword WHERE article_id = ?', 
                    [articleId]
                );

                // keyword와 sentence를 모두 담은 객체 배열로 생성
                const keywordsData = keywordRows.map(row => ({
                    keyword: row.keyword,
                    sentence: row.sentence
                }));
    
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
                    keywords: keywordsData,
                    recommendations: recommendations,
                    isSplit: isSplit
                });
            } else {
                res.status(404).send('기사를 찾을 수 없습니다.');
            }
        } catch (err) {
            console.error(err);
            res.status(500).send('서버 오류');
        }
};

const postKeywordExplanation = async (req, res, next) => {
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
        
    } catch (err) {
        console.error("Gemini API Error:", err);
        res.status(500).json({ explanation: "Explanation could not be retrieved." });
    }
};

const postArticleExplanation = async (req, res, next) => {
    const { label, title, content } = req.body;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-preview" });
        console.log("요청 받음:", label, title);

        /*
        const prompt = `
            You are an expert in news media analysis.

            Article Title: "${title}"
            Article Content: "${content}"
            Political Bias Label of this Article: "${label}"

            Please analyze why this article was identified as having this political orientation within this context. 

            Provide a kind and concise explanation in only 1 or 2 sentences so that it is easy for the user to understand. 
            Please respond in English.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ explanation: text });
        */

        const mockData = {
            explanation: `
            The term "strategic competitor" is considered a biased keyword because it reframes the U.S.-China relationship from one of diplomatic cooperation to one of direct rivalry and threat, reflecting a hawkish, right-leaning foreign policy.
            This specific wording is used to justify "America First" agendas and aggressive measures in trade and national security, intentionally contrasting with the more moderate and welcoming language used by previous administrations.`
        };
        
        res.json(mockData);
        

        
        
    } catch (err) {
        console.error("Gemini API Error:", err);
        res.status(500).json({ explanation: "Explanation could not be retrieved." });
    }
};



module.exports = {
    getArticleDetail,
    postKeywordExplanation,
    postArticleExplanation
};