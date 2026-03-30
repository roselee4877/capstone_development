from flask import Flask, request, jsonify
import torch
import numpy as np
# CROWN 모델의 구조가 정의된 파일을 임포트해야 합니다.
# from model.crown import CROWN 

app = Flask(__name__)

# 1. 모델 로드 (서버 시작 시 한 번만 실행)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model_path = "./best_model/CROWN-CROWN.pth"

# 실제 모델 로드 로직 (프로젝트 구조에 맞게 수정 필요)
def load_model():
    # model = CROWN(config) 
    # model.load_state_dict(torch.load(model_path, map_location=device))
    # model.to(device)
    # model.eval()
    print(f"✅ CROWN Model loaded on {device}")
    return None # 실제로는 model 객체 반환

model = load_model()

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        user_history = data.get('history', [])  # 유저가 읽은 기사 ID 리스트
        candidate_news = data.get('candidates', []) # 추천 후보 기사들
        
        if not user_history or not candidate_news:
            return jsonify({"error": "데이터가 부족합니다."}), 400

        # --- [CROWN 모델 추론 로직 시작] ---
        # 1. user_history와 candidates를 모델 입력 텐서로 변환
        # 2. scores = model(user_tensor, candidate_tensor)
        # 3. 임시로 랜덤 점수 생성 (연동 테스트용)
        scores = np.random.uniform(0, 1, len(candidate_news)).tolist()
        # --- [CROWN 모델 추론 로직 끝] ---

        # 기사 ID와 점수를 매칭하여 반환
        result = []
        for i, news in enumerate(candidate_news):
            result.append({
                "article_id": news['id'],
                "score": scores[i]
            })
            
        # 점수 높은 순으로 정렬
        result.sort(key=lambda x: x['score'], reverse=True)

        return jsonify({"recommendations": result})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)