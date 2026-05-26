const db = require('../config/db');

const getHomePage = async (req, res, next) => {
    try {
            const userId = req.session.userId;
            const page = parseInt(req.query.page) || 1;
            const limit = 10;
            const offset = (page - 1) * limit;
            const now = new Date();

            // 1. user_recommendation에서 해당 유저의 추천 article ID 목록 가져오기
            const [recRows] = await db.query(
                "SELECT recommend_id FROM user_recommendation WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
                [userId]
            );

            let articles = [];
            let total = 0;

            if (!recRows.length) {
                // 추천 데이터 없을 경우 Article 테이블에서 전체 기사 가져오기
                const [[{ count }]] = await db.query("SELECT COUNT(*) as count FROM article");
                total = count;

                const [rows] = await db.query(
                    "SELECT * FROM article ORDER BY created_at DESC LIMIT ? OFFSET ?",
                    [limit, offset]
                );
                articles = rows;

            } else {
                const raw = recRows[0].recommend_id;
                const recommendIds = typeof raw === 'string' ? JSON.parse(raw) : raw;

                total = recommendIds.length;

                // 2. 페이지에 해당하는 ID 슬라이싱 (순서 유지)
                const pagedIds = recommendIds.slice(offset, offset + limit);

                if (pagedIds.length) {
                    // 3. 해당 ID들 가져오기
                    const placeholders = pagedIds.map(() => "?").join(", ");
                    const [rows] = await db.query(
                        `SELECT * FROM article WHERE article_id IN (${placeholders})`,
                        pagedIds
                    );

                    // 4. IN절은 순서를 보장하지 않으므로, recommendIds 순서대로 정렬
                    const articleMap = Object.fromEntries(rows.map(a => [a.article_id, a]));
                    articles = pagedIds.map(id => articleMap[id]).filter(Boolean);
                }
            }

            const totalPages = Math.ceil(total / limit);
            const maxDisplayPages = 5;
            let startPage = Math.max(1, page - Math.floor(maxDisplayPages / 2));
            let endPage = startPage + maxDisplayPages - 1;
            if (endPage > totalPages) {
                endPage = totalPages;
                startPage = Math.max(1, endPage - maxDisplayPages + 1);
            }
            
            // 2. 사용자 성향 통계 가져오기 (예시: 세션의 user_id 사용)
            let stats = {
                weekly: { Left: 0, LeanLeft: 0, Center: 0, LeanRight: 0, Right: 0 },
                total: { Left: 0, LeanLeft: 0, Center: 0, LeanRight: 0, Right: 0 },
                recommend: { Left: 0, LeanLeft: 0, Center: 0, LeanRight: 0, Right: 0 }
            };
            if (userId) {
                const [weekly_rows] = await db.query(`
                    SELECT 
                        a.label,
                        COUNT(CASE WHEN l.viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as weekly_count
                    FROM log l
                    JOIN article a ON l.article_id = a.article_id
                    WHERE l.user_id = ?
                    GROUP BY a.label
                `, [userId]);

                const [total_rows] = await db.query(`
                    SELECT 
                        a.label,
                        COUNT(*) as total_count
                    FROM log l
                    JOIN article a ON l.article_id = a.article_id
                    WHERE l.user_id = ?
                    GROUP BY a.label
                `, [userId]);

                let recommend_rows = [];
                if (articles.length) {
                    [recommend_rows] = await db.query(`
                        SELECT 
                            a.label,
                            COUNT(*) as recommend_count
                        FROM article a
                        WHERE a.article_id IN (${articles.map(() => "?").join(", ")})
                        GROUP BY a.label
                    `, articles.map(a => a.article_id));
                }

                let tSum = 0; // 전체 합계
                let wSum = 0; // 주간 합계
                let rSum = 0; // 추천 합계
                const counts = {
                    Left: { t: 0, w: 0, r: 0 },
                    LeanLeft: { t: 0, w: 0, r: 0 },
                    Center: { t: 0, w: 0, r: 0 },
                    LeanRight: { t: 0, w: 0, r: 0 },
                    Right: { t: 0, w: 0, r: 0 }
                };

                weekly_rows.forEach(row => {
                    if (row.label === 'Left') counts.Left.w = row.weekly_count;
                    else if (row.label === 'Lean Left') counts.LeanLeft.w = row.weekly_count;
                    else if (row.label === 'Center') counts.Center.w = row.weekly_count;
                    else if (row.label === 'Lean Right') counts.LeanRight.w = row.weekly_count;
                    else if (row.label === 'Right') counts.Right.w = row.weekly_count;
                    wSum += row.weekly_count;
                });

                total_rows.forEach(row => {
                    if (row.label === 'Left') counts.Left.t = row.total_count;
                    else if (row.label === 'Lean Left') counts.LeanLeft.t = row.total_count;
                    else if (row.label === 'Center') counts.Center.t = row.total_count;
                    else if (row.label === 'Lean Right') counts.LeanRight.t = row.total_count;
                    else if (row.label === 'Right') counts.Right.t = row.total_count;
                    tSum += row.total_count;
                });

                recommend_rows.forEach(row => {
                    if (row.label === 'Left') counts.Left.r = row.recommend_count;
                    else if (row.label === 'Lean Left') counts.LeanLeft.r = row.recommend_count;
                    else if (row.label === 'Center') counts.Center.r = row.recommend_count;
                    else if (row.label === 'Lean Right') counts.LeanRight.r = row.recommend_count;
                    else if (row.label === 'Right') counts.Right.r = row.recommend_count;
                    rSum += row.recommend_count;
                });



                // 퍼센트 계산 함수
                const getPct = (count, total) => total > 0 ? Math.round((count / total) * 100) : 0;

                stats = {
                    weekly: {
                        Left: getPct(counts.Left.w, wSum),
                        LeanLeft: getPct(counts.LeanLeft.w, wSum),
                        Center: getPct(counts.Center.w, wSum),
                        LeanRight: getPct(counts.LeanRight.w, wSum),
                        Right: getPct(counts.Right.w, wSum)
                    },
                    total: {
                        Left: getPct(counts.Left.t, tSum),
                        LeanLeft: getPct(counts.LeanLeft.t, tSum),
                        Center: getPct(counts.Center.t, tSum),
                        LeanRight: getPct(counts.LeanRight.t, tSum),
                        Right: getPct(counts.Right.t, tSum)
                    },
                    recommend: {
                        Left: getPct(counts.Left.r, rSum),
                        LeanLeft: getPct(counts.LeanLeft.r, rSum),
                        Center: getPct(counts.Center.r, rSum),
                        LeanRight: getPct(counts.LeanRight.r, rSum),
                        Right: getPct(counts.Right.r, rSum)
                    }
                };

                //console.log("===== User Political Stats Debug =====");
                //console.dir(stats, { depth: null, colors: true });  
            }

            // 3. [추가] 최근 본 기사 5개 가져오기
            let recentLogs = [];
            if (userId) {
                [recentLogs] = await db.query(
                    `SELECT a.article_id, a.title, a.publisher, a.label, l.viewed_at 
                    FROM log l
                    JOIN article a ON l.article_id = a.article_id
                    WHERE l.user_id = ?
                    ORDER BY l.viewed_at DESC
                    LIMIT 5`,
                    [userId]
                );
            }
    
            // 3. EJS 렌더링 시 데이터 전달
            res.render('pages/article-list', { 
                title: 'Article List',
                articles: articles,
                stats: stats,
                currentPage: page,
                totalPages: totalPages,
                startPage: startPage,
                endPage: endPage,
                recentLogs: recentLogs // 최근 본 기사 데이터 추가
            });
        } catch (err) {
            console.error(err);
            res.status(500).send("서버 에러");
        }
};

const getSearchResults = async (req, res, next) => {
    const userId = req.session.userId; // 세션에서 userId 가져오기
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

        const [Search_rows] = await db.query(
            `SELECT label, COUNT(*) as search_count 
            FROM Article 
            WHERE ${conditions}
            GROUP BY label`, 
            params
        );

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

        // 2. 사용자 성향 통계 가져오기 (예시: 세션의 user_id 사용)
            let stats = {
                weekly: { Left: 0, LeanLeft: 0, Center: 0, LeanRight: 0, Right: 0 },
                total: { Left: 0, LeanLeft: 0, Center: 0, LeanRight: 0, Right: 0 },
                recommend: { Left: 0, LeanLeft: 0, Center: 0, LeanRight: 0, Right: 0 }
            };
            if (userId) {
                const [weekly_rows] = await db.query(`
                    SELECT 
                        a.label,
                        COUNT(CASE WHEN l.viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as weekly_count
                    FROM log l
                    JOIN article a ON l.article_id = a.article_id
                    WHERE l.user_id = ?
                    GROUP BY a.label
                `, [userId]);

                const [total_rows] = await db.query(`
                    SELECT 
                        a.label,
                        COUNT(*) as total_count
                    FROM log l
                    JOIN article a ON l.article_id = a.article_id
                    WHERE l.user_id = ?
                    GROUP BY a.label
                `, [userId]);

                let tSum = 0; // 전체 합계
                let wSum = 0; // 주간 합계
                let sSum = 0; // 검색 합계
                const counts = {
                    Left: { t: 0, w: 0, s: 0 },
                    LeanLeft: { t: 0, w: 0, s: 0 },
                    Center: { t: 0, w: 0, s: 0 },
                    LeanRight: { t: 0, w: 0, s: 0 },
                    Right: { t: 0, w: 0, s: 0 }
                };

                weekly_rows.forEach(row => {
                    if (row.label === 'Left') counts.Left.w = row.weekly_count;
                    else if (row.label === 'Lean Left') counts.LeanLeft.w = row.weekly_count;
                    else if (row.label === 'Center') counts.Center.w = row.weekly_count;
                    else if (row.label === 'Lean Right') counts.LeanRight.w = row.weekly_count;
                    else if (row.label === 'Right') counts.Right.w = row.weekly_count;
                    wSum += row.weekly_count;
                });

                total_rows.forEach(row => {
                    if (row.label === 'Left') counts.Left.t = row.total_count;
                    else if (row.label === 'Lean Left') counts.LeanLeft.t = row.total_count;
                    else if (row.label === 'Center') counts.Center.t = row.total_count;
                    else if (row.label === 'Lean Right') counts.LeanRight.t = row.total_count;
                    else if (row.label === 'Right') counts.Right.t = row.total_count;
                    tSum += row.total_count;
                });

                Search_rows.forEach(row => {
                    if (row.label === 'Left') counts.Left.s = row.search_count;
                    else if (row.label === 'Lean Left') counts.LeanLeft.s = row.search_count;
                    else if (row.label === 'Center') counts.Center.s = row.search_count;
                    else if (row.label === 'Lean Right') counts.LeanRight.s = row.search_count;
                    else if (row.label === 'Right') counts.Right.s = row.search_count;
                    sSum += row.search_count;
                });


                console.log(counts.Left, counts.LeanLeft, counts.Center, counts.LeanRight, counts.Right);

                // 퍼센트 계산 함수
                const getPct = (count, total) => total > 0 ? Math.round((count / total) * 100) : 0;

                stats = {
                    weekly: {
                        Left: getPct(counts.Left.w, wSum),
                        LeanLeft: getPct(counts.LeanLeft.w, wSum),
                        Center: getPct(counts.Center.w, wSum),
                        LeanRight: getPct(counts.LeanRight.w, wSum),
                        Right: getPct(counts.Right.w, wSum)
                    },
                    total: {
                        Left: getPct(counts.Left.t, tSum),
                        LeanLeft: getPct(counts.LeanLeft.t, tSum),
                        Center: getPct(counts.Center.t, tSum),
                        LeanRight: getPct(counts.LeanRight.t, tSum),
                        Right: getPct(counts.Right.t, tSum)
                    }
                };

                //console.log("===== User Political Stats Debug =====");
                //console.dir(stats, { depth: null, colors: true });  
            }

            // 3. [추가] 최근 본 기사 5개 가져오기
            let recentLogs = [];
            if (userId) {
                [recentLogs] = await db.query(
                    `SELECT a.article_id, a.title, a.publisher, a.label, l.viewed_at
                    FROM log l
                    JOIN article a ON l.article_id = a.article_id
                    WHERE l.log_id IN (
                        SELECT MAX(log_id)
                        FROM log
                        WHERE user_id = ?
                        GROUP BY article_id
                    )
                    ORDER BY l.viewed_at DESC
                    LIMIT 5;`,
                    [userId]
                );
            }

        // 6. EJS 렌더링 (모든 변수를 한꺼번에 전달)
        res.render('pages/article-list.ejs', { 
            articles: rows, 
            searchQuery: query,
            currentPage: page,
            totalPages: totalPages,
            startPage: startPage,
            endPage: endPage,
            stats: stats,
            recentLogs: recentLogs // 최근 본 기사 데이터 추가
        });
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).send("검색 중 오류가 발생했습니다.");
    }
};

const getUserLogs = async (req, res, next) => {
    const userId = req.session.userId;
    const { article_id } = req.body;

    console.log(`[Log] ${userId}, ${article_id}`);
    
    /*
    log_id BIGINT NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    article_id BIGINT NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    */

    // 2. 필수 데이터 체크
    if (!userId || !article_id) {
        console.warn('Missing userId or articleId. Log skipped.');
        return res.sendStatus(204); // 성공은 했으나 처리할 내용 없음
    }

    try {
        // 3. DB Insert (viewed_at은 DB 기본값 사용 가능하지만 전달받은 값 우선 사용)
        await db.query(
            'INSERT INTO log (user_id, article_id, viewed_at) VALUES (?, ?, NOW())',
            [userId, article_id] // timestamp는 전달하지 않음
        );
        
        res.sendStatus(200); 
    } catch (error) {
        console.error('Database Log Error:', error);
        res.sendStatus(500);
    }
};


module.exports = {
    getHomePage,
    getSearchResults,
    getUserLogs
};