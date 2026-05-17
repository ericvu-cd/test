// ======================
// 🎬 電影開場模組 intro.js
// ======================

(function () {

  const IMAGES = [
    "P1.jpg","P2.jpg","P3.jpg","P4.jpg","P5.jpg",
    "P6.jpg","P7.jpg","P8.jpg","P9.jpg"
  ];
  const IMAGE_DURATION = 5200;   // 每張停留 ms
  const FADE_BLACK     = 400;    // 淡黑 ms
  const BLACK_PAUSE    = 300;    // 純黑停頓 ms
  const FADE_IN        = 700;    // 淡入 ms

  let currentIdx  = 0;
  let introActive = true;
  let bgmEl       = null;
  let volumeFadeTimer = null;

  // ── 建立 DOM ──────────────────────────────────────────
  function buildIntroDOM() {
    const el = document.createElement("div");
    el.id = "intro-screen";
    el.innerHTML = `
      <div id="intro-vignette"></div>
      <div id="intro-letterbox-top"></div>
      <div id="intro-letterbox-bot"></div>

      <!-- 標題幕 -->
      <div id="intro-title-screen">
        <div id="intro-title-text"></div>
        <div id="intro-start-hint">點擊畫面開場</div>
      </div>

      <!-- 漫畫放映幕 -->
      <div id="intro-comic-screen" style="display:none;">
        <img id="intro-img-a" class="intro-img" src="" alt="">
        <img id="intro-img-b" class="intro-img" src="" alt="">
        <div id="intro-page-num"></div>
      </div>

      <!-- SKIP -->
      <button id="intro-skip-btn" style="display:none;" onclick="introSkip()">跳過 ▶▶</button>
    `;
    document.body.prepend(el);
    injectIntroStyles();
  }

  // ── CSS 注入 ──────────────────────────────────────────
  function injectIntroStyles() {
    const s = document.createElement("style");
    s.textContent = `
      #intro-screen {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: #000;
        overflow: hidden;
        cursor: pointer;
        font-family: 'Noto Serif TC', 'Noto Serif', serif;
      }

      /* 遮幅 letterbox */
      #intro-letterbox-top,
      #intro-letterbox-bot {
        position: absolute;
        left: 0; right: 0;
        height: 8vh;
        background: #000;
        z-index: 10;
        pointer-events: none;
      }
      #intro-letterbox-top { top: 0; }
      #intro-letterbox-bot { bottom: 0; }

      /* 暗角 vignette */
      #intro-vignette {
        position: absolute;
        inset: 0;
        z-index: 9;
        pointer-events: none;
        background: radial-gradient(ellipse at center,
          transparent 50%,
          rgba(0,0,0,0.72) 100%);
      }

      /* ── 標題幕 ── */
      #intro-title-screen {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3vh;
        z-index: 5;
      }

      #intro-title-text {
        font-size: clamp(2rem, 6vw, 4.5rem);
        font-weight: 900;
        letter-spacing: .18em;
        color: #e8f4ff;
        text-shadow:
          0 0 18px rgba(100,200,255,0.9),
          0 0 45px rgba(80,170,255,0.5),
          0 0 90px rgba(60,140,255,0.25);
        white-space: nowrap;
        min-height: 1.4em;
      }

      /* 打字機游標 */
      #intro-title-text::after {
        content: '|';
        animation: introCursor .7s step-end infinite;
        color: rgba(150,220,255,0.8);
        margin-left: 2px;
      }
      #intro-title-text.typing-done::after {
        animation: introGlow 2s ease-in-out infinite;
        color: transparent;
      }
      @keyframes introCursor {
        0%,100%{ opacity:1 } 50%{ opacity:0 }
      }
      @keyframes introGlow {
        0%,100%{ text-shadow: 0 0 18px rgba(100,200,255,.9),0 0 45px rgba(80,170,255,.5) }
        50%{ text-shadow: 0 0 30px rgba(100,200,255,1),0 0 80px rgba(80,170,255,.8),0 0 130px rgba(60,140,255,.4) }
      }

      #intro-start-hint {
        font-size: clamp(.75rem, 2vw, 1rem);
        letter-spacing: .25em;
        color: rgba(180,230,255,0.6);
        animation: introHintBlink 1.8s ease-in-out infinite;
        opacity: 0;
        transition: opacity 1s;
      }
      #intro-start-hint.visible { opacity: 1; }
      @keyframes introHintBlink {
        0%,100%{ opacity:.25 } 50%{ opacity:.85 }
      }

      /* ── 漫畫幕 ── */
      #intro-comic-screen {
        position: absolute;
        inset: 0;
        z-index: 4;
      }

      .intro-img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: saturate(0.88) brightness(0.95);
        opacity: 0;
        transition: opacity 0s;
        transform: scale(1.08);
        will-change: transform, opacity;
      }
      .intro-img.active {
        opacity: 1;
        animation: introBreath var(--breath-dur, 5.2s) ease-in-out forwards;
      }
      @keyframes introBreath {
        0%   { transform: scale(1.08); }
        100% { transform: scale(1.00); }
      }

      /* 頁碼 */
      #intro-page-num {
        position: absolute;
        bottom: calc(8vh + 14px);
        right: 18px;
        z-index: 12;
        font-size: .72rem;
        letter-spacing: .12em;
        color: rgba(255,255,255,.45);
        font-family: monospace;
      }

      /* SKIP */
      #intro-skip-btn {
        position: fixed;
        bottom: calc(8vh + 16px);
        right: 20px;
        z-index: 9999;
        background: rgba(0,0,0,0.65);
        border: 1px solid rgba(255,255,255,.25);
        border-radius: 20px;
        color: rgba(255,255,255,.6);
        font-size: .78rem;
        letter-spacing: .1em;
        padding: 6px 14px;
        cursor: pointer;
        transition: color .2s, border-color .2s;
      }
      #intro-skip-btn:hover {
        color: #fff;
        border-color: rgba(255,255,255,.6);
      }

      /* 整體淡出 */
      #intro-screen.fade-out {
        animation: introFadeOut .9s ease forwards;
      }
      @keyframes introFadeOut {
        to { opacity: 0; pointer-events: none; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── 打字機 ────────────────────────────────────────────
  const TITLE    = "友魚勇者之路";
  const SUBTITLE = "單人挑戰";

  function typewriterTitle(cb) {
    const el   = document.getElementById("intro-title-text");
    const hint = document.getElementById("intro-start-hint");
    let i = 0;

    function type() {
      if (i <= TITLE.length) {
        el.textContent = TITLE.slice(0, i);
        i++;
        setTimeout(type, 120);
      } else {
        el.classList.add("typing-done");
        setTimeout(() => {
          hint.classList.add("visible");
          if (cb) cb();
        }, 500);
      }
    }
    setTimeout(type, 800);
  }

  // ── 漫畫放映 ─────────────────────────────────────────
  let imgA, imgB, activeSlot = "a";

  function startComic() {
    const titleScr = document.getElementById("intro-title-screen");
    const comicScr = document.getElementById("intro-comic-screen");
    const skipBtn  = document.getElementById("intro-skip-btn");

    titleScr.style.transition = "opacity .6s";
    titleScr.style.opacity    = "0";
    setTimeout(() => { titleScr.style.display = "none"; }, 600);

    comicScr.style.display = "block";
    skipBtn.style.display  = "block";

    imgA = document.getElementById("intro-img-a");
    imgB = document.getElementById("intro-img-b");

    currentIdx = 0;
    showImage(currentIdx);
  }

  function showImage(idx) {
    if (!introActive) return;

    const src     = IMAGES[idx];
    const pageNum = document.getElementById("intro-page-num");
    pageNum.textContent = `● ${idx + 1} / ${IMAGES.length}`;

    const incoming = activeSlot === "a" ? imgA : imgB;
    const outgoing = activeSlot === "a" ? imgB : imgA;

    // 先黑掉舊圖
    outgoing.style.transition = `opacity ${FADE_BLACK}ms ease`;
    outgoing.style.opacity    = "0";

    // 預載新圖
    incoming.src = src;
    incoming.style.setProperty("--breath-dur", `${IMAGE_DURATION}ms`);
    incoming.style.transition = "opacity 0s";
    incoming.style.opacity    = "0";
    incoming.classList.remove("active");

    setTimeout(() => {
      // 純黑停頓後淡入
      incoming.style.transition = `opacity ${FADE_IN}ms ease`;
      incoming.style.opacity    = "1";
      // 觸發 breath 動畫
      void incoming.offsetWidth;
      incoming.classList.add("active");

      // 切換 slot
      activeSlot = activeSlot === "a" ? "b" : "a";

      // 排程下一張
      const nextDelay = IMAGE_DURATION + FADE_BLACK + BLACK_PAUSE;
      if (idx < IMAGES.length - 1) {
        setTimeout(() => {
          if (!introActive) return;
          showImage(idx + 1);
        }, nextDelay);
      } else {
        // 最後一張播完 → 淡出並進入歡迎頁
        setTimeout(() => {
          if (!introActive) return;
          endIntro();
        }, IMAGE_DURATION);
      }

    }, FADE_BLACK + BLACK_PAUSE);
  }

  // ── 音量漸降 ─────────────────────────────────────────
  function fadeVolumeTo(target, durationMs) {
    if (!bgmEl) return;
    const start    = bgmEl.volume;
    const diff     = target - start;
    const steps    = 40;
    const interval = durationMs / steps;
    let step = 0;
    clearInterval(volumeFadeTimer);
    volumeFadeTimer = setInterval(() => {
      step++;
      bgmEl.volume = Math.min(1, Math.max(0, start + diff * (step / steps)));
      if (step >= steps) clearInterval(volumeFadeTimer);
    }, interval);
  }

  // ── 結束開場 ─────────────────────────────────────────
  function endIntro(fast) {
    introActive = false;
    const screen = document.getElementById("intro-screen");

    // BGM 漸降至 50%
    const fadeDur = fast ? 600 : 2000;
    fadeVolumeTo(0.5, fadeDur);

    screen.classList.add("fade-out");
    setTimeout(() => {
      screen.remove();
      showWelcomeScreen();
    }, fast ? 700 : 1000);
  }

  function showWelcomeScreen() {
    const w = document.getElementById("welcome-screen");
    if (w) {
      w.style.opacity   = "0";
      w.style.display   = "flex";
      w.style.transition = "opacity .8s ease";
      setTimeout(() => { w.style.opacity = "1"; }, 50);
    }
  }

  // ── 全域 SKIP ─────────────────────────────────────────
  window.introSkip = function () {
    if (!introActive) return;
    endIntro(true);
  };

  // ── 點擊啟動音樂 + 漫畫 ──────────────────────────────
  function onTitleClick() {
    if (!introActive) return;

    // 啟動 BGM
    bgmEl = document.getElementById("bgm");
    if (!bgmEl) {
      bgmEl = new Audio("MZ.mp3");
      bgmEl.loop = true;
      bgmEl.id   = "bgm";
      document.body.appendChild(bgmEl);
    } else {
      bgmEl.src = "MZ.mp3";
      bgmEl.loop = true;
    }
    bgmEl.volume = 0;
    bgmEl.play().catch(() => {});
    fadeVolumeTo(1, 2000);

    // 移除點擊監聽，改為漫畫模式
    document.getElementById("intro-screen")
      .removeEventListener("click", onTitleClick);

    startComic();
  }

  // ── 初始化 ────────────────────────────────────────────
  function init() {
    // 確保歡迎頁先隱藏
    const w = document.getElementById("welcome-screen");
    if (w) w.style.display = "none";

    buildIntroDOM();

    document.getElementById("intro-screen")
      .addEventListener("click", onTitleClick);

    typewriterTitle(); // 開始打字，不需等待點擊
  }

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
