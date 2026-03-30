const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// JSON 파일이 위치한 경로
const JSON_DIR = 'C:/Users/rosel/OneDrive/바탕 화면/졸프_dataset/allsides_l_test_ig_results/ig';
// "C:\Users\rosel\OneDrive\바탕 화면\졸프_dataset\allsides_l_test_ig_results\ig"

async function migrateData() {
    // 1. 디렉토리 존재 여부 확인
    if (!fs.existsSync(JSON_DIR)) {
        console.error(`경로를 찾을 수 없습니다: ${JSON_DIR}`);
        return;
    }

    const files = fs.readdirSync(JSON_DIR).filter(file => file.endsWith('.json'));

    for (const file of files) {
        try {
            const rawData = fs.readFileSync(path.join(JSON_DIR, file));
            const data = JSON.parse(rawData);

            // [데이터 추출]
            const { id, title, text } = data.article;
            const { label, probabilities } = data.prediction;
            
            // <SEP> 태그 줄바꿈 처리
            const cleanedContent = text ? text.replace(/ <SEP> /g, '\n\n') : '';

            // [퍼센트 데이터 변환] 
            // JSON의 0.9979 형태를 DB의 DECIMAL(5,2)에 맞게 99.79로 변환 (100 곱함)
            const leftP = (probabilities.Left * 100).toFixed(2);
            const leanLeftP = (probabilities['Lean Left'] * 100).toFixed(2);
            const centerP = (probabilities.Center * 100).toFixed(2);
            const leanRightP = (probabilities['Lean Right'] * 100).toFixed(2);
            const rightP = (probabilities.Right * 100).toFixed(2);

            // 2. Article 테이블 삽입 (모든 컬럼 매칭)
            const articleSql = `
                INSERT IGNORE INTO Article 
                (article_id, title, article_content, label, 
                 left_percent, lean_left_percent, center_percent, 
                 lean_right_percent, right_percent, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;

            await db.query(articleSql, [
                id, 
                title, 
                cleanedContent, 
                label,
                leftP,
                leanLeftP,
                centerP,
                leanRightP,
                rightP
            ]);

            // 3. Keyword 데이터 추출 및 삽입
            if (data.keywords && Array.isArray(data.keywords)) {
                for (const kw of data.keywords) {
                    // 키워드가 비어있는 경우 방지
                    if (!kw.expanded) continue;

                    const keywordSql = `
                        INSERT IGNORE INTO Keyword (article_id, keyword, sentence) 
                        VALUES (?, ?, ?)
                    `;

                    await db.query(keywordSql, [
                        id, 
                        kw.expanded, 
                        kw.context_sentence || '' // 문장이 없을 경우 공백 처리
                    ]);
                }
            }

            console.log(`✅ 완료: [ID ${id}] ${title.substring(0, 30)}...`);

        } catch (err) {
            console.error(`❌ 실패: ${file} - ${err.message}`);
        }
    }

    console.log("\n✨ 모든 데이터 마이그레이션이 성공적으로 종료되었습니다.");
    process.exit();
}

migrateData();