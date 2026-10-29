// 구글 트렌드 한국 실시간 인기 검색어를 모아 분야별로 정리해 trends.json으로 저장하는 스크립트
// 실행: node scripts/fetch-trends.mjs  (Node.js 18 이상)
import { writeFile } from "node:fs/promises";

const FEED = "https://trends.google.com/trending/rss?geo=KR";

// 분야 분류: 검색어(가중치 3)와 관련 기사 제목에 들어간 단어로 판단 (헷갈리는 단어는 정규식)
const CATEGORIES = [
  ["경제", ["주가", "증시", "코스피", "코스닥", "환율", "금리", "부동산", "아파트", "청약", "실적", "IPO", "상장", "주식", "비트코인", "코인", "투자", "은행", "금융", "원전", "에너지", "수출", "관세"]],
  ["IT·과학", ["AI", "인공지능", "앱", "아이폰", "갤럭시", "반도체", "출시", "업데이트", "구글", "애플", "삼성전자", "오픈AI", "챗GPT", "로봇", "우주", "게임"]],
  ["스포츠", [/(?<![가-힣])경기(?!도)/, "야구", "축구", "농구", "배구", "골프", "리그", /감독(?!판)/, "선수", "우승", "프로야구", "코치", "KBO", "MLB", "EPL", "시리즈", "올림픽", "월드컵", "득점", "홈런", "vs"]],
  ["연예", [/배우(?!자)/, "가수", "뮤비", "뮤직비디오", "MV", "어도어", "하이브", "아이돌", "드라마", "영화", "예능", "콘서트", "컴백", "방송", "출연", "열애", "결혼", "넷플릭스", "OTT", "앨범"]],
  ["정치·사회", ["대통령", "국회", "의원", "정부", "장관", "선거", "검찰", "경찰", "법원", "재판", "사고", "화재", "주민등록", "등·초본", "시신", "구속", "피의자", "군인", "군무원", "국방", "정책", "외교", "북한"]],
  ["생활·날씨", ["날씨", "태풍", "지진", "미세먼지", "추위", "한파", "폭염", "할인", "이벤트", "축제", "여행", "맛집", "휴일", "연휴", "소비자", "쇼핑", "전자상거래"]],
];

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&")
    .trim();

const pick = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? decode(m[1]) : "";
};

// "2000+" → 2000, "1만+" 같은 형식도 처리
const trafficNumber = (t) => {
  const n = parseFloat(t.replace(/[^0-9.]/g, "")) || 0;
  return /만/.test(t) ? n * 10000 : /K/i.test(t) ? n * 1000 : /M/i.test(t) ? n * 1e6 : n;
};

const has = (text, w) => (w instanceof RegExp ? w.test(text) : text.includes(w));

function categorize(keyword, newsText) {
  let best = ["기타", 0];
  for (const [name, words] of CATEGORIES) {
    const hits = words.reduce((sum, w) => sum + (has(keyword, w) ? 3 : 0) + (has(newsText, w) ? 1 : 0), 0);
    if (hits > best[1]) best = [name, hits];
  }
  return best[0];
}

const res = await fetch(FEED, { headers: { "User-Agent": "Mozilla/5.0 (trends-bot)" }, signal: AbortSignal.timeout(15000) });
if (!res.ok) {
  console.error(`트렌드를 가져오지 못했어요: HTTP ${res.status}`);
  process.exit(1);
}
const xml = await res.text();

const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
  const news = [...item.matchAll(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/g)].map(([, n]) => ({
    title: pick(n, "ht:news_item_title"),
    url: pick(n, "ht:news_item_url"),
    source: pick(n, "ht:news_item_source"),
  }));
  const keyword = pick(item, "title");
  const traffic = pick(item, "ht:approx_traffic");
  return {
    keyword,
    traffic,
    trafficValue: trafficNumber(traffic),
    startedAt: new Date(pick(item, "pubDate")).toISOString(),
    picture: pick(item, "ht:picture"),
    category: categorize(keyword, news.map((n) => n.title).join(" ")),
    news: news.filter((n) => n.title && n.url).slice(0, 3),
  };
});

if (!items.length) {
  console.error("가져온 트렌드가 없어 trends.json을 바꾸지 않았어요.");
  process.exit(1);
}

// 검색량 많은 순, 같으면 최근에 뜬 순
items.sort((a, b) => b.trafficValue - a.trafficValue || new Date(b.startedAt) - new Date(a.startedAt));

// 분야별 요약: 어떤 분야가 많이 뜨는지
const summary = Object.entries(
  items.reduce((acc, t) => ((acc[t.category] = (acc[t.category] || 0) + 1), acc), {})
)
  .sort((a, b) => b[1] - a[1])
  .map(([category, count]) => ({ category, count }));

await writeFile(
  new URL("../trends.json", import.meta.url),
  JSON.stringify({ updatedAt: new Date().toISOString(), summary, items }, null, 2) + "\n"
);
console.log(`trends.json 저장 완료: ${items.length}건`);
console.log("분야:", summary.map((s) => `${s.category} ${s.count}`).join(", "));
items.forEach((t, i) => console.log(`${i + 1}. ${t.keyword} (${t.traffic}, ${t.category})`));
