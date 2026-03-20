console.log("utils.js 파일이 정상적으로 로드되었습니다!");


function executeSearch() {
    console.log("search\n");
    const query = document.getElementById('searchInput').value;
    if (!query) {
        alert("Please enter a search term.");
        return;
    }

    // 검색 페이지로 이동
    location.href = `/search?q=${encodeURIComponent(query)}`;
}

async function getBiasExplanation() {
    const btn = document.getElementById('ai-btn');
    const explanationDiv = document.getElementById('bias-explanation');
    
    // 로딩 상태 표시
    btn.disabled = true;
    btn.innerHTML = 'analyzing... <span class="animate-spin material-icons">sync</span>';
    
    try {
        // 현재 기사 ID와 라벨 정보를 서버로 전송
        const response = await fetch('/api/explain-article', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                articleId: '<%= article.id %>', // 서버에서 전달받은 ID
                label: '<%= article.label %>' 
            })
        });
        
        const data = await response.json();
        
        explanationDiv.classList.remove('hidden');
        explanationDiv.innerHTML = `<p class="font-semibold mb-2 text-blue-500">✨ Why this bias? :</p>${data.explanation}`;
        btn.classList.add('hidden'); // 한 번 분석하면 버튼은 숨김
    } catch (error) {
        console.error('Error:', error);
        btn.innerHTML = 'failed to get explanation';
        btn.disabled = false;
    }
}

async function toggleExpander(id, keyword) {
    const container = document.getElementById(id);
    const textElement = container.querySelector('.description-text');
    const label = "<%= article.label %>"; // EJS 변수 활용
    
    // 1. 이미 열려있다면 -> 닫기
    if (!container.classList.contains('hidden')) {
        closeExpander(id);
        return;
    }

    // 2. 다른 열려있는 익스펜더들 닫기 (선택 사항)
    /*
    document.querySelectorAll('.expander-content').forEach(el => {
        if (!el.classList.contains('hidden') && el.id !== id) {
            el.style.maxHeight = "0px";
            setTimeout(() => el.classList.add('hidden'), 300);
        }
    });*/

    // 3. 숨김 해제 및 로딩 표시
    container.classList.remove('hidden');
    
    // 4. 데이터 로딩 (내용이 비어있거나 초기 상태일 때만 호출)
    if (textElement.innerText.includes("Analyzing context...")) {
        textElement.innerHTML = '<div class="flex items-center gap-2 text-primary opacity-70"><span class="animate-spin text-xs">↻</span> Analyzing context...</div>';

        // 기사 본문 순수 텍스트 추출 (기존 모달 로직 활용)
        const articleElement = document.querySelector('.article-body');
        const articleText = articleElement ? articleElement.innerText : "";

        try {
            const response = await fetch('/api/explain-keyword', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    keyword: keyword, 
                    label: label, 
                    title: "<%= article.title %>",
                    content: articleText 
                })
            });
            
            const data = await response.json();
            textElement.innerText = data.explanation || "No explanation found.";
            
            // 텍스트가 채워진 후 높이를 다시 계산하여 부드럽게 맞춤
            container.style.maxHeight = container.scrollHeight + "px";
        } catch (error) {
            console.error("Error:", error);
            textElement.innerText = "Explanation could not be retrieved.";
        }
    }

    // 5. 펼치기 애니메이션
    setTimeout(() => {
        container.style.maxHeight = container.scrollHeight + "px";
    }, 10);
}

function closeExpander(id) {
    const container = document.getElementById(id);
    if (!container) return;

    container.style.maxHeight = "0px";
    setTimeout(() => {
        container.classList.add('hidden');
    }, 300);
}


async function explainKeyword(keyword, label) {
    const modal = document.getElementById('keywordModal');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');

    // 모달 열기 및 로딩 표시
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    title.innerText = `${keyword}`;
    content.innerHTML = '<div class="flex justify-center"><span class="animate-spin material-icons">sync</span> Analyzing...</div>';

    // 1. 기사 본문 텍스트 추출 (하이라이트 태그 등을 제외한 순수 텍스트만 가져옴)
    const articleElement = document.querySelector('.article-body');
    const articleText = articleElement ? articleElement.innerText : "";

    try {
        const response = await fetch('/api/explain-keyword', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 2. body에 content(본문) 추가
            body: JSON.stringify({ 
                keyword: keyword, 
                label: label, 
                title: "<%= article.title %>",
                content: articleText // 추출한 본문 텍스트 전달
            })
        });
        const data = await response.json();
        content.innerText = data.explanation;
    } catch (error) {
        console.error("Error:", error);
        content.innerText = "Explanation could not be retrieved.";
    }
}

function closeModal() {
    document.getElementById('keywordModal').classList.add('hidden');
    document.getElementById('keywordModal').classList.remove('flex');
}

function executeSearch() {
    console.log("search\n");
    const query = document.getElementById('searchInput').value;
    if (!query) {
        alert("Please enter a search term.");
        return;
    }

    // 검색 페이지로 이동
    location.href = `/search?q=${encodeURIComponent(query)}`;
}

function logClick(articleId) { 
    if (!articleId) return;

    // 보낼 데이터를 문자열로 준비
    const data = JSON.stringify({ 
        article_id: articleId
    });

    // 1. 타입을 명시한 Blob 객체 생성 (서버의 bodyParser가 인식하기 위함)
    const blob = new Blob([data], { type: 'application/json' });

    // 2. 전송
    navigator.sendBeacon('/api/log-click', blob);
}

function openSplitView(event, url) {
    event.preventDefault();

    const container = document.getElementById('view-container');
    const leftView = document.getElementById('left-view');
    const rightView = document.getElementById('right-view');
    const iframe = document.getElementById('right-iframe');
    const fullViewBtn = document.getElementById('full-view-btn');
    const aside = document.querySelector('aside');


    // URL에 파라미터를 붙입니다. (이미 ?가 있다면 &로 연결)
    const separator = url.includes('?') ? '&' : '?';
    const splitUrl = url + separator + "isSplit=true";

    // 1. iframe에 파라미터가 붙은 URL 로드
    iframe.src = splitUrl;

    // 1. 사이드바 숨기기
    if (aside) aside.style.display = 'none';
    
    // 2. 메인 컨테이너를 전체 너비(3컬럼)로 확장
    container.classList.remove('lg:col-span-2');
    container.classList.add('lg:col-span-3');

    // 3. 왼쪽 창 너비 조정
    leftView.style.width = '50%';

    // 4. 오른쪽 창 표시 및 너비 조정
    rightView.classList.remove('hidden'); // hidden 클래스 제거
    rightView.style.width = '50%';
    rightView.style.display = 'flex'; // hidden이었던 것을 flex로 강제 전환

    // 5. iframe 로드
    //iframe.src = url;
    
    // 6. 전체보기 버튼 링크 설정
    if (fullViewBtn) {
        fullViewBtn.onclick = () => window.location.href = url;
    }
}

function closeSplitView() {
    const container = document.getElementById('view-container');
    const leftView = document.getElementById('left-view');
    const rightView = document.getElementById('right-view');
    const aside = document.querySelector('aside');

    // 1. 사이드바 복구
    if (aside) aside.style.display = 'block';

    // 2. 메인 컨테이너 원래대로 (2컬럼)
    container.classList.remove('lg:col-span-3');
    container.classList.add('lg:col-span-2');

    // 3. 레이아웃 초기화
    leftView.style.width = '100%';
    rightView.style.width = '0';
    rightView.style.display = 'none';
    
    // 4. iframe 비우기 (메모리 및 소리 재생 방지)
    document.getElementById('right-iframe').src = "about:blank";
}