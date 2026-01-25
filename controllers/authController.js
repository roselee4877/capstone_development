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

        if (rows && rows.length > 0) {
            const user = rows[0];

            //세션에 사용자 정보 저장
            req.session.userId = username;

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

module.exports = {
    getLoginPage,
    getRegisterPage,
    logoutAndGetHomePage,
    postLogin,
    postRegister,
};
