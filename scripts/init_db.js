const db = require('../config/db');

const initDB = async () => {
    try {
        // Drop existing tables in the correct order
        console.log('Deleting existing tables...');

        await db.pool.query('SET FOREIGN_KEY_CHECKS = 0;'); // 안전하게 외래키 검사 끔
        await db.pool.query('DROP TABLE IF EXISTS Favorite;');
        await db.pool.query('DROP TABLE IF EXISTS BorrowLog;');
        await db.pool.query('DROP TABLE IF EXISTS Item;');
        await db.pool.query('DROP TABLE IF EXISTS BookCategory;');
        await db.pool.query('DROP TABLE IF EXISTS Category;');
        await db.pool.query('DROP TABLE IF EXISTS Book;');
        await db.pool.query('DROP TABLE IF EXISTS Author;');
        await db.pool.query('DROP TABLE IF EXISTS Admin;');
        await db.pool.query('DROP TABLE IF EXISTS User;');
        await db.pool.query('SET FOREIGN_KEY_CHECKS = 1;');

        // Create tables
        console.log('Creating new tables...');
        // TODO: 설계한 스키마에 맞춰 새로운 테이블을 생성하는 코드를 작성하세요.

        await db.pool.query(`
            CREATE TABLE User (
                user_id BIGINT NOT NULL,
                email VARCHAR(100) NOT NULL,
                password VARCHAR(255) NOT NULL,
                user_name VARCHAR(50) NOT NULL,
                gender ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
                birth_date DATE NOT NULL,
                user_politic VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                PRIMARY KEY (user_id)
            );
        `);

        await db.pool.query(`
            CREATE TABLE Article (
                article_id BIGINT NOT NULL,
                reporter_id BIGINT NOT NULL,
                cluster_id BIGINT NOT NULL,
                title VARCHAR(200) NOT NULL,
                summary TEXT,
                publisher_id BIGINT,
                article_content LONGTEXT,
                created_at DATE,
                progress_percent DECIMAL(5,2),
                conservative_percent DECIMAL(5,2),

                PRIMARY KEY (article_id),
                FOREIGN KEY (reporter_id) REFERENCES Reporter(reporter_id)
                FOREIGN KEY (publisher_id) REFERENCES Publisher(publisher_id)
            );
        `);

        await db.pool.query(`
            CREATE TABLE Comment (
                comment_id BIGINT NOT NULL,
                article_id BIGINT NOT NULL,
                user_id BIGINT NOT NULL,
                comment_content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                like_count INT DEFAULT 0,
                dislike_count INT DEFAULT 0,

                PRIMARY KEY (comment_id),
                FOREIGN KEY (user_id) REFERENCES User(user_id),
                FOREIGN KEY (article_id) REFERENCES Article(article_id)
            );
        `);

        await db.pool.query(`
            CREATE TABLE Log (
                log_id BIGINT NOT NULL,
                user_id BIGINT NOT NULL,
                article_id BIGINT NOT NULL,
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                PRIMARY KEY (log_id),
                FOREIGN KEY (user_id) REFERENCES User(user_id),
                FOREIGN KEY (article_id) REFERENCES Article(article_id)
            );
        `);

        await db.pool.query(`
            CREATE TABLE Reporter (
                reporter_id BIGINT NOT NULL,
                reporter_name VARCHAR(100) NOT NULL,

                PRIMARY KEY (reporter_id)
            );
        `);

        await db.pool.query(`
            CREATE TABLE Publisher (
                publisher_id BIGINT NOT NULL,
                publisher_name VARCHAR(100) NOT NULL,

                PRIMARY KEY (publisher_id)
            );
        `);


        console.log('Database initialization completed successfully.');
    } catch (err) {
        console.error('Database initialization failed:', err);
    } finally {
        db.pool.end();
    }
};

initDB();