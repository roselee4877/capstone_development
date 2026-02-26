const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// JSON 파일 경로 (본인의 경로에 맞게 수정하세요)
const RECOMMEND_JSON_PATH = 'C:/Users/rosel/OneDrive/바탕 화면/졸프/recommendations.json';

async function migrateRecommendations() {
    try {
        const rawData = fs.readFileSync(RECOMMEND_JSON_PATH);
        const data = JSON.parse(rawData);

        console.log(`총 ${data.recommendations.length}개의 원본 기사에 대한 추천 데이터를 처리를 시작합니다.`);

        for (const item of data.recommendations) {
            const sourceArticleId = item.article_id;

            // 처리할 리스트와 라벨 매핑
            const biasGroups = [
                { list: item.similar_left, label: 'Left' },
                { list: item.similar_center, label: 'Center' },
                { list: item.similar_right, label: 'Right' }
            ];

            for (const group of biasGroups) {
                if (group.list && group.list.length > 0) {
                    for (const target of group.list) {
                        try {
                            const sql = `
                                INSERT IGNORE INTO Recommendation (article_id, label, recommend_id)
                                VALUES (?, ?, ?)
                            `;
                            // target.article_id가 추천된 기사의 ID입니다.
                            await db.query(sql, [sourceArticleId, group.label, target.article_id]);
                        } catch (err) {
                            // Foreign Key 제약 조건 등으로 실패할 경우 (예: 추천된 ID가 Article 테이블에 없을 때)
                            console.error(`[오류] 기사 ${sourceArticleId} -> 추천 ${target.article_id} 삽입 실패: ${err.message}`);
                        }
                    }
                }
            }
            console.log(`완료: 원본 기사 ID ${sourceArticleId}의 추천 리스트 저장 완료`);
        }

        console.log("\n모든 추천 데이터 마이그레이션이 성공적으로 종료되었습니다.");
    } catch (err) {
        console.error("파일 읽기 또는 처리 중 에러 발생:", err);
    } finally {
        process.exit();
    }
}

migrateRecommendations();