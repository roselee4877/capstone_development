// 실제로는 DB에서 가져오면 됨
const sampleArticle = {
    id: 1,
    title: "샘플 기사 제목",
    press: "한겨레",
    reporter: "김기자",
    publishedAt: "2025-03-02 10:10",
    image: "https://picsum.photos/800/400",
    content: [
        "첫 번째 문단입니다.",
        "두 번째 문단입니다.",
        "세 번째 문단입니다."
    ],
    progressive: 70,
    conservative: 30,
};

const sampleComments = [
    {
        username: "철수",
        profile: "https://picsum.photos/200",
        time: "5분 전",
        text: "좋은 기사네요.",
        likes: 12,
        dislikes: 1
    },
    {
        username: "영희",
        profile: "https://picsum.photos/201",
        time: "10분 전",
        text: "전 좀 다르게 생각합니다.",
        likes: 3,
        dislikes: 5
    }
];

const otherViews = [
    { title: "반대 시각의 기사 1", press: "조선일보", link: "/article/2" },
    { title: "반대 시각의 기사 2", press: "중앙일보", link: "/article/3" },
];

const sameViews = [
    { title: "유사 관점 기사 1", press: "경향신문", link: "/article/4" },
    { title: "유사 관점 기사 2", press: "오마이뉴스", link: "/article/5" },
];

exports.getArticle = (req, res) => {
    const { id } = req.params;

    // 실제로는 DB에서 id로 기사 조회
    const article = sampleArticle;

    res.render("pages/article-detail", {
        article,
        comments: sampleComments,
        otherViews,
        sameViews,
        searchKeyword: "",
        user: { username: "rose" } // 로그인 유저 예시
    });
};

exports.addComment = (req, res) => {
    const { id } = req.params;
    const { text } = req.body;

    // 실제로는 DB INSERT
    sampleComments.push({
        username: "익명",
        profile: "https://picsum.photos/205",
        time: "지금",
        text,
        likes: 0,
        dislikes: 0
    });

    res.redirect(`/article/${id}`);
};
