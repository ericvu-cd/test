// ======================
// 🎮 教學模式（Tutorial）
// ======================

let tutorialStep = 0;
let tutorialMode = false;
let tutorialIntroStep = 0;
let tutorialClickLock = false;

// ======================
// 🚀 啟動教學
// ======================
function startTutorial() {
    tutorialMode = true;
    tutorialStep = 0;        // 👉 先跑導覽
    tutorialIntroStep = 1;

    document.getElementById("welcome-screen").style.display = "none";
    document.getElementById("music-control").style.display = "flex";

    setupTutorialPlayers();
    runTutorialIntro();
}

// ======================
// 👆 點擊切換導覽
// ======================
document.body.addEventListener("click", () => {
    if (tutorialMode && tutorialStep === 0 && !tutorialClickLock) {
        tutorialClickLock = true;

        tutorialIntroStep++;
        runTutorialIntro();

        setTimeout(() => tutorialClickLock = false, 400);
    }
});

// ======================
// 🧭 畫面導覽
// ======================
function runTutorialIntro() {

    if (tutorialIntroStep === 1) {
        highlightArea(".char-area", "👆 這裡是【對手區】，觀察他們的出牌！");
    }

    else if (tutorialIntroStep === 2) {
        highlightArea("#ocean", "🌊 這裡是【出牌區】，所有人會把魚放在這裡");
    }

    else if (tutorialIntroStep === 3) {
        highlightArea("#player-zone", "🃏 這裡是【你的手牌】，從這裡選擇要出的魚");
    }

    else {
        clearHighlight();
        tutorialStep = 1;
        runTutorialStep();
    }
}

// ======================
// ✨ 高亮 + Tooltip（完整版）
// ======================
function highlightArea(selector, text) {
    clearHighlight();

    const el = document.querySelector(selector);
    const tooltip = document.getElementById("tutorial-tooltip");

    if (!el || !tooltip) return;

    el.classList.add("tutorial-highlight");

    const rect = el.getBoundingClientRect();

    // 👉 顯示 tooltip（先顯示才能算尺寸）
    tooltip.style.display = "block";
    tooltip.style.opacity = "1";
    tooltip.style.zIndex = "99999";

    tooltip.innerText = text;

    const tooltipHeight = tooltip.offsetHeight || 60;
    const tooltipWidth = tooltip.offsetWidth || 260;

    const offset = Math.max(12, rect.height * 0.08);

    let top, left;

    // 上下判斷
    if (rect.bottom + tooltipHeight + 20 > window.innerHeight) {
        top = rect.top - tooltipHeight - offset;
    } else {
        top = rect.bottom + offset;
    }

    // 水平置中
    left = rect.left + rect.width / 2 - tooltipWidth / 2;

    // 防超出
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltipWidth - 10;
    }

    tooltip.style.top = top + "px";
    tooltip.style.left = left + "px";
}

// ======================
// 🧹 清除高亮
// ======================
function clearHighlight() {
    document.querySelectorAll(".tutorial-highlight")
        .forEach(el => el.classList.remove("tutorial-highlight"));

    const tooltip = document.getElementById("tutorial-tooltip");
    if (tooltip) tooltip.style.display = "none";
}

// ======================
// 👥 初始化玩家
// ======================
function setupTutorialPlayers() {
    players = [
        { n: "你", hand: [], isAI: false },
        { n: "教學AI", hand: [], isAI: true, id: "ai-1" }
    ];
}

// ======================
// 🎯 教學主流程
// ======================
function runTutorialStep() {
    table = [];
    renderTable();

    if (tutorialStep === 1) tutorialStep1();
    if (tutorialStep === 2) tutorialStep2();
    if (tutorialStep === 3) tutorialStep3();
}

// ======================
// 🧩 STEP 1
// ======================
function tutorialStep1() {
    addLog("【教學】選擇「養殖」的魚", "cmd");

    currentS = {
        t: "請選擇【養殖】的魚",
        c: f => f.d === "養殖"
    };

    players[0].hand = [
        { n: "虱目魚", d: "養殖", l:1, m:["養殖"], h:"洄游性", s:"全年" },
        { n: "鯊魚", d: "遠洋", l:3, m:["延繩釣"], h:"洄游性", s:"全年" },
        { n: "飛魚", d: "近海", l:1, m:["流刺網"], h:"洄游性", s:"春夏" }
    ];

    document.getElementById("summon-display").innerText =
        "【教學 1】\n選擇「養殖」的魚";

    phase = "PLAYER_TURN";
    renderUI();
}

// ======================
// 🧠 STEP 2
// ======================
function tutorialStep2() {
    addLog("【教學】觀察AI出的牌，找出規律", "cmd");

    currentS = {
        t: "觀察規則",
        c: f => f.d === "養殖"
    };

    table = [
        { pIdx: 1, card: { n:"虱目魚", d:"養殖", l:1, m:["養殖"], h:"洄游性", s:"全年" }},
        { pIdx: 1, card: { n:"吳郭魚", d:"養殖", l:1, m:["養殖"], h:"定棲性", s:"全年" }}
    ];

    players[0].hand = [
        { n: "鯊魚", d: "遠洋", l:3, m:["延繩釣"], h:"洄游性", s:"全年" },
        { n: "虱目魚", d: "養殖", l:1, m:["養殖"], h:"洄游性", s:"全年" },
        { n: "竹筴魚", d: "近海", l:1, m:["定置網"], h:"洄游性", s:"全年" }
    ];

    document.getElementById("summon-display").innerText =
        "【教學 2】\n觀察AI出的魚，找出規律";

    renderTable();
    phase = "PLAYER_TURN";
    renderUI();
}

// ======================
// 🔮 STEP 3
// ======================
function tutorialStep3() {
    addLog("【教學】媽祖指示：分享一張卡", "cmd");

    currentS = {
        t: "請送出一張卡",
        isMazu: true
    };

    players[0].hand = [
        { n: "虱目魚", d: "養殖", l:1, m:["養殖"], h:"洄游性", s:"全年" },
        { n: "竹筴魚", d: "近海", l:1, m:["定置網"], h:"洄游性", s:"全年" }
    ];

    document.getElementById("summon-display").innerText =
        "【教學 3】\n請送一張卡給對手";

    phase = "PLAYER_MAZU";
    renderUI();
}

// ======================
// 🎯 攔截玩家操作
// ======================
const originalPlayerAction = playerAction;

playerAction = function(idx) {

    if (!tutorialMode) {
        originalPlayerAction(idx);
        return;
    }

    const fish = players[0].hand[idx];

    if (tutorialStep === 1 || tutorialStep === 2) {

        if (currentS.c(fish)) {
            playSuccessSfx();
            addLog("✔ 正確選擇！", "success");

            tutorialStep++;
            setTimeout(runTutorialStep, 1000);

        } else {
            alert("❌ 再想想看！（提示：看來源）");
        }
    }

    else if (tutorialStep === 3) {
        playPopSfx();
        addLog("✨ 你分享了一張卡！", "success");

        tutorialStep++;
        setTimeout(showTutorialEnd, 1000);
    }
};

// ======================
// 🏁 教學結束
// ======================
function showTutorialEnd() {
    document.getElementById("summon-display").innerText =
        "🎉 教學完成！\n你已經學會守護海洋的方法";

    addLog("教學完成！準備進入正式遊戲", "success");

    setTimeout(() => {
        tutorialMode = false;
        location.reload();
    }, 2500);
}