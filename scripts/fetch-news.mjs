// 경제 뉴스 RSS를 모아 중요도 순으로 정리해 news.json으로 저장하는 스크립트
// 실행: node scripts/fetch-news.mjs  (Node.js 18 이상)
import { writeFile } from "node:fs/promises";

const FEEDS = [
  { source: "연합뉴스", url: "https://www.yna.co.kr/rss/economy.xml" },
  { source: "연합뉴스", url: "https://www.yna.co.kr/rss/market.xml" },
  { source: "한국경제", url: "https://www.hankyung.com/feed/economy" },
  { source: "한국경제", url: "https://www.hankyung.com/feed/finance" },
];

// 중요 키워드: [분류, 가중치, 키워드들] (짧은 단어는 오탐을 막으려고 정규식 사용)
const TOPICS = [
  ["금리", 10, ["기준금리", "금리", "금통위", "한국은행", /(?<![가-힣])한은/, "연준", /(?<![A-Za-z])Fed(?![A-Za-z])/, "FOMC", "파월", "국채"]],
  ["환율", 8, ["환율", "원·달러", "원달러", "달러화", "강달러", "약달러", "엔화", "엔저", "위안화"]],
  ["증시", 7, ["코스피", "코스닥", "증시", "나스닥", "S&P", "다우", "주가", "외국인 순매도", "외국인 순매수"]],
  ["물가", 8, ["물가", "CPI", "인플레", "소비자물가", "생산자물가"]],
  ["성장", 8, ["GDP", "성장률", "경기침체", "경상수지", "수출", "무역수지", "고용", "실업률"]],
  ["산업", 5, ["반도체", "삼성전자", "SK하이닉스", "현대차", "배터리", /(?<![A-Za-z])AI(?![A-Za-z])/]],
  ["부동산", 6, ["부동산", "집값", "아파트", "전세", "주택담보", "대출 규제", "DSR"]],
  ["원자재", 6, ["유가", "국제유가", "원유", "금값", "OPEC"]],
  ["정책", 5, ["관세", "추경", "예산", "세법", "기재부", "금융위", "금감원", "정부 대책"]],
];

// 중요도가 낮은 기사 유형은 제외
const SKIP = /^\s*\[(게시판|인사|부고|포토|사진|화보|모멘트|신간|알림|오늘의|표)\]|\[인사\]|\[부고\]/;

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .trim();

const pick = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decode(m[1]) : "";
};

async function fetchFeed({ source, url }) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (news-bot)" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => ({
      title: pick(item, "title"),
      link: pick(item, "link"),
      date: new Date(pick(item, "pubDate")).toISOString(),
      source,
    }));
  } catch (err) {
    console.warn(`[건너뜀] ${url}: ${err.message}`);
    return [];
  }
}

// 제목을 두 글자 단위로 쪼개 비슷한 기사인지 비교
const bigrams = (s) => {
  const t = s.replace(/[^가-힣A-Za-z0-9]/g, "");
  return new Set([...t].slice(0, -1).map((_, i) => t.slice(i, i + 2)));
};
const similarity = (a, b) => {
  const inter = [...a].filter((x) => b.has(x)).length;
  return inter / Math.min(a.size, b.size || 1);
};

function score(item, now) {
  const tags = [];
  let points = 0;
  for (const [tag, weight, words] of TOPICS) {
    const hits = words.filter((w) => (w instanceof RegExp ? w.test(item.title) : item.title.includes(w))).length;
    if (hits) {
      tags.push(tag);
      points += weight + (hits - 1) * 2;
    }
  }
  const hoursOld = (now - new Date(item.date)) / 36e5;
  points += Math.max(0, 6 - hoursOld / 2); // 최근 12시간 기사 가산점
  return { points, tags };
}

const now = Date.now();
const all = (await Promise.all(FEEDS.map(fetchFeed)))
  .flat()
  .filter((n) => n.title && n.link && !SKIP.test(n.title))
  .filter((n) => now - new Date(n.date) < 48 * 36e5);

// 중복 기사 묶기: 여러 매체가 다룬 소식일수록 중요
const groups = [];
for (const item of all.sort((a, b) => new Date(b.date) - new Date(a.date))) {
  const grams = bigrams(item.title);
  const group = groups.find((g) => similarity(g.grams, grams) > 0.6);
  if (group) group.count++;
  else groups.push({ item, grams, count: 1 });
}

const news = groups
  .map(({ item, count }) => {
    const { points, tags } = score(item, now);
    return { ...item, tags, score: Math.round((points + (count - 1) * 4) * 10) / 10 };
  })
  .filter((n) => n.tags.length)
  .sort((a, b) => b.score - a.score)
  .slice(0, 15);

if (!news.length) {
  console.error("가져온 뉴스가 없어 news.json을 바꾸지 않았어요.");
  process.exit(1);
}

await writeFile(
  new URL("../news.json", import.meta.url),
  JSON.stringify({ updatedAt: new Date(now).toISOString(), items: news }, null, 2) + "\n"
);
console.log(`news.json 저장 완료: ${news.length}건`);
news.slice(0, 5).forEach((n) => console.log(`- [${n.score}] ${n.title} (${n.tags.join(",")})`));
