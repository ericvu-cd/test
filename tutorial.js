// ======================
// 🎮 教學模式（穩定修正版）
// ======================

let tutorialStep = -1; // ⭐ 關鍵修正
let tutorialMode = false;
let tutorialClickLock = false;

// ======================
// 🚀 啟動教學
// ======================
function startTutorial() {
    tutorialMode = true;
    tutorialStep = -1; // ⭐ 讓第一步正常顯示

    const welcome = document.getElementById("welcome-screen");
    if (welcome) {
        welcome.style.display = "none";
    }

    document.body.classList.add("game-started");
	
	document.getElementById("summon-display").style.display = "none";
    document.getElementById("deck-info").style.display = "none";
    document.getElementById("log-btn").style.display = "none";

    // 先移除再加，確保不重複疊加
    document.body.removeEventListener("click", tutorialClickHandler);
    document.body.addEventListener("click", tutorialClickHandler);

    // 關閉可能殘留的卡牌預覽
    if (typeof closePreview === "function") closePreview();
	
    setupTutorialPlayers();

	currentPlayer = players[0];
	setTimeout(() => {
		setupTutorialCards(); // ⭐ 新增

		// ⭐ 確保 DOM 存在
		if (!document.getElementById("player-zone")) {
			console.warn("UI 還沒準備好");
			return;
		}
		currentPlayer = players[0];

		renderUI();
		renderTable();
		runTutorialStep();

	}, 300); // ⭐ 從 100 改 300
}

// ======================
// 👆 點擊切換（具名函式，避免重複疊加）
// ======================
function tutorialClickHandler() {
    if (!tutorialMode || tutorialClickLock) return;

    tutorialClickLock = true;
    tutorialStep++;
    runTutorialStep();

    setTimeout(() => tutorialClickLock = false, 300);
}

// ======================
// 🎯 教學流程
// ======================
function runTutorialStep() {

    clearHighlight();

    switch (tutorialStep) {

        case 0:
            highlightArea("#ocean",
`海洋失衡，魚群正在消失
點擊空白處繼續`);
            break;

        case 1:
            highlightArea("#player-zone",
`👇 下面是你持有的牌
點擊空白處繼續`);
            break;

        case 2:
            highlightArea(".char-area",
`👆 上方是你的對手
點擊空白處繼續`);
            break;

        case 3:
            highlightArea("#ocean",
`👆 所有人出的牌會出現在上方
點擊空白處繼續`);
            break;

        case 4:
            highlightArea("#player-zone",
`👇 你的目標是清空下方的牌
點擊空白處繼續`);
            break;

        case 5:
            highlightArea("#player-zone",
`高亮的卡是可以點擊出的牌
點擊空白處繼續`);
            break;

        case 6:
            highlightArea("#table",
`👆 觀察上方知道如何跟牌
點擊空白處繼續`);
            break;

        case 7:
            highlightArea("#player-zone",
`條件符合魚卡是能成功出的牌
點擊空白處繼續`);
            break;

        case 8:
            highlightArea("#player-zone",
`包含(顏色與標籤)：
燈號 / 捕撈 / 來源

點擊空白處繼續`);
            break;

        case 9:
            highlightArea("#player-zone",
`只要符合規定條件即可出
點擊空白處繼續`);
            break;

        case 10:
            highlightArea("#player-zone",
`每一回合：抽規則 → 出牌
點擊空白處繼續`);
            break;

        case 11:
            highlightArea("#table",
`👆 觀察上方提示找規則
點擊空白處繼續`);
            break;

        case 12:
            highlightArea("#player-zone",
`媽祖籤是要贈牌給剩牌最少的人
點擊空白處繼續`);
            break;

        case 13:
            highlightArea("#player-zone",
`贈牌時可以選最難出的牌
點擊空白處繼續`);
            break;

        case 14:
            highlightArea("#player-zone",
`👌準備開始你的第一場遊戲`);
            break;

	default:
		tutorialMode = false;
		clearHighlight();

		// 移除教學點擊監聽器
		document.body.removeEventListener("click", tutorialClickHandler);

		// ⭐ 恢復主畫面
		const welcome = document.getElementById("welcome-screen");
		if (welcome) {
			welcome.style.display = "flex";
			welcome.classList.remove("fade-out");
		}

		document.body.classList.remove("game-started");
		
		document.getElementById("summon-display").style.display = "flex";
        document.getElementById("deck-info").style.display = "block";
        document.getElementById("log-btn").style.display = "flex";

		// ⭐ 清空教學資料（避免殘留），保留一個玩家空殼避免 renderUI 報錯
		table = [];
		players = [{ n: "你", hand: [], isAI: false }]; 

		// ⭐ 重畫UI
		if (typeof renderUI === "function") renderUI();
		if (typeof renderTable === "function") renderTable();

		break;
	}
}

// ======================
// 🐟 教學卡片（關鍵補強）
// ======================
function setupTutorialCards() {

    // 玩家手牌
    players[0].hand = [
        { n: "虱目魚", d: "養殖", l:1, m:["養殖"], h:"洄游性", s:"全年" },
        { n: "鮭魚", d: "遠洋", l:2, m:["延繩釣"], h:"洄游性", s:"秋冬" },
        { n: "竹筴魚", d: "近海", l:1, m:["定置網"], h:"洄游性", s:"全年" }
    ];

    // AI（避免 render crash）
    players[1].hand = [];

    // 桌面（重點）
    table = [
        {
            pIdx: 1,
            card: { n:"虱目魚", d:"養殖", l:1, m:["養殖"], h:"洄游性", s:"全年" }
        },
        {
            pIdx: 1,
            card: { n:"吳郭魚", d:"養殖", l:1, m:["養殖"], h:"定棲性", s:"全年" }
        }
    ];
}

// ======================
// ✨ 高亮修正版（不會跑版）
// ======================
function highlightArea(selector, text) {

    const el = document.querySelector(selector);
    const tooltip = document.getElementById("tutorial-tooltip");

    if (!el || !tooltip) return;

    el.classList.add("tutorial-highlight");

    const rect = el.getBoundingClientRect();

    tooltip.style.display = "block";
    tooltip.innerText = text;

    let top = rect.bottom + 10;
    let left = rect.left + rect.width / 3;

    // ⭐ 修正邊界
    if (top > window.innerHeight - 120) {
        top = rect.top - 80;
    }

    if (left < 20) left = 20;
    if (left > window.innerWidth - 200) left = window.innerWidth - 200;

    tooltip.style.top = top + "px";
    tooltip.style.left = left + "px";
}

// ======================
function clearHighlight() {
    document.querySelectorAll(".tutorial-highlight")
        .forEach(el => el.classList.remove("tutorial-highlight"));

    const tooltip = document.getElementById("tutorial-tooltip");
    if (tooltip) tooltip.style.display = "none";
}

// ======================
function setupTutorialPlayers() {
    players = [
        {
            n: "你",
            hand: [],
            isAI: false,
            id: "player"   // ⭐ 這個目前不會用到，但先加
        },
        {
            n: "教學AI",
            hand: [],
            isAI: true,
            id: "ai-1",    // ⭐ 必須對應 HTML
            avatar: '<div style="font-size: 2rem;">🤖</div>'
        }
    ];
}
