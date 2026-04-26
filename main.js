let gameDifficulty = 0.7;
let speakingAI = null;
let showSummaryMode = true; // 預設開啟結算頁面

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 預載圖片功能
function preloadImages(prefix, count) {
    for (let i = 1; i <= count; i++) {
        const img = new Image();
        img.src = `${prefix}${i}.jpg`;
    }
}

// 頁面載入後立即執行預載
window.addEventListener('load', () => {
    preloadImages('P', 6);  // 預載故事 P1-P6
    preloadImages('F', 12); // 預載說明 F1-F12
    preloadFishImages();     // 預載所有魚圖片
});

// 預載魚圖片
function preloadFishImages() {
    if (typeof fishDB === "undefined") return;
    fishDB.forEach(f => {
        const img = new Image();
        img.src = `fishdb/${f.n}.png`;
    });
}

// 當視窗大小改變時，觸發 updateHandArrows 函式重新計算
window.addEventListener('resize', () => {
    updateHandArrows();
});

function setDifficulty(d, btn) {
    gameDifficulty = d;
	document.querySelectorAll('.sub-btnd').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// --- 故事與說明功能 ---
let storyIdx = 1;
let storyTimer = null;
const totalStories = 6;
// 新增說明專用的背景音樂
const infoBGM = new Audio('MZ.mp3'); 
infoBGM.loop = true; // 設定循環播放

// --- 故事滑動控制變數 ---
let touchStartX = 0;
let touchEndX = 0;

// 新增：回前一頁的功能
function prevStory() {
    stopStoryTimer();
    if (storyIdx > 1) {
        storyIdx--;
        updateStory();
        startStoryTimer(); // 重新開始自動換頁計時
    }
}

// 判斷滑動方向
function handleSwipe() {
    const swipeThreshold = 50; // 滑動超過 50px 才觸發
    const diff = touchEndX - touchStartX;

    if (diff < -swipeThreshold) {
        // 向左滑 -> 下一頁 (Next)
        nextStory();
    } else if (diff > swipeThreshold) {
        // 向右滑 -> 前一頁 (Prev)
        prevStory();
    }
}

// 故事功能
function openStory() {
    storyIdx = 1;
    updateStory();
    const overlay = document.getElementById("story-overlay");
    overlay.style.display = "flex"; // 顯示
    overlay.style.visibility = "visible"; // 確保可見
    overlay.style.opacity = "1"; // 確保不透明
	
	infoBGM.currentTime = 0; // 從頭播放
    infoBGM.play().catch(e => console.log("音樂播放受阻，需使用者互動過才能播放:", e));
	
    startStoryTimer();

    // 綁定觸控事件（用 on= 避免重複疊加）
    overlay.ontouchstart = (e) => {
        touchStartX = e.changedTouches[0].screenX;
    };

    overlay.ontouchend = (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    };
}

function updateStory() {
    document.getElementById("story-img").src = `P${storyIdx}.jpg`;
    document.getElementById("story-page-num").innerText = `${storyIdx} / ${totalStories}`;
}

function nextStory() {
    stopStoryTimer();
    if (storyIdx < totalStories) {
        storyIdx++;
        updateStory();
        startStoryTimer();
    } else {
        closeStory();
    }
}

function startStoryTimer() {
    stopStoryTimer();
    storyTimer = setTimeout(() => {
        if (storyIdx < totalStories) {
            storyIdx++;
            updateStory();
            startStoryTimer();
        } else {
            closeStory();
        }
    }, 10000); 
}

function stopStoryTimer() {
    if (storyTimer) clearTimeout(storyTimer);
}

function closeStory() {
    stopStoryTimer();
    document.getElementById("story-overlay").style.display = "none";
	infoBGM.pause();
}

// 說明功能
// --- 說明功能變數 ---
let infoIdx = 1;
let infoTimer = null;
const totalInfo = 18;
let infoTouchStartX = 0;
let infoTouchEndX = 0;

function prevInfo() {
    stopInfoTimer();
    if (infoIdx > 1) {
        infoIdx--;
        updateInfo();
        startInfoTimer();
    }
}

function handleSwipeInfo() {
    const swipeThreshold = 50; // 滑動超過 50px 才觸發
    const diff = infoTouchEndX - infoTouchStartX;

    if (diff < -swipeThreshold) {
        // 向左滑 -> 下一頁
        nextInfo();
    } else if (diff > swipeThreshold) {
        // 向右滑 -> 前一頁
        prevInfo();
    }
}

function openInfo() {
    infoIdx = 1;
    updateInfo();
    const overlay = document.getElementById("info-overlay");
    overlay.style.display = "flex";
    overlay.style.visibility = "visible";
    overlay.style.opacity = "1";
	
	infoBGM.currentTime = 0; // 從頭播放
    infoBGM.play().catch(e => console.log("音樂播放受阻，需使用者互動過才能播放:", e));
	
    startInfoTimer();

    // 綁定觸控事件 (使用 on 避免重複綁定)
    overlay.ontouchstart = (e) => {
        infoTouchStartX = e.changedTouches[0].screenX;
    };

    overlay.ontouchend = (e) => {
        infoTouchEndX = e.changedTouches[0].screenX;
        handleSwipeInfo();
    };
}

function updateInfo() {
    document.getElementById("info-img").src = `F${infoIdx}.jpg`;
    document.getElementById("info-page-num").innerText = `${infoIdx} / ${totalInfo}`;
}

function nextInfo() {
    stopInfoTimer();
    if (infoIdx < totalInfo) {
        infoIdx++;
        updateInfo();
        startInfoTimer();
    } else {
        closeInfo();
    }
}

function startInfoTimer() {
    stopInfoTimer();
    infoTimer = setTimeout(() => {
        if (infoIdx < totalInfo) {
            infoIdx++;
            updateInfo();
            startInfoTimer();
        } else {
            closeInfo();
        }
    }, 10000); // 10秒自動換頁
}

function stopInfoTimer() {
    if (infoTimer) clearTimeout(infoTimer);
}

function closeInfo() {
    stopInfoTimer();
    document.getElementById("info-overlay").style.display = "none";
	infoBGM.pause();
}

// 日誌視窗功能
function openLog() {
    document.getElementById("log-modal").style.display = "flex";
}
function closeLog() {
    document.getElementById("log-modal").style.display = "none";
}

let players = [], deckS = [], table = [], currentS = null, callerIdx = 0, phase = "WAIT";

// --- 標籤生成邏輯 ---
function getFishTags(f) {
    let html = '<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 1px;">';
    
    if (f.s.includes("全年")) html += `<span class="tag tag-all">全年</span>`;
    else {
        if (f.s.includes("春")) html += `<span class="tag tag-spring">春</span>`;
        if (f.s.includes("夏")) html += `<span class="tag tag-summer">夏</span>`;
        if (f.s.includes("秋")) html += `<span class="tag tag-autumn">秋</span>`;
        if (f.s.includes("冬")) html += `<span class="tag tag-winter">冬</span>`;
    }

    const ecoMethods = ["一支釣", "定置", "養殖", "手釣", "棒受網", "籠具", "釣具", "標槍"];
    f.m.forEach(method => {
        const isEco = ecoMethods.some(eco => method.includes(eco));
        html += `<span class="tag ${isEco ? 'tag-eco' : 'tag-warn'}">${method}</span>`;
    });

    const hClass = f.h.includes("洄游") ? "tag-migratory" : "tag-sedentary";
    html += `<span class="tag ${hClass}">${f.h}</span>`;

    let dClass = "tag-coastal";
    if (f.d.includes("遠洋")) dClass = "tag-ocean";
    if (f.d.includes("養殖")) dClass = "tag-farm";
    html += `<span class="tag ${dClass}">${f.d}</span>`;

    html += '</div>';
    return html;
}

// 卡牌預覽功能 (2X放大)
let previewTimeout = null;

/**
 * @param {number|null} idx - 手牌索引，如果是海洋區卡片則傳 null
 * @param {HTMLElement} originalCardEl - 原始卡片 DOM
 * @param {boolean} isHand - 是否為手牌 (決定是否顯示操作按鈕)
 */
function showCardPreview(idx, fish, isHand = true) {
    const overlay = document.getElementById("card-preview-overlay");
    const container = document.getElementById("card-preview-container");

    container.innerHTML = "";
    if (previewTimeout) clearTimeout(previewTimeout);

    // 燈號對應淡色背景
    const lightBg = fish.l === 1 ? "#d4f5e2" : fish.l === 2 ? "#fef3cd" : "#ffd6da";
    const lightBorder = fish.l === 1 ? "#77D9A8" : fish.l === 2 ? "#f9e1a9" : "#ffb3ba";

    // 詳情卡片
    const card = document.createElement("div");
    card.className = "preview-detail-card";
    card.style.borderColor = lightBorder;

    card.innerHTML = `
        <div class="preview-fish-img-wrap">
            <img src="fishdb/${fish.n}.png"
                 onerror="this.style.display='none'; this.parentNode.classList.add('no-img')"
                 alt="${fish.n}" class="preview-fish-img">
        </div>
        <div class="preview-fish-name" style="background:${lightBg};">${fish.n}</div>
        <div class="preview-fish-tags">${getFishTags(fish)}</div>
        <div class="preview-fish-desc">${fish.i || ""}</div>
    `;

    container.appendChild(card);

    // 出牌按鈕（手牌且輪到玩家）
    if (isHand && phase.includes("PLAYER")) {
        const controls = document.createElement("div");
        controls.className = "preview-controls";

        const btnCancel = document.createElement("button");
        btnCancel.className = "preview-btn btn-cancel";
        btnCancel.innerHTML = "❌";
        btnCancel.onclick = (e) => { e.stopPropagation(); closePreview(); };

        const btnConfirm = document.createElement("button");
        btnConfirm.className = "preview-btn btn-confirm";
        btnConfirm.innerHTML = "✔️";
        btnConfirm.onclick = (e) => { e.stopPropagation(); closePreview(); playerAction(idx); };

        controls.appendChild(btnConfirm);
        controls.appendChild(btnCancel);
        container.appendChild(controls);
    }

    overlay.style.display = "flex";

    // 手牌時自動關閉延長到 6 秒，桌面牌 4 秒
    previewTimeout = setTimeout(closePreview, isHand ? 6000 : 4000);
}

function closePreview() {
    if (previewTimeout) clearTimeout(previewTimeout);
    document.getElementById("card-preview-overlay").style.display = "none";
    document.getElementById("card-preview-container").innerHTML = "";
}

// --- 遊戲運行邏輯與 UI 渲染 ---
function renderUI() {

    players.forEach((p, i) => { 
        if(i > 0) {
			const isLastCard = p.hand.length === 1;
            const dangerClass = isLastCard ? "ai-last-card-danger" : "";
            
            // 將閃爍類別套用在包覆 🎴 的容器上
            const cardsIcon = `
                <span class="${dangerClass}" style="letter-spacing: -5px; display: inline-block; white-space: nowrap;">
                    ${"🎴".repeat(p.hand.length)}
                </span>`;
            
            document.getElementById(p.id).innerHTML = `
                <div class="avatar-img">${p.avatar}</div>
                <div class="ai-name">${p.n}</div>
                <div class="ai-cards">${cardsIcon}</div>
            `;
        }
    });

// --- 優化 3: 牌組告急閃爍 ---
    const deckInfo = document.getElementById("deck-info");
    deckInfo.innerText = `剩餘${deckS.length}次召喚`;
    if (deckS.length <= 5) {
        deckInfo.classList.add("deck-danger");
    } else {
        deckInfo.classList.remove("deck-danger");
    }
    
	const handEl = document.getElementById("player-hand");
    handEl.innerHTML = "";
    
    const isNormalTask = currentS && !currentS.isMazu && phase === "PLAYER_TURN" && callerIdx === 0;
    const hasValid = isNormalTask && players[0].hand.some(f => currentS.c(f));

    players[0].hand.forEach((f, idx) => {
        const c = document.createElement("div");
        c.className = `card light-${f.l}`;
        if (hasValid) {
            if (currentS.c(f)) c.classList.add("is-valid");
            else c.classList.add("is-not-valid");
        }
        c.innerHTML = `<div class="card-n">${f.n}</div><div class="card-i">${getFishTags(f)}</div>`;
        
        // 手牌點擊：放大預覽，並帶有出牌功能
        c.onclick = () => showCardPreview(idx, f, true);
        
        handEl.appendChild(c);
    });
	// 只要階段包含 PLAYER，就幫玩家區加上 my-turn 類別
    document.getElementById("player-zone").classList.toggle("my-turn", phase.includes("PLAYER"));
	setTimeout(updateHandArrows, 50);
}

// 確保點擊遮罩背景也能關閉預覽
document.getElementById("card-preview-overlay").onclick = (e) => {
    if(e.target.id === "card-preview-overlay") {
        closePreview();
    }
};

function renderTable() {
    const zone = document.getElementById("table");
    zone.innerHTML = "";
    table.forEach((t, index) => {
        const c = document.createElement("div");
        c.className = `card light-${t.card.l}`;
        c.innerHTML = `<div class="card-n">${t.card.n}</div><div class="card-i">${getFishTags(t.card)}</div>`;
        
        // 海洋區卡片點擊：放大預覽，但不帶功能
        c.onclick = () => showCardPreview(null, t.card, false);
        
        zone.appendChild(c);
        if (index === table.length - 1) { 
            void c.offsetWidth; 
            c.classList.add("card-played"); 
        }
    });
}

function playPopSfx() { 
try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // 1. 低頻震盪器 - 模擬撞擊的沉悶感
        const osc = ctx.createOscillator();
        const gainOsc = ctx.createGain();
        
        // 2. 雜訊緩衝區 - 模擬紙張摩擦的「刷」聲
        const bufferSize = ctx.sampleRate * 0.05; // 只需要極短的 0.05 秒
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1; // 白雜訊
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gainNoise = ctx.createGain();

        // --- 設定低頻撞擊 (Oscillator) ---
        osc.type = 'triangle'; // 使用三角波，比正弦波紮實一點
        osc.frequency.setValueAtTime(150, ctx.currentTime); // 起始頻率較低
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
        
        gainOsc.gain.setValueAtTime(0.6, ctx.currentTime);
        gainOsc.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

        // --- 設定摩擦雜訊 (Noise) ---
        gainNoise.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNoise.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

        // --- 連接並啟動 ---
        osc.connect(gainOsc);
        gainOsc.connect(ctx.destination);
        
        noise.connect(gainNoise);
        gainNoise.connect(ctx.destination);

        osc.start();
        noise.start();
        
        osc.stop(ctx.currentTime + 0.1);
        noise.stop(ctx.currentTime + 0.1);
        
    } catch(e) {}
	}
function playMazuSfx() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.connect(gain); gain.connect(ctx.destination); osc.frequency.setValueAtTime(880, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.4); gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6); osc.start(); osc.stop(ctx.currentTime + 0.6); } catch(e) {} }
function playSuccessSfx() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'triangle'; osc.connect(gain); gain.connect(ctx.destination); osc.frequency.setValueAtTime(523.25, ctx.currentTime); osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.2, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3); osc.start(); osc.stop(ctx.currentTime + 0.3); } catch(e) {} }

function addLog(m, type="") {
    const l = document.getElementById("log-messages");
    let className = "log-entry";
    if(type === "cmd") className += " log-cmd";
    if(type === "secret") className += " log-secret";
    if(type === "success") className += " log-success";
    const prefix = roundCount > 0 ? `<span style="color:#aaa; font-size:0.85em;">[R${roundCount}]</span> ` : "";
    l.innerHTML = `<div class="${className}">> ${prefix}${m}</div>` + l.innerHTML;
}

function toggleMusic() {
    const music = document.getElementById("bgm");
    const btn = document.getElementById("music-control");
    if (music.paused) { music.play(); btn.innerText = "🎵"; btn.style.opacity = "1"; }
    else { music.pause(); btn.innerText = "🔇"; btn.style.opacity = "0.4"; }
}

function createBubble() {
    const b = document.createElement("div");
    b.className = "bubble";
    const size = 5 + Math.random() * 16;
    b.style.left = Math.random() * 100 + "%";
    b.style.width = size + "px";
    b.style.height = size + "px";
    const duration = 5 + Math.random() * 8;
    b.style.animationDuration = duration + "s";
    // rise 動畫用 100% translateY，需要知道上移距離
    b.style.setProperty("--rise-h", (window.innerHeight * 0.7) + "px");
    document.getElementById("bubbles").appendChild(b);
    setTimeout(() => b.remove(), duration * 1000);
}
setInterval(createBubble, 300);

const fishPalettes = [
    { body: "rgba(120,200,255,0.7)", tail: "rgba(80,160,220,0.8)",  fin: "rgba(160,220,255,0.5)" },
    { body: "rgba(255,180,100,0.7)", tail: "rgba(220,130,60,0.8)",  fin: "rgba(255,210,150,0.5)" },
    { body: "rgba(150,230,180,0.7)", tail: "rgba(80,180,120,0.8)",  fin: "rgba(180,240,200,0.5)" },
    { body: "rgba(220,160,255,0.7)", tail: "rgba(170,100,220,0.8)", fin: "rgba(240,190,255,0.5)" },
    { body: "rgba(255,220,100,0.7)", tail: "rgba(210,170,40,0.8)",  fin: "rgba(255,240,160,0.5)" },
];

function createFish() {
    const palette = fishPalettes[Math.floor(Math.random() * fishPalettes.length)];
    const size = 28 + Math.random() * 36; // 魚身寬度 28~64px
    const h = size * 0.48;               // 魚身高度

    // 外層容器（負責游動）
    const wrapper = document.createElement("div");
    wrapper.className = "fish";
    wrapper.style.top  = (8 + Math.random() * 72) + "%";
    wrapper.style.right = "-120px";
    const swimDur = 12 + Math.random() * 14;
    wrapper.style.animationDuration = swimDur + "s";

    // 魚身
    const body = document.createElement("div");
    body.className = "fish-body";
    body.style.width  = size + "px";
    body.style.height = h + "px";
    body.style.background = palette.body;
    body.style.boxShadow = `inset -4px -2px 8px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.2)`;

    // 魚尾（三角形）
    const tail = document.createElement("div");
    tail.className = "fish-tail";
    const tailSize = h * 0.8;
    tail.style.borderTop    = `${tailSize * 0.45}px solid transparent`;
    tail.style.borderBottom = `${tailSize * 0.45}px solid transparent`;
    tail.style.borderRight  = `${tailSize * 0.85}px solid ${palette.tail}`;
    const wagDur = 0.35 + Math.random() * 0.2;
    tail.style.animationDuration = wagDur + "s";

    // 魚眼
    const eye = document.createElement("div");
    eye.className = "fish-eye";
    const eyeSize = Math.max(4, h * 0.18);
    eye.style.width  = eyeSize + "px";
    eye.style.height = eyeSize + "px";

    body.appendChild(tail);
    body.appendChild(eye);
    wrapper.appendChild(body);
    document.getElementById("fish-layer").appendChild(wrapper);
    setTimeout(() => wrapper.remove(), swimDur * 1000);
}
setInterval(createFish, 4000);

function initGame() {
	document.body.classList.add('game-started');
    // ✅ 改用加入 class 的方式觸發淡出
    const welcomeScreen = document.getElementById("welcome-screen");
    welcomeScreen.classList.add("fade-out");
	
	const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const bgmVolume = isMobile ? 0.03 : 0.1; // 手機用 0.03，電腦用 0.1

    // 啟動音樂與日誌
    document.getElementById("music-control").style.display = "flex";
	document.getElementById("report-control").style.display = "flex";
    document.getElementById("log-btn").style.display = "flex";
    const music = document.getElementById("bgm");
    music.play().then(() => {
        music.volume = bgmVolume;
    }).catch(err => {
        console.log("播放受阻");
        const btn = document.getElementById("music-control");
        btn.innerText = "🔇";
        btn.style.opacity = "0.4";
    });

	document.getElementById('player-hand').addEventListener('scroll', updateHandArrows);

    // 直接切換畫面並開始遊戲
    setTimeout(() => {
        startGame();
    }, 3500); // 保留 3.5 秒的淡出過渡效果
}

function startGame() {
// 1. 從資料庫中隨機挑選 3 個角色
    let aiPool = [...characterDB].sort(() => Math.random() - 0.5).slice(0, 3);
    
    // 2. 初始化玩家與隨機選出的 AI
    players = [
        { n: "你", hand: [], isAI: false }
    ];

    // 3. 將選出的 AI 加入 players 陣列
    aiPool.forEach((char, index) => {
        players.push({
            n: char.n,
            hand: [],
            isAI: true,
            id: `ai-${index + 1}`,
            personality: char.personality,
            // 統一頭像渲染方式
            avatar: `<img src="${char.img}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
        });
    });	
	
    let fishD = [...fishDB].sort(()=>Math.random()-0.5);
    players.forEach(p => p.hand = fishD.splice(0, 6));
    deckS = [...summonDB, ...mazuCards].sort(()=>Math.random()-0.5);
    
    addLog("勇者集結！注意觀察大家的出牌...");
    document.getElementById("summon-display").innerText = "";
    renderUI();
    autoStep();
}

function updateCallerHighlight() {
    players.forEach((p, idx) => {
        let el = (idx === 0) ? document.getElementById("player-zone") : document.getElementById(p.id);
        if (el) {
            if (idx === callerIdx) el.classList.add("is-caller");
            else el.classList.remove("is-caller");
        }
    });
}

let summonFocusTimer = null;

function showSummonFocus(duration, callback) {
    const overlay = document.getElementById("summon-focus-overlay");
    const box     = document.getElementById("summon-focus-box");

    // 清除上一輪殘留的 timer
    if (summonFocusTimer) {
        clearTimeout(summonFocusTimer);
        summonFocusTimer = null;
    }

    // 把召喚文字複製進遮罩框
    box.innerText = document.getElementById("summon-display").innerText;

    // 媽祖特殊樣式
    if (currentS && currentS.isMazu) {
        box.classList.add("mazu-style");
    } else {
        box.classList.remove("mazu-style");
    }

    // 重新觸發彈入動畫
    box.style.animation = "none";
    void box.offsetWidth;
    box.style.animation = "summonPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards";

    // 顯示遮罩
    overlay.style.transition = "opacity 0.4s ease";
    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "all";

    // duration 後自動淡出，再執行 callback
    summonFocusTimer = setTimeout(() => {
        overlay.style.transition = "opacity 0.8s ease";
        overlay.style.opacity = "0";
        overlay.style.pointerEvents = "none";
        summonFocusTimer = setTimeout(() => {
            summonFocusTimer = null;
            if (callback) callback();
        }, 800);
    }, duration);
}

function autoStep() {
    if (deckS.length === 0) { 
        addLog("召喚卡已用盡！開始結算剩餘手牌...", "cmd");
                // 找出手中剩餘卡牌最少的玩家
        let winner = players[0];
        for (let i = 1; i < players.length; i++) {
            // 若牌數相同，目前邏輯會保留順位較前（例如玩家本人）的優先權
            if (players[i].hand.length < winner.hand.length) {
                winner = players[i];
            }
        }
        // 延遲一秒後顯示勝利畫面
        showCountdownBubble(4, () => showWinScreen(winner));
        return;
    }
	
    table = [];
    roundCount++;
    const aiPlayers = players.filter(p => p.isAI);
    speakingAI = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
	document.getElementById("table").innerHTML = "";
    document.getElementById("summon-display").classList.remove("mazu-glow"); 
    
    currentS = deckS.pop();
    renderUI();
    const caller = players[callerIdx];
    updateCallerHighlight(); 

    if (callerIdx === 0) {
        addLog(`【你】抽到召喚：${currentS.t.replace(/\n/g, " ")}`, "cmd");
        document.getElementById("summon-display").innerText = (currentS.isMazu ? "【神明指示】\n" : "【你的召喚】\n") + currentS.t;
        phase = currentS.isMazu ? "PLAYER_MAZU" : "PLAYER_TURN";
        renderUI();
    } else {
        addLog(`【${caller.n}】抽到了一張神祕召喚。`, "secret");
        document.getElementById("summon-display").innerText = `【${caller.n}】抽到了神祕召喚！\n觀察對手出的魚，推敲召喚是什麼...`;
        phase = "WAIT";
    }

    // 教學模式不顯示遮罩，直接執行後續動作
    if (typeof tutorialMode !== "undefined" && tutorialMode) {
        if (currentS && currentS.isMazu) {
            document.getElementById("summon-display").classList.add("mazu-glow");
            if (callerIdx !== 0) { handleMazuAI(caller); }
        } else {
            if (callerIdx !== 0) {
                let idx = aiChooseCard(players[callerIdx]);
                aiMove(callerIdx, idx);
                phase = "PLAYER_TURN";
                renderUI();
            }
        }
        return;
    }

    // 聚焦遮罩：1.5秒後自動關閉才開放行動
    showSummonFocus(1500, () => {
        if (currentS.isMazu) {
            document.getElementById("summon-display").classList.add("mazu-glow"); 
            playMazuSfx(); 
            if (callerIdx !== 0) { handleMazuAI(caller); }
        } else {
            if (callerIdx !== 0) {
                let idx = aiChooseCard(players[callerIdx]);
                aiMove(callerIdx, idx);
                phase = "PLAYER_TURN";
                renderUI();
            }
        }
    });
}

function handleMazuAI(caller) {
    document.getElementById("summon-display").innerText = "【神明庇佑揭曉】\n" + currentS.t;
    addLog(`揭曉神明召喚：${currentS.t.replace(/\n/g, " ")}`, "cmd");

    setTimeout(() => {
        if (caller.hand.length === 0) { finishRound(); return; }

        let card = caller.hand.pop();
        let target = players.filter(p => p !== caller).sort((a,b) => a.hand.length - b.hand.length)[0];
        const targetEl = target.isAI
            ? document.getElementById(target.id)
            : document.getElementById("player-zone");
        showMazuGiftEffect(caller.n, target.n, card, targetEl);

        // 1. 送牌者先說話
        aiTalkMazuGive(caller, target, card);

        // 2. 停頓 2 秒後，執行送牌動作與接收者說話
        setTimeout(() => {
            target.hand.push(card);
            playPopSfx();
            addLog(`✨ ${caller.n} 分享了一張【${card.n}】給 ${target.n}！`, "success");
            
            // 3. 如果接收者是 AI，接著說話
            if (target.isAI) {
                aiTalkMazuReceive(target, caller, card);
            }
            
            renderUI();

            // 不顯示倒數氣泡，等 banner 自然消失後才進入下一回合
            setTimeout(finishRound, 5500);
            
        }, 2000); // 這裡是兩次說話之間的 2 秒停頓

    }, 3000);
}

// 媽祖贈牌：選擇對象
function showMazuTargetSelect(cardIdx) {
    const existing = document.getElementById("mazu-target-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "mazu-target-overlay";

    const card = players[0].hand[cardIdx];
    const targets = players.slice(1); // 排除玩家自己

    overlay.innerHTML = `
        <div class="mazu-overlay-title">🙏 神明指示：分享資源</div>
        <div class="mazu-overlay-sub">
            送出【${card.n}】給誰？
        </div>
    `;

    targets.forEach((p, i) => {
        const btn = document.createElement("button");
        btn.className = "mazu-target-btn";
        btn.innerHTML = `
            <span>${p.n}</span>
            <span class="btn-cards">🎴×${p.hand.length}</span>
        `;
        btn.onclick = () => {
            overlay.remove();
            confirmMazuGift(cardIdx, p);
        };
        overlay.appendChild(btn);
    });

    document.body.appendChild(overlay);
}

// 媽祖贈牌：確認送出
function confirmMazuGift(cardIdx, target) {
    const card = players[0].hand.splice(cardIdx, 1)[0];

    const targetEl = document.getElementById(target.id);
    showMazuGiftEffect("你", target.n, card, targetEl);

    target.hand.push(card);
    playPopSfx();
    addLog(`✨ 你分享了【${card.n}】給 ${target.n}！`, "success");

    if (target.isAI) {
        aiTalkMazuReceive(target, players[0], card);
    }

    phase = "RESULT";
    renderUI();
    // banner 顯示 5.5 秒後進入下一回合
    setTimeout(finishRound, 5500);
}

async function playerAction(idx) {
    if (navigator.vibrate) navigator.vibrate(30);

    if (phase === "PLAYER_MAZU") {
        // 先選目標，再確認送牌
        showMazuTargetSelect(idx);
        return;
    } else if (phase === "PLAYER_TURN") {
        const fish = players[0].hand[idx];
        if (callerIdx === 0 && currentS.c) {
            let hasValid = players[0].hand.some(f => currentS.c(f));
            if (hasValid && !currentS.c(fish)) { alert("必須符合你抽到的規律！"); return; }
        }
        players[0].hand.splice(idx, 1);
        playPopSfx();
        table.push({ pIdx: 0, card: fish });
        renderUI();
		renderTable();
        phase = "AI_FOLLOWING";
		
		await new Promise(resolve => setTimeout(resolve, 800));
        // 【關鍵修改】改用 for...of 才能支援 await
        for (let pi = 0; pi < players.length; pi++) {
            const p = players[pi];
            
            // 排除玩家本人 (pi === 0) 且如果是 AI 且不是目前的召喚者 (如果是 AI 跟牌)
            if (p.isAI && pi !== callerIdx) {
                let matchIdx = aiChooseCard(p);
                
                // 每位 AI 出牌前先等 0.6 秒
                await new Promise(resolve => setTimeout(resolve, 600));
                
                aiMove(pi, matchIdx); 
            }
        }

        // 所有 AI 出完後再等 0.2 秒進結果
        await new Promise(resolve => setTimeout(resolve, 200));
        showResult();
		
    }
}

function aiMove(pI, cI) {
    const p = players[pI];
	if (!p.hand[cI]) return; // 安全機制：確保這位置有牌
	
    const f = p.hand.splice(cI, 1)[0];

    playPopSfx();
    table.push({ pIdx: pI, card: f });
    renderTable();
	renderUI();    // 更新 AI 手上的卡片數量 (確保閃爍的 🎴 會消失一張)

    let isCorrect = currentS && currentS.c ? currentS.c(f) : null;

    aiTalk(p, f, isCorrect);
}

// 建立一個全域或區域變數來儲存當前回合的結算資料
let roundReport = [];
let roundCount = 0;

function showResult() {
    phase = "RESULT";
    roundReport = [];

    // 空白期提示，避免玩家以為當機
    const hint = document.createElement("div");
    hint.className = "countdown-bubble";
    hint.style.cssText = `position:fixed; left:50%; transform:translateX(-50%); bottom:130px; z-index:3000; pointer-events:none;`;
    hint.innerText = "🔍 計算結果中…";
    document.body.appendChild(hint);

    setTimeout(() => {
        hint.remove();
        table.forEach(t => {
            const isSuccess = currentS.c(t.card);
            const player = players[t.pIdx];
            const condText = currentS.t; 
            
            // 使用陣列來收集所有相關的特性
            let featuresFound = [];

            // 1. 檢查是否包含「燈號/永續等級」相關關鍵字
            if (["燈", "綠", "黃", "紅"].some(k => condText.includes(k))) {
                featuresFound.push(t.card.l === 1 ? "綠燈" : (t.card.l === 2 ? "黃燈" : "紅燈"));
            }

            // 2. 檢查是否包含「捕撈方式」相關關鍵字
            if (["網", "釣", "一支", "延繩", "圍網", "刺網", "籠具", "禁止捕撈", "標槍"].some(k => condText.includes(k))) {
                featuresFound.push(t.card.m.join("、"));
            }

            // 3. 檢查是否包含「來源/產地」相關關鍵字
            if (["養殖", "近海", "遠洋"].some(k => condText.includes(k))) {
                featuresFound.push(t.card.d);
            }

            // 4. 檢查是否包含「季節」相關關鍵字
            if (["春", "夏", "秋", "冬", "全年"].some(k => condText.includes(k))) {
                featuresFound.push(t.card.s);
            }

            // 5. 檢查是否包含「棲息地」相關關鍵字
            if (["洄游", "定棲", "底棲"].some(k => condText.includes(k))) {
                featuresFound.push(t.card.h);
            }

            // 最終呈現字串：如果以上都沒對應到，預設顯示燈號；若有多項則用 " | " 隔開
            let finalFeatureStr = featuresFound.length > 0 
                ? featuresFound.join(" | ") 
                : (t.card.l === 1 ? "綠燈" : (t.card.l === 2 ? "黃燈" : "紅燈"));

            roundReport.push({
                name: player.n,
                fishName: t.card.n,
                isSuccess: isSuccess,
                feature: finalFeatureStr
            });

            if (isSuccess) {
                playSuccessSfx();
                addLog(`${player.n} 成功送出【${t.card.n}】`, "success");
            } else {
                player.hand.push(t.card);
                addLog(`${player.n} 的【${t.card.n}】不符規律，退回。`);
            }
        });

        renderUI();
        
        let win = players.find(p => p.hand.length === 0);
        if (win) {
            showCountdownBubble(4, () => showWinScreen(win));
            return;
        }

        // 顯示倒數氣泡，4秒後進入結算
        showCountdownBubble(4, () => {
            if (showSummaryMode) {
                showRoundSummary();
            } else {
                finishRound();
            }
        });

    }, 1000);
}

function showCountdownBubble(seconds, callback) {
    const layer = document.getElementById("chat-layer");
    const ocean = document.getElementById("ocean");
    if (!layer || !ocean) { callback(); return; }

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble countdown-bubble";
    bubble.style.cssText = `
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        bottom: 130px;
        z-index: 1500;
        font-size: 1.2rem;
        text-align: center;
        pointer-events: none;
    `;
    layer.appendChild(bubble);

    let remaining = seconds;
    function tick() {
        bubble.innerText = `📋 ${remaining} 秒後進入結算，可先點牌放大查看`;
        if (remaining <= 0) {
            bubble.remove();
            callback();
            return;
        }
        remaining--;
        setTimeout(tick, 1000);
    }
    tick();
}

function showWinScreen(winner) {
    const overlay = document.createElement("div");
    overlay.id = "win-overlay";
    overlay.style = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #a8e6cf url('bgi.png') no-repeat center center; background-size: cover; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 5000; text-align: center; padding: 20px; box-sizing: border-box; font-family: "Microsoft JhengHei", sans-serif;`;
    const isPlayer = !winner.isAI;
    const title = isPlayer ? "✦ 友魚勇者 任務達成 ✦" : "🌊 海域重歸寧靜";
    const subTitle = isPlayer ? "感謝您守護海洋資源，實踐永續食魚精神！" : `由【${winner.n}】率先與大海達成和解。`;
    const badgeHtml = isPlayer ? `<div style="position: absolute; top: -65px; right: -25px; width: 110px; height: 110px; background: #FFB3BA; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; transform: rotate(15deg); font-weight: bold; border: 4px double white; box-shadow: 0 5px 15px rgba(255,179,186,0.4); font-size: 1.1rem; letter-spacing: 1px; z-index: 10;">合格認證</div>` : "";

    overlay.innerHTML = `<div style="border: 12px double #B2E2D2; padding: 45px 30px; border-radius: 40px; background: rgba(255, 255, 255, 0.92); box-shadow: 0 20px 60px rgba(0,0,0,0.15); max-width: 500px; position: relative; backdrop-filter: blur(3px);">
        ${badgeHtml}
        <h1 style="color: #455A64; 
font-size: 2rem; margin-bottom: 15px; letter-spacing: 2px;">${title}</h1>
        <p style="font-size: 1.2rem; color: #78909C; line-height: 1.6; margin-bottom: 25px;">${subTitle}</p>
        <div style="background: #FDFCF8; border: 2px dashed #B2E2D2; padding: 20px; border-radius: 20px; margin-bottom: 30px;"><p style="color: #00796B; font-weight: bold; margin: 0; font-size: 1.2rem;">懂魚、愛魚、吃對魚</p></div>
        <button onclick="location.reload()" style="padding: 15px 50px; font-size: 1.2rem; background: #FFDFBA; color: #D35400; border: 3px solid #FFB347; border-radius: 50px; font-weight: bold; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(255,179,186,0.3);">重新開始</button>
    </div>`;
    document.body.appendChild(overlay);
}

function finishRound() {
    let win = players.find(p => p.hand.length === 0);
    if (win) { 
        showWinScreen(win); 
        return; 
    }
    proceedToNextRound();
}

// 新增：處理下一回合的邏輯轉換
function proceedToNextRound() {
    callerIdx = (callerIdx + 1) % players.length;
    phase = "WAIT";
    autoStep();
}

// 新增：彈出視窗函式
function showRoundSummary() {
		
	if (!showSummaryMode) {
        proceedToNextRound(); // 或 finishRound()，視您的架構而定
        return;
    }
	
    const overlay = document.createElement("div");
    overlay.id = "round-summary-overlay";
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.7); display: flex; justify-content: center; 
        align-items: center; z-index: 4000; backdrop-filter: blur(4px);
    `;

    const reportHtml = roundReport.map(r => `
        <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee; text-align: left;">
            <div style="font-size: 1.2rem; margin-right: 15px; width: 25px;">
                ${r.isSuccess ? '<span style="color: #2ecc71;">✔️</span>' : '<span style="color: #e74c3c;">❌</span>'}
            </div>
            <div style="flex-grow: 1;">
                <span style="font-weight: bold; color: #333;">${r.name}</span>：
                <span>${r.fishName}</span>
                <span style="
                    margin-left: 8px; 
                    padding: 2px 8px; 
                    background: ${r.isSuccess ? '#d7ded9' : '#d7ded9'}; 
                    color: ${r.isSuccess ? '#247173' : '#c62828'}; 
                    border-radius: 4px; 
                    font-size: 0.85rem;
                    border: 1px solid ${r.isSuccess ? '#247173' : '#247173'};
                ">
                    ${r.feature}
                </span>
            </div>
        </div>
    `).join('');

    const modal = document.createElement("div");
    modal.style.cssText = `
        background: white; padding: 25px; border-radius: 20px; 
        width: 90%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    modal.classList.add("summary-pop-anim");
	

    modal.innerHTML = `
        <h2 style="color: #00796b; margin-top: 0; font-size: 1.1rem;">回合成果結算</h2>
        
        <div style="background: #f1f8e9; padding: 10px; border-radius: 10px; margin-bottom: 15px; text-align: left;">
            <div style="font-weight: bold; color: #388e3c; font-size: 0.9rem;">📜 本回召喚要求：</div>
            <div style="font-size: 1rem; color: #333; margin-top: 4px;">${currentS.t}</div>
        </div>

        <div style="margin-bottom: 20px;">
            ${reportHtml}
        </div>

        <button id="close-summary-btn" style="
            width: 100%; padding: 10px; background: #FFDFBA; border: none; 
            border-radius: 50px; font-weight: bold; color: #d35400; cursor: pointer;
        ">整理魚獲，繼續冒險</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById("close-summary-btn").onclick = () => {
        overlay.remove();
        proceedToNextRound();
    };
}

function aiChooseCard(p) {
    let difficulty = gameDifficulty;

    if (p.personality === "smart") difficulty += 0.1;
    if (p.personality === "chaotic") difficulty -= 0.2;

    difficulty = Math.max(0.1, Math.min(0.95, difficulty));

    if (table.length === 0) {
        return Math.floor(Math.random() * p.hand.length);
    }

    const played = table.map(t => t.card);

    let candidates = p.hand.map((f, idx) => ({ f, idx, score: 0 }));

    candidates.forEach(c => {
        if (played.every(f => f.l === played[0].l) && c.f.l === played[0].l) c.score++;
        if (played.every(f => f.h === played[0].h) && c.f.h === played[0].h) c.score++;
        if (played.every(f => f.d === played[0].d) && c.f.d === played[0].d) c.score++;
    });

    candidates.sort((a, b) => b.score - a.score);

    if (p.personality === "tricky" && Math.random() < 0.4) {
        return Math.floor(Math.random() * p.hand.length);
    }

    if (Math.random() < difficulty && candidates[0].score > 0) {
        return candidates[0].idx;
    }

    return Math.floor(Math.random() * p.hand.length);
}

function showChat(p, msg) {
    const layer = document.getElementById("chat-layer");
    const el = document.getElementById(p.id);
    if (!el) return;

    const rect = el.getBoundingClientRect();

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerText = msg;

    layer.appendChild(bubble);

    // 👉 先讓它出現在畫面（才能拿寬度）
    const bubbleWidth = bubble.offsetWidth;

    // 🎯 計算中心位置
    let left = rect.left + rect.width / 2 - bubbleWidth / 2;

    // 🚧 邊界限制（重點）
    const padding = 10;
    const maxLeft = window.innerWidth - bubbleWidth - padding;

    if (left < padding) left = padding;
    if (left > maxLeft) left = maxLeft;

    bubble.style.left = left + "px";
    bubble.style.top = rect.top - 10 + "px";

    setTimeout(() => bubble.remove(), 3000);
}

function aiTalk(p, card, isCorrectGuess = null) {
    if (p !== speakingAI) return;

    const persona = p.personality;
    let lines = [...dialogueDB[persona].play];

    // 針對狡猾性格的特殊邏輯：如果亂出牌且有設定特殊台詞
    if (isCorrectGuess === false && dialogueDB[persona].playWrong) {
        lines.push(...dialogueDB[persona].playWrong);
    }

    const msg = lines[Math.floor(Math.random() * lines.length)];
    showChat(p, msg);
}

function aiTalkMazuGive(p, target, card) {
    const lines = dialogueDB[p.personality].mazuGive;
    const msg = lines[Math.floor(Math.random() * lines.length)];
    showChat(p, msg);
}

function aiTalkMazuReceive(p, from, card) {
    const lines = dialogueDB[p.personality].mazuReceive;
    const msg = lines[Math.floor(Math.random() * lines.length)];
    showChat(p, msg);
}




function showMazuGiftEffect(fromName, toName, card, targetEl) {
    // 建立飛行層
    const flyLayer = document.createElement("div");
    flyLayer.id = "mazu-gift-effect";
    document.body.appendChild(flyLayer);

    // 計算起點（送牌者位置）與終點（接收者位置）
    const fromEl = fromName === "你"
        ? document.getElementById("player-zone")
        : document.querySelector(".char-area");
    const toEl = targetEl || document.querySelector(".char-area");

    const fromRect = (fromEl || document.body).getBoundingClientRect();
    const toRect   = (toEl   || document.body).getBoundingClientRect();

    const startX = fromRect.left + fromRect.width  / 2 - 40;
    const startY = fromRect.top  + fromRect.height / 2 - 55;
    const endX   = toRect.left   + toRect.width    / 2 - 40;
    const endY   = toRect.top    + toRect.height   / 2 - 55;

    // 飛行卡片（position: fixed，直接定位在視窗上）
    const flyCard = document.createElement("div");
    flyCard.className = `card light-${card.l} mazu-gift-card-fly`;
    flyCard.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top:  ${startY}px;
        width: 80px;
        pointer-events: none;
        --fly-x: ${endX - startX}px;
        --fly-y: ${endY - startY}px;
        --fly-x2: ${endX - startX + 20}px;
        --fly-y2: ${endY - startY - 20}px;
    `;
    flyCard.innerHTML = `
        <div style="width:100%; height:60px; overflow:hidden;">
            <img src="fishdb/${card.n}.png"
                 onerror="this.style.display='none'"
                 style="width:100%; height:100%; object-fit:cover;">
        </div>
        <div class="card-n" style="font-size:0.85rem; padding:4px 2px;">${card.n}</div>
    `;
    flyLayer.appendChild(flyCard);

    // 橫幅說明（飛行結束後才彈出，2秒後）
    setTimeout(() => {
        const banner = document.createElement("div");
        banner.className = "mazu-gift-banner";
        banner.innerHTML = `
            <div class="banner-icon">🙏</div>
            <div class="banner-img-wrap">
                <img src="fishdb/${card.n}.png"
                     onerror="this.parentNode.style.display='none'"
                     alt="${card.n}">
            </div>
            <div class="banner-from">${fromName} 分享</div>
            <div class="banner-fish">【${card.n}】</div>
            <div class="banner-to">➜ ${toName}</div>
        `;
        document.body.appendChild(banner);

        // 6 秒後淡出移除
        setTimeout(() => {
            banner.style.transition = "opacity 0.6s";
            banner.style.opacity = "0";
            flyLayer.style.transition = "opacity 0.6s";
            flyLayer.style.opacity = "0";
            setTimeout(() => { banner.remove(); flyLayer.remove(); }, 600);
        }, 3000);
    }, 2000);
}

function toggleReportMode() {
    showSummaryMode = !showSummaryMode;
    const btn = document.getElementById("report-control");
    if (showSummaryMode) {
        btn.classList.remove("off");
    } else {
        btn.classList.add("off");
    }
}

function updateHandArrows() {
    const hand = document.getElementById('player-hand');
    const leftArrow = document.getElementById('arrow-left');
    const rightArrow = document.getElementById('arrow-right');

    if (!hand || !leftArrow || !rightArrow) return;

    // 1. 判斷是否「溢出」：內容寬度 > 容器寬度
    const isOverflowing = hand.scrollWidth > hand.clientWidth;

    if (isOverflowing) {
        // 2. 如果溢出，根據滾動位置判斷顯示哪邊
        // 往右滑了超過 5px 才顯示左箭頭
        leftArrow.style.display = hand.scrollLeft > 5 ? 'flex' : 'none';
        
        // 還有超過 5px 的空間可以往右滑，才顯示右箭頭
        const maxScroll = hand.scrollWidth - hand.clientWidth;
        rightArrow.style.display = (hand.scrollLeft < maxScroll - 5) ? 'flex' : 'none';
    } else {
        // 3. 沒溢出就全部隱藏
        leftArrow.style.display = 'none';
        rightArrow.style.display = 'none';
    }
}