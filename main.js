let gameDifficulty = 0.7;
let speakingAI = null;
let sfxEnabled = true;
let showSummaryMode = true; // 預設開啟結算頁面
let roundReport = [];       // 每回合出牌結果紀錄

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 預載圖片功能
function preloadImages(prefix, count) {
    for (let i = 1; i <= count; i++) {
        const img = new Image();
        img.src = `${prefix}${i}.jpg`;
        img.decode().catch(() => {}); // 背景解碼，避免顯示時卡頓
    }
}

// DOMContentLoaded 即刻預載（比 load 早，不等 BGM/大圖載完）
document.addEventListener('DOMContentLoaded', () => {
    preloadImages('P', 6);  // 預載故事 P1-P6
    preloadImages('F', 18); // 預載說明 F1-F18
    preloadFishImages();     // 預載所有魚圖片
    initOceanCaustics();     // 初始化海洋光束
});

// 預載魚圖片
function preloadFishImages() {
    if (typeof fishDB === "undefined") return;
    fishDB.forEach(f => {
        const img = new Image();
        img.src = `fishdb/${f.n}.png`;
        img.decode().catch(() => {}); // 背景解碼，顯示時零延遲
    });
}

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

function prevStory() {
    stopStoryTimer();
    if (storyIdx > 1) { storyIdx--; updateStory(); startStoryTimer(); }
}

function handleSwipe() {
    const diff = touchEndX - touchStartX;
    if (diff < -50) nextStory();
    else if (diff > 50) prevStory();
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

// --- 說明功能變數 ---
let infoIdx = 1;
let infoTimer = null;
const totalInfo = 18;
let infoTouchStartX = 0;
let infoTouchEndX = 0;

// 判斷滑動方向（左滑下一頁，右滑上一頁）
function prevInfo() {
    stopInfoTimer();
    if (infoIdx > 1) { infoIdx--; updateInfo(); startInfoTimer(); }
}

function handleSwipeInfo() {
    const diff = infoTouchEndX - infoTouchStartX;
    if (diff < -50) nextInfo();
    else if (diff > 50) prevInfo();
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

// 真正均勻的 Fisher-Yates 洗牌（取代有偏的 sort+random）
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// UI 鎖定：等待動畫/AI計算時，攔截所有使用者觸控
function lockUI() {
    const el = document.getElementById("ui-lock");
    if (el) el.style.display = "block";
}
function unlockUI() {
    const el = document.getElementById("ui-lock");
    if (el) el.style.display = "none";
}

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
    // 玩家回合時強高亮手牌區
    const isMyTurn = phase === "PLAYER_TURN" || phase === "PLAYER_MAZU";
    document.getElementById("player-zone").classList.toggle("my-turn", isMyTurn);
    setTimeout(updateHandArrows, 50);
}

function updateHandArrows() {
    const hand = document.getElementById('player-hand');
    const leftArrow  = document.getElementById('arrow-left');
    const rightArrow = document.getElementById('arrow-right');
    if (!hand || !leftArrow || !rightArrow) return;

    const isOverflowing = hand.scrollWidth > hand.clientWidth + 2;
    if (isOverflowing) {
        leftArrow.style.display  = hand.scrollLeft > 5 ? 'flex' : 'none';
        const maxScroll = hand.scrollWidth - hand.clientWidth;
        rightArrow.style.display = hand.scrollLeft < maxScroll - 5 ? 'flex' : 'none';
    } else {
        leftArrow.style.display  = 'none';
        rightArrow.style.display = 'none';
    }
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
if (!sfxEnabled) return;
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
function playMazuSfx() { if (!sfxEnabled) return; try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.connect(gain); gain.connect(ctx.destination); osc.frequency.setValueAtTime(880, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.4); gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6); osc.start(); osc.stop(ctx.currentTime + 0.6); } catch(e) {} }
function playSuccessSfx() { if (!sfxEnabled) return; try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'triangle'; osc.connect(gain); gain.connect(ctx.destination); osc.frequency.setValueAtTime(523.25, ctx.currentTime); osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.2, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3); osc.start(); osc.stop(ctx.currentTime + 0.3); } catch(e) {} }

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
    if (music.paused) {
        music.play();
        sfxEnabled = true;
        btn.innerText = "🎵";
        btn.style.filter = "sepia(1) saturate(3) hue-rotate(175deg) brightness(1.4)";
        btn.style.opacity = "1";
    } else {
        music.pause();
        sfxEnabled = false;
        btn.innerText = "🔇";
        btn.style.filter = "";
        btn.style.opacity = "0.4";
    }
}

function createBubble() {
    const b = document.createElement("div");
    b.className = "bubble";
    const size = 4 + Math.random() * 18;
    b.style.left = Math.random() * 100 + "%";
    b.style.width  = size + "px";
    b.style.height = size + "px";
    const duration = 6 + Math.random() * 9;
    b.style.animationDuration = duration + "s";
    // 每顆泡泡獨立的左右飄移方向與距離（-8px ~ +8px）
    const drift = (Math.random() * 16 - 8).toFixed(1);
    b.style.setProperty("--drift-x", drift + "px");
    document.getElementById("bubbles").appendChild(b);
    setTimeout(() => b.remove(), duration * 1000);
}
setInterval(createBubble, 300);

// =============================================
// 🐟 魚體調色盤（每種魚有亮色/中色/暗色三層）
// =============================================
const fishPalettes = [
    // 海藍色
    { hi: "rgba(190,235,255,1)", mid: "rgba(100,185,255,0.95)", lo: "rgba(40,110,200,0.9)",  tail: "rgba(60,140,220,0.95)", fin: "rgba(80,160,235,0.8)",  glow: "rgba(100,190,255,0.45)" },
    // 珊瑚橘
    { hi: "rgba(255,220,170,1)", mid: "rgba(255,165,80,0.95)",  lo: "rgba(200,100,30,0.9)",  tail: "rgba(215,120,50,0.95)", fin: "rgba(240,150,70,0.8)",  glow: "rgba(255,175,90,0.40)" },
    // 翠綠色
    { hi: "rgba(195,250,210,1)", mid: "rgba(110,215,150,0.95)", lo: "rgba(40,150,90,0.9)",   tail: "rgba(60,175,110,0.95)", fin: "rgba(90,200,130,0.8)",  glow: "rgba(130,225,165,0.45)" },
    // 薰衣草紫
    { hi: "rgba(235,210,255,1)", mid: "rgba(180,130,255,0.95)", lo: "rgba(110,70,210,0.9)",  tail: "rgba(140,90,225,0.95)", fin: "rgba(165,115,245,0.8)", glow: "rgba(185,145,255,0.45)" },
    // 金黃色
    { hi: "rgba(255,245,180,1)", mid: "rgba(255,210,60,0.95)",  lo: "rgba(190,145,10,0.9)",  tail: "rgba(210,165,30,0.95)", fin: "rgba(245,200,50,0.8)",  glow: "rgba(255,215,80,0.40)" },
    // 青藍色
    { hi: "rgba(185,250,255,1)", mid: "rgba(70,215,235,0.95)",  lo: "rgba(20,155,175,0.9)",  tail: "rgba(40,180,200,0.95)", fin: "rgba(70,210,230,0.8)",  glow: "rgba(90,220,240,0.45)" },
    // 玫瑰粉（新增）
    { hi: "rgba(255,215,225,1)", mid: "rgba(255,150,175,0.95)", lo: "rgba(210,80,115,0.9)",  tail: "rgba(230,110,145,0.95)",fin: "rgba(255,140,165,0.8)", glow: "rgba(255,165,190,0.40)" },
    // 銀白色（遠景常見）
    { hi: "rgba(240,248,255,1)", mid: "rgba(200,225,245,0.90)", lo: "rgba(140,175,210,0.85)", tail: "rgba(160,195,225,0.90)",fin: "rgba(185,215,240,0.75)",glow: "rgba(210,235,250,0.35)" },
];

// =============================================
// 🌊 海洋光束初始化（只執行一次）
// =============================================
function initOceanCaustics() {
    const ocean = document.getElementById("ocean");
    if (!ocean || document.getElementById("ocean-caustics")) return;
    const layer = document.createElement("div");
    layer.id = "ocean-caustics";
    for (let i = 0; i < 5; i++) {
        const beam = document.createElement("div");
        beam.className = "caustic-beam";
        layer.appendChild(beam);
    }
    // 插在 ocean 的最前面（最底層）
    ocean.insertBefore(layer, ocean.firstChild);
}

// =============================================
// 🐟 魚體建立（完整強化版）
// =============================================
function createFish(forceSprint = false) {
    const palette = fishPalettes[Math.floor(Math.random() * fishPalettes.length)];

    // ── 深度分層 ──────────────────────────────────
    const isSprint = forceSprint || Math.random() < 0.05;
    const depth = isSprint ? 2 : Math.floor(Math.random() * 3);

    const cfg = [
        { scale: 0.28, opacity: 0.28, speedBase: 22, speedVar: 10, waveAmp: 5,  tiltAmp: 1.5, wagSpeed: 0.55, finH: 0.30 },
        { scale: 0.58, opacity: 0.52, speedBase: 12, speedVar: 7,  waveAmp: 14, tiltAmp: 3.0, wagSpeed: 0.40, finH: 0.35 },
        { scale: 1.00, opacity: 0.90, speedBase: 5,  speedVar: 5,  waveAmp: 24, tiltAmp: 5.0, wagSpeed: 0.28, finH: 0.40 },
    ][depth];

    const speed    = isSprint ? 7 + Math.random() * 3 : cfg.speedBase + Math.random() * cfg.speedVar;
    const waveDur  = isSprint ? 1.4 : 1.8 + Math.random() * 2.5;
    const waveDelay = isSprint ? 0 : Math.random() * 2;
    const topPct   = isSprint ? 15 + Math.random() * 60 : 8 + Math.random() * 72;

    const size = 40 * cfg.scale;
    const h    = size * 0.48;

    const bodyGrad = `
        radial-gradient(ellipse at 38% 32%,
            ${palette.hi}   0%,
            ${palette.mid}  45%,
            ${palette.lo}   100%
        )
    `;

    // 衝刺魚發光加強
    const glowMult = isSprint ? 0.6 : 0.5;
    const glowMult2 = isSprint ? 1.5 : 1.2;
    const bodyShadow = `
        inset -2px -2px 5px rgba(0,0,0,0.25),
        inset  1px  1px 4px rgba(255,255,255,0.15),
        0 0 ${size * glowMult}px ${palette.glow},
        0 0 ${size * glowMult2}px ${palette.glow.replace("0.4","0.15").replace("0.45","0.15").replace("0.35","0.12").replace("0.40","0.12").replace("0.30","0.10")}
    `;

    const wrapper = document.createElement("div");
    wrapper.className = "fish";
    wrapper.style.cssText = `
        position: absolute;
        top: ${topPct}%;
        right: -120px;
        opacity: ${cfg.opacity};
        --wave-amp: ${cfg.waveAmp}px;
        --tilt-amp: ${cfg.tiltAmp}deg;
        animation: fishWave ${waveDur}s ${waveDelay}s ease-in-out infinite;
        ${isSprint ? "filter: brightness(1.3) saturate(1.2);" : ""}
    `;

    const inner = document.createElement("div");
    inner.style.cssText = `animation: swim ${speed}s linear forwards;`;

    const body = document.createElement("div");
    body.className = "fish-body";
    body.style.cssText = `
        width: ${size}px;
        height: ${h}px;
        background: ${bodyGrad};
        box-shadow: ${bodyShadow};
        animation: fishBodySway ${waveDur}s ${waveDelay}s ease-in-out infinite;
    `;

    const fin = document.createElement("div");
    fin.className = "fish-fin";
    const finH = h * cfg.finH;
    const finW = size * 0.28;
    fin.style.cssText = `
        border-left:   ${finW * 0.35}px solid transparent;
        border-right:  ${finW * 0.65}px solid transparent;
        border-bottom: ${finH}px solid ${palette.fin};
        animation-duration: ${waveDur * 0.9}s;
        animation-delay:    ${waveDelay}s;
    `;

    const tail = document.createElement("div");
    tail.className = "fish-tail";
    const tailW = size * 0.25;
    const tailH = h * 0.70;
    const tailTop = (h - tailH) / 2;
    tail.style.cssText = `
        width:      ${tailW}px;
        height:     ${tailH}px;
        top:        ${tailTop}px;
        background: ${palette.tail};
        animation:  tailWag ${isSprint ? "0.22s" : cfg.wagSpeed + "s"} ${waveDelay}s ease-in-out infinite;
    `;

    const eye = document.createElement("div");
    eye.className = "fish-eye";
    const es = Math.max(3, h * 0.20);
    eye.style.cssText = `width:${es}px; height:${es}px;`;

    body.appendChild(fin);
    body.appendChild(tail);
    body.appendChild(eye);
    inner.appendChild(body);
    wrapper.appendChild(inner);
    document.getElementById("fish-layer").appendChild(wrapper);

    setTimeout(() => wrapper.remove(), speed * 1000 + 500);
}

// 普通魚：每 2.5 秒一條
setInterval(createFish, 2500);

// 衝刺魚：每 12-20 秒強制產生一條近景快魚
function scheduleSprintFish() {
    const delay = 12000 + Math.random() * 8000;
    setTimeout(() => {
        createFish(true);
        scheduleSprintFish();
    }, delay);
}

scheduleSprintFish();

function initGame() {
	initOceanCaustics();
	document.body.classList.add('game-started');
    // ✅ 改用加入 class 的方式觸發淡出
    const welcomeScreen = document.getElementById("welcome-screen");
    welcomeScreen.classList.add("fade-out");
	
    // 啟動音樂與日誌
    document.getElementById("music-control").style.display = "flex";
	document.getElementById("report-control").style.display = "flex";
    document.getElementById("log-btn").style.display = "flex";
    const music = document.getElementById("bgm");
    music.play().then(() => {
        music.volume = 0.03;
        const btn = document.getElementById("music-control");
        btn.style.filter = "sepia(1) saturate(3) hue-rotate(175deg) brightness(1.4)";
    }).catch(err => {
        console.log("播放受阻");
        const btn = document.getElementById("music-control");
        btn.innerText = "🔇";
        btn.style.opacity = "0.4";
    });

    // 直接切換畫面並開始遊戲
    document.getElementById('player-hand').addEventListener('scroll', updateHandArrows);
    setTimeout(() => {
        startGame();
    }, 3500); // 保留 3.5 秒的淡出過渡效果
}

function startGame() {
// 1. 從資料庫中隨機挑選 3 個角色
    let aiPool = shuffle([...characterDB]).slice(0, 3);
    
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
	
    let fishD = shuffle([...fishDB]);
    players.forEach(p => p.hand = fishD.splice(0, 6));
    deckS = shuffle([...summonDB, ...mazuCards]);
    
    const diffLabel = gameDifficulty <= 0.4 ? "隨興(難度0.4)" : gameDifficulty >= 0.9 ? "專注(難度0.9)" : "普通(難度0.7)";
    addLog(`勇者集結！難度：${diffLabel}。注意觀察大家的出牌...`);

    // 顯示等待藍框（HTML 已預先填好文字）
    const overlay = document.getElementById("summon-focus-overlay");
    overlay.style.transition = "opacity 0.4s ease";
    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "none";

    renderUI();
    setTimeout(autoStep, 2000);
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
    lockUI(); // 每回合開始立刻鎖定
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
    const causticsReset = document.getElementById("ocean-caustics");
    if (causticsReset) causticsReset.classList.remove("mazu-beams");
    
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
            const caustics = document.getElementById("ocean-caustics");
            if (caustics) caustics.classList.add("mazu-beams");
            playMazuSfx();
            if (callerIdx === 0) unlockUI(); // 玩家是媽祖召喚者，解鎖讓選牌
            else handleMazuAI(caller);
        } else {
            if (callerIdx !== 0) {
                let idx = aiChooseCard(players[callerIdx]);
                aiMove(callerIdx, idx);
                phase = "PLAYER_TURN";
                renderUI();
                unlockUI(); // AI 召喚完畢，玩家要跟牌，解鎖
            } else {
                unlockUI(); // 玩家自己是召喚者，解鎖讓出牌
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
    lockUI(); // 等 banner 顯示完畢
    setTimeout(finishRound, 5500);
}

// =============================================
// 🎴 出牌飛行動畫
// =============================================
function playCardFlyAnimation(card, fromEl, callback) {
    const tableEl = document.getElementById("table");
    const oceanEl = document.getElementById("ocean");
    if (!fromEl || !oceanEl) { if (callback) callback(); return; }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect   = (tableEl || oceanEl).getBoundingClientRect();

    const startX = fromRect.left + fromRect.width  / 2 - 45;
    const startY = fromRect.top  + fromRect.height / 2 - 65;
    const endX   = toRect.left   + toRect.width    / 2 - 45;
    const endY   = toRect.top    + 20;

    const fly = document.createElement("div");
    fly.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top:  ${startY}px;
        width: 90px;
        border-radius: 10px;
        overflow: hidden;
        pointer-events: none;
        z-index: 5000;
        background: linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(200,230,255,0.08) 100%);
        border: 1.5px solid rgba(160,200,255,0.3);
        box-shadow: 0 0 0 3px rgba(80,120,180,0.2), 0 8px 24px rgba(0,10,40,0.6), 0 0 16px rgba(100,160,255,0.25);
        transition: none;
    `;

    const lightBg = card.l === 1 ? "#d4f5e2" : card.l === 2 ? "#fef3cd" : "#ffd6da";
    fly.innerHTML = `
        <div style="background:${lightBg}; font-size:0.85rem; font-weight:900; text-align:center; padding:5px 2px; color:#444; border-bottom:1px solid rgba(0,0,0,0.1);">${card.n}</div>
        <div style="height:38px; overflow:hidden;">
            <img src="fishdb/${card.n}.png" onerror="this.style.display='none'" style="width:100%; height:100%; object-fit:cover;">
        </div>
    `;
    document.body.appendChild(fly);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const dx = endX - startX;
            const dy = endY - startY;
            fly.style.transition = "transform 1.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 1.5s ease";
            fly.style.transform  = `translate(${dx}px, ${dy}px) scale(0.75)`;
            fly.style.opacity    = "0";
        });
    });

    setTimeout(() => {
        fly.remove();
        if (callback) callback();
    }, 1550);
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
        phase = "AI_FOLLOWING";
        lockUI(); // 出牌後鎖定，防止亂點

        renderUI();

        const fromEl = document.getElementById("player-zone");
        playCardFlyAnimation(fish, fromEl, () => renderTable());

        await new Promise(resolve => setTimeout(resolve, 1550));
        for (let pi = 0; pi < players.length; pi++) {
            const p = players[pi];
            if (p.isAI && pi !== callerIdx) {
                let matchIdx = aiChooseCard(p);
                await new Promise(resolve => setTimeout(resolve, 600));
                aiMove(pi, matchIdx); 
            }
        }

        await new Promise(resolve => setTimeout(resolve, 200));
        unlockUI(); // AI 全部出完才解鎖
        showResult();
		
    }
}

function aiMove(pI, cI) {
    const p = players[pI];
	if (!p.hand[cI]) return; // 安全機制：確保這位置有牌
	
    const f = p.hand.splice(cI, 1)[0];

    playPopSfx();
    table.push({ pIdx: pI, card: f });

    // 出牌飛行動畫：動畫跑完後才讓卡出現在 ocean
    const fromEl = document.getElementById(p.id);
    playCardFlyAnimation(f, fromEl, () => renderTable());

    renderUI(); // 立即更新 AI 手牌數量

    let isCorrect = currentS && currentS.c ? currentS.c(f) : null;

    aiTalk(p, f, isCorrect);
}

// =============================================
// 🔙 退牌飛行動畫（ocean → 手牌區）
// =============================================
function playCardReturnAnimation(card, toEl, callback) {
    const tableEl = document.getElementById("table");
    const oceanEl = document.getElementById("ocean");
    if (!toEl || !oceanEl) { if (callback) callback(); return; }

    const fromRect = (tableEl || oceanEl).getBoundingClientRect();
    const toRect   = toEl.getBoundingClientRect();

    const startX = fromRect.left + fromRect.width  / 2 - 45;
    const startY = fromRect.top  + 20;
    const endX   = toRect.left   + toRect.width    / 2 - 45;
    const endY   = toRect.top    + toRect.height   / 2 - 65;

    const fly = document.createElement("div");
    const lightBg = card.l === 1 ? "#d4f5e2" : card.l === 2 ? "#fef3cd" : "#ffd6da";
    fly.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top:  ${startY}px;
        width: 90px;
        border-radius: 10px;
        overflow: hidden;
        pointer-events: none;
        z-index: 5000;
        opacity: 0;
        background: linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(200,230,255,0.08) 100%);
        border: 1.5px solid rgba(255,100,100,0.5);
        box-shadow: 0 0 0 3px rgba(180,60,60,0.2), 0 8px 24px rgba(40,0,0,0.5), 0 0 16px rgba(255,80,80,0.2);
        transition: none;
    `;
    fly.innerHTML = `
        <div style="background:${lightBg}; font-size:0.85rem; font-weight:900; text-align:center; padding:5px 2px; color:#444; border-bottom:1px solid rgba(0,0,0,0.1);">${card.n}</div>
        <div style="height:38px; overflow:hidden;">
            <img src="fishdb/${card.n}.png" onerror="this.style.display='none'" style="width:100%; height:100%; object-fit:cover;">
        </div>
    `;
    document.body.appendChild(fly);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const dx = endX - startX;
            const dy = endY - startY;
            fly.style.transition = "transform 1.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 1.5s ease";
            fly.style.transform  = `translate(${dx}px, ${dy}px) scale(1.1)`;
            fly.style.opacity    = "1";
        });
    });

    setTimeout(() => {
        fly.style.transition = "opacity 0.3s ease";
        fly.style.opacity = "0";
        setTimeout(() => {
            fly.remove();
            if (callback) callback();
        }, 300);
    }, 1500);
}

// 全域暫存：本回合需要退回的牌
let pendingReturns = [];
let roundCount = 0;

function showResult() {
    phase = "RESULT";
    roundReport = [];
    pendingReturns = [];

    // 空白期提示，避免玩家以為當機
    const hint = document.createElement("div");
    hint.className = "countdown-bubble";
    hint.style.cssText = `position:fixed; left:50%; transform:translateX(-50%); bottom:130px; z-index:3000; pointer-events:none;`;
    hint.innerText = "🔍 計算結果中…";
    document.body.appendChild(hint);

    setTimeout(() => {
        hint.remove();
        // AI 是召喚者時，全員出牌後才揭曉召喚條件
        if (callerIdx !== 0 && currentS && !currentS.isMazu) {
            const callerName = players[callerIdx].n;
            addLog(`揭曉《${callerName}》的神秘召喚：${currentS.t.replace(/\n/g, " ")}`, "cmd");
            document.getElementById("summon-display").innerText = `【${callerName}的召喚】\n${currentS.t}`;
        }
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
                // 先暫存，等結算頁關閉後再動畫退回
                pendingReturns.push({ card: t.card, player });
                addLog(`${player.n} 的【${t.card.n}】不符規律，退回。`);
            }
        });

        renderUI();

        // ⚠️ 勝負判定：排除仍在 pendingReturns 等待退牌的玩家
        // hand.length===0 但牌還在退回途中，不算真正出完
        const realWin = players.find(p =>
            p.hand.length === 0 &&
            !pendingReturns.some(r => r.player === p)
        );
        if (realWin) {
            showCountdownBubble(4, () => showWinScreen(realWin));
            return;
        }

        // 顯示倒數氣泡，4秒後進入結算
        showCountdownBubble(4, () => {
            if (showSummaryMode) {
                showRoundSummary();
            } else {
                playPendingReturns(() => finishRound());
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
    // 每回合結束後重排所有玩家手牌，避免 AI 因陣列順序固定而每次選同一張
    players.forEach(p => { if (p.isAI) shuffle(p.hand); });
    callerIdx = (callerIdx + 1) % players.length;
    phase = "WAIT";
    autoStep();
}

// 結算頁關閉後，同時播所有退牌動畫，全部結束後才加入手牌
function playPendingReturns(callback) {
    if (pendingReturns.length === 0) { if (callback) callback(); return; }

    const playerZone = document.getElementById("player-zone");
    let done = 0;
    const total = pendingReturns.length;

    pendingReturns.forEach(({ card, player }) => {
        const toEl = player.isAI ? document.getElementById(player.id) : playerZone;
        playCardReturnAnimation(card, toEl, () => {
            player.hand.push(card);
            done++;
            if (done === total) {
                pendingReturns = [];
                renderUI();
                if (callback) callback();
            }
        });
    });
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
        lockUI(); // 退牌動畫期間鎖定
        playPendingReturns(() => proceedToNextRound());
    };
}

function aiChooseCard(p) {
    let difficulty = gameDifficulty;

    if (p.personality === "smart")   difficulty += 0.15;
    if (p.personality === "chaotic") difficulty -= 0.25;
    if (p.personality === "tricky")  difficulty -= 0.1;

    difficulty = Math.max(0.05, Math.min(0.97, difficulty));

    // ── 情境 A：AI 是召喚者（自己先出，table 為空）──
    if (table.length === 0) {
        const validCards = p.hand
            .map((f, idx) => ({ f, idx }))
            .filter(c => currentS && currentS.c && currentS.c(c.f));

        const invalidCards = p.hand
            .map((f, idx) => ({ f, idx }))
            .filter(c => !(currentS && currentS.c && currentS.c(c.f)));

        // 低難度：傾向出正確牌（玩家容易看懂規律、跟對牌）
        // 高難度：傾向出錯誤牌（玩家難以從 AI 出牌推敲條件）
        const playCorrect = Math.random() > difficulty;

        // 問題3：手上沒有符合牌時，記錄到 log 讓玩家知道
        if (validCards.length === 0) {
            addLog(`${p.n} 手上沒有符合召喚的牌，隨機出牌。`, "secret");
            return Math.floor(Math.random() * p.hand.length);
        }

        const pool = playCorrect ? validCards : (invalidCards.length > 0 ? invalidCards : validCards);
        return pool[Math.floor(Math.random() * pool.length)].idx;
    }

    // ── 情境 B：AI 是跟牌者（看桌面推測召喚條件）──
    const played = table.map(t => t.card);

    // 預先計算桌面牌的共同特徵，避免在 forEach 內重複運算（修 Bug2）
    const allSameL = played.every(f => f.l === played[0].l);
    const allSameH = played.every(f => f.h === played[0].h);
    const allSameD = played.every(f => f.d === played[0].d);

    // 季節：找出桌面牌都共有的季節（全年視為包含所有季節）
    const seasons = ["春", "夏", "秋", "冬"];
    const commonSeasons = seasons.filter(s =>
        played.every(f => f.s.includes("全年") || f.s.includes(s))
    );
    // 桌面所有牌都有的共同漁法
    const commonMethods = played[0].m.filter(method =>
        played.every(f => f.m.includes(method))
    );

    // 評分：比對手牌與桌面共同特徵的吻合度
    let candidates = p.hand.map((f, idx) => {
        let score = 0;
        if (allSameL && f.l === played[0].l) score++;
        if (allSameH && f.h === played[0].h) score++;
        if (allSameD && f.d === played[0].d) score++;
        // 季節：手牌含全年、或含任一共同季節，給分
        if (commonSeasons.length > 0 &&
            (f.s.includes("全年") || commonSeasons.some(s => f.s.includes(s))))
            score++;
        // 漁法：手牌含任一共同漁法，給分
        if (commonMethods.length > 0 && commonMethods.some(m => f.m.includes(m)))
            score++;
        return { f, idx, score };
    });

    candidates.sort((a, b) => b.score - a.score);
    const topScore = candidates[0].score;

    // 三組：最佳匹配、部分匹配、完全不匹配
    const bestPool    = candidates.filter(c => c.score === topScore && topScore > 0);
    const partialPool = candidates.filter(c => c.score > 0 && c.score < topScore);
    const wrongPool   = candidates.filter(c => c.score === 0);

    // 問題4：topScore === 0 時（手牌完全沒有與桌面共同特徵的牌），
    // 不應 fallback 到 wrongPool（等同完全隨機），
    // 而是直接從分數最高的 candidates 中選（雖然分數都是 0，但至少不是亂選）
    if (topScore === 0) {
        // 手牌沒有任何特徵吻合，高難度仍嘗試從 candidates 前段選，低難度完全隨機
        const roll = Math.random();
        if (roll < difficulty) {
            // 高難度：從 candidates 最前段選（雖然都是 0 分，但維持一致行為）
            return candidates[Math.floor(Math.random() * Math.min(2, candidates.length))].idx;
        }
        return candidates[Math.floor(Math.random() * candidates.length)].idx;
    }

    // 難度決定從哪組選牌
    const roll = Math.random();
    if (roll < difficulty) {
        // 高難度：從最佳匹配中選
        return bestPool[Math.floor(Math.random() * bestPool.length)].idx;
    } else if (roll < difficulty + (1 - difficulty) * 0.4) {
        // 中間：從部分匹配中選
        if (partialPool.length > 0)
            return partialPool[Math.floor(Math.random() * partialPool.length)].idx;
    }

    // 低難度落點：從完全不匹配的牌中選，讓玩家容易看出差異
    if (wrongPool.length > 0)
        return wrongPool[Math.floor(Math.random() * wrongPool.length)].idx;

    // wrongPool 也空（代表所有牌都有分），退回 partialPool 或 bestPool
    if (partialPool.length > 0)
        return partialPool[Math.floor(Math.random() * partialPool.length)].idx;
    return bestPool[Math.floor(Math.random() * bestPool.length)].idx;
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

    const flyCard = document.createElement("div");
    flyCard.className = `mazu-gift-card-fly`;
    const mazuLightBg = card.l === 1 ? "#d4f5e2" : card.l === 2 ? "#fef3cd" : "#ffd6da";
    flyCard.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top:  ${startY}px;
        width: 90px;
        border-radius: 10px;
        overflow: hidden;
        pointer-events: none;
        background: linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(200,230,255,0.08) 100%);
        border: 1.5px solid rgba(160,200,255,0.3);
        box-shadow: 0 0 0 3px rgba(80,120,180,0.2), 0 8px 24px rgba(0,10,40,0.6), 0 0 16px rgba(100,160,255,0.25);
        --fly-x: ${endX - startX}px;
        --fly-y: ${endY - startY}px;
        --fly-x2: ${endX - startX + 20}px;
        --fly-y2: ${endY - startY - 20}px;
    `;
    flyCard.innerHTML = `
        <div style="background:${mazuLightBg}; font-size:0.85rem; font-weight:900; text-align:center; padding:5px 2px; color:#444; border-bottom:1px solid rgba(0,0,0,0.1);">${card.n}</div>
        <div style="height:38px; overflow:hidden;">
            <img src="fishdb/${card.n}.png" onerror="this.style.display='none'" style="width:100%; height:100%; object-fit:cover;">
        </div>
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
        btn.style.opacity = "1";
        btn.innerHTML = "📊";
    } else {
        btn.style.opacity = "0.85";
        btn.innerHTML = `<span style="filter:grayscale(1);display:inline-block;">📊</span><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.2em;font-weight:900;color:#ff2222;pointer-events:none;">✕</span>`;
        // 關掉時清除可能殘留的結算 overlay
        const existing = document.getElementById("round-summary-overlay");
        if (existing) {
            existing.remove();
            playPendingReturns(() => proceedToNextRound());
        }
    }
}

