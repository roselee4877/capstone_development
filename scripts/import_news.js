const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const JSON_DIR = 'C:/Users/rosel/OneDrive/바탕 화면/졸프/ALLSIDES-S/ALLSIDES-S'; 

async function migrateData() {
    const files = fs.readdirSync(JSON_DIR).filter(file => file.endsWith('.json'));
    console.log(`총 ${files.length}개의 파일을 처리하기 시작합니다.`);

    for (const file of files) {
        try {
            const rawData = fs.readFileSync(path.join(JSON_DIR, file));
            const data = JSON.parse(rawData);

            // 1. Article 데이터 추출 및 전처리
            const { id, title, text } = data.article;
            const { label } = data.prediction;
            
            const cleanedContent = text.replace(/ <SEP> /g, '\n\n');

            // 2. Article 테이블 삽입
            const articleSql = `
                INSERT IGNORE INTO Article 
                (article_id, title, article_content, label) 
                VALUES (?, ?, ?, ?)
            `;
            await db.query(articleSql, [id, title, cleanedContent, label]);

            // 3. Keyword 데이터 추출 및 삽입 (sentence 추가)
            if (data.keywords && data.keywords.length > 0) {
                for (const kw of data.keywords) {
                    const keywordSql = `
                        INSERT IGNORE INTO Keyword (article_id, keyword, sentence) 
                        VALUES (?, ?, ?)
                    `;
                    // kw.expanded -> keyword 컬럼
                    // kw.context_sentence -> sentence 컬럼
                    await db.query(keywordSql, [
                        id, 
                        kw.expanded, 
                        kw.context_sentence 
                    ]);
                }
            }

            console.log(`완료: [ID ${id}] ${title.substring(0, 20)}...`);
        } catch (err) {
            console.error(`실패: ${file} - ${err.message}`);
        }
    }

    console.log("\n 모든 데이터 마이그레이션이 종료되었습니다.");
    process.exit();
}

migrateData();