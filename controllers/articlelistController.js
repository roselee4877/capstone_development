// controllers/newsController.js

exports.getNewsList = (req, res) => {
    const newsList = [
        {
            imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDQF-O__3mTpsPkeLl40GPNY-IS9hVaALIob-s9N5csvYky0pwfiCvNAAFJr9zSHHBO8duy9MaIdXiaXhsmKkevwXIRDocW4LKGITdKE_Mbl2GKDJztVp_mVMWdHexbuNBGp-zKVQVFABOetAj2lHmbi_sYm9IB4c8nAcArifbz_Ol1oxCDuehgSb4pM2XiWoFET5wS9obX2m2ooomaqbBfOROHVhlddrVsrTQBIdjzmV5WttSaiusswc5DStXzog-ihuGoIdzVIg",
            title: "뉴스 타이틀 1",
            progressive: 57,
            conservative: 43,
            summary: "뉴스 요약 텍스트가 여기에 들어갑니다.",
            biasText: "중도 성향",
            press: "언론사",
            timeAgo: "10분 전",
            commentCount: 123
        },
        {
            imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAtxf8daMZ7vqGIpHPRQhaFoyhamwitpHNnE7vToUhp0HPMfEFX9g0L1ux6ujCTtZJAhP1xpGXU4ceREyiV_F5mSWvKFtm6FRJcGc8aqRnxbX24brtIDCeYzOqjNLDCmkmBltwWWDIp0tO7OXJejztKV_k4jXYpuwyhAC8H-k48xFYF24Arb0Wo9swr7_86yGkYn8fTLb8twG4664l21fx3b1AoiTvIkuHvBIuMvMYt_1XWxi-jmBj_9TwUqvYTkykpNYqfTx5boA",
            title: "뉴스 타이틀 2",
            progressive: 20,
            conservative: 80,
            summary: "뉴스 요약 텍스트...",
            biasText: "보수 성향",
            press: "언론사",
            timeAgo: "30분 전",
            commentCount: 52
        },
        {
            imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuD9nK6tyTfu2hfhTk8LE5sbtWSGlBOlnrVTL8JF3FwzAYdnbMwaqSvUYGTcIO2spqzJnLNT_uSlzmwc0TRuRrtNel4TuNJbAzQ4ABcoUMthBT_LRnd51fFM80G_0_00FKEu-UvhvX8E5X9OOZac1gQ_r29UEykI6AsObDwUAlcnjRYKUbRj9BRM1G3iqGgf36gic6h6JEVi1Asn1M7SmU4-DnQtqWeugwvZGsaMGWiSiLMCKntRDZWMt7InxkiMSW4n81KTRQ701w",
            title: "뉴스 타이틀 3",
            progressive: 82,
            conservative: 18,
            summary: "뉴스 요약 텍스트...",
            biasText: "진보 성향",
            press: "언론사",
            timeAgo: "1시간 전",
            commentCount: 9
        }
    ];

    res.render("newsList", { newsList });
};
