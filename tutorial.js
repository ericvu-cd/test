// ======================
// 🐟 新手教學模組 tutorial.js（全新設計版）
// ======================

let tutorialMode = false;
let tutorialPhase = "idle"; // idle | tour | practice1 | practice2 | mazu | done
let tutorialLockedCardIdx = -1; // 本次只能點的手牌 index

// ======================
// 🎨 注入教學專用樣式
// ======================
(function injectTutorialStyles() {
    const s = document.createElement("style");
    s.textContent = `

    /* ── 導航魚老師氣泡 ── */
    #tutor-fish {
        position: fixed;
        bottom: 160px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 8000;
        display: none;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        pointer-events: none;
        animation: tutorFishIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
    }
    @keyframes tutorFishIn {
        from { opacity:0; transform: translateX(-50%) scale(0.7) translateY(20px); }
        to   { opacity:1; transform: translateX(-50%) scale(1) translateY(0); }
    }

    #tutor-fish-avatar {
        font-size: 2.2rem;
        filter: drop-shadow(0 2px 8px rgba(100,200,255,0.7));
        animation: tutorFishBob 2s ease-in-out infinite;
    }
    @keyframes tutorFishBob {
        0%,100% { transform: translateY(0); }
        50%      { transform: translateY(-6px); }
    }

    #tutor-fish-bubble {
        background: linear-gradient(135deg, rgba(10,40,80,0.96), rgba(5,20,50,0.98));
        border: 1.5px solid rgba(100,200,255,0.5);
        border-radius: 16px;
        padding: 12px 16px;
        max-width: 280px;
        min-width: 180px;
        font-size: 0.95rem;
        line-height: 1.6;
        color: #dff0ff;
        text-align: center;
        box-shadow:
            0 0 20px rgba(60,160,255,0.25),
            0 4px 20px rgba(0,0,0,0.6);
        position: relative;
        pointer-events: none;
        white-space: pre-line;
    }
    /* 尾巴 */
    #tutor-fish-bubble::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 50%;
        transform: translateX(-50%);
        border: 5px solid transparent;
        border-top-color: rgba(100,200,255,0.5);
    }

    /* ── 下一步按鈕 ── */
    #tutor-next-btn {
        position: fixed;
        bottom: 110px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 8001;
        background: linear-gradient(135deg, #1a6fcc, #0d4a9e);
        border: 1.5px solid rgba(140,210,255,0.5);
        border-radius: 24px;
        color: #ffffff;
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        padding: 10px 28px;
        cursor: pointer;
        display: none;
        box-shadow: 0 4px 16px rgba(20,80,200,0.5);
        transition: transform 0.15s, box-shadow 0.15s;
        -webkit-tap-highlight-color: transparent;
    }
    #tutor-next-btn:active {
        transform: translateX(-50%) scale(0.95);
    }

    /* ── 高亮框（呼吸邊框）── */
    .tutor-highlight {
        outline: 3px solid rgba(100,210,255,0.9) !important;
        outline-offset: 4px !important;
        border-radius: 8px !important;
        box-shadow: 0 0 0 6px rgba(60,180,255,0.18), 0 0 24px rgba(60,180,255,0.25) !important;
        animation: tutorPulse 1.6s ease-in-out infinite !important;
        position: relative;
        z-index: 200;
    }
    @keyframes tutorPulse {
        0%,100% { box-shadow: 0 0 0 6px rgba(60,180,255,0.18), 0 0 24px rgba(60,180,255,0.2); }
        50%      { box-shadow: 0 0 0 10px rgba(60,180,255,0.08), 0 0 40px rgba(60,180,255,0.35); }
    }

    /* ── 指定手牌高亮（金色）── */
    .tutor-target-card {
        outline: 3px solid rgba(255,210,60,0.95) !important;
        outline-offset: 4px !important;
        box-shadow: 0 0 0 6px rgba(255,200,40,0.2), 0 0 24px rgba(255,180,0,0.4) !important;
        animation: tutorGoldPulse 1.2s ease-in-out infinite !important;
        position: relative;
        z-index: 300;
        cursor: pointer !important;
    }
    @keyframes tutorGoldPulse {
        0%,100% { box-shadow: 0 0 0 6px rgba(255,200,40,0.2), 0 0 24px rgba(255,180,0,0.35); }
        50%      { box-shadow: 0 0 0 10px rgba(255,200,40,0.1), 0 0 40px rgba(255,180,0,0.6); }
    }

    /* ── 鎖定其他手牌（暗色不可點）── */
    .tutor-card-locked {
        opacity: 0.3 !important;
        pointer-events: none !important;
        filter: grayscale(0.7) !important;
    }

    /* ── 結算頁老師氣泡（固定在結算視窗內）── */
    #tutor-summary-bubble {
        background: linear-gradient(135deg, rgba(10,40,80,0.97), rgba(5,20,50,0.99));
        border: 1.5px solid rgba(100,200,255,0.55);
        border-radius: 14px;
        padding: 12px 16px;
        font-size: 0.92rem;
        line-height: 1.6;
        color: #dff0ff;
        text-align: center;
        box-shadow: 0 0 20px rgba(60,160,255,0.2), 0 4px 16px rgba(0,0,0,0.5);
        margin: 10px 0;
        animation: tutorFishIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
        white-space: pre-line;
    }

    /* ── 遮罩（用於導覽階段：讓玩家只看不點）── */
    #tutor-overlay {
        position: fixed;
        inset: 0;
        z-index: 7000;
        pointer-events: all;
        background: transparent;
        display: none;
    }

    /* ── 教學結束彈窗 ── */
    #tutor-end-modal {
        position: fixed;
        inset: 0;
        z-index: 9000;
        background: rgba(4,12,22,0.88);
        display: none;
        justify-content: center;
        align-items: center;
    }
    #tutor-end-box {
        background: linear-gradient(170deg, #0d2137, #081626);
        border: 1.5px solid rgba(100,200,255,0.25);
        border-radius: 20px;
        padding: 32px 28px;
        max-width: 320px;
        width: 88%;
        text-align: center;
        animation: tutorFishIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
    }
    #tutor-end-box .end-emoji { font-size: 3rem; margin-bottom: 12px; }
    #tutor-end-box .end-title {
        font-size: 1.4rem; font-weight: 900;
        color: #dff0ff; letter-spacing: 0.1em;
        margin-bottom: 10px;
    }
    #tutor-end-box .end-desc {
        font-size: 0.9rem; color: rgba(180,220,255,0.75);
        line-height: 1.7; margin-bottom: 24px;
    }
    #tutor-end-box .end-btn {
        width: 100%; padding: 14px;
        background: linear-gradient(135deg, #f5c842, #e07828);
        border: none; border-radius: 50px;
        font-size: 1.1rem; font-weight: 900;
        color: #1a0800; cursor: pointer;
        box-shadow: 0 4px 0 #8a4200, 0 6px 14px rgba(200,100,0,0.3);
        letter-spacing: 0.05em;
        -webkit-tap-highlight-color: transparent;
    }
    #tutor-end-box .end-btn:active { transform: scale(0.97); }

    `;
    document.head.appendChild(s);
})();

// ======================
// 🏗️ 建立教學 DOM 元件
// ======================
function buildTutorialDOM() {
    // 導航魚老師
    if (!document.getElementById("tutor-fish")) {
        const fish = document.createElement("div");
        fish.id = "tutor-fish";
        fish.innerHTML = `
            <div id="tutor-fish-bubble"></div>
            <div id="tutor-fish-avatar">🐟</div>
        `;
        document.body.appendChild(fish);
    }

    // 下一步按鈕
    if (!document.getElementById("tutor-next-btn")) {
        const btn = document.createElement("button");
        btn.id = "tutor-next-btn";
        btn.textContent = "下一步 ▶";
        btn.onclick = tutorNextStep;
        document.body.appendChild(btn);
    }

    // 遮罩（導覽階段讓玩家無法點擊遊戲）
    if (!document.getElementById("tutor-overlay")) {
        const overlay = document.createElement("div");
        overlay.id = "tutor-overlay";
        overlay.onclick = () => {}; // 吸收點擊
        document.body.appendChild(overlay);
    }

    // 結束彈窗
    if (!document.getElementById("tutor-end-modal")) {
        const modal = document.createElement("div");
        modal.id = "tutor-end-modal";
        modal.innerHTML = `
            <div id="tutor-end-box">
                <div class="end-emoji">🎉</div>
                <div class="end-title">學會了！</div>
                <div class="end-desc">
                    你已經掌握基本玩法。\n觀察桌面的牌推測條件，\n出光手牌就是勝利！
                </div>
                <button class="end-btn" onclick="tutorFinish()">回主畫面，開始冒險！</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// ======================
// 🗣️ 顯示老師說話
// ======================
let _tutorBubbleTimer = null;

function tutorSay(text, showNext = false) {
    const fish = document.getElementById("tutor-fish");
    const bubble = document.getElementById("tutor-fish-bubble");
    const nextBtn = document.getElementById("tutor-next-btn");

    if (!fish || !bubble) return;

    // 重新觸發動畫
    fish.style.display = "none";
    void fish.offsetWidth;
    fish.style.display = "flex";

    bubble.textContent = text;

    if (nextBtn) {
        nextBtn.style.display = showNext ? "block" : "none";
    }

    if (_tutorBubbleTimer) clearTimeout(_tutorBubbleTimer);
}

function tutorHide() {
    const fish = document.getElementById("tutor-fish");
    const btn  = document.getElementById("tutor-next-btn");
    if (fish) fish.style.display = "none";
    if (btn)  btn.style.display  = "none";
}

// ======================
// ✨ 高亮控制
// ======================
function tutorHighlight(selector) {
    tutorClearHighlight();
    const el = document.querySelector(selector);
    if (el) el.classList.add("tutor-highlight");
}

function tutorClearHighlight() {
    document.querySelectorAll(".tutor-highlight")
        .forEach(el => el.classList.remove("tutor-highlight"));
}

// ======================
// 🔒 手牌鎖定（只開放指定 index）
// ======================
function tutorLockHand(allowedIdx) {
    tutorialLockedCardIdx = allowedIdx;
    const cards = document.querySelectorAll("#player-hand .card");
    cards.forEach((c, i) => {
        if (i === allowedIdx) {
            c.classList.remove("tutor-card-locked");
            c.classList.add("tutor-target-card");
        } else {
            c.classList.add("tutor-card-locked");
            c.classList.remove("tutor-target-card");
        }
    });
}

function tutorUnlockHand() {
    tutorialLockedCardIdx = -1;
    document.querySelectorAll("#player-hand .card").forEach(c => {
        c.classList.remove("tutor-card-locked", "tutor-target-card");
    });
}

// ======================
// 🚫 遮罩（導覽期間）
// ======================
function tutorEnableOverlay() {
    const o = document.getElementById("tutor-overlay");
    if (o) o.style.display = "block";
}

function tutorDisableOverlay() {
    const o = document.getElementById("tutor-overlay");
    if (o) o.style.display = "none";
}

// ======================
// 📋 導覽階段步驟管理
// ======================
let tourStep = 0;
const TOUR_STEPS = [
    {
        highlight: null,
        text: "嗨！我是導航魚 🐟\n帶你認識這片海洋！\n（這是新手教學，不計分）",
        next: true
    },
    {
        highlight: ".char-area",
        text: "👆 上方是你的對手\n大家輪流抽牌、出牌\n最快出完手牌就獲勝！",
        next: true
    },
    {
        highlight: "#ocean",
        text: "🌊 中間是出牌區\n所有人出的牌都會出現在這裡\n觀察對手的牌，是推測條件的關鍵！",
        next: true
    },
    {
        highlight: "#summon-display",
        text: "📜 這裡是召喚條件\n每回合會告訴你出牌規則\n（例如：需要養殖來源、洄游性…）",
        next: true
    },
    {
        highlight: "#player-zone",
        text: "👇 這是你的手牌\n點牌放大查看屬性\n對照條件，選對的牌出！\n\n現在來真正練習看看！",
        next: true
    }
];

function tutorNextStep() {
    tourStep++;
    runTourStep();
}

function runTourStep() {
    if (tourStep >= TOUR_STEPS.length) {
        // 導覽結束，進入第一次練習
        tutorClearHighlight();
        tutorDisableOverlay();
        startPractice1();
        return;
    }
    const step = TOUR_STEPS[tourStep];
    if (step.highlight) {
        tutorHighlight(step.highlight);
    } else {
        tutorClearHighlight();
    }
    tutorSay(step.text, step.next);
}

// ======================
// 🚀 啟動教學
// ======================
function startTutorial() {
    tutorialMode = true;
    tutorialPhase = "tour";
    tourStep = 0;

    // 隱藏歡迎頁
    const welcome = document.getElementById("welcome-screen");
    if (welcome) welcome.style.display = "none";

    // 隱藏不需要的UI
    document.getElementById("summon-display").style.display = "none";
    document.getElementById("deck-info").style.display = "none";
    document.getElementById("log-btn").style.display = "none";

    document.body.classList.add("game-started");
    if (typeof startFish    === "function") startFish();
    if (typeof startBubbles === "function") startBubbles();
    if (typeof closePreview === "function") closePreview();

    // 清除summon遮罩
    const focusOverlay = document.getElementById("summon-focus-overlay");
    if (focusOverlay) {
        focusOverlay.style.transition = "none";
        focusOverlay.style.opacity = "0";
        focusOverlay.style.pointerEvents = "none";
    }

    buildTutorialDOM();

    // 設定教學用玩家與牌
    setupTutorialPlayers();
    setupTutorialCards();

    currentPlayer = players[0];
    phase = "WAIT";

    setTimeout(() => {
        renderUI();
        renderTable();
        tutorEnableOverlay();  // 導覽期間鎖定互動
        runTourStep();
    }, 300);
}

// ======================
// 🃏 教學玩家與卡牌設定
// ======================
function setupTutorialPlayers() {
    players = [
        { n: "你", hand: [], isAI: false },
        {
            n: "章魚船長",
            hand: [],
            isAI: true,
            id: "ai-1",
            avatar: '<div style="font-size:2rem;">🐙</div>'
        },
        {
            n: "海龜智者",
            hand: [],
            isAI: true,
            id: "ai-2",
            avatar: '<div style="font-size:2rem;">🐢</div>'
        },
        {
            n: "螃蟹俠客",
            hand: [],
            isAI: true,
            id: "ai-3",
            avatar: '<div style="font-size:2rem;">🦀</div>'
        }
    ];
}

// 教學用的固定手牌與桌面牌
// 練習1：召喚條件「養殖來源」，指定玩家出【虱目魚】(養殖) → 成功
// 練習2：召喚條件「洄游性」，指定玩家出【吳郭魚】(定棲性) → 退牌
const TUTOR_HAND = [
    { n: "虱目魚",  d: "養殖", l: 1, m: ["養殖"],   h: "洄游性", s: "全年", i: "台灣養殖代表魚種" },
    { n: "吳郭魚",  d: "養殖", l: 1, m: ["養殖"],   h: "定棲性", s: "全年", i: "淡水養殖常見魚種" },
    { n: "竹筴魚",  d: "近海", l: 2, m: ["定置網"], h: "洄游性", s: "全年", i: "近海常見的中型魚" },
];

// 練習1 召喚條件（養殖來源）
const SUMMON_PRACTICE1 = {
    t: "出一張【養殖】來源的魚",
    c: (f) => f.d === "養殖",
    isMazu: false,
    why: "養殖漁業對環境壓力較小，是永續選擇之一。"
};

// 練習2 召喚條件（洄游性）
const SUMMON_PRACTICE2 = {
    t: "出一張【洄游性】的魚",
    c: (f) => f.h && f.h.includes("洄游"),
    isMazu: false,
    why: "洄游性魚類在特定季節才大量出現，需注意永續捕撈時機。"
};

// 媽祖籤召喚
const SUMMON_MAZU = {
    t: "神明指示：將一張手牌贈予他人",
    c: () => true,
    isMazu: true,
    why: null
};

function setupTutorialCards() {
    players[0].hand = TUTOR_HAND.map(f => ({ ...f, m: [...f.m] }));
    players[1].hand = [];
    players[2].hand = [];
    players[3].hand = [];

    // AI 給少量牌讓 renderUI 正常顯示
    players[1].hand = [
        { n: "鮭魚", d: "遠洋", l: 2, m: ["延繩釣"], h: "洄游性", s: "秋冬" },
        { n: "鯖魚", d: "近海", l: 2, m: ["圍網"],   h: "洄游性", s: "夏秋" }
    ];
    players[2].hand = [
        { n: "石斑魚", d: "養殖", l: 1, m: ["養殖"], h: "定棲性", s: "全年" }
    ];
    players[3].hand = [
        { n: "旗魚", d: "遠洋", l: 3, m: ["一支釣"], h: "洄游性", s: "春夏" },
        { n: "鱸魚", d: "養殖", l: 1, m: ["養殖"],   h: "定棲性", s: "全年" }
    ];

    table = [];
    callerIdx = 0;
    roundCount = 0;
}

// ======================
// 🟢 第一次練習（出對）
// ======================
function startPractice1() {
    tutorialPhase = "practice1";
    tutorClearHighlight();

    // 設定召喚條件
    currentS = SUMMON_PRACTICE1;
    callerIdx = 0;
    phase = "PLAYER_TURN";
    table = [];

    // 顯示召喚
    const summonEl = document.getElementById("summon-display");
    summonEl.style.display = "block";
    summonEl.innerText = "【你的召喚】\n" + currentS.t;

    renderUI();
    renderTable();

    setTimeout(() => {
        tutorSay(
            "📜 召喚條件出現了！\n\n條件是：「出一張養殖來源的魚」\n\n仔細看你的手牌屬性，\n我幫你找到了！\n\n就出【虱目魚】👆",
            false
        );

        // 延遲一下讓renderUI完成，再鎖定手牌
        setTimeout(() => {
            // 虱目魚是 index 0
            tutorLockHand(0);
            tutorHighlight("#player-zone");
        }, 400);
    }, 500);
}

// 練習1：玩家出牌後的處理
async function tutorPractice1AfterPlay(fishPlayed) {
    tutorClearHighlight();
    tutorHide();
    tutorUnlockHand();

    // AI 跟牌（章魚船長出一張養殖的）
    await sleep(800);

    // 章魚船長出 石斑魚（養殖，成功）
    const aiCard1 = players[2].hand.splice(0, 1)[0]; // 石斑魚
    if (aiCard1) {
        table.push({ pIdx: 2, card: aiCard1 });
        const fromEl = document.getElementById("ai-2");
        if (typeof playCardFlyAnimation === "function") {
            playCardFlyAnimation(aiCard1, fromEl, () => renderTable());
        }
        renderUI();
    }

    await sleep(1200);

    // 螃蟹俠客出 旗魚（遠洋，失敗）
    const aiCard2 = players[3].hand.splice(0, 1)[0]; // 旗魚
    if (aiCard2) {
        table.push({ pIdx: 3, card: aiCard2 });
        const fromEl2 = document.getElementById("ai-3");
        if (typeof playCardFlyAnimation === "function") {
            playCardFlyAnimation(aiCard2, fromEl2, () => renderTable());
        }
        renderUI();
    }

    await sleep(1200);

    // 進入結算
    tutorShowSummary1(fishPlayed);
}

// 練習1 結算頁
function tutorShowSummary1(fishPlayed) {
    phase = "RESULT";
    const isSuccess = SUMMON_PRACTICE1.c(fishPlayed);

    // 計算本回合結果
    const report = [];
    table.forEach(t => {
        const ok = SUMMON_PRACTICE1.c(t.card);
        report.push({
            name: players[t.pIdx].n,
            fishName: t.card.n,
            isSuccess: ok,
            // 退牌：加回手牌
            player: players[t.pIdx]
        });
        if (!ok) players[t.pIdx].hand.push(t.card);
    });

    // 老師解說文字（只說玩家自己的牌）
    let tutorText = "";
    if (isSuccess) {
        tutorText = `✅ 答對了！\n【${fishPlayed.n}】是「養殖」來源\n完全符合召喚條件！\n出牌成功，牌留在桌上 🎉`;
    } else {
        tutorText = `❌ 這張不符合條件\n【${fishPlayed.n}】不是養殖來源\n所以牌會退回你的手牌\n沒關係，繼續推測就好！`;
    }

    tutorBuildSummaryModal(
        SUMMON_PRACTICE1.t,
        report,
        tutorText,
        SUMMON_PRACTICE1.why,
        () => {
            // 關閉後進入練習2
            table = [];
            renderTable();
            renderUI();
            setTimeout(startPractice2, 600);
        }
    );
}

// ======================
// 🔴 第二次練習（出錯）
// ======================
function startPractice2() {
    tutorialPhase = "practice2";
    tutorClearHighlight();

    // 設定召喚條件（洄游性）
    currentS = SUMMON_PRACTICE2;
    callerIdx = 1; // AI 是召喚者
    phase = "PLAYER_TURN";
    table = [];

    const summonEl = document.getElementById("summon-display");
    summonEl.innerText = "【章魚船長的召喚】\n觀察對手出的牌，推敲條件是什麼...";

    // AI 先出牌（鮭魚，洄游性 → 符合）
    renderUI();
    renderTable();

    setTimeout(async () => {
        tutorSay(
            "🕵️ 這次是對手抽召喚！\n你不知道條件是什麼...\n\n觀察對手出的牌來推測！",
            false
        );

        await sleep(2000);

        // 章魚船長出鮭魚（洄游性）
        const aiCard = players[1].hand.splice(0, 1)[0];
        if (aiCard) {
            table.push({ pIdx: 1, card: aiCard });
            const fromEl = document.getElementById("ai-1");
            if (typeof playCardFlyAnimation === "function") {
                playCardFlyAnimation(aiCard, fromEl, () => renderTable());
            }
            renderUI();
        }

        await sleep(1500);

        tutorSay(
            "👀 看到了嗎？\n對手出了「洄游性」的鮭魚\n\n你覺得條件會是什麼？\n\n這次我故意讓你出【吳郭魚】\n看看出錯了會發生什麼事 😈",
            false
        );

        await sleep(2000);

        // 鎖定讓玩家只能出 吳郭魚（index 1，定棲性 → 不符合洄游）
        tutorLockHand(1);
        tutorHighlight("#player-zone");
        tutorSay(
            "就出【吳郭魚】看看！\n（這張其實不符合條件）",
            false
        );

    }, 500);
}

// 練習2：玩家出牌後的處理
async function tutorPractice2AfterPlay(fishPlayed) {
    tutorClearHighlight();
    tutorHide();
    tutorUnlockHand();

    await sleep(800);

    // 海龜智者出 竹筴魚（先加到手牌）
    // 給海龜一張洄游的牌
    const aiCard3 = { n: "鯖魚", d: "近海", l: 2, m: ["圍網"], h: "洄游性", s: "夏秋" };
    table.push({ pIdx: 2, card: aiCard3 });
    const fromEl3 = document.getElementById("ai-2");
    if (typeof playCardFlyAnimation === "function") {
        playCardFlyAnimation(aiCard3, fromEl3, () => renderTable());
    }
    renderUI();

    await sleep(1500);

    // 揭曉召喚條件
    const summonEl = document.getElementById("summon-display");
    summonEl.innerText = "【揭曉章魚船長的召喚】\n" + SUMMON_PRACTICE2.t;

    await sleep(800);

    tutorShowSummary2(fishPlayed);
}

// 練習2 結算頁
function tutorShowSummary2(fishPlayed) {
    phase = "RESULT";

    const report = [];
    table.forEach(t => {
        const ok = SUMMON_PRACTICE2.c(t.card);
        report.push({
            name: players[t.pIdx].n,
            fishName: t.card.n,
            isSuccess: ok,
            player: players[t.pIdx]
        });
        if (!ok) players[t.pIdx].hand.push(t.card);
    });

    const tutorText =
        `❌ 退牌了！\n【${fishPlayed.n}】是「定棲性」\n召喚條件需要「洄游性」\n所以這張牌退回你的手牌\n\n出錯不扣分，但牌會退回\n手牌越少越好，要小心選牌！`;

    tutorBuildSummaryModal(
        "（揭曉）" + SUMMON_PRACTICE2.t,
        report,
        tutorText,
        SUMMON_PRACTICE2.why,
        () => {
            // 關閉後進入媽祖練習
            table = [];
            renderTable();
            // 把玩家的吳郭魚加回來（退牌）
            if (!players[0].hand.find(f => f.n === "吳郭魚")) {
                players[0].hand.push({ n: "吳郭魚", d: "養殖", l: 1, m: ["養殖"], h: "定棲性", s: "全年", i: "淡水養殖常見魚種" });
            }
            renderUI();
            setTimeout(startPracticeMazu, 600);
        }
    );
}

// ======================
// 🙏 媽祖籤練習
// ======================
function startPracticeMazu() {
    tutorialPhase = "mazu";

    currentS = SUMMON_MAZU;
    callerIdx = 0;
    phase = "PLAYER_MAZU";
    table = [];

    const summonEl = document.getElementById("summon-display");
    summonEl.innerText = "【神明指示】\n" + SUMMON_MAZU.t;
    summonEl.classList.add("mazu-glow");

    // 補齊AI手牌數量（讓玩家看到選目標時有意義）
    players[1].hand = [
        { n: "鯖魚",  d: "近海", l: 2, m: ["圍網"],   h: "洄游性", s: "夏秋" }
    ];
    players[2].hand = [
        { n: "石斑魚", d: "養殖", l: 1, m: ["養殖"], h: "定棲性", s: "全年" },
        { n: "烏魚",   d: "近海", l: 2, m: ["刺網"], h: "洄游性", s: "冬" }
    ];
    players[3].hand = [
        { n: "鱸魚", d: "養殖", l: 1, m: ["養殖"], h: "定棲性", s: "全年" }
    ];

    renderUI();

    setTimeout(() => {
        tutorSay(
            "🙏 神明指示出現了！\n\n這是特殊召喚「媽祖籤」\n你需要選一張手牌\n送給其他玩家\n\n策略：送最難出的牌給對手！\n\n選一張牌出去試試看 👇",
            false
        );
        tutorHighlight("#player-zone");
    }, 500);
}

// 媽祖結束後
function tutorAfterMazu() {
    tutorClearHighlight();
    tutorHide();

    setTimeout(() => {
        tutorSay(
            "🎊 送牌成功！\n\n媽祖籤的策略：\n送給手牌最少的對手\n或送最難出的牌給對手\n\n現在你已經學會全部基本操作了！",
            false
        );

        setTimeout(showTutorEndModal, 2500);
    }, 800);
}

// ======================
// 📊 結算頁（含老師氣泡）
// ======================
function tutorBuildSummaryModal(conditionText, report, tutorBubbleText, ecoText, onClose) {

    const existing = document.getElementById("tutor-summary-overlay");
    if (existing) existing.remove();

    // 卡片 HTML
    const cardsHtml = report.map((r, i) => {
        const delay = 0.08 + i * 0.07;
        const bg = r.isSuccess
            ? "background:linear-gradient(135deg,#0a2e1a,#0d3d22);border:1.5px solid #3a9e5f;"
            : "background:linear-gradient(135deg,#2a0f0f,#361212);border:1.5px solid #8b3030;";
        const nameC = r.isSuccess ? "#90f0b8" : "#f4a0a0";
        const badge = r.isSuccess
            ? `<span style="font-size:13px;">⭐ 成功</span>`
            : `<span style="font-size:11px;color:#f07070;background:rgba(200,50,50,0.2);border:1px solid rgba(200,50,50,0.4);padding:1px 7px;border-radius:8px;">退牌</span>`;
        return `
        <div style="${bg}border-radius:13px;padding:8px 10px;
                    animation:rsSlideUp .24s ${delay}s ease both;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span style="font-size:0.8rem;color:rgba(255,255,255,0.45);">${r.name}</span>
                ${badge}
            </div>
            <div style="font-size:1rem;font-weight:bold;color:${nameC};">${r.fishName}</div>
        </div>`;
    }).join("");

    const overlay = document.createElement("div");
    overlay.id = "tutor-summary-overlay";
    overlay.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:rgba(4,12,22,0.92);
        display:flex;justify-content:center;align-items:center;
        box-sizing:border-box;z-index:5000;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
        background:linear-gradient(170deg,#0d2137 0%,#081626 100%);
        border-radius:20px;border:1px solid rgba(255,255,255,0.07);
        width:92%;max-width:400px;
        max-height:85vh;overflow-y:auto;
        padding:14px 12px 16px;box-sizing:border-box;
        animation:rsSlideDown .32s ease-out both;
    `;

    modal.innerHTML = `
        <style>
            @keyframes rsSlideDown { from{transform:translateY(-24px);opacity:0} to{transform:translateY(0);opacity:1} }
            @keyframes rsSlideUp   { from{transform:translateY(12px);opacity:0} to{transform:translateY(0);opacity:1} }
        </style>

        <!-- 召喚條件 -->
        <div style="background:linear-gradient(135deg,rgba(0,70,110,0.7),rgba(0,40,80,0.7));
                    border:1.5px solid rgba(60,170,255,0.28);border-radius:13px;
                    padding:8px 12px;margin-bottom:10px;">
            <div style="font-size:0.75rem;color:#60c8f0;letter-spacing:1.5px;margin-bottom:3px;">📜 本回召喚條件</div>
            <div style="font-size:0.95rem;color:#fff;font-weight:bold;line-height:1.4;">${conditionText}</div>
        </div>

        <!-- 老師氣泡 -->
        <div id="tutor-summary-bubble">${tutorBubbleText}</div>

        <!-- 出牌結果卡片 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
            ${cardsHtml}
        </div>

        <!-- 生態知識 -->
        ${ecoText ? `
        <div style="background:linear-gradient(135deg,rgba(0,70,110,0.7),rgba(0,40,80,0.7));
                    border:1.5px solid rgba(60,170,255,0.28);border-radius:13px;
                    padding:8px 12px;margin-bottom:12px;">
            <div style="font-size:0.75rem;color:#60c8f0;font-weight:bold;margin-bottom:3px;">🌊 生態小知識</div>
            <div style="font-size:0.88rem;color:rgba(190,235,255,0.85);line-height:1.6;">${ecoText}</div>
        </div>` : ""}

        <!-- 繼續按鈕 -->
        <button id="tutor-summary-close" style="
            width:100%;padding:12px;border:none;border-radius:50px;
            font-size:1rem;font-weight:900;cursor:pointer;
            background:linear-gradient(135deg,#f5c842,#e07828);
            color:#1a0800;
            box-shadow:0 4px 0 #8a4200,0 6px 14px rgba(200,100,0,0.3);
            -webkit-tap-highlight-color:transparent;
        ">整理魚獲，繼續！</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById("tutor-summary-close").onclick = () => {
        overlay.remove();
        if (onClose) onClose();
    };
}

// ======================
// 🏁 結束彈窗
// ======================
function showTutorEndModal() {
    tutorHide();
    tutorClearHighlight();
    const modal = document.getElementById("tutor-end-modal");
    if (modal) modal.style.display = "flex";
}

function tutorFinish() {
    tutorialMode = false;
    tutorialPhase = "idle";

    const modal = document.getElementById("tutor-end-modal");
    if (modal) modal.style.display = "none";

    // 清理
    tutorHide();
    tutorClearHighlight();
    tutorUnlockHand();
    tutorDisableOverlay();

    // 停止魚與氣泡
    if (typeof stopFish    === "function") stopFish();
    if (typeof stopBubbles === "function") stopBubbles();

    document.body.classList.remove("game-started");

    // 隱藏召喚顯示
    const summonEl = document.getElementById("summon-display");
    if (summonEl) {
        summonEl.style.display = "none";
        summonEl.classList.remove("mazu-glow");
    }
    document.getElementById("deck-info").style.display = "block";
    document.getElementById("log-btn").style.display = "flex";

    // 重置遊戲狀態
    table = [];
    players = [{ n: "你", hand: [], isAI: false }];
    currentS = null;
    phase = "WAIT";

    if (typeof renderUI    === "function") renderUI();
    if (typeof renderTable === "function") renderTable();

    // 顯示歡迎頁
    const welcome = document.getElementById("welcome-screen");
    if (welcome) {
        welcome.style.display = "flex";
        welcome.style.opacity = "0";
        welcome.style.transition = "opacity 0.8s ease";
        setTimeout(() => { welcome.style.opacity = "1"; }, 50);
        welcome.classList.remove("fade-out", "hidden");
    }
}

// ======================
// 🎮 攔截出牌（核心）
// 覆寫 playerAction，讓教學模式下走教學流程
// ======================
const _originalPlayerAction = typeof playerAction === "function" ? playerAction : null;

window.playerAction = async function(idx) {
    if (!tutorialMode) {
        if (_originalPlayerAction) return _originalPlayerAction(idx);
        return;
    }

    // 教學模式：檢查是否為媽祖
    if (phase === "PLAYER_MAZU") {
        // 媽祖籤：走原本的 showMazuTargetSelect，但結束後跳到 tutorAfterMazu
        tutorClearHighlight();
        tutorHide();

        // 暫時覆寫 confirmMazuGift 的後續
        const _origConfirm = window.confirmMazuGift;
        window.confirmMazuGift = function(cardIdx, target) {
            const card = players[0].hand.splice(cardIdx, 1)[0];
            const targetEl = document.getElementById(target.id);
            const playerEl = document.getElementById("player-zone");
            if (typeof showMazuGiftEffect === "function") {
                showMazuGiftEffect("你", target.n, card, targetEl, playerEl);
            }
            target.hand.push(card);
            if (typeof SFX !== "undefined" && SFX.gift) SFX.gift();
            renderUI();
            phase = "RESULT";

            // 還原
            window.confirmMazuGift = _origConfirm;

            setTimeout(tutorAfterMazu, 3000);
        };

        showMazuTargetSelect(idx);
        return;
    }

    if (phase !== "PLAYER_TURN") return;

    // 鎖定檢查：只能點指定的牌
    if (tutorialLockedCardIdx !== -1 && idx !== tutorialLockedCardIdx) {
        tutorSay("👆 請點亮起的那張牌！", false);
        return;
    }

    const fish = players[0].hand[idx];
    if (!fish) return;

    // 走預覽流程
    if (typeof closePreview === "function") closePreview();
    if (typeof showCardPreview === "function") {
        // 覆寫預覽的出牌按鈕行為
        showCardPreview(idx, fish, true);

        // 等玩家點 ✔️（showCardPreview 內部會呼叫 playerAction(idx)）
        // 但我們已經在 playerAction 裡了，需要避免遞迴
        // 所以這裡直接處理出牌
    }

    // 實際出牌
    players[0].hand.splice(idx, 1);
    if (typeof SFX !== "undefined" && SFX.card) SFX.card();
    table.push({ pIdx: 0, card: fish });
    phase = "AI_FOLLOWING";

    if (typeof closePreview === "function") closePreview();

    renderUI();

    const fromEl = document.getElementById("player-zone");
    if (typeof playCardFlyAnimation === "function") {
        playCardFlyAnimation(fish, fromEl, () => renderTable());
    } else {
        renderTable();
    }

    await sleep(1600);

    // 根據教學階段走不同後續
    if (tutorialPhase === "practice1") {
        await tutorPractice1AfterPlay(fish);
    } else if (tutorialPhase === "practice2") {
        await tutorPractice2AfterPlay(fish);
    }
};

// ======================
// 🛡️ 覆寫 showCardPreview
// 教學中，確保點 ✔️ 走教學流程而非原本流程
// ======================
const _origShowCardPreview = typeof showCardPreview === "function" ? showCardPreview : null;

window.showCardPreview = function(idx, fish, isHand) {
    if (!tutorialMode || !isHand) {
        if (_origShowCardPreview) return _origShowCardPreview(idx, fish, isHand);
        return;
    }

    // 鎖定檢查：鎖定的牌不開放預覽
    if (tutorialLockedCardIdx !== -1 && idx !== tutorialLockedCardIdx) {
        return;
    }

    if (_origShowCardPreview) _origShowCardPreview(idx, fish, isHand);
};
