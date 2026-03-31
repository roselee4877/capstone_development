const db = require('../config/db');

const getLoginPage = (req, res) => {
    res.render('pages/login', { title: 'Login' });
};

const getRegisterPage = (req, res) => {
    res.render('pages/signup', { title: 'Signup' });
};

const logoutAndGetHomePage = (req, res, next) => {
    req.session.destroy(err => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
};

const postLogin = async (req, res, next) => {
    const { username, password } = req.body;
    try {
        
        if (!username || !password) {
            return res.status(400).render('pages/login', { title: 'Login', error: '아이디와 비밀번호를 모두 입력하세요.' });
        }

        const [rows] = await db.pool.execute(
            'SELECT user_id FROM `User` WHERE user_id = ? AND password = ? LIMIT 1',
            [username, password]
        );

        if (rows && rows.length > 0) {//로그인 성공
            const user = rows[0];

            //세션에 사용자 정보 저장
            req.session.userId = username;

            //CROWN - 로그인 시 추천 업데이트 로직
            const today = new Date().toISOString().slice(0, 10); // '2026-03-30'

            // 1. 오늘 추천을 이미 생성했는지 확인
            const [lastUpdate] = await db.query(
                "SELECT updated_at FROM UserRecommendation WHERE user_id = ?", [username]
            );
            const needsUpdate = !lastUpdate || new Date(lastUpdate[0].updated_at).toISOString().slice(0, 10) !== today;
            if (needsUpdate) {
                // 2. 비동기로 모델 서버 호출 (사용자 대기 시간을 줄이기 위해 await를 안 쓸 수도 있음)
                updateUserRecommendations(username); 
            }

            // 로그인 성공 시 홈으로 리다이렉트
            return res.redirect('/');
        } else {
            // 로그인 실패: 다시 로그인 페이지 렌더링 (에러 메시지)
            return res.status(401).render('pages/login', { title: 'Login', error: '아이디 또는 비밀번호가 틀렸습니다.' });
        }

    } catch (err) {
        return next(err);
    }
};

const postRegister = async (req, res, next) => {
    const { username, password, political } = req.body;

    try {

        if (!username || !password || !political) {
            return res.status(400).send('모든 필드를 입력하세요.');
        }

        await db.query(
            `INSERT INTO User (user_id, password, user_politic)
            VALUES (?, ?, ?)`, 
            [username, password, political]
        ); 

        res.redirect('/login');
    } catch (err) {
        return next(err);
    }
};

async function updateUserRecommendations(userId) {
    try {
        const response = await axios.post('http://localhost:8000/predict', { user_id: userId });
        const ids = response.data.recommended_ids;

        // DB에 저장 (오늘의 추천 리스트 확정)
        await db.query(
            "INSERT INTO UserRecommendation (user_id, recommended_article_ids, updated_at) " +
            "VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE recommended_article_ids = ?, updated_at = NOW()",
            [userId, JSON.stringify(ids), JSON.stringify(ids)]
        );
    } catch (err) {
        console.error("추천 갱신 실패:", err);
    }
}

module.exports = {
    getLoginPage,
    getRegisterPage,
    logoutAndGetHomePage,
    postLogin,
    postRegister,
};
