// 모바일 햄버거 메뉴
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");

menuBtn.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuBtn.classList.toggle("open", isOpen);
  menuBtn.setAttribute("aria-expanded", isOpen);
});

// 메뉴 링크 클릭 시 메뉴 닫기
nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuBtn.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", false);
  });
});

// 화면이 넓어지면 열린 메뉴 정리
window.addEventListener("resize", () => {
  if (window.innerWidth > 640) {
    nav.classList.remove("open");
    menuBtn.classList.remove("open");
  }
});

// 스크롤 시 헤더 그림자
const header = document.querySelector(".header");
window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 10);
});

// 맨 위로 버튼
document.getElementById("toTop").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// 카드 스크롤 등장 애니메이션
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add("visible"), i * 120);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

// 푸터 연도 자동 갱신
document.getElementById("year").textContent = new Date().getFullYear();

// ===== 로그인 / 회원가입 =====
// 서버가 없어서 계정은 이 브라우저(localStorage)에만 저장돼요.
const USERS_KEY = "vibe_users";
const SESSION_KEY = "vibe_session";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const welcomePanel = document.getElementById("welcomePanel");
const loginStatus = document.getElementById("loginStatus");

const emailInput = document.getElementById("email");
const pwInput = document.getElementById("password");
const rememberInput = document.getElementById("remember");

const suName = document.getElementById("suName");
const suEmail = document.getElementById("suEmail");
const suPassword = document.getElementById("suPassword");
const suPassword2 = document.getElementById("suPassword2");
const suAgree = document.getElementById("suAgree");

// 저장소 읽기/쓰기 (사생활 보호 모드 등에서 실패해도 페이지는 동작하도록)
function readJSON(storage, key, fallback) {
  try {
    return JSON.parse(storage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const getUsers = () => readJSON(localStorage, USERS_KEY, []);
const findUser = (email) => getUsers().find((u) => u.email === email);

function getSession() {
  return readJSON(localStorage, SESSION_KEY, null) || readJSON(sessionStorage, SESSION_KEY, null);
}
function saveSession(email, remember) {
  writeJSON(remember ? localStorage : sessionStorage, SESSION_KEY, { email });
}
function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

// 비밀번호는 그대로 저장하지 않고 해시값으로 저장
async function hashPassword(email, password) {
  const text = `${email}:${password}`;
  if (!window.crypto?.subtle) return btoa(unescape(encodeURIComponent(text)));
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 오류 표시
function setError(input, message) {
  const field = input.closest(".field");
  field.classList.toggle("error", Boolean(message));
  field.querySelector(".field__msg").textContent = message;
}

// 입력칸별 검사 규칙: 오류 문구를 돌려주고, 문제없으면 ""
const rules = new Map([
  [emailInput, () => checkEmail(emailInput.value)],
  [pwInput, () => (!pwInput.value ? "비밀번호를 입력해 주세요." : "")],
  [suName, () => (!suName.value.trim() ? "이름을 입력해 주세요." : "")],
  [suEmail, () => checkEmail(suEmail.value)],
  [suPassword, () => {
    const v = suPassword.value;
    if (!v) return "비밀번호를 입력해 주세요.";
    if (v.length < 8) return "비밀번호는 8자 이상이어야 해요.";
    if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return "영문과 숫자를 함께 써 주세요.";
    return "";
  }],
  [suPassword2, () => {
    if (!suPassword2.value) return "비밀번호를 한 번 더 입력해 주세요.";
    return suPassword2.value !== suPassword.value ? "비밀번호가 일치하지 않아요." : "";
  }],
  [suAgree, () => (!suAgree.checked ? "약관에 동의해 주세요." : "")],
]);

function checkEmail(value) {
  const v = value.trim();
  if (!v) return "이메일을 입력해 주세요.";
  return EMAIL_RE.test(v) ? "" : "올바른 이메일 형식이 아니에요.";
}

function validate(input) {
  const message = rules.get(input)();
  setError(input, message);
  return !message;
}

// 폼 전체 검사: 첫 번째 잘못된 칸에 포커스
function validateForm(form) {
  const inputs = [...rules.keys()].filter((input) => form.contains(input));
  const invalid = inputs.filter((input) => !validate(input));
  if (invalid.length) invalid[0].focus();
  return invalid.length === 0;
}

// 입력 중에는 이미 표시된 오류만 다시 검사
rules.forEach((_, input) => {
  const event = input.type === "checkbox" ? "change" : "input";
  input.addEventListener(event, () => {
    if (input.closest(".field").classList.contains("error")) validate(input);
    if (input === suPassword && suPassword2.value) validate(suPassword2);
  });
});
[emailInput, suEmail].forEach((input) =>
  input.addEventListener("blur", () => input.value && validate(input))
);

// 비밀번호 보기/숨기기 (모든 비밀번호 칸 공통)
document.querySelectorAll(".pw-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = btn.previousElementSibling;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.textContent = show ? "숨기기" : "보기";
    btn.setAttribute("aria-label", show ? "비밀번호 숨기기" : "비밀번호 보기");
  });
});

// 화면 전환: 로그인 ↔ 회원가입 ↔ 로그인 후
function showPanel(panel) {
  [loginForm, signupForm, welcomePanel].forEach((p) => (p.hidden = p !== panel));
  panel.querySelectorAll(".field").forEach((f) => {
    f.classList.remove("error");
    f.querySelector(".field__msg").textContent = "";
  });
  loginStatus.textContent = "";
}

document.querySelectorAll("[data-show]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const panel = document.getElementById(link.dataset.show);
    showPanel(panel);
    panel.querySelector("input")?.focus();
  });
});

function showWelcome(user) {
  document.getElementById("welcomeAvatar").textContent = user.name.charAt(0);
  document.getElementById("welcomeTitle").textContent = `${user.name} 님, 환영합니다!`;
  document.getElementById("welcomeEmail").textContent = user.email;
  showPanel(welcomePanel);
}

function setLoading(form, loading, label) {
  const btn = form.querySelector(".login__btn");
  btn.disabled = loading;
  btn.textContent = label;
}

// 회원가입
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateForm(signupForm)) return;

  const email = suEmail.value.trim().toLowerCase();
  if (findUser(email)) {
    setError(suEmail, "이미 가입된 이메일이에요.");
    return suEmail.focus();
  }

  setLoading(signupForm, true, "가입 중...");
  const user = {
    name: suName.value.trim(),
    email,
    passwordHash: await hashPassword(email, suPassword.value),
    createdAt: new Date().toISOString(),
  };
  const saved = writeJSON(localStorage, USERS_KEY, [...getUsers(), user]);
  setLoading(signupForm, false, "가입하기");

  if (!saved) {
    setError(suAgree, "이 브라우저에서는 저장할 수 없어요. 사생활 보호 모드를 꺼 주세요.");
    return;
  }

  // 가입 완료 → 로그인 화면으로, 이메일 미리 채우기
  signupForm.reset();
  signupForm.querySelectorAll(".pw-toggle").forEach((btn) => {
    btn.previousElementSibling.type = "password";
    btn.textContent = "보기";
  });
  showPanel(loginForm);
  emailInput.value = email;
  pwInput.value = "";
  loginStatus.textContent = "회원가입이 완료됐어요. 로그인해 주세요.";
  pwInput.focus();
});

// 로그인
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginStatus.textContent = "";
  if (!validateForm(loginForm)) return;

  const email = emailInput.value.trim().toLowerCase();
  const user = findUser(email);
  if (!user) {
    setError(emailInput, "가입되지 않은 이메일이에요.");
    return emailInput.focus();
  }

  setLoading(loginForm, true, "로그인 중...");
  const hash = await hashPassword(email, pwInput.value);
  setLoading(loginForm, false, "로그인");

  if (hash !== user.passwordHash) {
    setError(pwInput, "비밀번호가 맞지 않아요.");
    return pwInput.focus();
  }

  saveSession(email, rememberInput.checked);
  loginForm.reset();
  showWelcome(user);
});

// 로그아웃
document.getElementById("logoutBtn").addEventListener("click", () => {
  clearSession();
  showPanel(loginForm);
});

// 새로고침해도 로그인 상태 유지
const session = getSession();
const sessionUser = session && findUser(session.email);
if (sessionUser) showWelcome(sessionUser);

// ===== 오늘의 핵심 경제 뉴스 =====
// news.json은 scripts/fetch-news.mjs가 만들어요 (GitHub Actions가 매시간 갱신).
const newsCard = document.getElementById("newsCard");
const newsModal = document.getElementById("newsModal");
const newsList = document.getElementById("newsList");
const newsFilter = document.getElementById("newsFilter");
const econPreview = document.getElementById("econPreview");

let newsItems = [];
let newsFilterTag = "전체";
let previewIndex = 0;
let previewTimer = null;

function timeAgo(iso) {
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  if (min < 60 * 24) return `${Math.floor(min / 60)}시간 전`;
  return `${Math.floor(min / 1440)}일 전`;
}

// 텍스트로만 넣어서 기사 제목에 HTML이 섞여도 안전하게
function el(tag, { dataset, ...props } = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  if (dataset) Object.assign(node.dataset, dataset);
  node.append(...children);
  return node;
}

// 카드 미리보기: 상위 5개 기사를 번갈아 보여주기
function showPreview(i) {
  const top = newsItems.slice(0, 5);
  const item = top[i];
  econPreview.classList.add("fade");
  setTimeout(() => {
    document.getElementById("econRank").textContent = `중요도 ${i + 1}위`;
    document.getElementById("econTitle").textContent = item.title;
    document.getElementById("econMeta").textContent = `${item.source} · ${timeAgo(item.date)} · ${item.tags.join(" · ")}`;
    document.querySelectorAll("#econDots span").forEach((d, n) => d.classList.toggle("on", n === i));
    econPreview.classList.remove("fade");
  }, 250);
}

function startPreview() {
  const count = Math.min(newsItems.length, 5);
  document.getElementById("econDots").replaceChildren(...Array.from({ length: count }, () => el("span")));
  showPreview(0);
  clearInterval(previewTimer);
  // 움직임 줄이기 설정을 켠 사용자에게는 자동으로 넘기지 않음
  if (count > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    previewTimer = setInterval(() => {
      previewIndex = (previewIndex + 1) % count;
      showPreview(previewIndex);
    }, 5000);
  }
}

function renderFilter() {
  const tags = ["전체", ...new Set(newsItems.flatMap((n) => n.tags))];
  newsFilter.replaceChildren(
    ...tags.map((tag) => {
      const btn = el("button", { type: "button", textContent: tag });
      btn.setAttribute("aria-pressed", tag === newsFilterTag);
      btn.addEventListener("click", () => {
        newsFilterTag = tag;
        renderFilter();
        renderList();
      });
      return btn;
    })
  );
}

function renderList() {
  const items = newsFilterTag === "전체" ? newsItems : newsItems.filter((n) => n.tags.includes(newsFilterTag));
  newsList.replaceChildren(
    ...items.map((n, i) =>
      el("li", {}, [
        el("a", { href: n.link, target: "_blank", rel: "noopener noreferrer" }, [
          el("span", { className: "news-list__rank", textContent: i + 1 }),
          el("span", {}, [
            el("span", { className: "news-list__title", textContent: n.title }),
            el("span", { className: "news-list__meta" }, [
              ...n.tags.map((t) => el("span", { className: "tag", textContent: t })),
              `${n.source} · ${timeAgo(n.date)}`,
            ]),
          ]),
        ]),
      ])
    )
  );
}

function showNewsError() {
  document.getElementById("econRank").textContent = "경제 뉴스";
  document.getElementById("econTitle").textContent = "뉴스를 불러오지 못했어요.";
  document.getElementById("econMeta").textContent = "눌러서 다시 시도";
  newsFilter.replaceChildren();
  const retry = el("button", { type: "button", textContent: "다시 시도" });
  retry.addEventListener("click", loadNews);
  newsList.replaceChildren(
    el("li", { className: "news-list__empty" }, [
      "뉴스를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.",
      el("br"),
      retry,
    ])
  );
}

async function loadNews() {
  try {
    const res = await fetch(`news.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    newsItems = data.items || [];
    if (!newsItems.length) throw new Error("empty");

    const updated = `${timeAgo(data.updatedAt)} 업데이트 · 중요도 순`;
    document.getElementById("newsUpdated").textContent = updated;
    document.getElementById("newsModalSub").textContent = updated;
    startPreview();
    renderFilter();
    renderList();
  } catch {
    showNewsError();
  }
}

newsCard.addEventListener("click", () => {
  if (!newsItems.length) loadNews();
  newsModal.showModal();
});
document.getElementById("newsClose").addEventListener("click", () => newsModal.close());
// 바깥(어두운 배경)을 누르면 닫기
newsModal.addEventListener("click", (e) => {
  if (e.target === newsModal) newsModal.close();
});

loadNews();

// ===== 서울 날씨 =====
// Open-Meteo: 무료이고 API 키가 필요 없어요.
const SEOUL = { lat: 37.5665, lon: 126.978 };
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${SEOUL.lat}&longitude=${SEOUL.lon}` +
  "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,is_day" +
  "&hourly=temperature_2m,weather_code,precipitation_probability,is_day" +
  "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
  "&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=7";
const AIR_URL =
  "https://air-quality-api.open-meteo.com/v1/air-quality" +
  `?latitude=${SEOUL.lat}&longitude=${SEOUL.lon}&current=pm10,pm2_5&timezone=Asia%2FSeoul`;

const weatherCard = document.getElementById("weatherCard");
const weatherModal = document.getElementById("weatherModal");
const weatherBody = document.getElementById("weatherBody");
let weatherData = null;

// WMO 날씨 코드 → [설명, 낮 아이콘, 밤 아이콘, 배경]
function describeWeather(code) {
  if (code === 0) return ["맑음", "☀️", "🌙", "clear"];
  if (code === 1) return ["대체로 맑음", "🌤️", "🌙", "clear"];
  if (code === 2) return ["구름 조금", "⛅", "☁️", "cloudy"];
  if (code === 3) return ["흐림", "☁️", "☁️", "cloudy"];
  if (code === 45 || code === 48) return ["안개", "🌫️", "🌫️", "cloudy"];
  if (code >= 51 && code <= 57) return ["이슬비", "🌦️", "🌧️", "rain"];
  if (code >= 61 && code <= 67) return ["비", "🌧️", "🌧️", "rain"];
  if (code >= 71 && code <= 77) return ["눈", "🌨️", "🌨️", "snow"];
  if (code >= 80 && code <= 82) return ["소나기", "🌦️", "🌧️", "rain"];
  if (code === 85 || code === 86) return ["소낙눈", "🌨️", "🌨️", "snow"];
  if (code >= 95) return ["뇌우", "⛈️", "⛈️", "rain"];
  return ["알 수 없음", "🌡️", "🌡️", "cloudy"];
}
const weatherIcon = (code, isDay = 1) => describeWeather(code)[isDay ? 1 : 2];

// 미세먼지 등급 (환경부 기준)
function airGrade(value, [good, normal, bad]) {
  if (value == null) return null;
  if (value <= good) return "좋음";
  if (value <= normal) return "보통";
  if (value <= bad) return "나쁨";
  return "매우나쁨";
}

const round = (n) => Math.round(n);
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function renderWeatherCard({ current, daily }, air) {
  const [cond, , , theme] = describeWeather(current.weather_code);
  const thumb = document.getElementById("weatherThumb");
  thumb.className = `card__thumb thumb--weather is-${current.is_day ? theme : "night"}`;
  document.getElementById("wxIcon").textContent = weatherIcon(current.weather_code, current.is_day);
  document.getElementById("wxTemp").textContent = `${round(current.temperature_2m)}°`;
  document.getElementById("wxCond").textContent = `서울 · ${cond}`;
  document.getElementById("wxRange").textContent =
    `최고 ${round(daily.temperature_2m_max[0])}° / 최저 ${round(daily.temperature_2m_min[0])}° · 체감 ${round(current.apparent_temperature)}°`;
  const pm = air && airGrade(air.pm10, [30, 80, 150]);
  document.getElementById("wxExtra").textContent =
    `습도 ${current.relative_humidity_2m}% · 바람 ${current.wind_speed_10m.toFixed(1)}m/s` + (pm ? ` · 미세먼지 ${pm}` : "");
}

function stat(label, value, className = "") {
  return el("div", { className: "wd-stat" }, [el("small", { textContent: label }), el("b", { textContent: value, className })]);
}

function renderWeatherDetail({ current, hourly, daily }, air) {
  const [cond] = describeWeather(current.weather_code);
  const pm10 = air && airGrade(air.pm10, [30, 80, 150]);
  const pm25 = air && airGrade(air.pm2_5, [15, 35, 75]);

  // 지금부터 24시간 (3시간 간격)
  const nowIdx = Math.max(0, hourly.time.findIndex((t) => t >= current.time.slice(0, 13)));
  const hours = [];
  for (let i = nowIdx; i < Math.min(nowIdx + 24, hourly.time.length); i += 3) {
    const rain = hourly.precipitation_probability[i];
    hours.push(
      el("div", { className: "wd-hour" }, [
        i === nowIdx ? "지금" : `${Number(hourly.time[i].slice(11, 13))}시`,
        el("span", { textContent: weatherIcon(hourly.weather_code[i], hourly.is_day[i]) }),
        el("b", { textContent: `${round(hourly.temperature_2m[i])}°` }),
        el("small", { textContent: rain >= 20 ? `💧${rain}%` : "" }),
      ])
    );
  }

  // 7일 예보: 주간 최저~최고 범위 안에서 막대 위치 계산
  const lo = Math.min(...daily.temperature_2m_min);
  const hi = Math.max(...daily.temperature_2m_max);
  const pct = (t) => ((t - lo) / (hi - lo || 1)) * 100;
  const days = daily.time.map((date, i) => {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const min = daily.temperature_2m_min[i];
    const max = daily.temperature_2m_max[i];
    const rain = daily.precipitation_probability_max[i];
    const bar = el("i");
    bar.style.left = `${pct(min)}%`;
    bar.style.right = `${100 - pct(max)}%`;
    return el("li", { className: "wd-day" }, [
      el("span", { className: "wd-day__name", textContent: i === 0 ? "오늘" : `${DAY_NAMES[weekday]}요일` }),
      el("span", { className: "wd-day__icon", textContent: weatherIcon(daily.weather_code[i]) }),
      el("span", { className: "wd-day__rain", textContent: rain >= 20 ? `💧${rain}%` : "" }),
      el("span", { className: "wd-day__range" }, [
        `${round(min)}°`,
        el("span", { className: "wd-bar" }, [bar]),
        el("b", { textContent: `${round(max)}°` }),
      ]),
    ]);
  });

  weatherBody.replaceChildren(
    el("div", { className: "wd-now" }, [
      el("span", { className: "wd-now__icon", textContent: weatherIcon(current.weather_code, current.is_day) }),
      el("span", { className: "wd-now__temp", textContent: `${round(current.temperature_2m)}°` }),
      el("div", { className: "wd-now__desc" }, [
        el("strong", { textContent: cond }),
        el("br"),
        `최고 ${round(daily.temperature_2m_max[0])}° / 최저 ${round(daily.temperature_2m_min[0])}°`,
      ]),
    ]),
    el("div", { className: "wd-stats" }, [
      stat("체감", `${round(current.apparent_temperature)}°`),
      stat("습도", `${current.relative_humidity_2m}%`),
      stat("바람", `${current.wind_speed_10m.toFixed(1)}m/s`),
      pm10 ? stat("미세먼지", pm10, `aq-${pm10}`) : stat("강수량", `${current.precipitation}mm`),
    ]),
    ...(pm25 ? [el("p", { className: "wd-air", textContent: `초미세먼지 ${pm25} (${round(air.pm2_5)}㎍/㎥) · 미세먼지 ${round(air.pm10)}㎍/㎥` })] : []),
    el("h3", { className: "wd-title", textContent: "시간별 예보" }),
    el("div", { className: "wd-hours" }, hours),
    el("h3", { className: "wd-title", textContent: "7일 예보" }),
    el("ol", { className: "wd-days" }, days)
  );
}

function showWeatherError() {
  document.getElementById("weatherThumb").className = "card__thumb thumb--weather is-error";
  document.getElementById("wxIcon").textContent = "⚠️";
  document.getElementById("wxTemp").textContent = "--°";
  document.getElementById("wxCond").textContent = "날씨를 불러오지 못했어요.";
  document.getElementById("wxRange").textContent = "눌러서 다시 시도";
  document.getElementById("wxExtra").textContent = "";
  const retry = el("button", { type: "button", textContent: "다시 시도" });
  retry.addEventListener("click", loadWeather);
  weatherBody.replaceChildren(
    el("div", { className: "wd-error" }, ["날씨를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.", el("br"), retry])
  );
}

async function loadWeather() {
  try {
    const [res, air] = await Promise.all([
      fetch(WEATHER_URL),
      // 미세먼지는 실패해도 날씨는 보여주기
      fetch(AIR_URL)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => j?.current ?? null)
        .catch(() => null),
    ]);
    if (!res.ok) throw new Error(res.status);
    weatherData = await res.json();

    renderWeatherCard(weatherData, air);
    renderWeatherDetail(weatherData, air);
    const time = new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
    document.getElementById("weatherUpdated").textContent = `${time} 기준 · 눌러서 7일 예보 보기`;
    document.getElementById("weatherModalSub").textContent = `${time} 기준`;
  } catch {
    weatherData = null;
    showWeatherError();
  }
}

weatherCard.addEventListener("click", () => {
  if (!weatherData) loadWeather();
  weatherModal.showModal();
});
document.getElementById("weatherClose").addEventListener("click", () => weatherModal.close());
weatherModal.addEventListener("click", (e) => {
  if (e.target === weatherModal) weatherModal.close();
});

loadWeather();
setInterval(loadWeather, 10 * 60 * 1000);

// ===== 요즘 트렌드 =====
// trends.json은 scripts/fetch-trends.mjs가 만들어요 (GitHub Actions가 매시간 갱신).
const trendCard = document.getElementById("trendCard");
const trendModal = document.getElementById("trendModal");
const trendList = document.getElementById("trendList");
const trendFilter = document.getElementById("trendFilter");

let trendData = null;
let trendFilterCat = "전체";

function renderTrendCard({ items, summary }) {
  document.getElementById("trendSum").textContent = summary
    .slice(0, 2)
    .map((s) => `${s.category} ${s.count}`)
    .join(" · ");
  document.getElementById("trendTop").replaceChildren(
    ...items.slice(0, 3).map((t) =>
      el("li", {}, [
        el("span", { className: "trend__kw", textContent: t.keyword }),
        el("span", { className: "tag", textContent: t.category, dataset: { cat: t.category } }),
        el("span", { className: "trend__traffic", textContent: t.traffic }),
      ])
    )
  );
}

// 분야 비율 막대
function renderTrendSummary({ items, summary }) {
  document.getElementById("trendSummary").replaceChildren(
    ...summary.map((s) => {
      const bar = el("span", { title: `${s.category} ${s.count}개`, dataset: { cat: s.category } });
      bar.style.width = `${(s.count / items.length) * 100}%`;
      return bar;
    })
  );
}

function renderTrendFilter() {
  const cats = ["전체", ...trendData.summary.map((s) => s.category)];
  trendFilter.replaceChildren(
    ...cats.map((cat) => {
      const count = cat === "전체" ? trendData.items.length : trendData.summary.find((s) => s.category === cat).count;
      const btn = el("button", { type: "button", textContent: `${cat} ${count}` });
      btn.setAttribute("aria-pressed", cat === trendFilterCat);
      btn.addEventListener("click", () => {
        trendFilterCat = cat;
        renderTrendFilter();
        renderTrendList();
      });
      return btn;
    })
  );
}

function renderTrendList() {
  const items = trendFilterCat === "전체" ? trendData.items : trendData.items.filter((t) => t.category === trendFilterCat);
  trendList.replaceChildren(
    ...items.map((t) => {
      const img = el("img", { className: "trend-item__img", src: t.picture, alt: "", loading: "lazy", referrerPolicy: "no-referrer" });
      img.addEventListener("error", () => img.remove());
      return el("li", {}, [
        el("div", { className: "trend-item" }, [
          ...(t.picture ? [img] : []),
          el("div", { className: "trend-item__body" }, [
            el("div", { className: "trend-item__kw" }, [
              el("strong", { textContent: `${trendData.items.indexOf(t) + 1}. ${t.keyword}` }),
              el("span", { className: "tag", textContent: t.category, dataset: { cat: t.category } }),
              el("small", { textContent: `검색 ${t.traffic} · ${timeAgo(t.startedAt)}부터` }),
            ]),
            el(
              "ul",
              { className: "trend-item__news" },
              t.news.map((n) =>
                el("li", {}, [
                  el("a", { href: n.url, target: "_blank", rel: "noopener noreferrer" }, [n.title, el("span", { textContent: n.source })]),
                ])
              )
            ),
          ]),
        ]),
      ]);
    })
  );
}

function showTrendError() {
  document.getElementById("trendSum").textContent = "";
  document.getElementById("trendTop").replaceChildren(el("li", { textContent: "트렌드를 불러오지 못했어요. 눌러서 다시 시도" }));
  trendFilter.replaceChildren();
  document.getElementById("trendSummary").replaceChildren();
  const retry = el("button", { type: "button", textContent: "다시 시도" });
  retry.addEventListener("click", loadTrends);
  trendList.replaceChildren(
    el("li", { className: "news-list__empty" }, ["트렌드를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.", el("br"), retry])
  );
}

async function loadTrends() {
  try {
    const res = await fetch(`trends.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(res.status);
    trendData = await res.json();
    if (!trendData.items?.length) throw new Error("empty");

    const updated = `${timeAgo(trendData.updatedAt)} 업데이트 · 검색량 순`;
    document.getElementById("trendUpdated").textContent = updated;
    document.getElementById("trendModalSub").textContent = updated;
    renderTrendCard(trendData);
    renderTrendSummary(trendData);
    renderTrendFilter();
    renderTrendList();
  } catch {
    trendData = null;
    showTrendError();
  }
}

trendCard.addEventListener("click", () => {
  if (!trendData) loadTrends();
  trendModal.showModal();
});
document.getElementById("trendClose").addEventListener("click", () => trendModal.close());
trendModal.addEventListener("click", (e) => {
  if (e.target === trendModal) trendModal.close();
});

loadTrends();
