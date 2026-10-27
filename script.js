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
