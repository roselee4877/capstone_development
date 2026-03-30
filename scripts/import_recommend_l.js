const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const RECOMMEND_JSON_PATH = 'C:/Users/rosel/OneDrive/바탕 화면/졸프_dataset/recommendations_allsides_l_test.json';

async function migrateRecommendations() {
    try {
        const rawData = fs.readFileSync(RECOMMEND_JSON_PATH, 'utf8');
        const data = JSON.parse(rawData);

        // [수정된 부분] data 객체 안에 있는 'recommendations' 배열을 가져옵니다.
        const recommendations = data.recommendations;

        if (!Array.isArray(recommendations)) {
            throw new Error("JSON 내부에 'recommendations' 배열이 존재하지 않습니다.");
        }

        console.log(`총 ${recommendations.length}개의 원본 기사에 대한 처리를 시작합니다.`);

        let totalInserted = 0;

        for (const item of recommendations) {
            const sourceId = item.article_id;

            // 5단계 성향 리스트 매핑 (JSON 키값과 일치시킴)
            const groups = [
                { list: item.similar_left, label: 'Left' },
                { list: item.similar_lean_left, label: 'Lean Left' },
                { list: item.similar_center, label: 'Center' },
                { list: item.similar_lean_right, label: 'Lean Right' },
                { list: item.similar_right, label: 'Right' }
            ];

            for (const group of groups) {
                if (group.list && group.list.length > 0) {
                    for (const target of group.list) {
                        try {
                            const targetId = target.article_id;

                            // 자기 자신 제외
                            if (sourceId === targetId) continue;

                            const sql = `
                                INSERT IGNORE INTO Recommendation (article_id, label, recommend_id)
                                VALUES (?, ?, ?)
                            `;

                            await db.query(sql, [sourceId, group.label, targetId]);
                            totalInserted++;
                        } catch (err) {
                            // Foreign Key 에러 등이 발생할 경우 출력 (디버깅용)
                            // console.error(`❌ 삽입 실패 (ID: ${sourceId} -> ${target.article_id})`);
                        }
                    }
                }
            }

            // 500개마다 진행 상황 출력
            const currentIndex = recommendations.indexOf(item);
            if (currentIndex % 500 === 0) {
                console.log(`⏳ 진행 중... (${currentIndex} / ${recommendations.length})`);
            }
        }

        console.log(`\n✨ 마이그레이션 완료! 총 ${totalInserted}개의 추천 관계 저장 성공.`);
    } catch (err) {
        console.error("❌ 오류 발생:", err.message);
    } finally {
        process.exit();
    }
}

migrateRecommendations();