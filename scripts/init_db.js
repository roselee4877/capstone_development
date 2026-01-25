const db = require('../config/db');

const initDB = async () => {
    try {
        // Drop existing tables in the correct order
        console.log('Deleting existing tables...');

        await db.pool.query('SET FOREIGN_KEY_CHECKS = 0;'); // 안전하게 외래키 검사 끔
        await db.pool.query('DROP TABLE IF EXISTS User;');
        await db.pool.query('DROP TABLE IF EXISTS Article;');
        await db.pool.query('DROP TABLE IF EXISTS Log;');
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
                cluster_id BIGINT NOT NULL,
                title VARCHAR(200) NOT NULL,
                summary TEXT,
                reporter VARCHAR(50),
                publisher VARCHAR(50),
                created_at DATE,
                article_content LONGTEXT,
                progress_percent DECIMAL(5,2),
                conservative_percent DECIMAL(5,2),

                PRIMARY KEY (article_id)
            );
        `);

        await db.pool.query(`
            CREATE TABLE Log (
                log_id BIGINT NOT NULL,
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

                PRIMARY KEY (log_id, keyword),
                FOREIGN KEY (article_id) REFERENCES Article(article_id)
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