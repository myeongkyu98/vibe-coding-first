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

// 로그인 폼: 비밀번호 보기/숨기기
const pwInput = document.getElementById("password");
const pwToggle = document.getElementById("pwToggle");

pwToggle.addEventListener("click", () => {
  const show = pwInput.type === "password";
  pwInput.type = show ? "text" : "password";
  pwToggle.textContent = show ? "숨기기" : "보기";
  pwToggle.setAttribute("aria-label", show ? "비밀번호 숨기기" : "비밀번호 보기");
});

// 로그인 폼: 입력값 검사
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const loginStatus = document.getElementById("loginStatus");

function setError(input, message) {
  const field = input.closest(".field");
  field.classList.toggle("error", Boolean(message));
  field.querySelector(".field__msg").textContent = message;
}

function validateEmail() {
  const value = emailInput.value.trim();
  if (!value) return setError(emailInput, "이메일을 입력해 주세요."), false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setError(emailInput, "올바른 이메일 형식이 아니에요."), false;
  setError(emailInput, "");
  return true;
}

function validatePassword() {
  const value = pwInput.value;
  if (!value) return setError(pwInput, "비밀번호를 입력해 주세요."), false;
  if (value.length < 6) return setError(pwInput, "비밀번호는 6자 이상이에요."), false;
  setError(pwInput, "");
  return true;
}

// 입력 중에는 이미 표시된 오류만 다시 검사
emailInput.addEventListener("input", () => emailInput.closest(".field").classList.contains("error") && validateEmail());
pwInput.addEventListener("input", () => pwInput.closest(".field").classList.contains("error") && validatePassword());
emailInput.addEventListener("blur", () => emailInput.value && validateEmail());

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  loginStatus.textContent = "";

  const emailOk = validateEmail();
  const pwOk = validatePassword();
  if (!emailOk) return emailInput.focus();
  if (!pwOk) return pwInput.focus();

  // 서버 연결 전이라 로그인 흉내만 냄
  const btn = loginForm.querySelector(".login__btn");
  btn.disabled = true;
  btn.textContent = "로그인 중...";
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = "로그인";
    loginStatus.textContent = `${emailInput.value.trim()} 님, 환영합니다!`;
  }, 800);
});
