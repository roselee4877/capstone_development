const db = require('../config/db');

const initDB = async () => {
    try {
        // Drop existing tables in the correct order
        console.log('Deleting existing tables...');

        await db.pool.query('SET FOREIGN_KEY_CHECKS = 0;'); // 안전하게 외래키 검사 끔
        await db.pool.query('DROP TABLE IF EXISTS User;');
        await db.pool.query('DROP TABLE IF EXISTS Article;');
        await db.pool.query('DROP TABLE IF EXISTS Log;');
        await db.pool.query('DROP TABLE IF EXISTS Keyword;');
        await db.pool.query('DROP TABLE IF EXISTS recommendation;');
        await db.pool.query('SET FOREIGN_KEY_CHECKS = 1;');

        // Create tables
        console.log('Creating new tables...');

        await db.pool.query(`
            CREATE TABLE User (
                user_id VARCHAR(50) NOT NULL,
                password VARCHAR(255) NOT NULL,
                user_politic VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                PRIMARY KEY (user_id)
            );
        `);

        await db.pool.query(`
            CREATE TABLE Article (
                article_id BIGINT NOT NULL,
                title VARCHAR(200) NOT NULL,
                article_content LONGTEXT,
                label VARCHAR(10),
                left_percent DECIMAL(5,2),
                lean_left_percent DECIMAL(5,2),
                center_percent DECIMAL(5,2),
                lean_right_percent DECIMAL(5,2),
                right_percent DECIMAL(5,2),

                summary TEXT,
                reporter VARCHAR(50),
                publisher VARCHAR(50),
                created_at DATE,

                PRIMARY KEY (article_id)
            );
        `);

        await db.pool.query(`
            CREATE TABLE Log (
                log_id BIGINT AUTO_INCREMENT,
                user_id VARCHAR(50) NOT NULL,
                article_id BIGINT NOT NULL,
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                PRIMARY KEY (log_id),
                FOREIGN KEY (user_id) REFERENCES User(user_id),
                FOREIGN KEY (article_id) REFERENCES Article(article_id)
            );
        `);

        await db.pool.query(`
            CREATE TABLE Keyword (
                article_id BIGINT NOT NULL,
                keyword VARCHAR(200) NOT NULL,
                sentence TEXT,

                PRIMARY KEY (article_id, keyword),
                FOREIGN KEY (article_id) REFERENCES Article(article_id)
            );
        `);

        await db.pool.query(`
            CREATE TABLE Recommendation (
                article_id BIGINT NOT NULL,
                label VARCHAR(30),
                recommend_id BIGINT NOT NULL,

                PRIMARY KEY (article_id, recommend_id),
                FOREIGN KEY (article_id) REFERENCES Article(article_id),
                FOREIGN KEY (recommend_id) REFERENCES Article(article_id)
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